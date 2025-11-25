# Documentation Site

A production-grade documentation site built with [Fumadocs](https://fumadocs.vercel.app), Next.js, and MDX.

## Features

- **Modern Stack**: Built with Next.js 15, React 19, and TypeScript
- **MDX Support**: Write documentation with MDX for enhanced content capabilities
- **Fast Performance**: Powered by Next.js with Turbopack for blazing-fast development
- **Beautiful UI**: Pre-built components from Fumadocs UI
- **Full-Text Search**: Built-in search functionality
- **Type-Safe**: Full TypeScript support with strict type checking
- **Customizable**: Easy to extend and customize for your needs

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended) or npm/yarn

## Installation

### As a Template

Use this repository as a template for your own documentation:

```bash
# Clone the repository
git clone https://github.com/your-org/docs.git
cd docs

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Installing as a Package

If this is published as a package:

```bash
pnpm add @your-org/docs
```

## Getting Started

### Development

Start the development server with hot-reload:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view your documentation site.

### Building for Production

Build the production-optimized site:

```bash
pnpm build
```

### Running Production Build

Start the production server:

```bash
pnpm start
```

## Project Structure

```
.
├── app/
│   ├── (home)/          # Landing page and home routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── docs/            # Documentation routes
│   │   ├── [[...slug]]/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── search/      # Search API endpoint
│   │       └── route.ts
│   ├── layout.tsx       # Root layout
│   └── layout.config.tsx # Shared layout configuration
├── content/
│   └── docs/            # Your MDX documentation files
│       ├── index.mdx
│       └── *.mdx
├── lib/
│   └── source.ts        # Content source loader configuration
├── .source/             # Generated files (do not edit)
│   └── index.ts
├── source.config.ts     # MDX configuration
└── tsconfig.json        # TypeScript configuration
```

## Writing Documentation

### Creating New Pages

Add MDX files to the `content/docs/` directory:

```mdx
---
title: Your Page Title
description: A brief description of your page
---

# Your Content

Write your documentation here using MDX syntax.

## Features

- Support for markdown
- React components
- Code highlighting
```

### Using Components

Fumadocs provides built-in components:

```mdx
## Cards

<Cards>
  <Card title="Getting Started" href="/docs/getting-started" />
  <Card title="API Reference" href="/docs/api" />
</Cards>

## Code Blocks

```typescript
const example = "Hello World";
console.log(example);
```
```

### Organizing Content

Create folders in `content/docs/` to organize your documentation:

```
content/docs/
├── index.mdx
├── getting-started/
│   ├── index.mdx
│   └── installation.mdx
├── guides/
│   ├── basics.mdx
│   └── advanced.mdx
└── api/
    └── reference.mdx
```

## Configuration

### MDX Options

Customize MDX behavior in `source.config.ts`:

```typescript
import { defineConfig } from 'fumadocs-mdx/config';

export default defineConfig({
  mdxOptions: {
    // Add your MDX options here
  },
});
```

### Layout Configuration

Modify `app/layout.config.tsx` to customize the documentation layout:

```typescript
export const layoutConfig = {
  // Your layout options
};
```

### Search Configuration

The search functionality is provided via `app/api/search/route.ts`. Customize search behavior by modifying this route handler.

## Deployment

### Vercel (Recommended)

The easiest way to deploy is using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Self-Hosting

Build and deploy to any hosting provider that supports Node.js:

```bash
# Build
pnpm build

# Start production server
pnpm start
```

### Environment Variables

No environment variables required by default. Add your own as needed in `.env.local`.

## Customization

### Styling

This project uses Tailwind CSS. Customize the design system by modifying:

- `tailwind.config.js` - Tailwind configuration
- Global styles in layout files

### Branding

Update branding elements in:

- `app/layout.config.tsx` - Site title, navigation
- `app/(home)/page.tsx` - Landing page content
- `public/` - Logo and favicon assets

## Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Troubleshooting

### TypeScript Path Aliases

The `@/.source` import uses a generated file. After adding new documentation files, the build process (`postinstall` script) automatically regenerates this file. If you encounter issues:

```bash
pnpm install  # Regenerates .source/index.ts
```

### Build Errors

If you encounter build errors:

1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && pnpm install`
3. Run type check: `pnpm type-check`

## Resources

- [Fumadocs Documentation](https://fumadocs.vercel.app)
- [Next.js Documentation](https://nextjs.org/docs)
- [MDX Documentation](https://mdxjs.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Support

- [Issues](https://github.com/your-org/docs/issues)
- [Discussions](https://github.com/your-org/docs/discussions)
