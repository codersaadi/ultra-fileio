# Ultra FileIO CLI

Automatic setup tool for Ultra FileIO in your web framework.

## Installation

The CLI is included with the `ultra-fileio` package:

```bash
npm install ultra-fileio
# or
pnpm add ultra-fileio
# or
yarn add ultra-fileio
# or
bun add ultra-fileio
```

## Usage

### Initialize Ultra FileIO in your project

```bash
npx ultra-fileio init
```

The CLI will:
- Auto-detect your framework (currently supports Next.js App Router)
- Detect your package manager (npm, pnpm, yarn, or bun)
- Install required dependencies
- Create necessary files and configuration
- Set up Prisma schema and run migrations
- Create environment variable template

### Specify a framework

```bash
npx ultra-fileio init --framework nextjs
# or
npx ultra-fileio init -f nextjs
```

### Get help

```bash
npx ultra-fileio --help
```

## Supported Frameworks

### Next.js App Router

The CLI will create the following files:

- `app/api/fileuploads/[[...fileuploads]]/route.ts` - Catch-all API route handler
- `lib/prisma.ts` - Prisma client singleton
- `lib/get-user.ts` - User authentication helper (needs customization)
- `components/FileUploadButton.tsx` - Upload UI components (Button, Dropzone)
- `components/FileUpload.tsx` - Ready-to-use upload component
- `prisma/schema.prisma` - Database schema with File model
- `.env.local` - Environment variables template

Dependencies installed:
- `ultra-fileio` - Core library
- `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner` - S3/R2 integration
- `sharp` - Image optimization
- `zod` - Schema validation
- `@prisma/client` & `prisma` - Database ORM
- `clsx` & `tailwind-merge` - Utility for className merging
- `lucide-react` - Icon library

After setup, you need to:

1. Update `.env.local` with your R2/S3 credentials
2. Update `lib/get-user.ts` with your auth implementation
3. Import and use the FileUpload component in your pages:
   ```tsx
   import FileUpload from '@/components/FileUpload'

   export default function Page() {
     return <FileUpload onUploadSuccess={() => console.log('Done!')} />
   }
   ```
4. Start your dev server and test the upload

## Extensibility

The CLI is designed to be extensible for other frameworks. To add support for a new framework:

1. Create a new file in `cli/frameworks/your-framework.ts`
2. Implement the `FrameworkSetup` interface
3. Create templates in `cli/templates/your-framework.ts`
4. Add the framework to the `frameworks` array in `cli/index.ts`

## Development

### Project Structure

```
cli/
├── index.ts                 # Main CLI entry point
├── types.ts                 # TypeScript types
├── frameworks/
│   └── nextjs.ts           # Next.js setup handler
├── templates/
│   └── nextjs.ts           # Next.js file templates
└── utils/
    ├── package-manager.ts  # Package manager detection
    └── files.ts            # File system utilities
```

### Building

```bash
npm run build
```

### Testing locally

```bash
node dist/cli/index.js --help
```

## License

MIT
