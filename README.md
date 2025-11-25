# Ultra FileIO

**Production-ready file upload library for Next.js with ORM-agnostic architecture**

[![npm version](https://badge.fury.io/js/ultra-fileio.svg)](https://www.npmjs.com/package/ultra-fileio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A complete file upload solution for Next.js that works seamlessly with **Prisma**, **Drizzle**, **Cloudflare R2**, and **AWS S3**. Built with TypeScript, fully type-safe, and production-ready.

## ✨ Features

- 🚀 **Next.js App Router** - Built-in route handlers for instant integration
- 🔧 **ORM Agnostic** - Works with Prisma, Drizzle, or any ORM via repository pattern
- ☁️ **Cloud Storage** - Cloudflare R2 and AWS S3 compatible
- 🛡️ **Type Safe** - Full TypeScript + Zod validation
- 🪝 **Lifecycle Hooks** - Before/after hooks for logging, auditing, custom logic
- 🖼️ **Image Optimization** - Automatic compression and thumbnail generation with Sharp
- 📦 **Presigned URLs** - Direct client-to-storage uploads for large files
- ⚡ **Production Ready** - Proper error handling, bulk operations, and best practices

## 📦 Installation

```bash
npm install ultra-fileio
# or
pnpm add ultra-fileio
# or
yarn add ultra-fileio
```

### Install Required Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner sharp zod
```

## 🚀 Quick Start

### 1. Environment Setup

```bash
# .env.local
S3_ACCOUNT_ID="your-account-id"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"
S3_PUBLIC_URL="https://your-bucket.r2.dev"
S3_REGION="auto"

DATABASE_URL="postgresql://..."
```

### 2. Add Database Schema

<details>
<summary>Prisma Schema</summary>

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
</details>

<details>
<summary>Drizzle Schema</summary>

```typescript
import { pgTable, text, timestamp, uuid, varchar, index, bigint } from 'drizzle-orm/pg-core'

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  r2Key: text('r2_key').notNull().unique(),
  originalFilename: varchar('original_filename', { length: 512 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  publicUrl: text('public_url').notNull(),
  uploadedBy: uuid('uploaded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  r2KeyIdx: index('files_r2_key_idx').on(table.r2Key),
  uploadedByIdx: index('files_uploaded_by_idx').on(table.uploadedBy),
  createdAtIdx: index('files_created_at_idx').on(table.createdAt),
}))
```
</details>

### 3. Create API Route

```typescript
// app/api/fileuploads/[[...fileuploads]]/route.ts
import { FlexibleFileService, PrismaFileRepository, isR2Configured } from 'ultra-fileio'
import { fileUploadsHandler } from 'ultra-fileio/server'
import { getUserId } from '@/lib/get-user'
import { prisma } from '@/lib/prisma'

const fileRepository = new PrismaFileRepository(prisma)
let fileService: FlexibleFileService | null = null

if (isR2Configured) {
  fileService = new FlexibleFileService(fileRepository)
}

export const { GET, POST, PUT, PATCH, DELETE } = fileUploadsHandler({
  fileService,
  fileRepository,
  getUserId,
  basePath: '/api/fileuploads',
})
```

### 4. Upload from Client

```typescript
'use client'

async function handleUpload(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/fileuploads', {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  console.log('Uploaded:', data.publicUrl)
}
```

## 🎯 API Endpoints

The catch-all route `[[...fileuploads]]` creates these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/fileuploads` | Upload a file |
| `GET` | `/api/fileuploads` | List all user files |
| `GET` | `/api/fileuploads/{id}` | Get file details |
| `DELETE` | `/api/fileuploads/{id}` | Delete a file |
| `POST` | `/api/fileuploads/presigned` | Get presigned URL |
| `POST` | `/api/fileuploads/complete` | Complete presigned upload |

## 📖 Documentation

- [Quick Start Guide](./docs/GUIDE.md)
- [Installation](./docs/content/docs/installation.mdx)
- [Configuration](./docs/content/docs/configuration.mdx)
- [Next.js Integration](./docs/content/docs/nextjs.mdx)
- [Prisma Setup](./docs/content/docs/prisma.mdx)
- [Drizzle Setup](./docs/content/docs/drizzle.mdx)

## 💡 Examples

Check out the [complete Next.js example](./examples/nextjs-approuter) with:

- ✅ File upload with drag-and-drop
- ✅ File list with delete
- ✅ Prisma database integration
- ✅ R2/S3 storage
- ✅ Image optimization
- ✅ TypeScript throughout

## 🏗️ Project Structure

```
ultra-fileio/
├── src/
│   ├── index.ts              # Main exports
│   ├── file.service.ts       # File service (ORM agnostic)
│   ├── file.module.ts        # R2/S3 storage service
│   ├── file.schema.ts        # Zod schemas
│   ├── server/               # Server-side exports
│   │   ├── index.ts
│   │   ├── route-handler.ts  # Next.js route handlers
│   │   └── file-handler.ts   # Catch-all handler
│   ├── client/               # Client-side exports
│   │   ├── index.ts
│   │   └── useFileUpload.tsx # React hooks
│   └── repositories/         # ORM adapters
│       ├── file.repository.interface.ts
│       ├── base.repository.ts
│       └── adapters/
│           ├── prisma.adapter.ts
│           └── drizzle.adapter.ts
├── examples/
│   └── nextjs-approuter/     # Complete example app
└── docs/                     # Documentation site
```

## 🔧 Development

### Setup

```bash
# Install dependencies
bun install

# Build library
bun run build

# Watch mode
bun run dev

# Lint & format
bun run check:fix

# Type check
bun run typecheck
```

### Run Example App

```bash
cd examples/nextjs-approuter
pnpm install
pnpm prisma migrate dev
pnpm dev
```

## 🧪 Tech Stack

- **Runtime**: [Bun](https://bun.sh/) / Node.js 18+
- **Framework**: [Next.js](https://nextjs.org/) 14+ with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Validation**: [Zod](https://zod.dev/)
- **Storage**: [AWS SDK v3](https://aws.amazon.com/sdk-for-javascript/) (S3-compatible)
- **Images**: [Sharp](https://sharp.pixelplumbing.com/)
- **ORMs**: [Prisma](https://www.prisma.io/) / [Drizzle](https://orm.drizzle.team/)
- **Linting**: [Biome](https://biomejs.dev/)

## 🤝 Contributing

Contributions are welcome! Please check out the [contributing guidelines](./CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with inspiration from modern file upload libraries
- Powered by Cloudflare R2 and AWS S3
- Designed for the Next.js ecosystem

## 📞 Support

- 📖 [Documentation](./docs/)
- 💬 [GitHub Discussions](https://github.com/codersaadi/ultra-fileio/discussions)
- 🐛 [Issue Tracker](https://github.com/codersaadi/ultra-fileio/issues)

---

Made with ❤️ for the JS,TS community
