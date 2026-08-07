# Web application

## Overview

This workspace is the Next.js App Router web application. It owns page rendering, browser interaction, public page presentation, and same origin calls to the API. Business rules and authorization remain in the API boundary.

## Key files

| File | Owns |
|---|---|
| `apps/web/package.json` | Web scripts and Next.js dependencies |
| `apps/web/app/layout.tsx` | Root document layout and metadata |
| `apps/web/app/page.tsx` | Current home page entry point |
| `apps/web/app/globals.css` | Global web styles |
| `apps/web/next.config.js` | Next.js configuration and future API rewrites |

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web check-types
```

## Conventions

- Use feature based folders as the web surface grows.
- Keep API calls and browser state at the presentation boundary. Do not place authorization rules in client components.
- Keep reusable UI accessible at WCAG AA level and follow the installed React and web design guidance.
- Use named exports for reusable components. Use default exports only where Next.js requires them for route entry files.
- Public confession pages use the reserved `/p/[slug]` route described by the architecture spec.

## Gotchas

- The current package script is named `check-types`; the root command is `pnpm check-types` until tooling standardizes the future `typecheck` name.
- The API workspace owns NestJS endpoints, but the starter page must not invent API or database calls before their contracts and feature slices exist.

## Related specs

- [Stack and architecture](../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
