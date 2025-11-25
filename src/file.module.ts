import type { S3ClientConfig } from "@aws-sdk/client-s3";
import sharp from "sharp";
import z from "zod";
import {
	type DeleteResult,
	DeleteResultSchema,
	DocumentUploadSchema,
	type FileUpload,
	FileUploadSchema,
	ImageUploadSchema,
	type ListResult,
	ListResultSchema,
	type R2Config,
	R2ConfigSchema,
	type UploadOptions,
	UploadOptionsSchema,
	type UploadResult,
	UploadResultSchema,
	VideoUploadSchema,
} from "./file.schema";

// ============================================================================
// CUSTOM ERROR TYPES
// ============================================================================

export type StorageErrorCode =
	| "BAD_REQUEST"
	| "NOT_FOUND"
	| "INTERNAL_SERVER_ERROR"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "CONFLICT"
	| "PAYLOAD_TOO_LARGE";

export interface StorageErrorOptions {
	code: StorageErrorCode;
	message: string;
	cause?: unknown;
	metadata?: Record<string, any>;
}

/**
 * Custom error class for storage operations
 * Framework-agnostic and can be mapped to any error format (TRPC, HTTP, etc.)
 */
export class StorageError extends Error {
	public readonly code: StorageErrorCode;
	public readonly statusCode: number;
	public readonly metadata?: Record<string, any>;

	constructor(options: StorageErrorOptions) {
		super(options.message);
		this.name = "StorageError";
		this.code = options.code;
		this.statusCode = this.mapCodeToStatusCode(options.code);
		this.metadata = options.metadata;

		// Maintain proper stack trace for where our error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, StorageError);
		}

		// Store the cause if provided
		if (options.cause) {
			this.cause = options.cause;
		}
	}

	/**
	 * Map error codes to HTTP status codes
	 */
	private mapCodeToStatusCode(code: StorageErrorCode): number {
		const codeMap: Record<StorageErrorCode, number> = {
			BAD_REQUEST: 400,
			UNAUTHORIZED: 401,
			FORBIDDEN: 403,
			NOT_FOUND: 404,
			CONFLICT: 409,
			PAYLOAD_TOO_LARGE: 413,
			INTERNAL_SERVER_ERROR: 500,
		};
		return codeMap[code] || 500;
	}

	/**
	 * Convert to TRPC error format (if using TRPC)
	 */
	toTRPCError(): { code: string; message: string } {
		return {
			code: this.code,
			message: this.message,
		};
	}

	/**
	 * Convert to plain object for logging or API responses
	 */
	toJSON(): Record<string, any> {
		return {
			name: this.name,
			code: this.code,
			statusCode: this.statusCode,
			message: this.message,
			metadata: this.metadata,
			...(this.cause ? { cause: String(this.cause) } : {}),
		};
	}
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ImageDimensions {
	width: number;
	height: number;
	valid: boolean;
}

interface ThumbnailOptions {
	width?: number;
	height?: number;
	quality?: number;
	format?: "jpeg" | "png" | "webp";
}

interface ImageOptimizationOptions {
	quality?: number;
	maxWidth?: number;
	maxHeight?: number;
	format?: "jpeg" | "png" | "webp";
}

interface ExpiredFile {
	key: string;
	lastModified: Date;
	metadata?: Record<string, any>;
}

// ============================================================================
// R2 STORAGE SERVICE CLASS
// ============================================================================

export class R2StorageService {
	private s3Client: any;
	private config: R2Config;
	private bucketName: string;

	constructor(config: R2Config) {
		this.config = R2ConfigSchema.parse(config);
		this.bucketName = this.config.bucketName;

		// Initialize S3 client (AWS SDK v3)
		this.initializeS3Client();
	}

	private initializeS3Client() {
		// Note: You'll need to install @aws-sdk/client-s3
		const { S3Client } = require("@aws-sdk/client-s3");

		// Check if we're using AWS S3 or Cloudflare R2 based on region
		const isAwsS3 =
			this.config.region !== "auto" &&
			!this.config.region.includes("cloudflare");

		const clientConfig: S3ClientConfig = {
			region: this.config.region,
			credentials: {
				accessKeyId: this.config.accessKeyId,
				secretAccessKey: this.config.secretAccessKey,
			},
			// Disable automatic checksum calculation for cleaner URLs (optional)
			// R2 supports checksums but they're not required
			requestChecksumCalculation: "WHEN_REQUIRED", // Only calculate when explicitly requested
		};

		// Only set custom endpoint for Cloudflare R2, not AWS S3
		if (!isAwsS3) {
			clientConfig.endpoint = `https://${this.config.accountId}.r2.cloudflarestorage.com`;
		}

		this.s3Client = new S3Client(clientConfig);
	}

	/**
	 * Generate a unique file key with proper structure
	 */
	private generateFileKey(options: UploadOptions, filename: string): string {
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substring(2, 15);
		const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

		return `${options.category}/${options.userId}/${timestamp}-${randomId}-${sanitizedFilename}`;
	}

	/**
	 * Validate file based on type
	 */
	private validateFile(
		file: FileUpload,
		type: "image" | "video" | "document" | "any" = "any",
	): void {
		try {
			switch (type) {
				case "image":
					ImageUploadSchema.parse(file);
					break;
				case "video":
					VideoUploadSchema.parse(file);
					break;
				case "document":
					DocumentUploadSchema.parse(file);
					break;
				default:
					FileUploadSchema.parse(file);
			}
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new StorageError({
					code: "BAD_REQUEST",
					message: `File validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
					cause: error,
				});
			}
			throw error;
		}
	}

	/**
	 * Generate pre-signed URL for secure uploads
	 */
	async generatePresignedUploadUrl(
		options: UploadOptions,
		filename: string,
		contentType: string,
		expiresIn = 3600,
	): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
		try {
			const validatedOptions = UploadOptionsSchema.parse(options);
			const key = this.generateFileKey(validatedOptions, filename);

			const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
			const { PutObjectCommand } = require("@aws-sdk/client-s3");

			const command = new PutObjectCommand({
				Bucket: this.bucketName,
				Key: key,
				ContentType: contentType,
				Metadata: {
					userId: validatedOptions.userId,
					category: validatedOptions.category,
					originalFilename: filename,
					uploadedAt: new Date().toISOString(),
					...validatedOptions.customMetadata,
				},
				...(validatedOptions.tags && {
					Tagging: validatedOptions.tags.map((tag) => `tag=${tag}`).join("&"),
				}),
			});

			const uploadUrl = await getSignedUrl(this.s3Client, command, {
				expiresIn,
			});
			const publicUrl = this.getPublicUrl(key);

			return { uploadUrl, key, publicUrl };
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Failed to generate presigned URL: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	/**
	 * Upload file directly to R2
	 */
	async uploadFile(
		file: FileUpload,
		options: UploadOptions,
		fileType: "image" | "video" | "document" | "any" = "any",
	): Promise<UploadResult> {
		try {
			this.validateFile(file, fileType);
			const validatedOptions = UploadOptionsSchema.parse(options);

			let processedFile = file;

			// Optimize image if requested and it's an image
			if (validatedOptions.optimizeImage && fileType === "image") {
				processedFile = await this.optimizeImage(file, {
					quality: 85,
					maxWidth: 2048,
					maxHeight: 2048,
					format: "webp",
				});
			}

			const key = this.generateFileKey(
				validatedOptions,
				processedFile.filename,
			);
			const { PutObjectCommand } = require("@aws-sdk/client-s3");

			const metadata = {
				userId: validatedOptions.userId,
				category: validatedOptions.category,
				originalFilename: processedFile.filename,
				uploadedAt: new Date().toISOString(),
				...validatedOptions.customMetadata,
			};

			const command = new PutObjectCommand({
				Bucket: this.bucketName,
				Key: key,
				Body: processedFile.buffer,
				ContentType: processedFile.contentType,
				Metadata: metadata,
				// Note: ACL removed - bucket should be configured with appropriate public access policies
				// instead of using ACLs. Many modern S3/R2 buckets have ACLs disabled by default.
				...(validatedOptions.expiresIn && {
					Expires: new Date(Date.now() + validatedOptions.expiresIn * 1000),
				}),
				...(validatedOptions.tags && {
					Tagging: validatedOptions.tags.map((tag) => `tag=${tag}`).join("&"),
				}),
			});

			const result = await this.s3Client.send(command);

			// Generate thumbnail for images if requested
			let thumbnailUrl: string | undefined;
			if (validatedOptions.generateThumbnail && fileType === "image") {
				thumbnailUrl = await this.generateThumbnail(key, processedFile);
			}

			// Generate signed URL for private bucket access
			const signedUrl = validatedOptions.isPublic
				? this.getPublicUrl(key)
				: await this.generateSignedUrl(key, 86400); // 24 hours

			const uploadResult: UploadResult = {
				key,
				url: signedUrl,
				publicUrl: signedUrl,
				size: processedFile.size,
				contentType: processedFile.contentType,
				etag: result.ETag?.replace(/"/g, "") || "",
				thumbnailUrl,
				metadata,
				uploadedAt: new Date(),
			};

			return UploadResultSchema.parse(uploadResult);
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	/**
	 * Upload multiple files
	 */
	async uploadMultipleFiles(
		files: FileUpload[],
		options: UploadOptions,
		fileType: "image" | "video" | "document" | "any" = "any",
	): Promise<UploadResult[]> {
		try {
			const uploadPromises = files.map((file) =>
				this.uploadFile(file, options, fileType),
			);
			return await Promise.all(uploadPromises);
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Batch upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	/**
	 * Delete file from R2
	 */
	async deleteFile(key: string): Promise<DeleteResult> {
		try {
			const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

			const command = new DeleteObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			await this.s3Client.send(command);

			return DeleteResultSchema.parse({
				key,
				deleted: true,
				message: "File deleted successfully",
			});
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Delete failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	/**
	 * Delete multiple files
	 */
	async deleteMultipleFiles(keys: string[]): Promise<DeleteResult[]> {
		try {
			const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");

			const command = new DeleteObjectsCommand({
				Bucket: this.bucketName,
				Delete: {
					Objects: keys.map((key) => ({ Key: key })),
				},
			});

			const result = await this.s3Client.send(command);

			return keys.map((key) => ({
				key,
				deleted: !result.Errors?.some((error: any) => error.Key === key),
				message: result.Errors?.find((error: any) => error.Key === key)
					?.Message,
			}));
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Batch delete failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	/**
	 * List files with pagination
	 */
	async listFiles(
		prefix?: string,
		maxKeys = 100,
		continuationToken?: string,
	): Promise<ListResult> {
		try {
			const { ListObjectsV2Command } = require("@aws-sdk/client-s3");

			const command = new ListObjectsV2Command({
				Bucket: this.bucketName,
				Prefix: prefix,
				MaxKeys: maxKeys,
				ContinuationToken: continuationToken,
			});

			const result = await this.s3Client.send(command);

			const objects = (result.Contents || []).map((obj: any) => ({
				key: obj.Key,
				size: obj.Size,
				lastModified: obj.LastModified,
				etag: obj.ETag?.replace(/"/g, "") || "",
				url: this.getPublicUrl(obj.Key),
			}));

			return ListResultSchema.parse({
				objects,
				isTruncated: result.IsTruncated || false,
				nextContinuationToken: result.NextContinuationToken,
			});
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `List failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	/**
	 * Check if object exists and get metadata using HEAD request
	 */
	async headObject(
		key: string,
	): Promise<{
		contentLength: number;
		contentType?: string;
		lastModified?: Date;
	}> {
		try {
			const { HeadObjectCommand } = require("@aws-sdk/client-s3");

			const command = new HeadObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			const result = await this.s3Client.send(command);

			return {
				contentLength: result.ContentLength || 0,
				contentType: result.ContentType,
				lastModified: result.LastModified,
			};
		} catch (error) {
			throw new StorageError({
				code: "NOT_FOUND",
				message: `File not found: ${key}`,
				cause: error,
			});
		}
	}

	/**
	 * Get file metadata
	 */
	async getFileMetadata(key: string): Promise<any> {
		try {
			const { HeadObjectCommand } = require("@aws-sdk/client-s3");

			const command = new HeadObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			const result = await this.s3Client.send(command);

			return {
				key,
				size: result.ContentLength,
				contentType: result.ContentType,
				lastModified: result.LastModified,
				etag: result.ETag?.replace(/"/g, "") || "",
				metadata: result.Metadata,
			};
		} catch (error) {
			throw new StorageError({
				code: "NOT_FOUND",
				message: `File not found: ${key}`,
				cause: error,
			});
		}
	}

	/**
	 * Generate signed URL for private files
	 */
	async generateSignedUrl(key: string, expiresIn = 3600): Promise<string> {
		try {
			const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
			const { GetObjectCommand } = require("@aws-sdk/client-s3");

			const command = new GetObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			return await getSignedUrl(this.s3Client, command, { expiresIn });
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	/**
	 * Get public URL for a file
	 */
	getPublicUrl(key: string): string {
		if (this.config.publicUrl) {
			return `${this.config.publicUrl}/${key}`;
		}

		// Check if we're using AWS S3 or Cloudflare R2
		const isAwsS3 =
			this.config.region !== "auto" &&
			!this.config.region.includes("cloudflare");

		if (isAwsS3) {
			// AWS S3 standard URL format
			return `https://${this.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`;
		} else {
			// Cloudflare R2 URL format
			return `https://${this.bucketName}.${this.config.accountId}.r2.cloudflarestorage.com/${key}`;
		}
	}

	/**
	 * Copy file within R2
	 */
	async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
		try {
			const { CopyObjectCommand } = require("@aws-sdk/client-s3");

			const command = new CopyObjectCommand({
				Bucket: this.bucketName,
				CopySource: `${this.bucketName}/${sourceKey}`,
				Key: destinationKey,
			});

			await this.s3Client.send(command);
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Copy failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	// ============================================================================
	// IMPLEMENTED TODO METHODS
	// ============================================================================

	/**
	 * Generate thumbnail using Sharp
	 */
	private async generateThumbnail(
		key: string,
		file: FileUpload,
		options: ThumbnailOptions = {},
	): Promise<string> {
		try {
			const {
				width = 300,
				height = 300,
				quality = 80,
				format = "webp",
			} = options;

			// Convert buffer to Sharp-compatible format
			const inputBuffer = this.convertToBuffer(file.buffer);

			// Generate thumbnail
			const thumbnailBuffer = await sharp(inputBuffer)
				.resize(width, height, {
					fit: "cover",
					position: "center",
				})
				.toFormat(format, { quality })
				.toBuffer();

			// Create thumbnail key
			const thumbnailKey = this.generateThumbnailKey(key, format);

			// Upload thumbnail to R2
			const { PutObjectCommand } = require("@aws-sdk/client-s3");

			const command = new PutObjectCommand({
				Bucket: this.bucketName,
				Key: thumbnailKey,
				Body: thumbnailBuffer,
				ContentType: `image/${format}`,
				Metadata: {
					originalKey: key,
					thumbnailGenerated: new Date().toISOString(),
					thumbnailWidth: width.toString(),
					thumbnailHeight: height.toString(),
				},
			});

			await this.s3Client.send(command);

			return this.getPublicUrl(thumbnailKey);
		} catch (error) {
			console.error("Thumbnail generation failed:", error);
			// Fallback to original image URL if thumbnail generation fails
			return this.getPublicUrl(key);
		}
	}

	/**
	 * Optimize image using Sharp
	 */
	private async optimizeImage(
		file: FileUpload,
		options: ImageOptimizationOptions = {},
	): Promise<FileUpload> {
		try {
			const {
				quality = 85,
				maxWidth = 2048,
				maxHeight = 2048,
				format = "webp",
			} = options;

			const inputBuffer = this.convertToBuffer(file.buffer);

			// Get original image metadata
			const metadata = await sharp(inputBuffer).metadata();

			// Only optimize if the image is larger than specified dimensions
			const needsResize =
				(metadata.width && metadata.width > maxWidth) ||
				(metadata.height && metadata.height > maxHeight);

			let sharpInstance = sharp(inputBuffer);

			// Resize if needed
			if (needsResize) {
				sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
					fit: "inside",
					withoutEnlargement: true,
				});
			}

			// Convert to specified format with quality optimization
			const optimizedBuffer = await sharpInstance
				.toFormat(format, { quality })
				.toBuffer();

			// Generate new filename with optimized format
			const originalName = file.filename;
			const nameWithoutExt = originalName.substring(
				0,
				originalName.lastIndexOf("."),
			);
			const optimizedFilename = `${nameWithoutExt}.${format}`;

			return {
				buffer: new Uint8Array(optimizedBuffer).buffer,
				contentType: `image/${format}`,
				filename: optimizedFilename,
				size: optimizedBuffer.length,
			};
		} catch (error) {
			console.error("Image optimization failed:", error);
			// Return original file if optimization fails
			return file;
		}
	}

	/**
	 * Clean up expired files
	 */
	async cleanupExpiredFiles(): Promise<number> {
		try {
			let deletedCount = 0;
			let continuationToken: string | undefined;
			const expiredFiles: ExpiredFile[] = [];

			// List all files and check for expired ones
			do {
				const listResult = await this.listFiles(
					undefined,
					1000,
					continuationToken,
				);

				for (const obj of listResult.objects) {
					try {
						const metadata = await this.getFileMetadata(obj.key);

						// Check if file has expiration metadata
						if (metadata.metadata?.expiresAt) {
							const expiresAt = new Date(metadata.metadata.expiresAt);
							const now = new Date();

							if (now > expiresAt) {
								expiredFiles.push({
									key: obj.key,
									lastModified: obj.lastModified,
									metadata: metadata.metadata,
								});
							}
						}

						// Also check object-level expiration (if set during upload)
						// This would be handled by R2 automatically, but we can clean up
						// based on our custom metadata
					} catch (error) {
						console.warn(`Failed to get metadata for ${obj.key}:`, error);
					}
				}

				continuationToken = listResult.nextContinuationToken;
			} while (continuationToken);

			// Delete expired files in batches
			const batchSize = 1000; // R2 delete limit
			for (let i = 0; i < expiredFiles.length; i += batchSize) {
				const batch = expiredFiles.slice(i, i + batchSize);
				const keys = batch.map((file) => file.key);

				try {
					await this.deleteMultipleFiles(keys);
					deletedCount += keys.length;
				} catch (error) {
					console.error(`Failed to delete batch ${i / batchSize + 1}:`, error);
				}
			}

			return deletedCount;
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				cause: error,
			});
		}
	}

	// ============================================================================
	// HELPER METHODS
	// ============================================================================

	/**
	 * Generate thumbnail key from original key
	 */
	private generateThumbnailKey(originalKey: string, format: string): string {
		const lastDotIndex = originalKey.lastIndexOf(".");
		const keyWithoutExt =
			lastDotIndex > -1 ? originalKey.substring(0, lastDotIndex) : originalKey;
		return `${keyWithoutExt}_thumb.${format}`;
	}

	/**
	 * Convert ArrayBuffer or Uint8Array to Buffer for Sharp compatibility
	 */
	private convertToBuffer(input: ArrayBuffer | Uint8Array): Buffer {
		if (input instanceof ArrayBuffer) {
			return Buffer.from(input);
		} else if (input instanceof Uint8Array) {
			return Buffer.from(input);
		} else {
			throw new StorageError({
				code: "BAD_REQUEST",
				message: "Invalid buffer type provided",
			});
		}
	}
}

// ============================================================================
// FACTORY FUNCTION FOR DEPENDENCY INJECTION
// ============================================================================

export const createR2StorageService = (config: R2Config): R2StorageService => {
	return new R2StorageService(config);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse file from FormData or multipart request
 */
export async function parseFileFromRequest(
	request: Request,
): Promise<FileUpload[]> {
	try {
		const formData = await request.formData();
		const files: FileUpload[] = [];

		formData.forEach(async (value: FormDataEntryValue) => {
			if (value instanceof File) {
				const buffer = await value.arrayBuffer();
				files.push({
					buffer,
					contentType: value.type,
					filename: value.name,
					size: value.size,
				});
			}
		});

		return files;
	} catch (error) {
		throw new StorageError({
			code: "BAD_REQUEST",
			message: "Failed to parse files from request",
			cause: error,
		});
	}
}

/**
 * Convert base64 to file upload
 */
export function base64ToFileUpload(
	base64: string,
	filename: string,
	contentType: string,
): FileUpload {
	try {
		const base64Data = base64.split(",")[1] || base64;
		const buffer = Buffer.from(base64Data, "base64");

		return {
			buffer: new Uint8Array(buffer).buffer,
			contentType,
			filename,
			size: buffer.length,
		};
	} catch (error) {
		throw new StorageError({
			code: "BAD_REQUEST",
			message: "Invalid base64 data",
			cause: error,
		});
	}
}

/**
 * Validate image dimensions using Sharp
 */
export async function validateImageDimensions(
	buffer: ArrayBuffer,
	maxWidth?: number,
	maxHeight?: number,
): Promise<ImageDimensions> {
	try {
		const inputBuffer = Buffer.from(new Uint8Array(buffer));
		const metadata = await sharp(inputBuffer).metadata();

		const width = metadata.width || 0;
		const height = metadata.height || 0;

		let valid = true;

		if (maxWidth && width > maxWidth) {
			valid = false;
		}

		if (maxHeight && height > maxHeight) {
			valid = false;
		}

		// Also validate that it's actually a valid image
		if (width === 0 || height === 0) {
			valid = false;
		}

		return { width, height, valid };
	} catch (error) {
		return { width: 0, height: 0, valid: false };
	}
}

/**
 * Get image format from buffer
 */
export async function getImageFormat(
	buffer: ArrayBuffer,
): Promise<string | null> {
	try {
		const inputBuffer = Buffer.from(new Uint8Array(buffer));
		const metadata = await sharp(inputBuffer).metadata();
		return metadata.format || null;
	} catch (error) {
		return null;
	}
}

/**
 * Compress image with specific settings
 */
export async function compressImage(
	buffer: ArrayBuffer,
	options: {
		quality?: number;
		format?: "jpeg" | "png" | "webp";
		maxWidth?: number;
		maxHeight?: number;
	} = {},
): Promise<{ buffer: ArrayBuffer; size: number; format: string }> {
	try {
		const { quality = 80, format = "webp", maxWidth, maxHeight } = options;

		const inputBuffer = Buffer.from(new Uint8Array(buffer));
		let sharpInstance = sharp(inputBuffer);

		// Resize if dimensions are specified
		if (maxWidth || maxHeight) {
			sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
				fit: "inside",
				withoutEnlargement: true,
			});
		}

		// Compress with specified format and quality
		const compressedBuffer = await sharpInstance
			.toFormat(format, { quality })
			.toBuffer();

		return {
			buffer: new Uint8Array(compressedBuffer).buffer,
			size: compressedBuffer.length,
			format,
		};
	} catch (error) {
		throw new StorageError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Image compression failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			cause: error,
		});
	}
}
