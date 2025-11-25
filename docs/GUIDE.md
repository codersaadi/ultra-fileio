# Meta Uploads - Complete Guide

**A production-ready file upload library for Next.js with ORM-agnostic architecture**

## Overview

Meta Uploads is an enterprise-grade file upload service that works seamlessly with Next.js App Router, Prisma, Drizzle, and Cloudflare R2/S3 storage. It provides a clean, type-safe API for handling file uploads with best practices built-in.

### Key Features

- ✅ **Next.js App Router** - Full support with route handlers
- ✅ **ORM Agnostic** - Works with Prisma, Drizzle, or any ORM via repository pattern
- ✅ **Cloud Storage** - Cloudflare R2 / AWS S3 compatible
- ✅ **Type Safe** - Full TypeScript + Zod validation
- ✅ **Lifecycle Hooks** - Before/after hooks for logging, auditing
- ✅ **Presigned URLs** - Direct client-to-storage uploads
- ✅ **Image Optimization** - Automatic compression and thumbnails
- ✅ **Production Ready** - Error handling, bulk operations

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Next.js App Router Integration](#nextjs-app-router-integration)
5. [ORM Setup (Prisma & Drizzle)](#orm-setup)
6. [File Upload Methods](#file-upload-methods)
7. [API Reference](#api-reference)
8. [Best Practices](#best-practices)
9. [Examples](#examples)

---

## Installation

```bash
npm install meta-uploads
# or
pnpm add meta-uploads
# or
yarn add meta-uploads
```

### Required Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner sharp zod
```

---

## Quick Start

### 1. Environment Variables

Create a `.env` file with your R2/S3 credentials:

```bash
# Cloudflare R2 Configuration
S3_ACCOUNT_ID="your-account-id"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"
S3_PUBLIC_URL="https://your-bucket.r2.dev"
S3_REGION="auto"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

### 2. Initialize File Service

```typescript
// lib/file-service.ts
import { FlexibleFileService, getDefaultFileServiceConfig } from 'meta-uploads';
import { PrismaFileRepository } from 'meta-uploads/repositories/adapters/prisma';
import { prisma } from './prisma';

// Create repository (Prisma example)
const repository = new PrismaFileRepository(prisma, {
  beforeCreate: async (data) => {
    console.log('Creating file:', data);
  },
  afterCreate: async (result) => {
    console.log('File created:', result.id);
  },
});

// Create file service
export const fileService = new FlexibleFileService(
  repository,
  getDefaultFileServiceConfig()
);
```

### 3. Create Upload Route

```typescript
// app/api/upload/route.ts
import { createFileUploadRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';

const { POST } = createFileUploadRouteHandler({
  fileService,
  getUserId: async () => {
    // TODO: Replace with real auth
    return 'user-123';
  },
});

export { POST };
```

### 4. Upload Files from Client

```typescript
// components/FileUploader.tsx
'use client';

async function handleUpload(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  console.log('Uploaded:', data.file);
}
```

---

## Configuration

### File Service Config

```typescript
import { FlexibleFileService, FileServiceConfig } from 'meta-uploads';

const config: FileServiceConfig = {
  r2Config: {
    accountId: process.env.S3_ACCOUNT_ID!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    bucketName: process.env.S3_BUCKET_NAME!,
    publicUrl: process.env.S3_PUBLIC_URL, // Optional
    region: process.env.S3_REGION || 'auto',
  },
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

const fileService = new FlexibleFileService(repository, config);
```

### Storage Service Config

For advanced use cases, you can access the R2 storage service directly:

```typescript
import { createR2StorageService } from 'meta-uploads';

const storageService = createR2StorageService({
  accountId: process.env.S3_ACCOUNT_ID!,
  accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  bucketName: process.env.S3_BUCKET_NAME!,
  publicUrl: process.env.S3_PUBLIC_URL,
  region: 'auto',
});
```

---

## Next.js App Router Integration

Meta Uploads provides ready-to-use route handlers for Next.js App Router.

### Upload Route Handler

```typescript
// app/api/upload/route.ts
import { createFileUploadRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';
import { auth } from '@/auth'; // Your auth solution

const { POST } = createFileUploadRouteHandler({
  fileService,
  getUserId: async () => {
    const session = await auth();
    return session?.user?.id ?? null;
  },
  onError: (error, req) => {
    console.error('Upload error:', error);
  },
});

export { POST };
```

### Presigned URL Route Handler

For direct client-to-storage uploads:

```typescript
// app/api/upload-url/route.ts
import { createPresignedUrlRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';

const { POST } = createPresignedUrlRouteHandler({
  fileService,
  getUserId: async () => {
    // Return authenticated user ID
    return 'user-123';
  },
});

export { POST };
```

### Delete Route Handler

```typescript
// app/api/files/[id]/route.ts
import { createFileDeleteRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';

const { DELETE } = createFileDeleteRouteHandler({
  fileService,
  getUserId: async () => 'user-123',
});

export { DELETE };
```

### Get File Route Handler

```typescript
// app/api/files/[id]/route.ts
import { createFileGetRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';

const { GET } = createFileGetRouteHandler({
  fileService,
  getUserId: async () => 'user-123',
});

export { GET };
```

---

## ORM Setup

Meta Uploads uses the Repository Pattern to work with any ORM.

### Prisma Setup

#### 1. Add Schema

```prisma
// prisma/schema.prisma
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

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  files     File[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

#### 2. Create Repository

```typescript
// lib/file-service.ts
import { PrismaFileRepository } from 'meta-uploads/repositories/adapters/prisma';
import { prisma } from './prisma';

const repository = new PrismaFileRepository(prisma, {
  // Optional lifecycle hooks
  beforeCreate: async (data) => {
    console.log('Creating file:', data.originalFilename);
  },
  afterCreate: async (file) => {
    console.log('File created:', file.id);
  },
  beforeDelete: async (params) => {
    console.log('Deleting file:', params);
  },
  afterDelete: async (params) => {
    console.log('File deleted');
  },
});
```

### Drizzle Setup

#### 1. Define Schema

```typescript
// db/schema.ts
import { pgTable, text, bigint, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  r2Key: text('r2_key').notNull().unique(),
  originalFilename: text('original_filename').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  publicUrl: text('public_url').notNull(),
  uploadedBy: uuid('uploaded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### 2. Create Repository

```typescript
// lib/file-service.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, count, sql, and, like, gte, lte, inArray } from 'drizzle-orm';
import { DrizzleFileRepository } from 'meta-uploads/repositories/adapters/drizzle';
import { files, users } from './db/schema';

const db = drizzle(pool);

const repository = new DrizzleFileRepository({
  db,
  files,
  users, // Optional
  drizzleFns: { eq, desc, count, sql, and, like, gte, lte, inArray },
  hooks: {
    beforeCreate: async (data) => {
      console.log('Creating file:', data);
    },
  },
});
```

---

## File Upload Methods

Meta Uploads supports multiple upload strategies.

### Method 1: Direct Server Upload

Upload files through your API route. Good for small files (<5MB).

#### Client Side

```typescript
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data.file;
}
```

#### Server Side

```typescript
// app/api/upload/route.ts
import { createFileUploadRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';

const { POST } = createFileUploadRouteHandler({
  fileService,
  getUserId: async () => 'user-123',
});

export { POST };
```

### Method 2: Presigned URL Upload

Best for large files. Upload directly to R2/S3 from the client.

#### Client Side

```typescript
async function uploadWithPresignedUrl(file: File) {
  // 1. Get presigned URL from your API
  const urlResponse = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      category: 'images',
    }),
  });

  const { uploadUrl, key, publicUrl } = await urlResponse.json();

  // 2. Upload directly to R2/S3
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  // 3. Save file record to database
  const saveResponse = await fetch('/api/save-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      r2Key: key,
      originalFilename: file.name,
      fileSize: file.size,
      publicUrl,
    }),
  });

  const data = await saveResponse.json();
  return data.file;
}
```

#### Server Side

```typescript
// app/api/upload-url/route.ts
import { createPresignedUrlRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';

const { POST } = createPresignedUrlRouteHandler({
  fileService,
  getUserId: async () => 'user-123',
});

export { POST };
```

```typescript
// app/api/save-file/route.ts
import { createSaveFileRecordRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';

const { POST } = createSaveFileRecordRouteHandler({
  fileService,
  getUserId: async () => 'user-123',
});

export { POST };
```

### Method 3: Service Layer Upload

Use the service directly for server-side uploads.

```typescript
import { fileService } from '@/lib/file-service';

async function serverSideUpload() {
  const userId = 'user-123';

  const file = {
    buffer: fileBuffer, // ArrayBuffer
    contentType: 'image/png',
    filename: 'example.png',
    size: 1024000,
  };

  const result = await fileService.uploadFile(userId, {
    file,
    category: 'profile-images',
  });

  console.log('Uploaded:', result);
}
```

---

## API Reference

### FlexibleFileService

#### Methods

##### `uploadFile(userId, request)`

Upload a single file.

```typescript
const result = await fileService.uploadFile('user-123', {
  file: {
    buffer: arrayBuffer,
    contentType: 'image/png',
    filename: 'photo.png',
    size: 1024000,
  },
  category: 'images', // Optional
});
```

##### `getFile(fileId)`

Get file metadata by ID.

```typescript
const file = await fileService.getFile('file-123');
```

##### `getFilesByUser(userId)`

Get all files for a user.

```typescript
const files = await fileService.getFilesByUser('user-123');
```

##### `deleteFile(fileId, userId?)`

Delete file from both database and storage.

```typescript
const result = await fileService.deleteFile('file-123', 'user-123');
console.log(result.r2Deleted); // true if R2 deletion succeeded
```

##### `generateUploadUrl(userId, filename, contentType, category?)`

Generate presigned URL for client upload.

```typescript
const { uploadUrl, key, publicUrl } = await fileService.generateUploadUrl(
  'user-123',
  'photo.png',
  'image/png',
  'profile'
);
```

##### `saveFileRecord(userId, data)`

Save file record after presigned upload.

```typescript
const file = await fileService.saveFileRecord('user-123', {
  r2Key: 'uploads/user-123/photo.png',
  originalFilename: 'photo.png',
  fileSize: 1024000,
  publicUrl: 'https://bucket.r2.dev/uploads/user-123/photo.png',
});
```

##### `getFileStats()`

Get storage statistics.

```typescript
const stats = await fileService.getFileStats();
console.log(stats.totalFiles); // Total file count
console.log(stats.totalSize); // Total size in bytes
console.log(stats.recentUploads); // Uploads in last 7 days
console.log(stats.averageFileSize); // Average file size
```

### R2StorageService

Direct storage operations (accessible via `fileService.r2Service`).

```typescript
// Upload to storage only (no database)
const result = await fileService.r2Service.uploadFile(file, options, 'image');

// Generate presigned URL
const { uploadUrl, key, publicUrl } =
  await fileService.r2Service.generatePresignedUploadUrl(options, filename, contentType);

// Delete from storage
await fileService.r2Service.deleteFile(key);

// List files with pagination
const { objects, isTruncated, nextContinuationToken } =
  await fileService.r2Service.listFiles('prefix/', 100);

// Get file metadata
const metadata = await fileService.r2Service.getFileMetadata(key);

// Copy file
await fileService.r2Service.copyFile(sourceKey, destKey);

// Clean up expired files
const deletedCount = await fileService.r2Service.cleanupExpiredFiles();
```

---

## Best Practices

### 1. Authentication

Always authenticate users before allowing uploads:

```typescript
import { auth } from '@/auth';

const { POST } = createFileUploadRouteHandler({
  fileService,
  getUserId: async (req) => {
    const session = await auth();
    if (!session?.user) return null;
    return session.user.id;
  },
});
```

### 2. File Validation

Validate file types and sizes on both client and server:

```typescript
// Client validation
function validateFile(file: File) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    throw new Error('File too large');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
}
```

### 3. Error Handling

Use proper error handling with StorageError:

```typescript
import { StorageError } from 'meta-uploads';

try {
  await fileService.uploadFile(userId, { file });
} catch (error) {
  if (error instanceof StorageError) {
    console.error(`[${error.code}] ${error.message}`);
    console.error(error.metadata);
  }
}
```

### 4. Lifecycle Hooks

Use hooks for logging, auditing, and notifications:

```typescript
const repository = new PrismaFileRepository(prisma, {
  beforeCreate: async (data) => {
    // Log upload attempt
    await auditLog.create({
      action: 'FILE_UPLOAD_START',
      userId: data.uploadedBy,
      metadata: { filename: data.originalFilename },
    });
  },
  afterCreate: async (file) => {
    // Send notification
    await notifyUser(file.uploadedBy, `File ${file.originalFilename} uploaded`);
  },
  beforeDelete: async ({ id }) => {
    // Check permissions
    const file = await prisma.file.findUnique({ where: { id } });
    // ... additional checks
  },
});
```

### 5. Categories for Organization

Use categories to organize files:

```typescript
await fileService.uploadFile(userId, {
  file,
  category: 'profile-images', // Creates path: profile-images/user-123/...
});

await fileService.uploadFile(userId, {
  file,
  category: 'documents', // Creates path: documents/user-123/...
});
```

### 6. Environment-Specific Config

Use different configs for dev/staging/production:

```typescript
const config = {
  r2Config: {
    accountId: process.env.S3_ACCOUNT_ID!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    bucketName:
      process.env.NODE_ENV === 'production'
        ? process.env.S3_BUCKET_NAME!
        : process.env.S3_BUCKET_NAME_DEV!,
    publicUrl: process.env.S3_PUBLIC_URL,
  },
  maxFileSize:
    process.env.NODE_ENV === 'production'
      ? 10 * 1024 * 1024 // 10MB in production
      : 50 * 1024 * 1024, // 50MB in development
};
```

### 7. Cleanup Jobs

Run periodic cleanup for expired files:

```typescript
// cron job or scheduled task
async function cleanupExpiredFiles() {
  const deletedCount = await fileService.r2Service.cleanupExpiredFiles();
  console.log(`Cleaned up ${deletedCount} expired files`);
}
```

---

## Examples

### Complete Upload Component

```typescript
'use client';

import { useState } from 'react';

export function FileUploader() {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setFiles((prev) => [...prev, data.file]);
      alert('Upload successful!');
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Delete failed');

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      alert('File deleted!');
    } catch (error) {
      alert('Delete failed: ' + error.message);
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        accept="image/*"
      />

      <div>
        {files.map((file) => (
          <div key={file.id}>
            <img src={file.publicUrl} alt={file.originalFilename} />
            <button onClick={() => handleDelete(file.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Drag-and-Drop Upload

```typescript
'use client';

import { useState } from 'react';

export function DragDropUploader() {
  const [dragging, setDragging] = useState(false);

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    console.log('Uploaded:', data.file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={dragging ? 'border-blue-500' : 'border-gray-300'}
    >
      Drop files here
    </div>
  );
}
```

### Batch Upload

```typescript
async function uploadMultipleFiles(files: File[]) {
  const uploads = files.map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    return res.json();
  });

  const results = await Promise.all(uploads);
  console.log('All uploads complete:', results);
}
```

---

## Troubleshooting

### Issue: "Missing required R2 environment variables"

Make sure all R2 environment variables are set in your `.env` file:

```bash
S3_ACCOUNT_ID="..."
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="..."
```

### Issue: "File validation failed"

Check that your file meets the requirements:
- Images only (by default)
- Under max file size (10MB default)
- Valid content type

### Issue: "Database error while creating file"

Ensure your database schema matches the repository requirements:
- `id` field (UUID/CUID)
- `r2Key` field (unique)
- `originalFilename`, `fileSize`, `publicUrl`, `uploadedBy`, `createdAt` fields

### Issue: Upload succeeds but file not accessible

Check your R2 bucket's public access settings:
1. Enable public access in R2 dashboard
2. Set custom domain (optional)
3. Use `S3_PUBLIC_URL` env variable

---

## Support

For issues and questions:
- GitHub Issues: [github.com/your-repo/meta-uploads/issues](https://github.com)
- Documentation: See example app in `examples/nextjs-approuter`

---

## License

MIT License - see LICENSE file for details.
