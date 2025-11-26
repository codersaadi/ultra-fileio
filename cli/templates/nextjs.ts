import type { FileTemplate } from "../types.js";

export const routeHandlerTemplate: FileTemplate = {
	path: "app/api/fileuploads/[[...fileuploads]]/route.ts",
	content: `import { getUserId } from "@/lib/get-user";
import { prisma } from "@/lib/prisma";
import {
	FlexibleFileService,
	PrismaFileRepository,
	isR2Configured,
} from "ultra-fileio";
import { fileUploadsHandler } from "ultra-fileio/server";

// Create repository
const fileRepository = new PrismaFileRepository(prisma);

// Create file service (only if R2 is configured)
let fileService: FlexibleFileService | null = null;
if (isR2Configured) {
	fileService = new FlexibleFileService(fileRepository);
}

// Export all HTTP method handlers
export const { GET, POST, PUT, PATCH, DELETE } = fileUploadsHandler({
	fileService,
	fileRepository,
	getUserId,
	basePath: "/api/fileuploads",
});
`,
};

export const prismaClientTemplate: FileTemplate = {
	path: "lib/prisma.ts",
	content: `import { PrismaClient } from "@prisma/client";

declare global {
	// eslint-disable-next-line no-var
	var prisma: PrismaClient | undefined;
}

export const prisma =
	global.prisma ??
	new PrismaClient({
		log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});

if (process.env.NODE_ENV !== "production") {
	global.prisma = prisma;
}
`,
};

export const getUserTemplate: FileTemplate = {
	path: "lib/get-user.ts",
	content: `// TODO: Replace this with your actual auth implementation
// Examples:
// - NextAuth: const session = await auth(); return session?.user?.id ?? "anonymous";
// - Clerk: const { userId } = await auth(); return userId ?? "anonymous";
// - Supabase: const { data: { user } } = await supabase.auth.getUser(); return user?.id ?? "anonymous";

/**
 * Get the current user ID from the request.
 * Returns "anonymous" if no user is authenticated.
 */
export async function getUserId(req: Request): Promise<string> {
	// For development/testing only - returns a demo user
	// You can also check the request headers, cookies, etc.
	const userId = req.headers.get("x-user-id");
	return userId || "demo-user";
}
`,
};

export const prismaSchema = `
model File {
  id               String   @id @default(cuid())
  r2Key            String   @unique @map("r2_key")
  originalFilename String   @map("original_filename")
  fileSize         Int      @map("file_size")
  publicUrl        String   @map("public_url")
  uploadedBy       String   @map("uploaded_by")
  createdAt        DateTime @default(now()) @map("created_at")

  @@index([r2Key])
  @@index([uploadedBy])
  @@index([createdAt])
  @@map("files")
}`;

export const envTemplate = `
# Cloudflare R2 / S3 Configuration
S3_ACCOUNT_ID="your-account-id"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"
S3_PUBLIC_URL="https://your-bucket.r2.dev"
S3_REGION="auto"

# Database
DATABASE_URL="file:./dev.db"
`;

export const fileUploadButtonTemplate: FileTemplate = {
	path: "components/FileUploadButton.tsx",
	content: `"use client";

import { type ClassValue, clsx } from "clsx";
import {
	AlertCircle,
	CheckCircle,
	FileIcon,
	FileUp,
	Upload,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import {
	type UploadProgress,
	type UploadedFile,
	useFileUpload,
} from "ultra-fileio/client";

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// ============================================================================
// FILE UPLOAD BUTTON COMPONENT
// ============================================================================

export interface FileUploadButtonProps {
	endpoint: string;
	category?: string;
	accept?: string;
	maxSize?: number; // in bytes
	onSuccess?: (file: UploadedFile) => void;
	onError?: (error: Error) => void;
	onProgress?: (progress: UploadProgress) => void;
	disabled?: boolean;
	className?: string;
	children?: React.ReactNode;
}

/**
 * A simple, customizable file upload button component
 */
export function FileUploadButton({
	endpoint,
	category,
	accept,
	maxSize,
	onSuccess,
	onError,
	onProgress,
	disabled,
	className,
	children = "Upload File",
}: FileUploadButtonProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const { upload, uploading, progress, error } = useFileUpload({
		endpoint,
		category,
		onSuccess,
		onError,
		onProgress,
	});

	const handleClick = () => {
		if (!disabled && !uploading) {
			inputRef.current?.click();
		}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file size
		if (maxSize && file.size > maxSize) {
			const sizeInMB = (maxSize / (1024 * 1024)).toFixed(2);
			const error = new Error(\`File size exceeds \${sizeInMB}MB\`);
			onError?.(error);
			return;
		}

		await upload(file);

		// Reset input
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	const isDisabled = disabled || uploading;

	return (
		<div className={className}>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				onChange={handleFileChange}
				style={{ display: "none" }}
				disabled={isDisabled}
			/>
			<button
				type="button"
				onClick={handleClick}
				disabled={isDisabled}
				className={cn(
					"inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
					"bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2",
					uploading && "cursor-wait",
				)}
			>
				{uploading ? (
					<>
						<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
						{progress ? \`\${progress.percentage}%\` : "Uploading..."}
					</>
				) : (
					<>
						<FileUp className="mr-2 h-4 w-4" />
						{children}
					</>
				)}
			</button>
			{error && (
				<div className="mt-2 text-sm text-red-500 flex items-center">
					<AlertCircle className="mr-1 h-4 w-4" />
					{error.message}
				</div>
			)}
		</div>
	);
}

// ============================================================================
// FILE DROPZONE UI COMPONENT
// ============================================================================

export interface FileDropzoneProps {
	onFileSelect: (file: File) => Promise<void>;
	uploading: boolean;
	progress: UploadProgress | null;
	error: Error | null;
	disabled?: boolean;
	accept?: string;
	maxSize?: number;
	className?: string;
	children?: React.ReactNode;
	uploadedFiles?: UploadedFile[];
	onFileRemove?: (fileId: string) => void;
	onUploadSuccess?: (file: UploadedFile) => void;
}

/**
 * A reusable drag-and-drop UI component that handles file selection and drag states.
 * It does not handle the actual upload logic, which should be passed via onFileSelect.
 */
export function FileDropzone({
	onFileSelect,
	uploading,
	progress,
	error,
	disabled,
	accept,
	maxSize,
	className,
	children,
	uploadedFiles = [],
	onFileRemove,
	onUploadSuccess,
}: FileDropzoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = async (file: File) => {
		// Validate file type
		if (accept) {
			const acceptedTypes = accept.split(",").map((t) => t.trim());
			const isAccepted = acceptedTypes.some((type) => {
				if (type.startsWith(".")) {
					return file.name.toLowerCase().endsWith(type.toLowerCase());
				}
				if (type.endsWith("/*")) {
					return file.type.startsWith(type.replace("/*", ""));
				}
				return file.type === type;
			});

			if (!isAccepted) {
				return;
			}
		}

		// Validate file size
		if (maxSize && file.size > maxSize) {
			return;
		}

		await onFileSelect(file);
	};

	const handleDragEnter = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (!disabled && !uploading) {
				setIsDragging(true);
			}
		},
		[disabled, uploading],
	);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			if (disabled || uploading) return;

			const file = e.dataTransfer.files[0];
			if (file) {
				await handleFile(file);
			}
		},
		[disabled, uploading],
	);

	const handleClick = () => {
		if (!disabled && !uploading) {
			inputRef.current?.click();
		}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			await handleFile(file);
		}

		// Reset input
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	const isDisabled = disabled || uploading;

	return (
		<div className={cn("w-full", className)}>
			<div
				onDragEnter={handleDragEnter}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={handleClick}
				className={cn(
					"relative flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed transition-all duration-200 ease-in-out",
					"min-h-[200px] p-6 text-center cursor-pointer",
					isDragging
						? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01]"
						: "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50",
					isDisabled && "opacity-60 cursor-not-allowed hover:border-gray-300",
				)}
			>
				<input
					ref={inputRef}
					type="file"
					accept={accept}
					onChange={handleFileChange}
					className="hidden"
					disabled={isDisabled}
				/>

				<div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
					<div
						className={cn(
							"p-4 rounded-full bg-gray-100 dark:bg-gray-800 transition-colors",
							isDragging && "bg-blue-100 dark:bg-blue-900/30 text-blue-500",
						)}
					>
						<Upload className="w-8 h-8" />
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-sm font-medium text-gray-700 dark:text-gray-200">
							{isDragging
								? "Drop file here"
								: "Click to upload or drag and drop"}
						</p>
						<p className="text-xs text-gray-500">
							{accept ? \`Accepted types: \${accept}\` : "All files accepted"}
							{maxSize &&
								\` • Max size: \${(maxSize / (1024 * 1024)).toFixed(0)}MB\`}
						</p>
					</div>
				</div>

				{children}
			</div>

			{/* Progress & Error State */}
			{(uploading || error) && (
				<div className="mt-4 space-y-2">
					{uploading && progress && (
						<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
										<FileIcon className="w-4 h-4 text-blue-500" />
									</div>
									<span className="text-sm font-medium">Uploading...</span>
								</div>
								<span className="text-xs text-gray-500">
									{progress.percentage}%
								</span>
							</div>
							<div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
								<div
									className="h-full bg-blue-500 transition-all duration-300 ease-out"
									style={{ width: \`\${progress.percentage}%\` }}
								/>
							</div>
						</div>
					)}

					{error && (
						<div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
							<AlertCircle className="w-5 h-5 shrink-0" />
							<span>{error.message}</span>
						</div>
					)}
				</div>
			)}

			{/* Uploaded Files List */}
			{uploadedFiles.length > 0 && (
				<div className="mt-6 space-y-3">
					<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
						Uploaded Files
					</h4>
					<div className="grid gap-2">
						{uploadedFiles.map((file) => (
							<div
								key={file.id}
								className="group flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
							>
								<div className="flex items-center gap-3 overflow-hidden">
									<div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md shrink-0">
										<FileIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
									</div>
									<div className="flex flex-col min-w-0">
										<a
											href={file.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-sm font-medium truncate hover:text-blue-500 transition-colors"
										>
											{file.filename}
										</a>
										<span className="text-xs text-gray-500">
											{(file.size / 1024).toFixed(1)} KB
										</span>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="w-4 h-4 text-green-500" />
									{onFileRemove && (
										<button
											onClick={() => onFileRemove(file.id)}
											className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
										>
											<X className="w-4 h-4" />
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ============================================================================
// FILE UPLOAD DROPZONE COMPONENT
// ============================================================================

export interface FileUploadDropzoneProps {
	endpoint: string;
	category?: string;
	accept?: string;
	maxSize?: number;
	onSuccess?: (file: UploadedFile) => void;
	onError?: (error: Error) => void;
	onProgress?: (progress: UploadProgress) => void;
	disabled?: boolean;
	className?: string;
	children?: React.ReactNode;
}

/**
 * A drag-and-drop file upload component with a modern UI
 */
export function FileUploadDropzone({
	endpoint,
	category,
	accept,
	maxSize,
	onSuccess,
	onError,
	onProgress,
	disabled,
	className,
	children,
}: FileUploadDropzoneProps) {
	const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

	const { upload, uploading, progress, error } = useFileUpload({
		endpoint,
		category,
		onSuccess: (file) => {
			setUploadedFiles((prev) => [...prev, file]);
			onSuccess?.(file);
		},
		onError,
		onProgress,
	});

	const handleFileSelect = async (file: File) => {
		// Validate file type
		if (accept) {
			const acceptedTypes = accept.split(",").map((t) => t.trim());
			const isAccepted = acceptedTypes.some((type) => {
				if (type.startsWith(".")) {
					return file.name.toLowerCase().endsWith(type.toLowerCase());
				}
				if (type.endsWith("/*")) {
					return file.type.startsWith(type.replace("/*", ""));
				}
				return file.type === type;
			});

			if (!isAccepted) {
				const error = new Error("File type not accepted");
				onError?.(error);
				return;
			}
		}

		// Validate file size
		if (maxSize && file.size > maxSize) {
			const sizeInMB = (maxSize / (1024 * 1024)).toFixed(2);
			const error = new Error(\`File size exceeds \${sizeInMB}MB\`);
			onError?.(error);
			return;
		}

		await upload(file);
	};

	return (
		<FileDropzone
			onFileSelect={handleFileSelect}
			uploading={uploading}
			progress={progress}
			error={error}
			disabled={disabled}
			accept={accept}
			maxSize={maxSize}
			className={className}
			uploadedFiles={uploadedFiles}
			onFileRemove={(id) =>
				setUploadedFiles((files) => files.filter((f) => f.id !== id))
			}
			onUploadSuccess={onSuccess}
		>
			{children}
		</FileDropzone>
	);
}
`,
};

export const fileUploadTemplate: FileTemplate = {
	path: "components/FileUpload.tsx",
	content: `"use client";
import { useState } from "react";
import { type UploadedFile, usePresignedUpload } from "ultra-fileio/client";
import { FileDropzone } from "./FileUploadButton";

interface FileUploadProps {
	onUploadSuccess: () => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
	const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
	const { upload, uploading, progress, error } = usePresignedUpload();

	const handleFileSelect = async (file: File) => {
		await upload(file);
	};

	return (
		<FileDropzone
			onFileSelect={handleFileSelect}
			uploading={uploading}
			progress={progress}
			error={error}
			accept="image/*"
			onUploadSuccess={onUploadSuccess}
			maxSize={5 * 1024 * 1024}
			uploadedFiles={uploadedFiles}
			onFileRemove={(id: string) =>
				setUploadedFiles((files) => files.filter((f) => f.id !== id))
			}
		/>
	);
}
`,
};

// ============================================================================
// DRIZZLE TEMPLATES
// ============================================================================

export const drizzleRouteHandlerTemplate = (
	dbPath: string,
	filesSchemaPath: string,
	usersSchemaPath?: string,
): FileTemplate => {
	const usersImport = usersSchemaPath
		? `import { users } from "${usersSchemaPath}";\nimport { eq, desc, count, sql, and, like, gte, lte, inArray } from "drizzle-orm";`
		: `import { eq, desc, count, sql, and, like, gte, lte, inArray } from "drizzle-orm";`;

	const usersConfig = usersSchemaPath ? "users," : "users: undefined,";

	return {
		path: "app/api/fileuploads/[[...fileuploads]]/route.ts",
		content: `import { getUserId } from "@/lib/get-user";
import { db } from "${dbPath}";
import { files } from "${filesSchemaPath}";
${usersImport}
import {
	FlexibleFileService,
	DrizzleFileRepository,
	isR2Configured,
} from "ultra-fileio";
import { fileUploadsHandler } from "ultra-fileio/server";

// Create Drizzle repository
const fileRepository = new DrizzleFileRepository({
	db,
	files,
	drizzleFns: { eq, desc, count, sql, and, like, gte, lte, inArray },
	${usersConfig}
});

// Create file service (only if R2 is configured)
let fileService: FlexibleFileService | null = null;
if (isR2Configured) {
	fileService = new FlexibleFileService(fileRepository);
}

// Export all HTTP method handlers
export const { GET, POST, PUT, PATCH, DELETE } = fileUploadsHandler({
	fileService,
	fileRepository,
	getUserId,
	basePath: "/api/fileuploads",
});
`,
	};
};

export const drizzleSchemaTemplate: FileTemplate = {
	path: "lib/schema.ts",
	content: `import { pgTable, text, timestamp, varchar, integer, index } from "drizzle-orm/pg-core";

/**
 * Files table schema for ultra-fileio
 *
 * This schema is designed to work with ultra-fileio's DrizzleFileRepository.
 * You can customize it based on your needs, but make sure to keep the required fields.
 */
export const files = pgTable("files", {
	id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
	r2Key: text("r2_key").notNull().unique(),
	originalFilename: varchar("original_filename", { length: 512 }).notNull(),
	fileSize: integer("file_size").notNull(),
	publicUrl: text("public_url").notNull(),
	uploadedBy: text("uploaded_by").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
	r2KeyIdx: index("files_r2_key_idx").on(table.r2Key),
	uploadedByIdx: index("files_uploaded_by_idx").on(table.uploadedBy),
	createdAtIdx: index("files_created_at_idx").on(table.createdAt),
}));

// Example users table (optional)
// Uncomment this if you want to track uploaders with a users table
/*
export const users = pgTable("users", {
	id: text("id").primaryKey(),
	name: text("name"),
	email: text("email").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
*/
`,
};

export const drizzleDbTemplate: FileTemplate = {
	path: "lib/db.ts",
	content: `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle database client
 *
 * This uses postgres-js as the driver. You can use other drivers like:
 * - node-postgres (pg)
 * - neon
 * - vercel-postgres
 *
 * See: https://orm.drizzle.team/docs/get-started-postgresql
 */

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
	throw new Error("DATABASE_URL environment variable is required");
}

// Disable prefetch for serverless environments
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
`,
};

export const drizzleEnvTemplate = `
# Cloudflare R2 / S3 Configuration
S3_ACCOUNT_ID="your-account-id"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"
S3_PUBLIC_URL="https://your-bucket.r2.dev"
S3_REGION="auto"

# Database (PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
`;
