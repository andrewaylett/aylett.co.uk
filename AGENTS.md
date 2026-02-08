# AGENTS.md — aylett.co.uk

Personal website for Andrew Aylett, hosted at https://www.aylett.co.uk/.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React Server Components by default)
- **Language:** TypeScript (strict)
- **React:** 19 (with React Compiler enabled)
- **Styling:** Tailwind CSS 4 via PostCSS
- **Content:** Markdown files with YAML frontmatter, processed through unified
- **Testing:** Jest 30 + Testing Library (jsdom)
- **Linting:** ESLint 9 (flat config) + TypeScript type-checking
- **Hosting:** Vercel (auto-deploy from main)
- **Analytics:** Plausible (self-proxied)
- **Node:** ^24

## Directory Structure

```
src/
  app/                    # Next.js App Router pages and routes
    articles/
      md/                 # Article markdown files
      [id]/page.tsx       # Dynamic article route
      articles.ts         # Data fetching (cached)
      rss/                # RSS feed route
    thoughts/
      md/                 # Thought markdown files
      [id]/page.tsx       # Dynamic thought route
      thoughts.ts         # Data fetching (cached)
      rss/                # RSS feed route
    tags/                 # Tag listing and per-tag pages
    card/                 # Business card page
    qr/                   # QR code generator
    links/                # Links page
    schema/               # JSON-LD schema page
    api/                  # API routes
    layout.tsx            # Root layout
    page.tsx              # Home page
    sitemap.ts            # Dynamic sitemap generation
    styles/               # Global CSS
  client/                 # Client-side components (use "use client")
    hooks/
      useExploded.ts      # Proxy-based hook for lazy promise destructuring
    mermaid/              # Dynamically imported Mermaid diagram renderer
    qr/                   # QR code form component
  components/             # Shared UI components (server-safe)
  remark/                 # Unified markdown processing pipeline
    process_markdown.ts   # Pipeline definitions (baseProcessor, intoReact, intoText)
    traverse.ts           # Filesystem discovery and Markdown class
    remarkRetextEnglish.ts # remark → retext bridge
    retextRemark.ts       # retext → remark bridge
    components.tsx        # rehype-react component overrides (Mermaid)
  types.ts                # Zod content schemas (Article, Thought, Content)
  utilities.ts            # Shared helpers
  proxy.ts                # Middleware: lowercase URL redirect
test/                     # Jest test files (mirrors src/ structure)
```

## Architecture

### App Router and RSC

All pages are React Server Components unless explicitly marked `"use client"`.
Client components live under `src/client/` and are dynamically imported where
needed (e.g. Mermaid diagrams via `next/dynamic`).

### Markdown Processing Pipeline

The most complex custom code. Defined in `src/remark/process_markdown.ts`:

1. **Parse:** `remark-parse` turns markdown into an mdast tree
2. **Frontmatter extraction:** `remark-frontmatter` identifies YAML blocks,
   then a custom `shiftIf` helper removes the first YAML node from the tree
   and stores it on `vfile.data.frontMatter`
3. **Text processing:** The mdast tree is bridged to nlcst via
   `remarkRetextEnglish`, processed with `retext-smartypants` (smart quotes),
   then bridged back to mdast via `retextRemark`
4. **Dash conversion:** A custom visitor replaces ` -- ` with em-dashes
5. **GFM:** GitHub-Flavoured Markdown extensions

This base processor is then extended:
- **`intoReact`**: Converts to hast via `remark-rehype`, strips redundant
  `<pre>` wrappers around Mermaid code blocks, adds heading slugs, and renders
  to React elements via `rehype-react` with custom component overrides
- **`intoText`**: Serialises back to plain markdown via `remark-stringify`

### Content System

Two content types, each with a Zod schema in `src/types.ts`:

**Articles** (`ArticleSchema`):
- Fields: title, revision, revised, author, expires, abstract, copyright,
  description, lifecycle, tags
- Lifecycle states: `draft`, `live`, `historical`, `obsolete` (default: `live`)
- Located in `src/app/articles/md/`

**Thoughts** (`ThoughtSchema`):
- Fields: title, date, tags, description
- No lifecycle tracking
- Located in `src/app/thoughts/md/`

Data fetching uses React's `cache()` wrapper around `findMarkdown()` for
request-level deduplication (see `articles.ts` and `thoughts.ts`).

### Type System

`src/types.ts` defines Zod schemas (`ArticleSchema`, `ThoughtSchema`) that
serve as both runtime validators and compile-time type sources via
`z.infer<typeof Schema>`. The `tag` discriminator and `lifecycle` default are
injected by Zod's `.default()` during parsing, not by mutation.

### Key Patterns

- **`use()` for promises:** Server components pass promises as props; client
  components call React's `use()` to suspend until resolved.
- **`useExploded`:** A Proxy-based hook that takes `Promise<{a, b}>` and
  returns `{a: Promise<a>, b: Promise<b>}`, allowing individual fields to be
  passed as props before the parent promise resolves.
- **Dynamic imports:** The Mermaid renderer is loaded via `next/dynamic` with a
  loading fallback to avoid bundling the large mermaid library on all pages.
- **Middleware URL normalisation:** `src/proxy.ts` redirects any URL containing
  uppercase characters to its lowercase equivalent.

## Commands

```sh
pnpm run dev      # Start local dev server (next dev)
pnpm run build    # Production build (next build --experimental-app-only)
pnpm test         # Runs lint, then Jest
pnpm run lint     # ESLint + TypeScript type-check (eslint && tsc -b .)
pnpm run format   # Auto-fix: eslint --fix . && tsc -b .
```

## Testing

- Test runner: Jest 30 with SWC transform
- Environment: jsdom (via jest-environment-jsdom)
- Test files: `test/` directory, mirroring `src/` structure
  - `test/utilities.test.ts` — utility function tests
  - `test/client/qr/QRCodeForm.test.tsx` — QR code form component tests
  - `test/components/ListingEntry.test.tsx` — listing entry component tests
- Libraries: `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`
- `pnpm test` runs `pnpm run lint` as a pretest step

## Non-obvious Details

- **CSP configuration:** `next.config.ts` sets strict Content-Security-Policy
  headers in production (with `report-uri`). New external resources will be
  blocked unless the CSP rules are updated.
- **Mermaid dynamic import:** Mermaid is loaded client-side only via
  `next/dynamic`. The `intoReact` pipeline also strips the `<pre>` wrapper
  around mermaid code blocks so rehype-react can substitute the component.
- **`shiftIf` frontmatter extraction:** Rather than using a standard frontmatter
  plugin's built-in extraction, a custom `shiftIf` helper peels the first YAML
  node from the tree. This allows the frontmatter to travel through the rest of
  the pipeline on `vfile.data.frontMatter`.
- **`pageExtensions`:** Set to `['js', 'jsx', 'ts', 'tsx']` in
  `next.config.ts` — `.md` files are **not** page sources; they are read from
  the filesystem by `traverse.ts`.
- **React Compiler:** Enabled in `next.config.ts` (`reactCompiler: true`),
  with the ESLint plugin for compiler-compatible code.
