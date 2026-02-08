# The aylett.co.uk Website

This is the source for the website hosted at https://www.aylett.co.uk/.

It uses TypeScript and Next.js 16 with React 19, and deploys automatically to
Vercel. Pages are server-rendered by default (RSC) to minimise client-side
JavaScript.

## Content

- **Articles** (`src/app/articles/md/`) — longer-form pieces with revision
  tracking and a lifecycle (draft, live, historical, obsolete).
- **Thoughts** (`src/app/thoughts/md/`) — shorter posts with a date and tags.

Both are written in Markdown with YAML frontmatter.

## Development

```sh
npm run dev      # Start local dev server
npm run build    # Production build
npm test         # Lint + type-check + Jest tests
npm run lint     # ESLint + TypeScript only
npm run format   # Auto-fix lint issues
```
