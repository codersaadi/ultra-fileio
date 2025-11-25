import { StorageError } from "../file.module";
import { parseFileFromRequest } from "../file.module";
import type { FlexibleFileService } from "../file.service";

// ============================================================================
// NEXT.JS APP ROUTER ROUTE HANDLER
// ============================================================================

/**
 * Configuration interface for route handler
 */
export interface RouteHandlerConfig {
	fileService: FlexibleFileService;
	getUserId: (req: Request) => Promise<string | null> | string | null;
	onError?: (error: Error, req: Request) => void;
}

/**
 * Create a secure file upload route handler for Next.js App Router
 *
 * @example
 * ```ts
 * // app/api/upload/route.ts
 * import { createFileUploadRouteHandler } from 'meta-uploads/server';
 * import { fileService } from '@/lib/file-service';
 * import { auth } from '@/auth';
 *
 * const { POST } = createFileUploadRouteHandler({
 *   fileService,
 *   getUserId: async () => {
 *     const session = await auth();
 *     return session?.user?.id ?? null;
 *   },
 * });
 *
 * export { POST };
 * ```
 */
export function createFileUploadRouteHandler(config: RouteHandlerConfig) {
	const POST = async (req: Request) => {
		try {
			// Authenticate user
			const userId = await config.getUserId(req);
			if (!userId) {
				return Response.json({ error: "Unauthorized" }, { status: 401 });
			}

			// Parse files from request
			const files = await parseFileFromRequest(req as unknown as Request);

			if (files.length === 0) {
				return Response.json({ error: "No files provided" }, { status: 400 });
			}

			// Get category from query params
			const { searchParams } = new URL(req.url);
			const category = searchParams.get("category") || "general";

			// Upload file
			const file = files[0];
			if (!file) {
				return Response.json({ error: "No file provided" }, { status: 400 });
			}
			const result = await config.fileService.uploadFile(userId, {
				file,
				category,
			});

			return Response.json({
				success: true,
				file: result,
			});
		} catch (error) {
			// Handle custom errors
			if (error instanceof StorageError) {
				config.onError?.(error, req);
				return Response.json(
					{
						error: error.message,
						code: error.code,
						metadata: error.metadata,
					},
					{ status: error.statusCode },
				);
			}

			// Handle unknown errors
			const errorMessage =
				error instanceof Error ? error.message : "Upload failed";
			config.onError?.(error as Error, req);
			return Response.json({ error: errorMessage }, { status: 500 });
		}
	};

	return { POST };
}

/**
 * Create a presigned URL route handler for client-side uploads
 *
 * @example
 * ```ts
 * // app/api/upload-url/route.ts
 * import { createPresignedUrlRouteHandler } from 'meta-uploads/server';
 * import { fileService } from '@/lib/file-service';
 * import { auth } from '@/auth';
 *
 * const { POST } = createPresignedUrlRouteHandler({
 *   fileService,
 *   getUserId: async () => {
 *     const session = await auth();
 *     return session?.user?.id ?? null;
 *   },
 * });
 *
 * export { POST };
 * ```
 */
export function createPresignedUrlRouteHandler(config: RouteHandlerConfig) {
	const POST = async (req: Request) => {
		try {
			const userId = await config.getUserId(req);
			if (!userId) {
				return Response.json({ error: "Unauthorized" }, { status: 401 });
			}

			const body = await req.json();
			const { filename, contentType, category } = body;

			if (!filename || !contentType) {
				return Response.json(
					{ error: "Filename and contentType are required" },
					{ status: 400 },
				);
			}

			const result = await config.fileService.generateUploadUrl(
				userId,
				filename,
				contentType,
				category,
			);

			return Response.json(result);
		} catch (error) {
			if (error instanceof StorageError) {
				config.onError?.(error, req);
				return Response.json(
					{
						error: error.message,
						code: error.code,
					},
					{ status: error.statusCode },
				);
			}

			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to generate upload URL";
			config.onError?.(error as Error, req);
			return Response.json({ error: errorMessage }, { status: 500 });
		}
	};

	return { POST };
}

/**
 * Create a save file record route handler for presigned uploads
 *
 * @example
 * ```ts
 * // app/api/save-file/route.ts
 * import { createSaveFileRecordRouteHandler } from 'meta-uploads/server';
 * import { fileService } from '@/lib/file-service';
 * import { auth } from '@/auth';
 *
 * const { POST } = createSaveFileRecordRouteHandler({
 *   fileService,
 *   getUserId: async () => {
 *     const session = await auth();
 *     return session?.user?.id ?? null;
 *   },
 * });
 *
 * export { POST };
 * ```
 */
export function createSaveFileRecordRouteHandler(config: RouteHandlerConfig) {
	const POST = async (req: Request) => {
		try {
			const userId = await config.getUserId(req);
			if (!userId) {
				return Response.json({ error: "Unauthorized" }, { status: 401 });
			}

			const body = await req.json();
			const { r2Key, originalFilename, fileSize, publicUrl } = body;

			if (!r2Key || !originalFilename || !fileSize || !publicUrl) {
				return Response.json(
					{
						error:
							"Missing required fields: r2Key, originalFilename, fileSize, publicUrl",
					},
					{ status: 400 },
				);
			}

			const fileRecord = await config.fileService.saveFileRecord(userId, {
				r2Key,
				originalFilename,
				fileSize,
				publicUrl,
			});

			return Response.json({
				success: true,
				file: fileRecord,
			});
		} catch (error) {
			if (error instanceof StorageError) {
				config.onError?.(error, req);
				return Response.json(
					{
						error: error.message,
						code: error.code,
					},
					{ status: error.statusCode },
				);
			}

			const errorMessage =
				error instanceof Error ? error.message : "Failed to save file record";
			config.onError?.(error as Error, req);
			return Response.json({ error: errorMessage }, { status: 500 });
		}
	};

	return { POST };
}

/**
 * Create a file deletion route handler
 *
 * @example
 * ```ts
 * // app/api/files/[id]/route.ts
 * import { createFileDeleteRouteHandler } from 'meta-uploads/server';
 * import { fileService } from '@/lib/file-service';
 * import { auth } from '@/auth';
 *
 * const { DELETE } = createFileDeleteRouteHandler({
 *   fileService,
 *   getUserId: async () => {
 *     const session = await auth();
 *     return session?.user?.id ?? null;
 *   },
 * });
 *
 * export { DELETE };
 * ```
 */
export function createFileDeleteRouteHandler(config: RouteHandlerConfig) {
	const DELETE = async (
		req: Request,
		{ params }: { params: { id: string } },
	) => {
		try {
			const userId = await config.getUserId(req);
			if (!userId) {
				return Response.json({ error: "Unauthorized" }, { status: 401 });
			}

			const fileId = params.id;
			if (!fileId) {
				return Response.json({ error: "File ID is required" }, { status: 400 });
			}

			const result = await config.fileService.deleteFile(fileId, userId);

			return Response.json({
				success: true,
				file: result.file,
				r2Deleted: result.r2Deleted,
			});
		} catch (error) {
			if (error instanceof StorageError) {
				config.onError?.(error, req);
				return Response.json(
					{
						error: error.message,
						code: error.code,
					},
					{ status: error.statusCode },
				);
			}

			const errorMessage =
				error instanceof Error ? error.message : "Failed to delete file";
			config.onError?.(error as Error, req);
			return Response.json({ error: errorMessage }, { status: 500 });
		}
	};

	return { DELETE };
}

/**
 * Create a file GET route handler to retrieve file info
 *
 * @example
 * ```ts
 * // app/api/files/[id]/route.ts
 * import { createFileGetRouteHandler } from 'meta-uploads/server';
 *
 * const { GET } = createFileGetRouteHandler({
 *   fileService,
 *   getUserId: async () => {
 *     const session = await auth();
 *     return session?.user?.id ?? null;
 *   },
 * });
 *
 * export { GET };
 * ```
 */
export function createFileGetRouteHandler(config: RouteHandlerConfig) {
	const GET = async (req: Request, { params }: { params: { id: string } }) => {
		try {
			const userId = await config.getUserId(req);
			if (!userId) {
				return Response.json({ error: "Unauthorized" }, { status: 401 });
			}

			const fileId = params.id;
			if (!fileId) {
				return Response.json({ error: "File ID is required" }, { status: 400 });
			}

			const file = await config.fileService.getFile(fileId);

			if (!file) {
				return Response.json({ error: "File not found" }, { status: 404 });
			}

			return Response.json({ file });
		} catch (error) {
			if (error instanceof StorageError) {
				config.onError?.(error, req);
				return Response.json(
					{
						error: error.message,
						code: error.code,
					},
					{ status: error.statusCode },
				);
			}

			const errorMessage =
				error instanceof Error ? error.message : "Failed to get file";
			config.onError?.(error as Error, req);
			return Response.json({ error: errorMessage }, { status: 500 });
		}
	};

	return { GET };
}
