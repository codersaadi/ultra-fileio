# Meta-Uploads Integration Guide

This Next.js application demonstrates a complete integration with the **meta-uploads** file service library from `/home/syed/meta-uploads/src`.

## Overview

The meta-uploads library provides:
- **ORM-agnostic file repository** - Works with Prisma, Drizzle, or any ORM
- **Cloudflare R2/S3 storage** - Production-ready cloud storage
- **Type-safe operations** - Full TypeScript support with Zod validation
- **Flexible architecture** - Dependency injection for easy testing and customization

## Architecture

```
nextjs-approuter/
├── lib/
│   ├── repositories/
│   │   ├── file.repository.interface.ts  # Repository contract
│   │   ├── base.repository.ts            # Base implementation with hooks
│   │   └── prisma.adapter.ts             # Prisma-specific adapter
│   ├── services/
│   │   ├── file.service.ts               # Main file service
│   │   ├── file.module.ts                # R2/S3 storage service
│   │   └── file.schema.ts                # Zod schemas and types
│   ├── route-handler.ts                  # Next.js route handler utilities
│   ├── file-service.ts                   # Service initialization
│   └── prisma.ts                         # Prisma client singleton
├── app/
│   └── api/
│       └── files/                        # File API routes
└── components/                           # React components
```

## Key Features

### 1. ORM-Agnostic Design

The library uses a repository pattern with dependency injection:

```typescript
// lib/file-service.ts
import { PrismaFileRepository } from './repositories/prisma.adapter'
import { FlexibleFileService } from './services/file.service'

const fileRepository = new PrismaFileRepository(prisma)
const fileService = new FlexibleFileService(fileRepository, config)
```

### 2. Cloudflare R2 / S3 Storage

Files are stored in Cloudflare R2 (S3-compatible) instead of local filesystem:

```typescript
const fileService = new FlexibleFileService(fileRepository, {
  r2Config: {
    accountId: process.env.S3_ACCOUNT_ID!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    bucketName: process.env.S3_BUCKET_NAME!,
    publicUrl: process.env.S3_PUBLIC_URL,
    region: 'auto',
  },
  maxFileSize: 10 * 1024 * 1024, // 10MB
})
```

### 3. Type-Safe File Operations

All file operations are type-safe with Zod validation:

```typescript
import { FileUpload, UploadOptions } from './services/file.schema'

const file: FileUpload = {
  buffer: arrayBuffer,
  contentType: 'image/jpeg',
  filename: 'photo.jpg',
  size: 1024000,
}

const result = await fileService.uploadFile(userId, { file, category: 'photos' })
```

### 4. Lifecycle Hooks

The repository supports lifecycle hooks for logging, auditing, and custom logic:

```typescript
const fileRepository = new PrismaFileRepository(prisma, {
  beforeCreate: async (context) => {
    console.log('Creating file:', context.data)
  },
  afterCreate: async (context) => {
    console.log('File created:', context.result)
  },
  onError: async (context) => {
    console.error('Error:', context.error)
  },
})
```

## Database Schema

The application uses the following schema compatible with meta-uploads:

```prisma
model File {
  id               String   @id @default(cuid())
  r2Key            String   @unique @map("r2_key")
  originalFilename String   @map("original_filename")
  fileSize         Int      @map("file_size")
  publicUrl        String   @map("public_url")
  uploadedBy       String   @map("uploaded_by")
  createdAt        DateTime @default(now()) @map("created_at")

  uploader User @relation(fields: [uploadedBy], references: [id], onDelete: Cascade)

  @@index([r2Key])
  @@index([uploadedBy])
  @@index([createdAt])
  @@map("files")
}
```

## API Routes

### Upload File
```typescript
// app/api/files/route.ts
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || 'demo-user'
  const files = await parseFileFromRequest(request)
  const category = searchParams.get('category') || 'general'
  
  const uploadedFile = await fileService.uploadFile(userId, {
    file: files[0],
    category,
  })
  
  return NextResponse.json({ file: uploadedFile })
}
```

### List Files
```typescript
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || 'demo-user'
  const files = await fileRepository.getFilesByUser(userId)
  return NextResponse.json({ files })
}
```

### Delete File
```typescript
export async function DELETE(request: NextRequest, { params }) {
  const userId = request.headers.get('x-user-id') || 'demo-user'
  const result = await fileService.deleteFile(params.id, userId)
  return NextResponse.json({ message: 'Deleted', r2Deleted: result.r2Deleted })
}
```

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# Cloudflare R2 / S3 Configuration
S3_ACCOUNT_ID="your-account-id"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"
S3_PUBLIC_URL="https://your-bucket.r2.dev"
S3_REGION="auto"
```

### Setup Cloudflare R2

1. **Create R2 Bucket**:
   - Go to Cloudflare Dashboard > R2
   - Create a new bucket
   - Enable public access if needed

2. **Generate API Tokens**:
   - Go to R2 API Tokens
   - Create a new token with read/write permissions
   - Copy the access key ID and secret

3. **Configure Public URL** (optional):
   - Set up a custom domain or use R2's public URL
   - Add the URL to your `.env` file

## Usage Examples

### Upload from Client

```typescript
'use client'

const handleUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/files?category=documents', {
    method: 'POST',
    headers: {
      'x-user-id': 'demo-user'
    },
    body: formData
  })
  
  const data = await response.json()
  console.log('Uploaded:', data.file)
}
```

### List User Files

```typescript
const response = await fetch('/api/files', {
  headers: {
    'x-user-id': 'demo-user'
  }
})

const { files } = await response.json()
files.forEach(file => {
  console.log(file.originalFilename, file.publicUrl)
})
```

### Download File

```typescript
// Files are publicly accessible via publicUrl
const downloadFile = (file) => {
  const a = document.createElement('a')
  a.href = file.publicUrl
  a.download = file.originalFilename
  a.target = '_blank'
  a.click()
}
```

## Advanced Features

### 1. Presigned Upload URLs

For direct client-to-R2 uploads without going through your server:

```typescript
// Generate presigned URL
const { uploadUrl, publicUrl } = await fileService.generateUploadUrl(
  userId,
  'document.pdf',
  'application/pdf',
  'documents'
)

// Client uploads directly to R2
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileBlob,
  headers: { 'Content-Type': 'application/pdf' }
})

// Save record to database
await fileService.saveFileRecord(userId, {
  r2Key: key,
  originalFilename: 'document.pdf',
  fileSize: fileBlob.size,
  publicUrl,
})
```

### 2. File Statistics

```typescript
const stats = await fileRepository.getFileStats()
console.log('Total files:', stats.totalFiles)
console.log('Total size:', stats.totalSize)
console.log('Recent uploads:', stats.recentUploads)
```

### 3. Bulk Operations

```typescript
// Bulk delete
const result = await fileRepository.bulkDeleteFiles(['id1', 'id2', 'id3'])
console.log('Deleted:', result.deleted)

// Bulk create
const files = await fileRepository.bulkCreateFiles([
  { r2Key: 'key1', originalFilename: 'file1.jpg', ... },
  { r2Key: 'key2', originalFilename: 'file2.jpg', ... },
])
```

### 4. Custom Queries

```typescript
const { data, total } = await fileRepository.getAllFiles({
  limit: 20,
  offset: 0,
  search: 'report',
  uploaderId: 'user-123',
  startDate: new Date('2024-01-01'),
  orderBy: 'createdAt',
  orderDir: 'desc',
})
```

## Benefits of This Architecture

1. **Scalability**: Files stored in cloud, not on server filesystem
2. **ORM Flexibility**: Switch between Prisma, Drizzle, etc. easily
3. **Type Safety**: Full TypeScript support with runtime validation
4. **Testing**: Easy to mock repositories for testing
5. **Extensibility**: Hooks for custom business logic
6. **Performance**: Direct client uploads with presigned URLs
7. **Production Ready**: Built-in error handling and logging

## Migration from Local Storage

If you have an existing app with local file storage:

1. **Update Schema**: Migrate to new file schema
2. **Configure R2**: Set up Cloudflare R2 credentials
3. **Migrate Files**: Upload existing files to R2
4. **Update Records**: Update database with R2 keys and public URLs
5. **Deploy**: Switch to new file service

## Testing

```typescript
// Mock repository for testing
const mockRepository = {
  createFile: jest.fn(),
  getFileById: jest.fn(),
  // ... other methods
}

const testService = new FlexibleFileService(mockRepository, config)

// Test upload
await testService.uploadFile('user-1', { file, category: 'test' })
expect(mockRepository.createFile).toHaveBeenCalled()
```

## Troubleshooting

### R2 Not Configured

If R2 credentials are not set, the app gracefully degrades:

```typescript
if (!isR2Configured || !fileService) {
  return NextResponse.json(
    { error: 'Please configure R2 credentials' },
    { status: 503 }
  )
}
```

### CORS Issues

Add CORS headers to your R2 bucket:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"]
  }
]
```

### File Size Limits

Adjust the maxFileSize in configuration:

```typescript
const fileService = new FlexibleFileService(fileRepository, {
  r2Config: { /* ... */ },
  maxFileSize: 50 * 1024 * 1024, // 50MB
})
```

## Next Steps

1. **Authentication**: Add real user authentication
2. **Authorization**: Implement file access control
3. **Image Processing**: Add thumbnail generation
4. **Video Processing**: Add video transcoding
5. **Analytics**: Track file usage and downloads
6. **Quotas**: Implement storage quotas per user
7. **Sharing**: Add file sharing capabilities

## Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
