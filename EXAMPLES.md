# Meta-Uploads Examples

## Quick Start Guide

Meta-Uploads provides a clear separation between server and client code, making it easy to integrate secure file uploads into your Next.js application.

### Installation

```bash
npm install meta-uploads
# or
pnpm add meta-uploads
# or
yarn add meta-uploads
```

---

## Setup

### 1. Configure Environment Variables

Create a `.env.local` file:

```bash
S3_ACCOUNT_ID=your-cloudflare-account-id
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-bucket-name
S3_PUBLIC_URL=https://your-custom-domain.com  # Optional
S3_REGION=auto  # or your AWS region
```

### 2. Initialize File Service (Server-Side)

Create `lib/file-service.ts`:

```typescript
import {
  createFlexibleFileService,
  getDefaultFileServiceConfig,
  PrismaFileRepository  // or DrizzleFileRepository
} from 'meta-uploads/server';
import { prisma } from './prisma';  // Your Prisma client

// Initialize repository (choose Prisma or Drizzle)
const repository = new PrismaFileRepository(prisma);

// Create file service with default config
export const fileService = createFlexibleFileService(
  repository,
  getDefaultFileServiceConfig()
);
```

---

## Next.js App Router (Recommended)

### Direct Upload Example

#### 1. Create Upload API Route

`app/api/upload/route.ts`:

```typescript
import { createFileUploadRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';
import { auth } from '@/auth';  // Your auth solution

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

#### 2. Create Client Component

`app/components/FileUploader.tsx`:

```tsx
'use client';

import { FileUploadButton } from 'meta-uploads/client';

export function FileUploader() {
  return (
    <FileUploadButton
      endpoint="/api/upload"
      category="avatars"
      accept="image/*"
      maxSize={5 * 1024 * 1024}  // 5MB
      onSuccess={(file) => {
        console.log('Uploaded:', file);
        // Update your UI or state
      }}
      onError={(error) => {
        console.error('Upload error:', error);
      }}
      className="upload-button"
    >
      Upload Avatar
    </FileUploadButton>
  );
}
```

### Presigned URL Upload (More Secure)

#### 1. Create Presigned URL API Route

`app/api/upload-url/route.ts`:

```typescript
import { createPresignedUrlRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';
import { auth } from '@/auth';

const { POST } = createPresignedUrlRouteHandler({
  fileService,
  getUserId: async () => {
    const session = await auth();
    return session?.user?.id ?? null;
  },
});

export { POST };
```

#### 2. Use Presigned Upload Hook

`app/components/SecureUploader.tsx`:

```tsx
'use client';

import { usePresignedUpload } from 'meta-uploads/client';

export function SecureUploader() {
  const { upload, uploading, progress, error } = usePresignedUpload({
    getPresignedUrlEndpoint: '/api/upload-url',
    category: 'documents',
    onSuccess: (file) => {
      console.log('Uploaded:', file);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await upload(file);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && progress && (
        <div>Uploading: {progress.percentage}%</div>
      )}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### Drag-and-Drop Upload

`app/components/Dropzone.tsx`:

```tsx
'use client';

import { FileUploadDropzone } from 'meta-uploads/client';

export function Dropzone() {
  return (
    <FileUploadDropzone
      endpoint="/api/upload"
      category="documents"
      accept="image/*,.pdf"
      maxSize={10 * 1024 * 1024}
      onSuccess={(file) => {
        console.log('Uploaded:', file);
      }}
    >
      <div className="dropzone">
        <p>Drag and drop files here, or click to select</p>
      </div>
    </FileUploadDropzone>
  );
}
```

### File Management Routes

#### Get File Info

`app/api/files/[id]/route.ts`:

```typescript
import { createFileGetRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';
import { auth } from '@/auth';

const { GET } = createFileGetRouteHandler({
  fileService,
  getUserId: async () => {
    const session = await auth();
    return session?.user?.id ?? null;
  },
});

export { GET };
```

#### Delete File

`app/api/files/[id]/route.ts`:

```typescript
import {
  createFileGetRouteHandler,
  createFileDeleteRouteHandler
} from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';
import { auth } from '@/auth';

const { GET } = createFileGetRouteHandler({
  fileService,
  getUserId: async () => {
    const session = await auth();
    return session?.user?.id ?? null;
  },
});

const { DELETE } = createFileDeleteRouteHandler({
  fileService,
  getUserId: async () => {
    const session = await auth();
    return session?.user?.id ?? null;
  },
});

export { GET, DELETE };
```

---

## Next.js Pages Router

### Direct Upload Example

#### 1. Create Upload API Route

`pages/api/upload.ts`:

```typescript
import { createFileUploadApiHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

export const config = {
  api: {
    bodyParser: false,  // Important for file uploads
  },
};

export default createFileUploadApiHandler({
  fileService,
  getUserId: async (req) => {
    const session = await getServerSession(req, undefined, authOptions);
    return session?.user?.id ?? null;
  },
  onError: (error, req, res) => {
    console.error('Upload error:', error);
  },
});
```

#### 2. Create Client Component

`components/FileUploader.tsx`:

```tsx
import { FileUploadButton } from 'meta-uploads/client';

export function FileUploader() {
  return (
    <FileUploadButton
      endpoint="/api/upload"
      category="avatars"
      accept="image/*"
      maxSize={5 * 1024 * 1024}
      onSuccess={(file) => {
        console.log('Uploaded:', file);
      }}
    >
      Upload Avatar
    </FileUploadButton>
  );
}
```

### Presigned URL Upload

#### 1. Create Presigned URL API Route

`pages/api/upload-url.ts`:

```typescript
import { createPresignedUrlApiHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

export default createPresignedUrlApiHandler({
  fileService,
  getUserId: async (req) => {
    const session = await getServerSession(req, undefined, authOptions);
    return session?.user?.id ?? null;
  },
});
```

#### 2. Use Hook

`components/SecureUploader.tsx`:

```tsx
import { usePresignedUpload } from 'meta-uploads/client';

export function SecureUploader() {
  const { upload, uploading, progress, error } = usePresignedUpload({
    getPresignedUrlEndpoint: '/api/upload-url',
    category: 'documents',
    onSuccess: (file) => {
      console.log('Uploaded:', file);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await upload(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={uploading} />
      {uploading && progress && <div>Uploading: {progress.percentage}%</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### File Deletion

`pages/api/files/[id].ts`:

```typescript
import { createFileDeleteApiHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default createFileDeleteApiHandler({
  fileService,
  getUserId: async (req) => {
    const session = await getServerSession(req, undefined, authOptions);
    return session?.user?.id ?? null;
  },
});
```

---

## Advanced Usage

### Custom Upload Hook

```tsx
'use client';

import { useFileUpload } from 'meta-uploads/client';
import { useState } from 'react';

export function CustomUploader() {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const { upload, uploading, progress, error, reset } = useFileUpload({
    endpoint: '/api/upload',
    category: 'gallery',
    onSuccess: (file) => {
      setUploadedFiles(prev => [...prev, file.url]);
    },
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.percentage}%`);
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await upload(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <progress value={progress?.percentage || 0} max={100} />}
      {error && (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}
      <div>
        {uploadedFiles.map((url, i) => (
          <img key={i} src={url} alt={`Upload ${i}`} />
        ))}
      </div>
    </div>
  );
}
```

### Multiple File Upload

```tsx
'use client';

import { useFileUpload } from 'meta-uploads/client';

export function MultiUploader() {
  const { upload, uploading } = useFileUpload({
    endpoint: '/api/upload',
    category: 'gallery',
  });

  const handleMultipleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    for (const file of files) {
      await upload(file);
    }
  };

  return (
    <input
      type="file"
      multiple
      onChange={handleMultipleFiles}
      disabled={uploading}
    />
  );
}
```

---

## Database Schema

### Prisma Schema

```prisma
model File {
  id               String   @id @default(cuid())
  r2Key            String   @unique
  originalFilename String
  fileSize         Int
  publicUrl        String
  uploadedBy       String
  uploadedAt       DateTime @default(now())

  @@index([uploadedBy])
  @@map("files")
}
```

### Drizzle Schema

```typescript
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const files = pgTable('files', {
  id: text('id').primaryKey(),
  r2Key: text('r2_key').notNull().unique(),
  originalFilename: text('original_filename').notNull(),
  fileSize: integer('file_size').notNull(),
  publicUrl: text('public_url').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});
```

---

## TypeScript Support

All components and hooks are fully typed:

```typescript
import type {
  UploadedFile,
  UploadProgress,
  FileUpload,
  UploadResult
} from 'meta-uploads/client';

import type {
  FlexibleFileService,
  FileRecord,
  StorageError
} from 'meta-uploads/server';
```

---

## Benefits

- **Clear Separation**: Server code in `meta-uploads/server`, client code in `meta-uploads/client`
- **Type Safe**: Full TypeScript support with proper types
- **Secure**: Authentication built-in, presigned URLs supported
- **Flexible**: Works with any auth solution (NextAuth, Clerk, Supabase, etc.)
- **ORM Agnostic**: Use Prisma, Drizzle, or any other ORM
- **Progress Tracking**: Real-time upload progress
- **Error Handling**: Comprehensive error handling
- **Framework Ready**: Works with both App Router and Pages Router
