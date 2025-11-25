# Quick Start Guide - Meta-Uploads Integration

Get up and running with the Next.js meta-uploads example in 5 minutes!

## Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Cloudflare R2 account (for file uploads)

## Step 1: Install Dependencies

```bash
cd nextjs-approuter
pnpm install
```

## Step 2: Configure Database

```bash
# Run migrations
pnpm prisma:migrate

# This creates:
# - SQLite database at prisma/dev.db
# - User and File tables
# - Demo users (demo-user, john@example.com, jane@example.com)
```

## Step 3: Configure Cloudflare R2 (Optional)

### Option A: With R2 (Full Functionality)

1. **Create R2 Bucket**:
   - Login to Cloudflare Dashboard
   - Go to R2 Object Storage
   - Create a new bucket (e.g., "my-files")
   - Enable public access if needed

2. **Generate API Tokens**:
   - Click "Manage R2 API Tokens"
   - Create token with read/write permissions
   - Copy Account ID, Access Key ID, and Secret Access Key

3. **Update `.env`**:
   ```env
   S3_ACCOUNT_ID="your-cloudflare-account-id"
   S3_ACCESS_KEY_ID="your-access-key-id"
   S3_SECRET_ACCESS_KEY="your-secret-access-key"
   S3_BUCKET_NAME="my-files"
   S3_PUBLIC_URL="https://pub-xxxxx.r2.dev"
   S3_REGION="auto"
   ```

### Option B: Without R2 (Browse Only)

The app will run without R2 configuration, but file uploads will be disabled. You can still:
- Browse the UI
- See the demo users
- Understand the architecture

## Step 4: Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Step 5: Test File Upload

1. Open the application in your browser
2. Drag and drop an image file (JPEG, PNG, WebP, GIF)
3. File is uploaded to R2 and saved to database
4. Click "Download" to retrieve the file
5. Click "Delete" to remove the file

## What's Happening Behind the Scenes?

### 1. File Upload Flow

```
Client → POST /api/files → parseFileFromRequest()
  ↓
FlexibleFileService.uploadFile()
  ↓
R2StorageService.uploadFile() → Cloudflare R2
  ↓
PrismaFileRepository.createFile() → Database
  ↓
Response with file metadata
```

### 2. File List Flow

```
Client → GET /api/files
  ↓
PrismaFileRepository.getFilesByUser()
  ↓
Query database for user's files
  ↓
Response with file list
```

### 3. File Delete Flow

```
Client → DELETE /api/files/[id]
  ↓
FlexibleFileService.deleteFile()
  ↓
Delete from R2 → Cloudflare R2
  ↓
PrismaFileRepository.deleteFile() → Database
  ↓
Response with success
```

## Understanding the Code

### Service Initialization

```typescript
// lib/file-service.ts
import { PrismaFileRepository } from './repositories/prisma.adapter'
import { FlexibleFileService } from './services/file.service'

// Create repository (Prisma adapter)
const fileRepository = new PrismaFileRepository(prisma)

// Create file service with R2 config
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

### API Route

```typescript
// app/api/files/route.ts
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || 'demo-user'
  
  // Parse file from multipart/form-data
  const files = await parseFileFromRequest(request)
  
  // Upload to R2 and save to database
  const result = await fileService.uploadFile(userId, {
    file: files[0],
    category: 'general',
  })
  
  return NextResponse.json({ file: result })
}
```

### Client Component

```typescript
// components/FileUpload.tsx
const handleUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/files', {
    method: 'POST',
    headers: { 'x-user-id': 'demo-user' },
    body: formData,
  })
  
  const data = await response.json()
  console.log('Uploaded:', data.file)
}
```

## Exploring Features

### 1. Repository Pattern

The library uses dependency injection for ORM flexibility:

```typescript
// Easy to swap ORMs
const drizzleRepo = new DrizzleFileRepository(db)
const fileService = new FlexibleFileService(drizzleRepo, config)
```

### 2. Lifecycle Hooks

Add custom logic before/after operations:

```typescript
const repository = new PrismaFileRepository(prisma, {
  beforeCreate: async (context) => {
    console.log('Creating file:', context.data)
  },
  afterCreate: async (context) => {
    console.log('File created:', context.result)
    // Send notification, log to analytics, etc.
  },
  onError: async (context) => {
    console.error('Error:', context.error)
    // Send to error tracking service
  },
})
```

### 3. Type Safety

All operations are type-safe:

```typescript
import { FileUpload, UploadOptions } from './services/file.schema'

const file: FileUpload = {
  buffer: arrayBuffer,
  contentType: 'image/jpeg',
  filename: 'photo.jpg',
  size: 1024000,
}

// TypeScript ensures correct types
const result = await fileService.uploadFile(userId, { file })
```

### 4. Advanced Queries

```typescript
// Get files with filters
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

## Common Issues

### "File uploads not configured"

You need to set up Cloudflare R2 credentials in `.env`. See Step 3 above.

### "CORS error when uploading"

Add CORS policy to your R2 bucket:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"]
  }
]
```

### "Database error"

Make sure you've run migrations:

```bash
pnpm prisma:migrate
```

## Next Steps

1. **Read [INTEGRATION.md](./INTEGRATION.md)** - Detailed architecture documentation
2. **Read [README.md](./README.md)** - Full feature list and API reference
3. **Read [EXAMPLES.md](./EXAMPLES.md)** - Code examples and patterns
4. **Explore the code** - Check out the implementation in `lib/` and `app/api/`

## Quick Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Database
pnpm prisma:migrate         # Run migrations
pnpm prisma:studio          # Open database GUI
pnpm prisma:generate        # Generate Prisma Client

# Code Quality
pnpm lint                   # Run linter
```

## Support

- **Documentation**: See INTEGRATION.md, README.md, EXAMPLES.md
- **Source Code**: `/home/syed/meta-uploads/src`
- **Example App**: `/home/syed/meta-uploads/examples/nextjs-approuter`

Happy coding! 🚀
