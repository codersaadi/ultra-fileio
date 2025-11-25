# Contributing to Documentation Site

First off, thank you for considering contributing to this project! It's people like you that make this documentation site better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (preferred) or npm/yarn
- Git
- A code editor (VS Code recommended)

### Initial Setup

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/your-username/docs.git
cd docs
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/your-org/docs.git
```

4. Install dependencies:

```bash
pnpm install
```

5. Create a branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

## Development Workflow

### Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your changes in real-time.

### Type Checking

Run TypeScript type checking:

```bash
pnpm type-check
```

### Building

Test the production build:

```bash
pnpm build
pnpm start
```

### Linting

Run ESLint to check for code issues:

```bash
pnpm lint
```

## Project Structure

Understanding the project structure will help you contribute effectively:

```
.
├── app/                    # Next.js app directory
│   ├── (home)/            # Landing page routes
│   ├── docs/              # Documentation routes
│   ├── api/               # API routes (search, etc.)
│   └── layout.config.tsx  # Shared layout configuration
├── content/
│   └── docs/              # MDX documentation files
├── lib/
│   └── source.ts          # Content source configuration
├── .source/               # Auto-generated (don't edit)
└── source.config.ts       # MDX configuration
```

### Key Files

- **source.config.ts**: Configure MDX processing and frontmatter schema
- **lib/source.ts**: Configure how content is loaded and processed
- **app/layout.config.tsx**: Shared layout settings (nav, footer, etc.)
- **content/docs/**: All MDX documentation pages

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, Node version, browser)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- A clear and descriptive title
- Detailed description of the proposed feature
- Explain why this enhancement would be useful
- List any alternative solutions you've considered

### Contributing Code

#### Adding Documentation

1. Create a new MDX file in `content/docs/`:

```mdx
---
title: Page Title
description: Brief description
---

# Your Content Here

Start writing your documentation...
```

2. Organize related pages in folders:

```
content/docs/
├── guides/
│   ├── getting-started.mdx
│   └── advanced-usage.mdx
```

3. Test locally with `pnpm dev`

#### Modifying Components

1. Component files are in `app/` directory
2. Follow React and Next.js best practices
3. Ensure TypeScript types are correct
4. Test changes thoroughly

#### Updating Configuration

1. **MDX Configuration**: Edit `source.config.ts`
2. **Layout Configuration**: Edit `app/layout.config.tsx`
3. **TypeScript Configuration**: Edit `tsconfig.json`
4. **Package Configuration**: Edit `package.json`

## Style Guidelines

### Code Style

- Use TypeScript for all new files
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### TypeScript

```typescript
// Good
interface PageProps {
  params: {
    slug: string[];
  };
}

export default function Page({ params }: PageProps) {
  // Implementation
}

// Bad
export default function Page(props: any) {
  // Implementation
}
```

### React Components

```typescript
// Good
export function MyComponent({ title, children }: PropsType) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}

// Bad
export function MyComponent(props) {
  return <div>{props.children}</div>;
}
```

### MDX Documentation

- Use clear, concise language
- Include code examples where appropriate
- Follow the existing frontmatter structure
- Break up long pages with headings
- Use lists for better readability

```mdx
---
title: Clear, Descriptive Title
description: Brief summary of the page content
---

# Main Heading

Brief introduction paragraph.

## Section Heading

Content with examples:

```typescript
// Code example with syntax highlighting
const example = "value";
```

## Another Section

Continue documentation...
```

## Commit Guidelines

We follow conventional commits for clear and semantic commit messages:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```bash
feat(docs): add API reference page

Add comprehensive API reference documentation with examples
for all public methods.

Closes #123
```

```bash
fix(search): resolve search results not displaying

Fixed an issue where search results were not being rendered
properly due to incorrect data formatting.

Fixes #456
```

```bash
docs: update contributing guidelines

- Add commit message guidelines
- Clarify pull request process
- Update code style examples
```

## Pull Request Process

### Before Submitting

1. Ensure your code follows the style guidelines
2. Run type checking: `pnpm type-check`
3. Run linting: `pnpm lint`
4. Test the build: `pnpm build`
5. Update documentation if needed
6. Sync with upstream:

```bash
git fetch upstream
git rebase upstream/main
```

### Submitting a Pull Request

1. Push your changes to your fork:

```bash
git push origin feature/your-feature-name
```

2. Open a pull request on GitHub
3. Fill out the pull request template
4. Link any related issues

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated (if applicable)
- [ ] Local build successful

## Screenshots (if applicable)

Add screenshots to show visual changes

## Related Issues

Closes #issue_number
```

### Review Process

1. At least one maintainer review required
2. All CI checks must pass
3. Address any review feedback
4. Once approved, a maintainer will merge

### After Merge

1. Delete your feature branch:

```bash
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

2. Update your main branch:

```bash
git checkout main
git pull upstream main
```

## Questions?

Feel free to:

- Open an issue for questions
- Start a discussion on GitHub Discussions
- Reach out to maintainers

Thank you for contributing!
