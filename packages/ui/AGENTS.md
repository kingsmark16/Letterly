# UI package

## Overview

This package contains reusable React UI primitives shared by the web application and future workspaces. It is presentation code only and must not contain confession business rules, authorization, database access, or provider clients.

## Key files

| File                         | Owns                             |
| ---------------------------- | -------------------------------- |
| `packages/ui/src/button.tsx` | Button primitive                 |
| `packages/ui/src/card.tsx`   | Card primitive                   |
| `packages/ui/src/code.tsx`   | Code display primitive           |
| `packages/ui/package.json`   | Package exports and local checks |

## Commands

```bash
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
pnpm --filter @repo/ui test
```

## Conventions

- Components must support keyboard use, visible focus, meaningful labels, and the WCAG AA baseline.
- Keep components small and composable. Prefer named exports.
- Follow the installed React best practices and web design guidelines when adding or changing primitives.
- Export components through the existing wildcard package boundary unless a deliberate public API decision changes it.
- Keep domain logic outside this package.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
