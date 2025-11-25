// ============================================================================
// META-UPLOADS - MAIN ENTRY POINT
// ============================================================================

/**
 * NOTE: For better tree-shaking and clearer imports, prefer using:
 * - 'meta-uploads/server' for server-side code (API routes, route handlers)
 * - 'meta-uploads/client' for client-side code (React components, hooks)
 */
export const isR2Configured = Boolean(
	process.env.S3_ACCOUNT_ID &&
		process.env.S3_ACCESS_KEY_ID &&
		process.env.S3_SECRET_ACCESS_KEY &&
		process.env.S3_BUCKET_NAME,
);
// Core services and utilities (can be used on server-side)
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
} from "./file.module";

export {
	FlexibleFileService,
	createFlexibleFileService,
	getDefaultFileServiceConfig,
	type FileUploadRequest,
} from "./file.service";

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
} from "./file.schema";

export type {
	IFileRepository,
	FileRecord,
	FileInsert,
	FileStats,
} from "./repositories/file.repository.interface";

// Repository adapters
export { PrismaFileRepository } from "./repositories/adapters/prisma.adapter";
export { DrizzleFileRepository } from "./repositories/adapters/drizzle.adapter";
export { BaseFileRepository } from "./repositories/base.repository";
