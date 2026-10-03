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

The table lists representative primitives. The package also owns container, dialog, field, icon button, input, link, stack, status, and textarea components.

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
- IconButton shares the canonical Button variants and keeps its plain button/name/loading contract. Status uses static classes and caller supplied state slots; only errors with recovery announce as alerts.
- Input and Textarea share static classes through the internal `src/lib/control-styles.ts`; Field uses Tailwind classes and preserves its label/error associations. The textarea minimum height is a canonical token. Global control hover rules must not override invalid borders.
- Link, Container, and Stack now use static token-backed Tailwind classes and `cn`. Container preserves the legacy page width cap even for full size; Stack declares all nine gap classes explicitly and passes caller inline styles through. Their CSS Module selectors are removed; browser compatibility checks include actual server-rendered layout output.
- `components.json` and [README.md](README.md) own source generation guidance. The root `@repo/ui` TypeScript alias resolves the generator destination; runtime consumers use explicit public subpaths. Both workspace configurations route shared UI and `cn` to this package, with the web global stylesheet as the Tailwind compiler input.
- Button and Card own their canonical Tailwind implementations here. Button variants and sizes derive from one static variant definition. `src/lib/utils.ts` owns `cn`, with Letterly typography, radius, shadow, target, and duration merge coverage, exported as `@repo/ui/lib/utils`.
- Dialog uses Tailwind classes and preserves the native lifecycle, semantic element structure, and inclusive compact query at 48rem. Its width cap is a token, and the web configuration test guards compact query alignment. Icon only close composes the shared IconButton, owns its canonical interaction colors and glyph token, and keeps a 44 px target at every viewport. The shared CSS Module is removed; remaining feature root/header overrides still need migration under spec 0009.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
