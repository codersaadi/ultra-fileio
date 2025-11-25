// ============================================================================
// FILE REPOSITORY INTERFACE - ORM AGNOSTIC
// ============================================================================

/**
 * Core file record structure - all ORMs must map to this
 */
export interface FileRecord {
  id: string;
  r2Key: string;
  originalFilename: string;
  fileSize: number;
  publicUrl: string;
  uploadedBy: string;
  createdAt: Date;
}

/**
 * Data required to create a new file record
 */
export interface FileInsert {
  r2Key: string;
  originalFilename: string;
  fileSize: number;
  publicUrl: string;
  uploadedBy: string;
}

/**
 * Filter options for querying files
 */
export interface FileQueryOptions {
  limit?: number;
  offset?: number;
  search?: string;
  uploaderId?: string;
  startDate?: Date;
  endDate?: Date;
  orderBy?: 'createdAt' | 'fileSize' | 'originalFilename';
  orderDir?: 'asc' | 'desc';
}

/**
 * Extended file record with user information
 */
export interface FileRecordWithUser extends FileRecord {
  uploaderName?: string | null;
  uploaderEmail?: string | null;
}

/**
 * File statistics
 */
export interface FileStats {
  totalFiles: number;
  totalSize: number;
  recentUploads: number;
  averageFileSize: number;
}

// ============================================================================
// HOOKS & INTERCEPTORS
// ============================================================================

/**
 * Context passed to hooks
 */
export interface HookContext<T = any> {
  operation: string;
  data?: T;
  result?: any;
  error?: Error;
  metadata?: Record<string, any>;
  startTime?: number;
}

/**
 * Hook function type
 */
export type HookFunction<T = any> = (context: HookContext<T>) => Promise<void> | void;

/**
 * Lifecycle hooks for file operations
 */
export interface FileRepositoryHooks {
  // Before operations
  beforeCreate?: HookFunction<FileInsert>;
  beforeRead?: HookFunction<{ id: string }>;
  beforeUpdate?: HookFunction<{ id: string; data: Partial<FileRecord> }>;
  beforeDelete?: HookFunction<{ id: string }>;
  beforeQuery?: HookFunction<FileQueryOptions>;

  // After operations
  afterCreate?: HookFunction<FileRecord>;
  afterRead?: HookFunction<FileRecord | null>;
  afterUpdate?: HookFunction<FileRecord>;
  afterDelete?: HookFunction<void>;
  afterQuery?: HookFunction<FileRecord[]>;

  // Error handling
  onError?: HookFunction<Error>;

  // Generic interceptor - runs on all operations
  intercept?: (context: HookContext) => Promise<HookContext>;
}

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

/**
 * Abstract file repository interface
 * All ORM adapters must implement this interface
 */
export interface IFileRepository {
  // Lifecycle hooks
  hooks?: FileRepositoryHooks;

  // CRUD operations
  createFile(data: FileInsert): Promise<FileRecord>;
  getFileById(id: string): Promise<FileRecord | null>;
  getFileByR2Key(r2Key: string): Promise<FileRecord | null>;
  updateFile(id: string, data: Partial<FileInsert>): Promise<FileRecord>;
  deleteFile(id: string): Promise<void>;

  // Query operations
  getFilesByUser(userId: string): Promise<FileRecord[]>;
  getAllFiles(options?: FileQueryOptions): Promise<{
    data: FileRecordWithUser[];
    total: number;
  }>;

  // Bulk operations
  bulkDeleteFiles(ids: string[]): Promise<{ deleted: number }>;
  bulkCreateFiles(files: FileInsert[]): Promise<FileRecord[]>;

  // Statistics
  getFileStats(): Promise<FileStats>;

  // Utility methods
  exists(id: string): Promise<boolean>;
  count(options?: FileQueryOptions): Promise<number>;
}

// ============================================================================
// REPOSITORY FACTORY INTERFACE
// ============================================================================

/**
 * Configuration for repository
 */
export interface RepositoryConfig {
  hooks?: FileRepositoryHooks;
  connectionString?: string;
  client?: any; // ORM-specific client
  options?: Record<string, any>;
}

/**
 * Factory for creating repository instances
 */
export interface IRepositoryFactory {
  createFileRepository(config: RepositoryConfig): IFileRepository;
}
