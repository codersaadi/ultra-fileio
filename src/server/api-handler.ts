import { FlexibleFileService } from '../file.service';
import { StorageError } from '../file.module';
import { parseFileFromRequest } from '../file.module';
type NextApiResponse = any
type NextApiRequest = any
// ============================================================================
// NEXT.JS API ROUTE HANDLER (Pages Router)
// ============================================================================

/**
 * Configuration interface for API handler
 */
export interface ApiHandlerConfig {
  fileService: FlexibleFileService;
  getUserId: (req: NextApiRequest) => Promise<string | null> | string | null;
  onError?: (error: Error, req: NextApiRequest, res: NextApiResponse) => void;
}

/**
 * Create a secure file upload API handler for Next.js Pages Router
 *
 * @example
 * ```ts
 * // pages/api/upload.ts
 * import { createFileUploadApiHandler } from 'meta-uploads/server';
 * import { fileService } from '@/lib/file-service';
 * import { getServerSession } from 'next-auth';
 *
 * export const config = {
 *   api: {
 *     bodyParser: false,
 *   },
 * };
 *
 * export default createFileUploadApiHandler({
 *   fileService,
 *   getUserId: async (req) => {
 *     const session = await getServerSession(req, res, authOptions);
 *     return session?.user?.id ?? null;
 *   },
 * });
 * ```
 */
export function createFileUploadApiHandler(config: ApiHandlerConfig) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Only allow POST NextApirequests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Authenticate user
      const userId = await config.getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Parse files from NextApirequest
      const files = await parseFileFromRequest(req as unknown as NextApiRequest);

      if (files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      // Get category from query params or body
      const category = ((req as any).query.category as string) || 'general';

      // Upload file
      const file = files[0];
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      const result = await config.fileService.uploadFile(userId, {
        file,
        category,
      });

      return res.status(200).json({
        success: true,
        file: result,
      });
    } catch (error) {
      // Handle custom errors
      if (error instanceof StorageError) {
        config.onError?.(error, req, res);
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
          metadata: error.metadata,
        });
      }

      // Handle unknown errors
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      config.onError?.(error as Error, req, res);
      return res.status(500).json({ error: errorMessage });
    }
  };
}

/**
 * Create a presigned URL API handler for client-side uploads
 *
 * @example
 * ```ts
 * // pages/api/upload-url.ts
 * import { createPresignedUrlApiHandler } from 'meta-uploads/server';
 *
 * export default createPresignedUrlApiHandler({
 *   fileService,
 *   getUserId: async (req) => {
 *     const session = await getServerSession(req, res, authOptions);
 *     return session?.user?.id ?? null;
 *   },
 * });
 * ```
 */
export function createPresignedUrlApiHandler(config: ApiHandlerConfig) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const userId = await config.getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { filename, contentType, category } = req.body as any;

      if (!filename || !contentType) {
        return res.status(400).json({
          error: 'Filename and contentType are required'
        });
      }

      const result = await config.fileService.generateUploadUrl(
        userId,
        filename,
        contentType,
        category
      );

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof StorageError) {
        config.onError?.(error, req, res);
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to generate upload URL';
      config.onError?.(error as Error, req, res);
      return res.status(500).json({ error: errorMessage });
    }
  };
}

/**
 * Create a save file record API handler for presigned uploads
 *
 * @example
 * ```ts
 * // pages/api/save-file.ts
 * import { createSaveFileRecordApiHandler } from 'meta-uploads/server';
 *
 * export default createSaveFileRecordApiHandler({
 *   fileService,
 *   getUserId: async (req) => {
 *     const session = await getServerSession(req, res, authOptions);
 *     return session?.user?.id ?? null;
 *   },
 * });
 * ```
 */
export function createSaveFileRecordApiHandler(config: ApiHandlerConfig) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const userId = await config.getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { r2Key, originalFilename, fileSize, publicUrl } = req.body as any;

      if (!r2Key || !originalFilename || !fileSize || !publicUrl) {
        return res.status(400).json({
          error: 'Missing required fields: r2Key, originalFilename, fileSize, publicUrl'
        });
      }

      const fileRecord = await config.fileService.saveFileRecord(userId, {
        r2Key,
        originalFilename,
        fileSize,
        publicUrl,
      });

      return res.status(200).json({
        success: true,
        file: fileRecord,
      });
    } catch (error) {
      if (error instanceof StorageError) {
        config.onError?.(error, req, res);
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to save file record';
      config.onError?.(error as Error, req, res);
      return res.status(500).json({ error: errorMessage });
    }
  };
}

/**
 * Create a file deletion API handler
 *
 * @example
 * ```ts
 * // pages/api/files/[id].ts
 * import { createFileDeleteApiHandler } from 'meta-uploads/server';
 *
 * export default createFileDeleteApiHandler({
 *   fileService,
 *   getUserId: async (req) => {
 *     const session = await getServerSession(req, res, authOptions);
 *     return session?.user?.id ?? null;
 *   },
 * });
 * ```
 */
export function createFileDeleteApiHandler(config: ApiHandlerConfig) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const userId = await config.getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const fileId = (req as any).query.id as string;
      if (!fileId) {
        return res.status(400).json({ error: 'File ID is required' });
      }

      const result = await config.fileService.deleteFile(fileId, userId);

      return res.status(200).json({
        success: true,
        file: result.file,
        r2Deleted: result.r2Deleted,
      });
    } catch (error) {
      if (error instanceof StorageError) {
        config.onError?.(error, req, res);
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
      config.onError?.(error as Error, req, res);
      return res.status(500).json({ error: errorMessage });
    }
  };
}
