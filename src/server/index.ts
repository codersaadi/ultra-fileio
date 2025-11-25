// ============================================================================
// SERVER-SIDE EXPORTS
// Use this for Next.js API routes and route handlers
// ============================================================================

// Pages Router API handlers
export {
	createFileUploadApiHandler,
	createPresignedUrlApiHandler,
	createSaveFileRecordApiHandler,
	createFileDeleteApiHandler,
	type ApiHandlerConfig,
} from "./api-handler";

// App Router route handlers
export {
	createFileUploadRouteHandler,
	createPresignedUrlRouteHandler,
	createSaveFileRecordRouteHandler,
	createFileDeleteRouteHandler,
	createFileGetRouteHandler,
	type RouteHandlerConfig,
} from "./route-handler";

// Unified file handler (better-auth style)
export {
	FileHandler,
	createFileHandler,
	type FileHandlerConfig,
	type FileHandlerResponse,
} from "./file-handler";

// Next.js adapter for unified handler
export {
	createNextFileHandler,
	fileUploadsHandler,
} from "./nextjs-adapter";

// Re-export core services for server-side use
export {
	R2StorageService,
	createR2StorageService,
	StorageError,
	parseFileFromRequest,
	base64ToFileUpload,
	validateImageDimensions,
	getImageFormat,
	compressImage,
	type StorageErrorCode,
	type StorageErrorOptions,
} from "../file.module";

export {
	FlexibleFileService,
	createFlexibleFileService,
	getDefaultFileServiceConfig,
	type FileUploadRequest,
} from "../file.service";

export type {
	FileUpload,
	ImageUpload,
	VideoUpload,
	DocumentUpload,
	R2Config,
	UploadOptions,
	UploadResult,
	DeleteResult,
	ListResult,
} from "../file.schema";

export type {
	IFileRepository,
	FileRecord,
	FileInsert,
	FileStats,
} from "../repositories/file.repository.interface";

// Re-export repository adapters
export { PrismaFileRepository } from "../repositories/adapters/prisma.adapter";
export { DrizzleFileRepository } from "../repositories/adapters/drizzle.adapter";
export { BaseFileRepository } from "../repositories/base.repository";
