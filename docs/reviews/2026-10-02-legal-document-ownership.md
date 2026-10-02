# Legal document ownership milestone

Date: 2026-10-02

Branch: `feat/repository-verification-baseline`

Starting revision: `6fd315e`. Freshness check found zero missing commits from the freshly fetched `origin/main`.

Governing decision: [Repository structure and ownership](../specs/0022-repository-structure/index.md), reusable legal ownership and rollout milestone 2. The user authorized continuation with “next”. This is a record of implementation verification, not an independent model review.

## Change

`apps/web/src/features/legal/privacy-document.tsx` and `terms-document.tsx` now own reusable legal content, section contents, update dates, and document presentation. `legal-page.module.css` owns the existing shared policy styles, moved intact from the terms route.

The privacy and terms routes keep their metadata and page composition. The privacy route now renders `PrivacyDocument` instead of maintaining a second copy of its markup. The landing, sign in, sign up, password recovery, password reset, and email verification routes import documents directly from the legal feature. No reusable document imports remain from `app/privacy/page.tsx` or `app/terms/page.tsx`.

The client dialog still receives server rendered document nodes and owns opening, closing, and focus. No client directive, new barrel, dependency, legal wording, publication date, schema, database change, or API change was added.

## Acceptance and evidence

| Requirement                                      | Verification                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reusable content belongs to the legal feature    | Both documents and their stylesheet have one feature owner. Eight route consumers use direct imports. Search found no former document or stylesheet imports in maintained web source.                                                                                                          |
| Policy content and route metadata stay unchanged | Original and moved data/render functions match after export renaming and formatter normalization. All CSS declarations match. Browser comparison against captures made before extraction preserves both article texts, titles, descriptions, and all 40 section IDs and heading relationships. |
| Routes and dialogs retain their behavior         | 32 browser checks passed across desktop and mobile Chromium. These include the existing nine legal cases on each project, both dialogs on all five authentication routes, exact document comparison, and keyboard operation with reduced motion.                                               |
| Responsive presentation remains usable           | Existing policy checks cover 390, 768, 1024, and 1440 pixel widths, nonzero section widths, and no document overflow. Mobile dialog bounds and desktop centering checks pass. Inspected mobile privacy and desktop terms screenshots.                                                          |
| Compiler, formatter, and application checks pass | Web lint, web type checks, root formatting check, six web unit tests, and the final web production build pass. `git diff --check` passes.                                                                                                                                                      |

Browser verification used the production web build on `127.0.0.1:3100`. The API was not started. The first run attempted normal landing catalog navigation and timed out with the API unavailable. The successful run copied the existing legal cases into ignored local output and changed only landing navigation to the existing `/?uiFixture=empty` fixture. All assertions were retained. Additional local checks exercised authentication dialog consumers and keyboard behavior. Temporary configuration, baseline captures, and screenshots remain ignored under `apps/web/output/legal-ownership/`.

The initial keyboard probe asserted that every Tab kept `document.activeElement` inside the dialog, including when Chromium moves focus into its browser chrome. The corrected check verifies dialog focus, forward movement through close/contact controls, backward movement, Escape, and restored trigger focus. It passes in both browser projects.

## Existing issue confirmed separately

With JavaScript disabled, both full policy articles are inside a hidden streamed `DIV` with ID `S:0`; their measured bounds are zero. This fails the supplemental progressive rendering check. Rebuilding the original route files and original stylesheet from `6fd315e` reproduces the same issue on both routes. The current source bytes were restored in a `finally` block, and the final production build and passing browser run use the extracted feature implementation.

The no JavaScript issue is not reported as fixed or passing. Investigate the root rendering and Suspense boundaries in a separate focused fix. The final passing browser command excludes this known failing supplemental probe; it does not claim the whole browser suite passes.

## Skills and limits

Vercel React guidance: `bundle-barrel-imports` is applied through direct feature imports. The documents remain server components, consistent with `server-serialization`; the existing client dialog boundary receives rendered content rather than importing document definitions. No bundle size or runtime performance improvement is claimed. Installed Next.js page, CSS, and server/client documentation was consulted before moving code.

The development skill governs the narrow ownership slice. Accessibility guidance governs keyboard, focus restoration, responsive layout, and reduced motion checks. The sync skill records feature ownership in web context and adds context for the newly introduced legal area.

NestJS files were not changed. API unit/integration tests, the complete browser suite, GitHub CI, deployment, push, pull request, and formal independent code review were not performed in this milestone. The user's preexisting `skills-lock.json` edit remains outside the commit.

The development skill's read only scout inspected the extraction and reported no actionable issue in content, metadata, update dates, sections, anchors, style ownership, or server/client boundaries. This is additional exploration, not a certified independent review.
