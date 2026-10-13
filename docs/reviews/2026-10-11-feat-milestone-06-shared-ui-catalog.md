# Review, feat/milestone-06-shared-ui-catalog, 2026-10-11

**Reviewed by**: GPT-5.6 Terra (author on GPT-6)
**Scope**: 264 files, feat/milestone-06-shared-ui-catalog vs origin/staging
**Verdict**: Approve with nits

## Summary

This milestone moves shared UI and feature ownership into their intended packages, adds bounded catalog overview, cursor-page, and lookup reads, isolates public template presentations, and extends fixture and browser coverage. The catalog API, Prisma index migration, route composition, native-dialog fallback, and cancellation work are internally consistent with the governing specifications. The only finding is an unenforced server-only boundary on the new catalog reader; it does not break current behavior but leaves a server module importable from client code.

## Minor

### Minor: Mark the catalog reader as server-only, `apps/web/src/features/catalog/server/catalog.ts:1`
**Problem**: This module reads `process.env.APP_ORIGIN` and performs server route data loading, but it has no `import "server-only"` marker. The repository-structure decision explicitly requires server readers to be kept separate from browser clients and marked with `server-only` where appropriate.
**Why it matters**: A future client component can import this module without Next.js rejecting the boundary. That could expose its server request behavior to the browser bundle or fail at runtime, and the feature-oriented move would no longer enforce the ownership it documents.
**Suggested fix**: Add the `server-only` marker at the module boundary and retain browser transport calls under `src/lib/api` and feature `api/` owners.

## Strengths

- Catalog pagination applies filters before Prisma paging, uses `(displayOrder, id)` cursor positions, takes at most `size + 1` families, validates cursor filter and size binding, and adds matching indexes.
- The public catalog responses resolve trusted registry capabilities without returning registry keys, and unavailable or ambiguous identities fail closed with safe errors.
- Native-dialog enhancement preserves ordinary route links for unsupported or JavaScript-disabled browsers, while the focused multi-browser suite exercises focus return, inert background behavior, Escape, overlay policy, and compact layouts.
- Browser cancellation coverage verifies each migrated owner read passes the TanStack Query abort signal through Axios and leaves retained query data intact after cancellation.

## Test coverage

Coverage is strong for the changed behavior. API service, controller, cursor, and Prisma-argument tests cover bounded catalog reads and safe errors; web unit tests cover catalog readers, session hydration, registry identity, and cancellation; Playwright fixture suites cover catalog growth, public rendering, template registration, dialogs, and performance budgets across configured browsers. The new server-reader ownership boundary itself has no automated enforcement test, which is the finding above. I did not execute the repository test gates during this independent source review.
