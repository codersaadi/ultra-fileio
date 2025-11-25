# Setup Guide

This guide will walk you through setting up the Next.js File Manager application from scratch.

## Quick Start (5 minutes)

```bash
# 1. Install dependencies
pnpm install

# 2. Run database migrations
pnpm prisma:migrate

# 3. Start the development server
pnpm dev

# 4. Open http://localhost:3000
```

That's it! The application will automatically:
- Create the SQLite database
- Initialize a demo user
- Create the uploads directory

## Detailed Setup

### Step 1: Install Dependencies

Install all required packages:

```bash
pnpm install
```

This installs:
- Next.js 16 with React 19
- Prisma ORM
- TypeScript
- Tailwind CSS 4
- ESLint

### Step 2: Configure Environment

The `.env` file is already configured with sensible defaults:

```env
DATABASE_URL="file:./dev.db"
MAX_FILE_SIZE=5242880
UPLOAD_DIR="./uploads"
```

You can modify these values if needed.

### Step 3: Set Up the Database

Run Prisma migrations to create the database schema:

```bash
pnpm prisma:migrate
```

When prompted, name your migration (e.g., "init").

This creates:
- SQLite database file at `prisma/dev.db`
- User and File tables
- Prisma Client

### Step 4: Verify Database Setup (Optional)

Open Prisma Studio to view your database:

```bash
pnpm prisma:studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View tables and data
- Manually add/edit records
- Test queries

### Step 5: Start the Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Testing the Application

### 1. Upload a File

- Drag and drop a file onto the upload area, or
- Click "Upload a file" to select a file
- The file will be uploaded and appear in the file list

### 2. Download a File

- Click the "Download" button next to any file
- The file will be downloaded to your browser's download folder

### 3. Delete a File

- Click the "Delete" button next to any file
- Confirm the deletion
- The file will be removed from both the database and disk

## Troubleshooting

### Database Issues

**Error: "Can't reach database server"**

Solution: Make sure the database has been created:
```bash
pnpm prisma:migrate
```

**Error: "Prisma Client not found"**

Solution: Generate the Prisma Client:
```bash
pnpm prisma:generate
```

### File Upload Issues

**Error: "Failed to upload file"**

Check:
1. Upload directory exists and is writable
2. File size is under the limit (5MB default)
3. Disk space is available

**Files not persisting after restart**

This is expected with SQLite in development. For production, use:
- PostgreSQL, MySQL, or another persistent database
- Cloud storage for files (S3, Cloudinary, etc.)

### Port Already in Use

If port 3000 is already in use:

```bash
pnpm dev -- -p 3001
```

This starts the server on port 3001 instead.

## Next Steps

### Add Authentication

Install NextAuth.js:
```bash
pnpm add next-auth
```

Configure providers in `app/api/auth/[...nextauth]/route.ts`.

### Use Cloud Storage

Replace local file storage with cloud storage:

**AWS S3**:
```bash
pnpm add @aws-sdk/client-s3
```

**Cloudinary**:
```bash
pnpm add cloudinary
```

Update `lib/fileService.ts` to use the cloud storage API.

### Add More Features

Ideas for extending the application:
- File sharing with other users
- File previews for images and PDFs
- Folder organization
- Search and filtering
- File versioning
- Access control and permissions

### Deploy to Production

1. Update `DATABASE_URL` to a production database
2. Configure cloud storage for files
3. Add authentication
4. Set up environment variables in your hosting platform
5. Deploy to Vercel, AWS, or your preferred platform

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Database
pnpm prisma:generate        # Generate Prisma Client
pnpm prisma:migrate         # Run migrations
pnpm prisma:studio          # Open database GUI
pnpm prisma db push         # Push schema without migration
pnpm prisma db seed         # Seed database

# Code Quality
pnpm lint                   # Run ESLint
pnpm lint --fix            # Fix linting issues
```

## Support

For issues or questions:
1. Check the [README.md](./README.md) for documentation
2. Review the [Next.js documentation](https://nextjs.org/docs)
3. Review the [Prisma documentation](https://www.prisma.io/docs)
4. Open an issue on GitHub

## Additional Resources

- [Next.js App Router Guide](https://nextjs.org/docs/app)
- [Prisma Getting Started](https://www.prisma.io/docs/getting-started)
- [Tailwind CSS Guide](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
