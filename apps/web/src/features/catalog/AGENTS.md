# Web catalog feature

## Overview

This area owns template discovery, catalog browsing, card presentation, lazy preview modal dialogs, and draft creation. It provides server data readers for public category and paginated template endpoints, and keeps presentation logic decoupled from template implementations.

## Key files

| File | Owns |
| --- | --- |
| `catalog-copy.ts` | Shared capability labels, introductory copy, and fallback card descriptions |
| `components/catalog-template-card.tsx` | Catalog card presentation, category badge, and action triggers |
| `components/catalog-template-card.module.css` | Card layout, artwork container, and typography styling |
| `components/create-draft-button.tsx` | Client draft creation mutation, auth session check, and return path navigation |
| `components/create-draft-button.module.css` | Button states, feedback alert presentation, and draft recovery link |
| `preview/template-preview-dialog.tsx` | Accessible preview modal trigger, native dialog fallback, and hydration gating |
| `preview/template-preview-dialog.module.css` | Dialog container, responsive dimensions, and trigger styling |
| `preview/template-preview-content.tsx` | Preview dialog body, capability list, and dynamic preview frame mounting |
| `preview/registered-preview.tsx` | Dynamic import map and exact version dispatch for registered template previews |
| `preview/secret-letter-preview.tsx` | Secret Letter catalog sample letter presentation without feature forms |
| `server/catalog.ts` | Server readers with single retry logic for category, overview, page, and lookup endpoints |
| `server/catalog.test.ts` | Unit coverage for transient retry and error status handling |

## Conventions

- Validate all server catalog data with shared Zod schemas from `@letterly/contracts/catalog`.
- Server catalog reads use `cache: "no-store"` and retry once after a network failure (`TypeError`) or HTTP 500, 502, 503, or 504. Permanent errors fail immediately.
- Preview dialogs render on demand and load template previews with dynamic imports so inactive templates do not penalize initial bundle size.
- Previews fall back to full page routes when native HTML dialog is unsupported.
- `CreateDraftButton` redirects unauthenticated visitors to sign in with an encoded return path pointing to the chosen template start route.
- If draft creation encounters a network failure or 5xx error, prompt the user to inspect existing drafts before retrying to prevent duplicate pages.

## Gotchas

- Template preview dialogs must mount template previews only while open to prevent unnecessary rendering work.
- The web application avoids the legacy `GET /api/v1/templates` array route; use `/api/v1/catalog/templates` or `/api/v1/catalog/overview`.

## Related specs

- [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)
- [Authenticated Secret Letter draft loop](../../../../../docs/specs/0003-authenticated-secret-letter-draft-loop.md)
- [Preview dialog composition](../../../../../docs/specs/0022-repository-structure/0022-preview-dialog-composition.md)
- [Catalog boundaries](../../../../../docs/specs/0022-repository-structure/0022-catalog-boundaries.md)
- [Catalog growth and bounded browsing](../../../../../docs/specs/0022-repository-structure/0022-catalog-growth-pagination.md)
- [Native dialog browser policy](../../../../../docs/specs/0022-repository-structure/0022-native-dialog-browser-policy.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

