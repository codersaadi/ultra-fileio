import { z } from 'zod';

// ============================================================================
// ZOD SCHEMAS & TYPES
// ============================================================================

// File validation schemas
export const FileUploadSchema = z.object({
  buffer: z.instanceof(ArrayBuffer).or(z.instanceof(Uint8Array)),
  contentType: z.string().min(1),
  filename: z.string().min(1),
  size: z.number().positive(),
});

export const ImageUploadSchema = FileUploadSchema.extend({
  contentType: z.string().regex(/^image\/(jpeg|jpg|png|webp|gif)$/i, {
    message: 'Only JPEG, PNG, WebP, and GIF images are allowed',
  }),
  size: z.number().max(10 * 1024 * 1024, 'Image must be less than 10MB'),
});

export const VideoUploadSchema = FileUploadSchema.extend({
  contentType: z.string().regex(/^video\/(mp4|webm|ogg|mov)$/i, {
    message: 'Only MP4, WebM, OGG, and MOV videos are allowed',
  }),
  size: z.number().max(100 * 1024 * 1024, 'Video must be less than 100MB'),
});

export const DocumentUploadSchema = FileUploadSchema.extend({
  contentType: z
    .string()
    .regex(
      /^(application\/pdf|text\/plain|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i,
      {
        message: 'Only PDF, TXT, DOC, and DOCX documents are allowed',
      }
    ),
  size: z.number().max(25 * 1024 * 1024, 'Document must be less than 25MB'),
});

// Storage configuration schema
export const R2ConfigSchema = z.object({
  accountId: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  bucketName: z.string().min(1),
  publicUrl: z.url().optional(),
  region: z.string().optional().default('auto'),
});

// Upload options schema
export const UploadOptionsSchema = z.object({
  userId: z.string().min(1),
  category: z.string(),
  isPublic: z.boolean().default(true),
  generateThumbnail: z.boolean().default(false),
  optimizeImage: z.boolean().default(true),
  customMetadata: z.record(z.string(), z.string()).optional(),
  expiresIn: z.number().positive().optional(), // seconds
  tags: z.array(z.string()).optional(),
});

// Response schemas
export const UploadResultSchema = z.object({
  key: z.string(),
  url: z.string(),
  publicUrl: z.string().optional(),
  size: z.number(),
  contentType: z.string(),
  etag: z.string(),
  thumbnailUrl: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  uploadedAt: z.date(),
});

export const DeleteResultSchema = z.object({
  key: z.string(),
  deleted: z.boolean(),
  message: z.string().optional(),
});

export const ListResultSchema = z.object({
  objects: z.array(
    z.object({
      key: z.string(),
      size: z.number(),
      lastModified: z.date(),
      etag: z.string(),
      url: z.string(),
    })
  ),
  isTruncated: z.boolean(),
  nextContinuationToken: z.string().optional(),
});

// Type exports
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type ImageUpload = z.infer<typeof ImageUploadSchema>;
export type VideoUpload = z.infer<typeof VideoUploadSchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type R2Config = z.infer<typeof R2ConfigSchema>;
export type UploadOptions = z.infer<typeof UploadOptionsSchema>;
export type UploadResult = z.infer<typeof UploadResultSchema>;
export type DeleteResult = z.infer<typeof DeleteResultSchema>;
export type ListResult = z.infer<typeof ListResultSchema>;
