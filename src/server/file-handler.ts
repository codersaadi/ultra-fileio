import type { FlexibleFileService } from "../file.service";
import type { IFileRepository } from "../repositories/file.repository.interface";

// ============================================================================
// TYPES
// ============================================================================

export interface FileHandlerConfig {
	fileService?: FlexibleFileService | null;
	fileRepository: IFileRepository;
	getUserId: (request: Request) => Promise<string> | string;
	onError?: (error: Error, request: Request) => void;
	basePath?: string; // e.g., '/api/fileuploads'
}

export interface FileHandlerResponse {
	status: number;
	headers?: Record<string, string>;
	body?: any;
	redirect?: string;
}

// ============================================================================
// FILE HANDLER - Single unified handler for all file operations
// ============================================================================

export class FileHandler {
	constructor(private config: FileHandlerConfig) {}

	/**
	 * Main handler function that routes to specific operations
	 */
	async handle(request: Request): Promise<FileHandlerResponse> {
		const url = new URL(request.url);
		const pathSegments = this.getPathSegments(url.pathname);
		const method = request.method;

		try {
			// Route to appropriate handler based on path and method

			// POST /upload-url - Generate presigned upload URL
			if (method === "POST" && pathSegments[0] === "upload-url") {
				return await this.handlePresignedUrl(request);
			}

			// POST /save-file - Save file record after presigned upload
			if (method === "POST" && pathSegments[0] === "save-file") {
				return await this.handleSaveFile(request);
			}

			// POST /files - Direct file upload (multipart form)
			if (
				method === "POST" &&
				pathSegments[0] === "files" &&
				!pathSegments[1]
			) {
				return await this.handleDirectUpload(request);
			}

			// GET /files - List all files for user
			if (method === "GET" && pathSegments[0] === "files" && !pathSegments[1]) {
				return await this.handleListFiles(request);
			}

			// GET /files/:id - Get specific file
			if (
				method === "GET" &&
				pathSegments[0] === "files" &&
				pathSegments[1] &&
				!pathSegments[2]
			) {
				return await this.handleGetFile(request, pathSegments[1]);
			}

			// DELETE /files/:id - Delete file
			if (
				method === "DELETE" &&
				pathSegments[0] === "files" &&
				pathSegments[1] &&
				!pathSegments[2]
			) {
				return await this.handleDeleteFile(request, pathSegments[1]);
			}

			// GET /files/:id/download - Download file
			if (
				method === "GET" &&
				pathSegments[0] === "files" &&
				pathSegments[1] &&
				pathSegments[2] === "download"
			) {
				return await this.handleDownloadFile(request, pathSegments[1]);
			}

			// Not found
			return {
				status: 404,
				body: { error: "Not found", path: url.pathname, method },
			};
		} catch (error) {
			console.error("File handler error:", error);
			this.config.onError?.(error as Error, request);

			return {
				status: 500,
				body: {
					error:
						error instanceof Error ? error.message : "Internal server error",
				},
			};
		}
	}

	/**
	 * Extract path segments from pathname
	 */
	private getPathSegments(pathname: string): string[] {
		const basePath = this.config.basePath || "/api/fileuploads";
		const relativePath = pathname.replace(basePath, "").replace(/^\/|\/$/g, "");
		return relativePath ? relativePath.split("/") : [];
	}

	/**
	 * POST /upload-url - Generate presigned upload URL
	 */
	private async handlePresignedUrl(
		request: Request,
	): Promise<FileHandlerResponse> {
		const userId = await this.config.getUserId(request);

		let body;
		try {
			body = await request.json();
		} catch (e) {
			console.error("[FileHandler] Failed to parse JSON body:", e);
			return {
				status: 400,
				body: { error: "Invalid JSON body" },
			};
		}

		const { filename, contentType, category } = body;

		if (!filename || !contentType) {
			return {
				status: 400,
				body: { error: "Missing required fields: filename, contentType" },
			};
		}

		const result = await this.config.fileService?.generateUploadUrl(
			userId,
			filename,
			contentType,
			category,
		);

		return {
			status: 200,
			body: result,
		};
	}

	/**
	 * POST /save-file - Save file record after presigned upload
	 */
	private async handleSaveFile(request: Request): Promise<FileHandlerResponse> {
		const userId = await this.config.getUserId(request);
		const body = await request.json();
		const { r2Key, originalFilename, fileSize, publicUrl } = body;

		if (!r2Key || !originalFilename || !fileSize || !publicUrl) {
			return {
				status: 400,
				body: {
					error:
						"Missing required fields: r2Key, originalFilename, fileSize, publicUrl",
				},
			};
		}

		const file = await this.config.fileService?.saveFileRecord(userId, {
			r2Key,
			originalFilename,
			fileSize,
			publicUrl,
		});

		return {
			status: 201,
			body: { file },
		};
	}

	/**
	 * POST /files - Direct file upload (multipart form)
	 */
	private async handleDirectUpload(
		request: Request,
	): Promise<FileHandlerResponse> {
		const userId = await this.config.getUserId(request);
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const category = formData.get("category") as string | undefined;

		if (!file) {
			return {
				status: 400,
				body: { error: "No file provided" },
			};
		}

		const buffer = await file.arrayBuffer();
		const uploadResult = await this.config.fileService?.uploadFile(userId, {
			file: {
				buffer,
				contentType: file.type,
				filename: file.name,
				size: file.size,
			},
			category,
		});

		return {
			status: 201,
			body: { file: uploadResult },
		};
	}

	/**
	 * GET /files - List all files for user
	 */
	private async handleListFiles(
		request: Request,
	): Promise<FileHandlerResponse> {
		const userId = await this.config.getUserId(request);
		const files = await this.config.fileService?.getFilesByUser(userId);

		return {
			status: 200,
			body: { files },
		};
	}

	/**
	 * GET /files/:id - Get specific file
	 */
	private async handleGetFile(
		_request: Request,
		fileId: string,
	): Promise<FileHandlerResponse> {
		const file = await this.config.fileRepository.getFileById(fileId);

		if (!file) {
			return {
				status: 404,
				body: { error: "File not found" },
			};
		}

		return {
			status: 200,
			body: { file },
		};
	}

	/**
	 * DELETE /files/:id - Delete file
	 */
	private async handleDeleteFile(
		request: Request,
		fileId: string,
	): Promise<FileHandlerResponse> {
		const userId = await this.config.getUserId(request);
		const result = await this.config.fileService?.deleteFile(fileId, userId);

		return {
			status: 200,
			body: {
				message: "File deleted successfully",
				r2Deleted: result?.r2Deleted,
			},
		};
	}

	/**
	 * GET /files/:id/download - Download file
	 */
	private async handleDownloadFile(
		_request: Request,
		fileId: string,
	): Promise<FileHandlerResponse> {
		const file = await this.config.fileRepository.getFileById(fileId);

		if (!file) {
			return {
				status: 404,
				body: { error: "File not found" },
			};
		}

		// Generate signed URL for secure download
		const signedUrl =
			await this.config.fileService?.r2Service.generateSignedUrl(
				file.r2Key,
				3600,
			);

		return {
			status: 307, // Temporary redirect
			redirect: signedUrl,
		};
	}
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export const createFileHandler = (config: FileHandlerConfig): FileHandler => {
	return new FileHandler(config);
};
