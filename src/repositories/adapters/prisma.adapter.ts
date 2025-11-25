import { StorageError } from "../../file.module";
import { BaseFileRepository } from "../base.repository";
import type {
	FileInsert,
	FileQueryOptions,
	FileRecord,
	FileRecordWithUser,
	FileRepositoryHooks,
	FileStats,
	IFileRepository,
} from "../file.repository.interface";

// ============================================================================
// PRISMA ADAPTER
// ============================================================================

export class PrismaFileRepository
	extends BaseFileRepository
	implements IFileRepository
{
	private prisma: any;

	constructor(prisma: any, hooks: FileRepositoryHooks = {}) {
		super(hooks);
		this.prisma = prisma;
	}

	// ========================================================================
	// CRUD OPERATIONS
	// ========================================================================

	async createFile(data: FileInsert): Promise<FileRecord> {
		return this.wrapWithHooks(
			"createFile",
			this.hooks.beforeCreate,
			this.hooks.afterCreate,
			async () => {
				try {
					const file = await this.prisma.file.create({
						data: {
							r2Key: data.r2Key,
							originalFilename: data.originalFilename,
							fileSize: data.fileSize,
							publicUrl: data.publicUrl,
							uploadedBy: data.uploadedBy,
						},
					});
					return this.mapToFileRecord(file);
				} catch (error) {
					throw new StorageError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Database error while creating file",
						cause: error,
					});
				}
			},
			data,
		);
	}

	async getFileById(id: string): Promise<FileRecord | null> {
		return this.wrapWithHooks(
			"getFileById",
			this.hooks.beforeRead,
			this.hooks.afterRead,
			async () => {
				try {
					const file = await this.prisma.file.findUnique({
						where: { id },
					});
					return file ? this.mapToFileRecord(file) : null;
				} catch (error) {
					throw new StorageError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Database error while fetching file",
						cause: error,
					});
				}
			},
			{ id },
		);
	}

	async getFileByR2Key(r2Key: string): Promise<FileRecord | null> {
		return this.wrapWithHooks(
			"getFileByR2Key",
			this.hooks.beforeRead,
			this.hooks.afterRead,
			async () => {
				try {
					const file = await this.prisma.file.findUnique({
						where: { r2Key },
					});
					return file ? this.mapToFileRecord(file) : null;
				} catch (error) {
					throw new StorageError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Database error while fetching file by R2 key",
						cause: error,
					});
				}
			},
			{ r2Key },
		);
	}

	async updateFile(id: string, data: Partial<FileInsert>): Promise<FileRecord> {
		return this.wrapWithHooks(
			"updateFile",
			this.hooks.beforeUpdate,
			this.hooks.afterUpdate,
			async () => {
				try {
					const file = await this.prisma.file.update({
						where: { id },
						data,
					});
					return this.mapToFileRecord(file);
				} catch (error) {
					if ((error as any).code === "P2025") {
						throw new StorageError({
							code: "NOT_FOUND",
							message: "File not found",
							metadata: { id },
						});
					}
					throw new StorageError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Database error while updating file",
						cause: error,
					});
				}
			},
			{ id, data },
		);
	}

	async deleteFile(id: string): Promise<void> {
		return this.wrapWithHooks(
			"deleteFile",
			this.hooks.beforeDelete,
			this.hooks.afterDelete,
			async () => {
				try {
					await this.prisma.file.delete({
						where: { id },
					});
				} catch (error) {
					if ((error as any).code === "P2025") {
						throw new StorageError({
							code: "NOT_FOUND",
							message: "File not found",
							metadata: { id },
						});
					}
					throw new StorageError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Database error while deleting file",
						cause: error,
					});
				}
			},
			{ id },
		);
	}

	// ========================================================================
	// QUERY OPERATIONS
	// ========================================================================

	async getFilesByUser(userId: string): Promise<FileRecord[]> {
		return this.wrapWithHooks(
			"getFilesByUser",
			this.hooks.beforeQuery,
			this.hooks.afterQuery,
			async () => {
				try {
					const files = await this.prisma.file.findMany({
						where: { uploadedBy: userId },
						orderBy: { createdAt: "desc" },
					});
					return files.map(this.mapToFileRecord);
				} catch (error) {
					throw new StorageError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Database error while fetching user files",
						cause: error,
					});
				}
			},
			{ userId },
		);
	}

	async getAllFiles(
		options: FileQueryOptions = {},
	): Promise<{ data: FileRecordWithUser[]; total: number }> {
		return this.wrapWithHooks(
			"getAllFiles",
			this.hooks.beforeQuery,
			this.hooks.afterQuery,
			async () => {
				try {
					const {
						limit = 50,
						offset = 0,
						search,
						uploaderId,
						startDate,
						endDate,
						orderBy = "createdAt",
						orderDir = "desc",
					} = options;

					// Build where clause
					const where: any = {};

					if (search) {
						where.originalFilename = {
							contains: search,
							mode: "insensitive",
						};
					}

					if (uploaderId) {
						where.uploadedBy = uploaderId;
					}

					if (startDate || endDate) {
						where.createdAt = {};
						if (startDate) where.createdAt.gte = startDate;
						if (endDate) where.createdAt.lte = endDate;
					}

					// Execute queries in parallel
					const [files, total] = await Promise.all([
						this.prisma.file.findMany({
							where,
							include: {
								uploader: {
									select: {
										name: true,
										email: true,
									},
								},
							},
							orderBy: { [orderBy]: orderDir },
							take: limit,
							skip: offset,
						}),
						this.prisma.file.count({ where }),
					]);

					const data = files.map((file: any) => ({
						...this.mapToFileRecord(file),
						uploaderName: file.uploader?.name,
						uploaderEmail: file.uploader?.email,
					}));

					return { data, total };
				} catch (error) {
					throw new StorageError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Database error while fetching files",
						cause: error,
					});
				}
			},
			options,
		);
	}

	// ========================================================================
	// BULK OPERATIONS
	// ========================================================================

	async bulkDeleteFiles(ids: string[]): Promise<{ deleted: number }> {
		return this.wrapWithHooks(
			"bulkDeleteFiles",
			this.hooks.beforeDelete,
			this.hooks.afterDelete,
			async () => {
				try {
					if (ids.length === 0) return { deleted: 0 };

					const result = await this.prisma.file.deleteMany({
						where: {
							id: { in: ids },
						},
					});

					return { deleted: result.count };
				} catch (error) {
					throw new StorageError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Database error while bulk deleting files",
						cause: error,
					});
				}
			},
			{ ids },
		);
	}

	async bulkCreateFiles(fileData: FileInsert[]): Promise<FileRecord[]> {
		return this.wrapWithHooks(
			"bulkCreateFiles",
			this.hooks.beforeCreate,
			this.hooks.afterCreate,
			async () => {
				try {
					if (fileData.length === 0) return [];

					// Prisma doesn't return created records in createMany
					// So we need to create them individually or use a transaction
					const files = await this.prisma.$transaction(
						fileData.map((data) => this.prisma.file.create({ data })),
					);

					return files.map(this.mapToFileRecord);
				} catch (error) {
					throw new StorageError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Database error while bulk creating files",
						cause: error,
					});
				}
			},
			{ files: fileData },
		);
	}

	// ========================================================================
	// STATISTICS
	// ========================================================================

	async getFileStats(): Promise<FileStats> {
		try {
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

			const [totalFiles, totalSizeResult, recentUploads, avgSizeResult] =
				await Promise.all([
					this.prisma.file.count(),
					this.prisma.file.aggregate({
						_sum: { fileSize: true },
					}),
					this.prisma.file.count({
						where: {
							createdAt: { gte: sevenDaysAgo },
						},
					}),
					this.prisma.file.aggregate({
						_avg: { fileSize: true },
					}),
				]);

			return {
				totalFiles,
				totalSize: totalSizeResult._sum.fileSize || 0,
				recentUploads,
				averageFileSize: avgSizeResult._avg.fileSize || 0,
			};
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Database error while fetching file stats",
				cause: error,
			});
		}
	}

	// ========================================================================
	// UTILITY METHODS
	// ========================================================================

	async exists(id: string): Promise<boolean> {
		try {
			const count = await this.prisma.file.count({
				where: { id },
			});
			return count > 0;
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Database error while checking file existence",
				cause: error,
			});
		}
	}

	async count(options: FileQueryOptions = {}): Promise<number> {
		try {
			const { search, uploaderId, startDate, endDate } = options;

			const where: any = {};

			if (search) {
				where.originalFilename = {
					contains: search,
					mode: "insensitive",
				};
			}

			if (uploaderId) {
				where.uploadedBy = uploaderId;
			}

			if (startDate || endDate) {
				where.createdAt = {};
				if (startDate) where.createdAt.gte = startDate;
				if (endDate) where.createdAt.lte = endDate;
			}

			return await this.prisma.file.count({ where });
		} catch (error) {
			throw new StorageError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Database error while counting files",
				cause: error,
			});
		}
	}

	// ========================================================================
	// HELPER METHODS
	// ========================================================================

	private mapToFileRecord(file: any): FileRecord {
		return {
			id: file.id,
			r2Key: file.r2Key,
			originalFilename: file.originalFilename,
			fileSize: file.fileSize,
			publicUrl: file.publicUrl,
			uploadedBy: file.uploadedBy,
			createdAt: new Date(file.createdAt),
		};
	}
}

// ============================================================================
// PRISMA SCHEMA EXAMPLE
// ============================================================================

/*
// Add this to your schema.prisma file:

model File {
  id               String   @id @default(uuid())
  r2Key            String   @unique @map("r2_key")
  originalFilename String   @map("original_filename") @db.VarChar(512)
  fileSize         BigInt   @map("file_size")
  publicUrl        String   @map("public_url")
  uploadedBy       String   @map("uploaded_by")
  createdAt        DateTime @default(now()) @map("created_at")

  uploader User @relation(fields: [uploadedBy], references: [id], onDelete: Cascade)

  @@index([r2Key])
  @@index([uploadedBy])
  @@index([createdAt])
  @@map("files")
}
*/
