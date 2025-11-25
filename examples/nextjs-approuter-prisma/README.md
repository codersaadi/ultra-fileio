# Next.js File Manager with Meta-Uploads

A complete file management system built with Next.js App Router, **meta-uploads library**, Prisma, and TypeScript. This example demonstrates how to integrate the enterprise-grade meta-uploads file service with Cloudflare R2/S3 storage, ORM-agnostic architecture, and production-ready features.

## 🎯 What's New - Meta-Uploads Integration

This example showcases the **meta-uploads** library from `/home/syed/meta-uploads/src`, providing:

- ✅ **Cloudflare R2 / S3 Storage** - Cloud storage instead of local filesystem
- ✅ **ORM-Agnostic Design** - Works with Prisma, Drizzle, or any ORM via repository pattern
- ✅ **Type-Safe Operations** - Full TypeScript + Zod validation
- ✅ **Lifecycle Hooks** - Before/after hooks for logging, auditing, custom logic
- ✅ **Production Ready** - Error handling, presigned URLs, bulk operations
- ✅ **Dependency Injection** - Easy testing and customization

## Features

- 📁 **File Upload**: Drag-and-drop or click to upload files (up to 5MB)
- 📊 **File Management**: View, download, and delete files
- 🗄️ **Database Integration**: Prisma ORM with SQLite for data persistence
- 🎨 **Modern UI**: Responsive design with Tailwind CSS and dark mode support
- 🔐 **Type Safety**: Full TypeScript support throughout the application
- 🚀 **API Routes**: RESTful API endpoints for file and user management

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **File Service**: meta-uploads (Cloudflare R2 / S3)
- **Database**: Prisma with SQLite (production: PostgreSQL/MySQL)
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Validation**: Zod
- **Storage SDK**: AWS SDK v3 (S3-compatible)

## Project Structure

```
nextjs-approuter/
├── app/
│   ├── api/
│   │   ├── files/          # File management endpoints
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts       # GET, DELETE file
│   │   │   │   └── download/
│   │   │   │       └── route.ts   # Download file
│   │   │   └── route.ts           # GET, POST files
│   │   ├── users/          # User management endpoints
│   │   │   └── route.ts
│   │   └── init/           # Initialize demo user
│   │       └── route.ts
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/
│   ├── FileUpload.tsx      # File upload component with drag-and-drop
│   └── FileList.tsx        # File list with download/delete actions
├── lib/
│   ├── repositories/
│   │   ├── file.repository.interface.ts  # Repository contract
│   │   ├── base.repository.ts            # Base with lifecycle hooks
│   │   └── prisma.adapter.ts             # Prisma adapter
│   ├── services/
│   │   ├── file.service.ts               # Main file service (meta-uploads)
│   │   ├── file.module.ts                # R2/S3 storage service
│   │   └── file.schema.ts                # Zod schemas
│   ├── route-handler.ts                  # Next.js route utilities
│   ├── file-service.ts                   # Service initialization
│   └── prisma.ts                         # Prisma client singleton
├── prisma/
│   └── schema.prisma       # Database schema
└── uploads/                # File storage directory (created automatically)
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm, npm, or yarn

### Installation

1. **Install dependencies**:

```bash
pnpm install
# or
npm install
# or
yarn install
```

2. **Set up environment variables**:

Copy `.env.example` to `.env` and configure Cloudflare R2:

```bash
# Database
DATABASE_URL="file:./dev.db"

# Cloudflare R2 / S3 Configuration (Required for uploads)
S3_ACCOUNT_ID="your-account-id"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"
S3_PUBLIC_URL="https://your-bucket.r2.dev"
S3_REGION="auto"
```

**Note**: Without R2 configuration, the app will run but uploads will be disabled.

3. **Initialize the database**:

```bash
pnpm prisma:migrate
# or
npm run prisma:migrate
```

This will:
- Create the SQLite database
- Run migrations to set up tables
- Generate Prisma Client

4. **Start the development server**:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

5. **Open your browser**:

Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

The schema is designed to work with the meta-uploads library:

### User Model
- `id`: Unique identifier (CUID)
- `email`: User email (unique)
- `name`: Optional user name
- `createdAt`: Timestamp
- `updatedAt`: Timestamp
- `files`: Relation to File model

### File Model (Meta-Uploads Compatible)
- `id`: Unique identifier (CUID)
- `r2Key`: R2/S3 object key (unique)
- `originalFilename`: Original filename
- `fileSize`: File size in bytes
- `publicUrl`: Public URL for direct access
- `uploadedBy`: Foreign key to User
- `createdAt`: Timestamp

This schema is compatible with any ORM through the repository pattern.

## API Endpoints

### Files

- `GET /api/files` - Get all files for a user
- `POST /api/files` - Upload a new file (multipart/form-data)
- `GET /api/files/[id]` - Get a specific file's metadata
- `GET /api/files/[id]/download` - Download a file
- `DELETE /api/files/[id]` - Delete a file

### Users

- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user

### Initialization

- `POST /api/init` - Initialize demo user

## Meta-Uploads File Service

The `FlexibleFileService` from meta-uploads provides:

- **Cloud Storage**: Upload files to Cloudflare R2 / S3
- **ORM Agnostic**: Works with Prisma, Drizzle, or custom ORMs
- **Type Safety**: Full TypeScript + Zod validation
- **Lifecycle Hooks**: Before/after hooks for custom logic
- **Presigned URLs**: Direct client-to-R2 uploads
- **Bulk Operations**: Efficient batch operations
- **Image Optimization**: Automatic image processing
- **Error Handling**: Production-ready error management

### Architecture

```typescript
// Repository Pattern (ORM Agnostic)
interface IFileRepository {
  createFile(data: FileInsert): Promise<FileRecord>
  getFileById(id: string): Promise<FileRecord | null>
  getFilesByUser(userId: string): Promise<FileRecord[]>
  deleteFile(id: string): Promise<void>
  // ... more methods
}

// Service with Dependency Injection
const fileRepository = new PrismaFileRepository(prisma)
const fileService = new FlexibleFileService(fileRepository, config)
```

**See [INTEGRATION.md](./INTEGRATION.md) for detailed documentation.**

## Scripts

```bash
# Development
pnpm dev                 # Start dev server

# Production
pnpm build              # Build for production
pnpm start              # Start production server

# Database
pnpm prisma:generate    # Generate Prisma Client
pnpm prisma:migrate     # Run database migrations
pnpm prisma:studio      # Open Prisma Studio

# Linting
pnpm lint               # Run ESLint
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` |
| `MAX_FILE_SIZE` | Maximum file size in bytes | `5242880` (5MB) |
| `UPLOAD_DIR` | Directory for uploaded files | `./uploads` |

## Customization

### Change Database Provider

To use PostgreSQL, MySQL, or another database:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // or "mysql", "mongodb", etc.
  url      = env("DATABASE_URL")
}
```

2. Update `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

3. Run migrations:
```bash
pnpm prisma:migrate
```

### Adjust File Size Limit

Update `MAX_FILE_SIZE` in `.env`:
```
MAX_FILE_SIZE=10485760  # 10MB
```

### Change Upload Directory

Update `UPLOAD_DIR` in `.env`:
```
UPLOAD_DIR="./public/uploads"
```

## Security Considerations

For production use, consider:

1. **Authentication**: Add user authentication (NextAuth.js, Auth0, etc.)
2. **Authorization**: Verify users can only access their own files
3. **File Validation**: Check file types and scan for malware
4. **Storage**: Use cloud storage (S3, Cloudinary, etc.) instead of local filesystem
5. **Rate Limiting**: Prevent abuse with rate limiting
6. **HTTPS**: Always use HTTPS in production
7. **Environment Variables**: Never commit `.env` to version control

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

**Note**: When deploying to Vercel or similar platforms, use a proper database (PostgreSQL, MySQL) instead of SQLite, and use cloud storage for files.

## License

MIT
