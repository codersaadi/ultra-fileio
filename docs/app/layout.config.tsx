import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        Ultra FileIO <span className="text-xs font-normal text-muted-foreground">by Saad</span>
      </>
    ),
  },
  githubUrl: 'https://github.com/codersaadi/ultra-fileio',
  // see https://fumadocs.dev/docs/ui/navigation/links
  links: [],
};
