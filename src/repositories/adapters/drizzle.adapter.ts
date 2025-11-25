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

/**
 * Drizzle function types
 * These are passed in by the user so we don't have a hard dependency on Drizzle
 */
export interface DrizzleFns {
	eq: any;
	desc: any;
	count: any;
	sql: any;
	and: any;
	like: any;
	gte: any;
	lte: any;
	inArray: any;
}
// ============================================================================
// DRIZZLE ADAPTER
// ============================================================================

/**
 * Drizzle ORM adapter for file repository
 * Implements the IFileRepository interface using Drizzle
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/node-postgres';
 * import { eq, desc, count, sql, and, like, gte, lte, inArray } from 'drizzle-orm';
 * import { files } from './db/schema';
 *
 * const repository = new DrizzleFileRepository({
 *   db: drizzle(pool),
 *   files: files,
 *   drizzleFns: { eq, desc, count, sql, and, like, gte, lte, inArray },
 *   users: users, // optional
 *   hooks: {} // optional
 * });
 * ```
 */
export class DrizzleFileRepository
	extends BaseFileRepository
	implements IFileRepository
{
	private db: any;
	private users: any;
	private drizzleFns: DrizzleFns;
	private filesTable: any;

	constructor(config: {
		db: any;
		files: any;
		drizzleFns: DrizzleFns;
		users?: any;
		hooks?: FileRepositoryHooks;
	}) {
		super(config.hooks || {});
		this.db = config.db;
		this.filesTable = config.files;
		this.drizzleFns = config.drizzleFns;
		this.users = config.users;
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
					const [file] = await this.db
						.insert(this.filesTable)
						.values(data)
						.returning();
					if (!file) {
						throw new StorageError({
							code: "INTERNAL_SERVER_ERROR",
							message: "Failed to create file record",
						});
					}
					return this.mapToFileRecord(file);
				} catch (error) {
					if (error instanceof StorageError) throw error;
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
					const [file] = await this.db
						.select()
						.from(this.filesTable)
						.where(this.drizzleFns.eq(this.filesTable.id, id));
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
					const [file] = await this.db
						.select()
						.from(this.filesTable)
						.where(this.drizzleFns.eq(this.filesTable.r2Key, r2Key));
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
					const [file] = await this.db
						.update(this.filesTable)
						.set(data)
						.where(this.drizzleFns.eq(this.filesTable.id, id))
						.returning();
					if (!file) {
						throw new StorageError({
							code: "NOT_FOUND",
							message: "File not found",
							metadata: { id },
						});
					}
					return this.mapToFileRecord(file);
				} catch (error) {
					if (error instanceof StorageError) throw error;
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
					await this.db
						.delete(this.filesTable)
						.where(this.drizzleFns.eq(this.filesTable.id, id));
				} catch (error) {
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
					const results = await this.db
						.select()
						.from(this.filesTable)
						.where(this.drizzleFns.eq(this.filesTable.uploadedBy, userId))
						.orderBy(this.drizzleFns.desc(this.filesTable.createdAt));
					return results.map(this.mapToFileRecord);
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

					// Build where conditions
					const conditions = [];

					if (search) {
						conditions.push(
							this.drizzleFns.like(
								this.filesTable.originalFilename,
								`%${search}%`,
							),
						);
					}

					if (uploaderId) {
						conditions.push(
							this.drizzleFns.eq(this.filesTable.uploadedBy, uploaderId),
						);
					}

					if (startDate) {
						conditions.push(
							this.drizzleFns.gte(this.filesTable.createdAt, startDate),
						);
					}

					if (endDate) {
						conditions.push(
							this.drizzleFns.lte(this.filesTable.createdAt, endDate),
						);
					}

					const whereClause =
						conditions.length > 0
							? this.drizzleFns.and(...conditions)
							: undefined;

					// Get data with joins (only if users table is available)
					let data;
					if (this.users) {
						data = await this.db
							.select({
								id: this.filesTable.id,
								r2Key: this.filesTable.r2Key,
								originalFilename: this.filesTable.originalFilename,
								fileSize: this.filesTable.fileSize,
								publicUrl: this.filesTable.publicUrl,
								uploadedBy: this.filesTable.uploadedBy,
								createdAt: this.filesTable.createdAt,
								uploaderName: this.users.name,
								uploaderEmail: this.users.email,
							})
							.from(this.filesTable)
							.leftJoin(
								this.users,
								this.drizzleFns.eq(this.filesTable.uploadedBy, this.users.id),
							)
							.where(whereClause)
							.orderBy(
								orderDir === "desc"
									? this.drizzleFns.desc(this.filesTable[orderBy])
									: this.filesTable[orderBy],
							)
							.limit(limit)
							.offset(offset);
					} else {
						// Fallback without user joins
						const filesData = await this.db
							.select()
							.from(this.filesTable)
							.where(whereClause)
							.orderBy(
								orderDir === "desc"
									? this.drizzleFns.desc(this.filesTable[orderBy])
									: this.filesTable[orderBy],
							)
							.limit(limit)
							.offset(offset);

						data = filesData.map((file: any) => ({
							...file,
							uploaderName: null,
							uploaderEmail: null,
						}));
					}

					// Get total count
					const totalResult = await this.db
						.select({ total: this.drizzleFns.count() })
						.from(this.filesTable)
						.where(whereClause);

					const total = totalResult[0]?.total || 0;

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

					const result = await this.db
						.delete(this.filesTable.files)
						.where(this.drizzleFns.inArray(this.filesTable.id, ids));

					return { deleted: result.rowCount || 0 };
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

					const results = await this.db
						.insert(this.filesTable)
						.values(fileData)
						.returning();

					return results.map(this.mapToFileRecord);
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

			const statsResult = await this.db
				.select({
					totalFiles: this.drizzleFns.count(),
					totalSize: this.drizzleFns
						.sql<number>`COALESCE(SUM(${this.filesTable.fileSize}), 0)`,
					averageFileSize: this.drizzleFns
						.sql<number>`COALESCE(AVG(${this.filesTable.fileSize}), 0)`,
				})
				.from(this.filesTable);

			const recentUploadsResult = await this.db
				.select({ recentUploads: this.drizzleFns.count() })
				.from(this.filesTable)
				.where(this.drizzleFns.gte(this.filesTable.createdAt, sevenDaysAgo));

			const stats = statsResult[0];
			const recentUploads = recentUploadsResult[0]?.recentUploads || 0;

			if (!stats) {
				return {
					totalFiles: 0,
					totalSize: 0,
					recentUploads: 0,
					averageFileSize: 0,
				};
			}

			return {
				totalFiles: stats.totalFiles,
				totalSize: Number(stats.totalSize),
				recentUploads,
				averageFileSize: Number(stats.averageFileSize),
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
			const [file] = await this.db
				.select({ id: this.filesTable.id })
				.from(this.filesTable)
				.where(this.drizzleFns.eq(this.filesTable.id, id))
				.limit(1);
			return !!file;
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

			const conditions = [];

			if (search) {
				conditions.push(
					this.drizzleFns.like(this.filesTable.originalFilename, `%${search}%`),
				);
			}

			if (uploaderId) {
				conditions.push(
					this.drizzleFns.eq(this.filesTable.uploadedBy, uploaderId),
				);
			}

			if (startDate) {
				conditions.push(
					this.drizzleFns.gte(this.filesTable.createdAt, startDate),
				);
			}

			if (endDate) {
				conditions.push(
					this.drizzleFns.lte(this.filesTable.createdAt, endDate),
				);
			}

			const whereClause =
				conditions.length > 0 ? this.drizzleFns.and(...conditions) : undefined;

			const result = await this.db
				.select({ total: this.drizzleFns.count() })
				.from(this.filesTable)
				.where(whereClause);

			return result[0]?.total || 0;
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
			fileSize: Number(file.fileSize),
			publicUrl: file.publicUrl,
			uploadedBy: file.uploadedBy,
			createdAt: new Date(file.createdAt),
		};
	}
}
