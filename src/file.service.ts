import type { FileUpload, UploadOptions } from "./file.schema";

import {
	type R2StorageService,
	StorageError,
	createR2StorageService,
} from "./file.module";
import type {
	FileInsert,
	FileRecord,
	IFileRepository,
} from "./repositories/file.repository.interface";

// ============================================================================
// FLEXIBLE FILE SERVICE - ORM AGNOSTIC
// ============================================================================

interface FileServiceConfig {
	r2Config: {
		accountId: string;
		accessKeyId: string;
		secretAccessKey: string;
		bucketName: string;
		publicUrl?: string;
		region?: string;
	};
	maxFileSize: number; // bytes
}

export interface FileUploadRequest {
	file: FileUpload;
	category?: string; // Optional category, defaults to 'general'
}

/**
 * Flexible File Service that works with any ORM
 * Uses dependency injection for the repository
 */
export class FlexibleFileService {
	private repository: IFileRepository;
	public r2Service: R2StorageService;
	private config: FileServiceConfig;

	/**
	 * Constructor with dependency injection
	 * @param repository - Any repository implementation (Drizzle, Prisma, etc.)
	 * @param config - Service configuration
	 */
	constructor(
		repository: IFileRepository,
		config: FileServiceConfig = getDefaultFileServiceConfig(),
	) {
		this.repository = repository;
		this.config = config;
		this.r2Service = createR2StorageService({
			...config.r2Config,
			region: config.r2Config.region || "auto",
		});
	}

	/**
	 * Upload a single image file
	 */
	async uploadFile(
		userId: string,
		request: FileUploadRequest,
	): Promise<FileRecord> {
		try {
			// Validate file size
			if (request.file.size > this.config.maxFileSize) {
				throw new StorageError({
					code: "BAD_REQUEST",
					message: `File size exceeds maximum allowed size of ${this.formatFileSize(this.config.maxFileSize)}`,
					metadata: {
						maxSize: this.config.maxFileSize,
						actualSize: request.file.size,
					},
				});
			}

			// Validate it's an image
			if (!request.file.contentType.startsWith("image/")) {
				throw new StorageError({
					code: "BAD_REQUEST",
					message: "Only image files are allowed",
					metadata: { contentType: request.file.contentType },
				});
			}

			// Upload to R2
			const uploadOptions: UploadOptions = {
				userId,
				category: request.category || "general",
				isPublic: true,
				generateThumbnail: false,
				optimizeImage: true,
			};

			const uploadResult = await this.r2Service.uploadFile(
				request.file,
				{
					...uploadOptions,
					generateThumbnail: false,
					optimizeImage: true,
				},
				"image",
			);

			// Create file record using repository
			const fileData: FileInsert = {
				r2Key: uploadResult.key,
				originalFilename: request.file.filename,
				fileSize: uploadResult.size,
				publicUrl: uploadResult.url,
				uploadedBy: userId,
			};

			return await this.repository.createFile(fileData);
		} catch (error) {
			if (error instanceof StorageError) throw error;
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `File upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	/**
	 * Get file by ID
	 */
	async getFile(fileId: string): Promise<FileRecord | null> {
		return await this.repository.getFileById(fileId);
	}

	/**
	 * Delete file and clean up R2 storage
	 */
	async deleteFile(
		fileId: string,
		userId?: string,
	): Promise<{ file: FileRecord; r2Deleted: boolean }> {
		const file = await this.repository.getFileById(fileId);
		if (!file) {
			throw new StorageError({
				code: "NOT_FOUND",
				message: "File not found",
				metadata: { fileId },
			});
		}

		// Check ownership if userId provided
		if (userId && file.uploadedBy !== userId) {
			throw new StorageError({
				code: "FORBIDDEN",
				message: "Not authorized to delete this file",
				metadata: { fileId, userId, ownerId: file.uploadedBy },
			});
		}

		let r2Deleted = false;

		try {
			// Delete from database first
			await this.repository.deleteFile(file.id);
			// Delete from R2 storage
			await this.r2Service.deleteFile(file.r2Key);
			r2Deleted = true;
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to delete file",
				cause: error,
				metadata: { fileId, r2Key: file.r2Key },
			});
		}

		return { file, r2Deleted };
	}

	/**
	 * Generate presigned upload URL
	 */
	async generateUploadUrl(
		userId: string,
		filename: string,
		contentType: string,
		category?: string,
	): Promise<{
		uploadUrl: string;
		key: string;
		publicUrl: string;
	}> {
		// Validate it's an image
		if (!contentType.startsWith("image/")) {
			throw new StorageError({
				code: "BAD_REQUEST",
				message: "Only image files are allowed",
				metadata: { contentType },
			});
		}

		// Generate presigned URL
		const uploadOptions: UploadOptions = {
			userId,
			category: category || "general",
			isPublic: true,
			generateThumbnail: false,
			optimizeImage: true,
		};

		return await this.r2Service.generatePresignedUploadUrl(
			uploadOptions,
			filename,
			contentType,
		);
	}

	/**
	 * Save file record to database after presigned upload
	 * This should be called after the client successfully uploads to R2/S3
	 */
	async saveFileRecord(
		userId: string,
		data: {
			r2Key: string;
			originalFilename: string;
			fileSize: number;
			publicUrl: string;
		},
	): Promise<FileRecord> {
		try {
			// Create file record using repository
			const fileData: FileInsert = {
				r2Key: data.r2Key,
				originalFilename: data.originalFilename,
				fileSize: data.fileSize,
				publicUrl: data.publicUrl,
				uploadedBy: userId,
			};

			return await this.repository.createFile(fileData);
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Failed to save file record: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	/**
	 * Generate public URL for a file key
	 */
	generatePublicUrl(r2Key: string): string {
		return this.r2Service.getPublicUrl(r2Key);
	}

	/**
	 * Get files by user
	 */
	async getFilesByUser(userId: string): Promise<FileRecord[]> {
		return await this.repository.getFilesByUser(userId);
	}

	/**
	 * Get file statistics
	 */
	async getFileStats() {
		return await this.repository.getFileStats();
	}

	/**
	 * Check if file exists
	 */
	async fileExists(fileId: string): Promise<boolean> {
		return await this.repository.exists(fileId);
	}

	private formatFileSize(bytes: number): string {
		const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		if (bytes === 0) return "0 Bytes";
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
	}
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export const createFlexibleFileService = (
	repository: IFileRepository,
	config: FileServiceConfig,
): FlexibleFileService => {
	return new FlexibleFileService(repository, config);
};

// ============================================================================
// DEFAULT CONFIG HELPER
// ============================================================================

export const getDefaultFileServiceConfig = (): FileServiceConfig => {
	const requiredR2Vars = [
		"S3_ACCOUNT_ID",
		"S3_ACCESS_KEY_ID",
		"S3_SECRET_ACCESS_KEY",
		"S3_BUCKET_NAME",
	];
	const missingVars = requiredR2Vars.filter((varName) => !process.env[varName]);

	if (missingVars.length > 0) {
		throw new Error(
			`Missing required R2 environment variables: ${missingVars.join(", ")}. ` +
				"Please configure your R2 credentials in the environment file to enable file uploads.",
		);
	}

	return {
		r2Config: {
			accountId: process.env.S3_ACCOUNT_ID!,
			accessKeyId: process.env.S3_ACCESS_KEY_ID!,
			secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
			bucketName: process.env.S3_BUCKET_NAME!,
			publicUrl: process.env.S3_PUBLIC_URL,
			region: process.env.S3_REGION || "auto",
		},
		maxFileSize: 10 * 1024 * 1024, // 10MB
	};
};
