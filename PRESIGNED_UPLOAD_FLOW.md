# Presigned URL Upload Flow

## Overview
Presigned URL uploads provide a more secure way to upload files by uploading directly to S3/R2 storage without passing through your server. This reduces server load and improves upload speeds.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRESIGNED UPLOAD FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│              │          │              │          │              │
│   Browser    │          │  Next.js API │          │   S3/R2      │
│   (Client)   │          │   (Server)   │          │   Storage    │
│              │          │              │          │              │
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       │                         │                         │
       │  STEP 1: Request        │                         │
       │  Presigned URL          │                         │
       ├────────────────────────>│                         │
       │                         │                         │
       │  POST /api/upload-url   │                         │
       │  {                      │                         │
       │    filename: "photo.jpg"│                         │
       │    contentType: "image" │                         │
       │    fileSize: 1024000    │                         │
       │    category: "avatars"  │                         │
       │  }                      │                         │
       │                         │                         │
       │                         │  STEP 2: Generate       │
       │                         │  Presigned URL          │
       │                         ├────────────────────────>│
       │                         │                         │
       │                         │  PutObjectCommand()     │
       │                         │  + expiration (3600s)   │
       │                         │                         │
       │                         │  Returns presigned URL  │
       │                         │<────────────────────────┤
       │                         │                         │
       │  STEP 3: Return URL     │                         │
       │  & Metadata             │                         │
       │<────────────────────────┤                         │
       │                         │                         │
       │  Response:              │                         │
       │  {                      │                         │
       │    uploadUrl: "https://"│                         │
       │    key: "avatars/xyz"   │                         │
       │    publicUrl: "https://"│                         │
       │  }                      │                         │
       │                         │                         │
       │                         │                         │
       │  STEP 4: Upload File    │                         │
       │  Directly to Storage    │                         │
       ├─────────────────────────────────────────────────>│
       │                         │                         │
       │  PUT [uploadUrl]        │                         │
       │  Content-Type: image/jpeg                         │
       │  Body: [binary file data]                         │
       │                         │                         │
       │  [Progress Events: 0% -> 100%]                    │
       │                         │                         │
       │  200 OK                 │                         │
       │<──────────────────────────────────────────────────┤
       │                         │                         │
       │                         │                         │
       │  STEP 5: Save File      │                         │
       │  Record to Database     │                         │
       ├────────────────────────>│                         │
       │                         │                         │
       │  POST /api/save-file    │                         │
       │  {                      │                         │
       │    r2Key: "avatars/xyz" │                         │
       │    originalFilename     │                         │
       │    fileSize             │                         │
       │    publicUrl            │                         │
       │  }                      │                         │
       │                         │                         │
       │                         │  STEP 6: Insert into DB │
       │                         │  ┌────────────────────┐ │
       │                         │  │   Database         │ │
       │                         │  │  ┌──────────────┐  │ │
       │                         ├─>│  │ File Record  │  │ │
       │                         │  │  └──────────────┘  │ │
       │                         │  └────────────────────┘ │
       │                         │                         │
       │  STEP 7: Return File    │                         │
       │  Metadata               │                         │
       │<────────────────────────┤                         │
       │                         │                         │
       │  Response:              │                         │
       │  {                      │                         │
       │    file: {              │                         │
       │      id: "file_123"     │                         │
       │      publicUrl          │                         │
       │      originalFilename   │                         │
       │      fileSize           │                         │
       │      uploadedAt         │                         │
       │    }                    │                         │
       │  }                      │                         │
       │                         │                         │
       │  ✅ Upload Complete!    │                         │
       │                         │                         │
```

---

## Detailed Step-by-Step Process

### **Step 1: Client Requests Presigned URL**
**Location:** `src/client/useFileUpload.tsx:332-343`

The client makes a POST request to your Next.js API to get a presigned URL:

```typescript
const presignedResponse = await fetch('/api/fileuploads/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: 'photo.jpg',
    contentType: 'image/jpeg',
    fileSize: 1024000,
    category: 'avatars',
  }),
});
```

---

### **Step 2: Server Generates Presigned URL**
**Location:** `src/server/file-handler.ts:107-141`

Your Next.js API handler processes the request:

```typescript
// 1. Authenticate user
const userId = await getUserId(request);

// 2. Generate presigned URL from S3/R2
const result = await fileService.generateUploadUrl(
  userId,
  filename,
  contentType,
  category
);

// 3. Return presigned URL to client
return {
  uploadUrl: "https://bucket.s3.region.amazonaws.com/key?signature=...",
  key: "avatars/user123_1234567890_photo.jpg",
  publicUrl: "https://cdn.example.com/avatars/user123_1234567890_photo.jpg"
};
```

**Key Points:**
- URL is signed with AWS credentials
- Has expiration time (default: 3600 seconds / 1 hour)
- Grants temporary write permission to specific S3 key
- No file passes through your server

---

### **Step 3: Client Receives Upload URL**
**Location:** `src/client/useFileUpload.tsx:345-351`

```typescript
const { uploadUrl, key, publicUrl } = await presignedResponse.json();
setProgress({ loaded: 0, total: file.size, percentage: 20 });
```

Client now has:
- ✅ `uploadUrl` - Presigned S3/R2 URL to upload to
- ✅ `key` - S3 object key (path in bucket)
- ✅ `publicUrl` - Public URL to access file after upload

---

### **Step 4: Upload Directly to S3/R2**
**Location:** `src/client/useFileUpload.tsx:354-405`

Client uploads file directly to S3/R2 using the presigned URL:

```typescript
const xhr = new XMLHttpRequest();

// Track upload progress
xhr.upload.addEventListener('progress', (e) => {
  const percentage = Math.round((e.loaded / e.total) * 100);
  setProgress({ loaded: e.loaded, total: e.total, percentage });
});

// Upload directly to S3/R2
xhr.open('PUT', uploadUrl);
xhr.setRequestHeader('Content-Type', file.type);
xhr.send(file); // Binary file data
```

**Key Benefits:**
- ⚡ Fast - No server bottleneck
- 📊 Real-time progress tracking
- 💰 Reduced server bandwidth costs
- 🔒 Secure - URL expires after 1 hour

---

### **Step 5: Save File Record to Database**
**Location:** `src/client/useFileUpload.tsx:407-427`

After successful upload to S3/R2, client saves metadata to your database:

```typescript
const saveResponse = await fetch('/api/fileuploads/save-file', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    r2Key: key,                    // S3 object key
    originalFilename: file.name,   // "photo.jpg"
    fileSize: file.size,           // 1024000
    publicUrl,                     // CDN URL
    category: 'avatars',
  }),
});
```

---

### **Step 6: Server Saves to Database**
**Location:** `src/server/file-handler.ts:146-169`

Your API handler creates a database record:

```typescript
const userId = await getUserId(request);

const file = await fileService.saveFileRecord(userId, {
  r2Key: "avatars/user123_1234567890_photo.jpg",
  originalFilename: "photo.jpg",
  fileSize: 1024000,
  publicUrl: "https://cdn.example.com/...",
});

// Database record created:
// {
//   id: "file_123",
//   r2Key: "avatars/user123_1234567890_photo.jpg",
//   originalFilename: "photo.jpg",
//   fileSize: 1024000,
//   publicUrl: "https://cdn.example.com/...",
//   uploadedBy: "user123",
//   uploadedAt: "2024-01-15T10:30:00Z"
// }
```

---

### **Step 7: Return Success to Client**
**Location:** `src/client/useFileUpload.tsx:428-442`

Client receives file metadata and triggers success callback:

```typescript
const { file: savedFile } = await saveResponse.json();

const uploadedFile = {
  id: savedFile.id,
  url: savedFile.publicUrl,
  filename: savedFile.originalFilename,
  size: savedFile.fileSize,
  contentType: file.type,
  uploadedAt: savedFile.uploadedAt,
};

setProgress({ loaded: file.size, total: file.size, percentage: 100 });
onSuccess?.(uploadedFile);
```

---

## Code Components Involved

### **Client Side**

1. **`usePresignedUpload()` Hook** - `src/client/useFileUpload.tsx:270-464`
   - Manages upload state (uploading, progress, error)
   - Validates file type and size
   - Coordinates 3-step upload process
   - Tracks progress (10% → 20% → 90% → 100%)

2. **React Components** - `src/client/FileUploadButton.tsx`
   - `<FileUploadButton />` - Click to upload
   - `<FileUploadDropzone />` - Drag & drop
   - `<FileDropzone />` - Custom dropzone

### **Server Side**

1. **`FileHandler` Class** - `src/server/file-handler.ts:27-273`
   - `handlePresignedUrl()` - Generate presigned URL (Step 2)
   - `handleSaveFile()` - Save file record (Step 6)

2. **`FlexibleFileService`** - `src/file.service.ts`
   - `generateUploadUrl()` - Creates presigned URL
   - `saveFileRecord()` - Inserts database record

3. **Route Handlers** - `src/server/nextjs-adapter.ts`
   - `createPresignedUrlRouteHandler()` - App Router
   - `createPresignedUrlApiHandler()` - Pages Router

---

## Security Features

### ✅ **Authentication Required**
```typescript
const userId = await getUserId(request);
if (!userId) {
  throw new Error('Unauthorized');
}
```

### ✅ **Time-Limited URLs**
- Presigned URLs expire after 1 hour (3600 seconds)
- Prevents unauthorized access after expiration

### ✅ **File Validation**
```typescript
// Client-side validation
const allowedTypes = ['image/*'];
const maxSize = 5 * 1024 * 1024; // 5MB

if (!isAllowed) {
  throw new Error('Invalid file type');
}
if (file.size > maxSize) {
  throw new Error('File too large');
}
```

### ✅ **Unique File Keys**
```typescript
const key = `${category}/${userId}_${timestamp}_${filename}`;
// Example: "avatars/user123_1234567890_photo.jpg"
```

Prevents file collisions and ties files to users.

---

## Advantages vs Direct Upload

| Feature | Direct Upload | Presigned Upload |
|---------|--------------|------------------|
| **Server Load** | ❌ High (file passes through) | ✅ Low (direct to S3) |
| **Upload Speed** | ❌ Limited by server | ✅ Fast (direct to S3) |
| **Scalability** | ❌ Server bottleneck | ✅ Highly scalable |
| **Bandwidth Cost** | ❌ Pay for server egress | ✅ Only S3 costs |
| **Progress Tracking** | ✅ Yes | ✅ Yes |
| **Authentication** | ✅ Yes | ✅ Yes |
| **File Processing** | ✅ Can process before upload | ❌ Process after upload |
| **Complexity** | ✅ Simple (1 step) | ⚠️ More complex (3 steps) |

---

## Example Usage

### **With React Hook**

```tsx
'use client';

import { usePresignedUpload } from 'meta-uploads/client';

export function SecureUploader() {
  const { upload, uploading, progress, error } = usePresignedUpload({
    getPresignedUrlEndpoint: '/api/fileuploads/upload-url',
    saveFileRecordEndpoint: '/api/fileuploads/save-file',
    category: 'avatars',
    maxFileSize: 5 * 1024 * 1024,
    allowedTypes: ['image/*'],
    onSuccess: (file) => {
      console.log('✅ Upload complete!', file);
      // Update UI, show success message, etc.
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
        accept="image/*"
      />

      {uploading && progress && (
        <div>
          <progress value={progress.percentage} max={100} />
          <span>{progress.percentage}%</span>
        </div>
      )}

      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
```

### **API Setup (App Router)**

```typescript
// app/api/fileuploads/upload-url/route.ts
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

```typescript
// app/api/fileuploads/save-file/route.ts
import { createSaveFileRouteHandler } from 'meta-uploads/server';
import { fileService } from '@/lib/file-service';
import { auth } from '@/auth';

const { POST } = createSaveFileRouteHandler({
  fileService,
  getUserId: async () => {
    const session = await auth();
    return session?.user?.id ?? null;
  },
});

export { POST };
```

---

## Progress Tracking Breakdown

The upload progress is mapped across the 3 steps:

```
0%  ────────> Request presigned URL
10% ────────> Received presigned URL
20% ────────> Start upload to S3/R2
...
90% ────────> Upload to S3/R2 complete
100% ───────> Database record saved ✅
```

**Code:** `src/client/useFileUpload.tsx:331, 351, 361, 375, 429`

---

## Error Handling

Each step has comprehensive error handling:

### **Step 1 Error: Failed to Get Presigned URL**
```typescript
if (!presignedResponse.ok) {
  throw new Error('Failed to get presigned URL');
}
```

### **Step 4 Error: Upload to S3 Failed**
```typescript
xhr.addEventListener('error', () => {
  throw new Error('Network error occurred during upload');
});
```

### **Step 5 Error: Database Save Failed**
```typescript
if (!saveResponse.ok) {
  throw new Error('Failed to save file record');
}
```

**Note:** If Step 4 succeeds but Step 5 fails, the file exists in S3 but has no database record. Consider implementing cleanup logic or retry mechanisms.

---

## Configuration

### **Client Configuration**

```typescript
const { upload } = usePresignedUpload({
  getPresignedUrlEndpoint: '/api/fileuploads/upload-url',
  saveFileRecordEndpoint: '/api/fileuploads/save-file',
  category: 'avatars',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/*'],
  onSuccess: (file) => console.log('Success!', file),
  onError: (error) => console.error('Error!', error),
  onProgress: (progress) => console.log('Progress:', progress.percentage),
});
```

### **Server Configuration**

```typescript
// lib/file-service.ts
import { getDefaultFileServiceConfig } from 'meta-uploads/server';

const config = getDefaultFileServiceConfig();
// config.s3.region = 'auto'
// config.s3.bucket = process.env.S3_BUCKET_NAME
// config.presignedUrlExpiration = 3600 (1 hour)
```

---

## Summary

### **3-Step Process:**

1. **Get Presigned URL** - Client → Server → S3 (get upload permission)
2. **Upload File** - Client → S3 (direct upload with progress)
3. **Save Record** - Client → Server → Database (persist metadata)

### **Key Benefits:**

- ⚡ **Performance** - Direct uploads, no server bottleneck
- 🔒 **Security** - Authenticated, time-limited URLs
- 📊 **Progress** - Real-time upload tracking
- 💰 **Cost-Effective** - Reduced server bandwidth
- 🎯 **Scalable** - Handles thousands of concurrent uploads

### **Perfect For:**

- Large file uploads (images, videos, documents)
- High-traffic applications
- Mobile apps (reduced data usage)
- CDN-backed storage (fast global access)

---

## Related Files

- **Client Hook:** `src/client/useFileUpload.tsx:270-464`
- **Server Handler:** `src/server/file-handler.ts:107-169`
- **File Service:** `src/file.service.ts`
- **Route Adapters:** `src/server/nextjs-adapter.ts`
- **Examples:** `EXAMPLES.md`

---

**🎉 You now understand how presigned URL uploads work in meta-uploads!**
