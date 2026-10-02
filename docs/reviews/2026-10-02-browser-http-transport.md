# Browser HTTP transport milestone

Date: 2026-10-02

Branch: `feat/repository-verification-baseline`

Starting revision: `8a88efa`. Freshly fetched `origin/main` has no missing commits. The user authorized the next slice with “next”.

Governing decision: [Repository structure and ownership](../specs/0022-repository-structure/index.md), web transport ownership and rollout milestone 3. This records implementation and verification, not a formal independent review.

## Ownership and request flow

`apps/web/src/lib/api/transport.ts` owns the two existing Axios clients and schema validated request helper. It preserves the `/api/v1` and `/` bases, credential handling, JSON headers, and 35 second timeout. `errors.ts` owns the original error class and safe normalization. A source comparison confirms the moved error class and normalizer match their originals after export and formatting normalization.

`apps/web/src/features/pages/api/list-pages.ts` owns the creator page list endpoint. Its input and output sources remain `listPagesQuerySchema` and `pageListResponseSchema`. The dashboard imports it directly, keeps its existing query keys and pagination behavior, and passes TanStack Query's abort signal to Axios.

Flow: dashboard query, validated status/size/cursor, shared credentialed `GET /api/v1/pages`, existing Nest guard and validated query boundary, owner scoped list service, safe page summary projection, shared response schema, dashboard cards. No server route, controller, repository, database schema, or API envelope changed.

Cancellation is the one deliberate behavior improvement: a canceled request retains its Axios cancellation identity rather than being turned into an offline error. This lets query cancellation stop obsolete in-flight work. Existing network, timeout, malformed response, request ID, and safe error details remain unchanged.

Remaining endpoint functions use the extracted transport but stay in `api-client.ts` for later bounded migrations. Its error reexport is deliberate compatibility for existing consumers and points to the same class. The migrated list implementation and unused `listDrafts` alias were removed from that module. Direct external storage uploads keep their existing upload behavior.

## Verification

| Check                   | Result                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root uncached unit gate | 420 tests pass: 386 API, 15 UI, and 19 web.                                                                                                                                                                                                                                                                                                          |
| Web boundary coverage   | Thirteen new tests cover validated page lists, default/bounded pagination, input validation before dispatch, schema rejection, credentials/settings, safe HTTP error fields, timeout/network normalization, private diagnostic exclusion, error identity, and in-flight abort. All tests run through `pnpm test` and the existing CI workspace gate. |
| API HTTP integration    | `pnpm --filter api test:e2e --runInBand --runTestsByPath test/pages-drafts.e2e-spec.ts` passes nine existing tests using mocked providers. These exercise authorization, DTO validation, safe projections, error envelopes, and private cache headers without a live database.                                                                       |
| Browser callers         | Six selected checks pass across desktop/mobile Chromium: existing page status filters, new cursor pagination, and safe malformed response handling with explicit retry recovery. Four passed in the first fixture run; the two error checks passed after narrowing their alert locator.                                                              |
| Static checks           | Web lint, web type checks, root formatting check, and `git diff --check` pass.                                                                                                                                                                                                                                                                       |
| Production build        | Web production build passes with the existing route surface.                                                                                                                                                                                                                                                                                         |

Browser checks use the real production web bundle and intercepted auth/list responses. The server rendered dashboard layout also reads categories, so the local harness supplies an empty category response through a read only HTTP fixture on `127.0.0.1:3001`. It has no database or external provider access. The first attempt without that fixture timed out during page navigation. The fixture resolves the test environment dependency; it does not alter application code.

The new error recovery browser test initially matched both the dashboard alert and Next.js's route announcer. Its assertion now scopes to `#dashboard-content`, and both project runs pass. The temporary browser configuration and reports are ignored under `apps/web/output/http-transport/`; new behavioral tests are committed under `e2e/`.

## Skill alignment and limits

Vercel React `bundle-barrel-imports` guides direct feature imports. The dashboard no longer imports the broad endpoint module for page listing. The blueprint's centralized Axios, response validation, safe errors, and cancellation requirements are applied to this first endpoint. No bundle size or performance improvement is claimed without measurement.

NestJS `error-use-exception-filters`, `test-use-testing-module`, `test-e2e-supertest`, and `test-mock-external-services` guide preservation and verification of the existing transport envelope and HTTP test boundary. This slice changes browser ownership, not Nest architecture. The development skill guides the bounded migration, and sync records the new transport area and endpoint owner.

Live database integration, provider authentication, full browser regression, GitHub CI, deployment, push, pull request, and formal independent review are not reported as completed. The existing no JavaScript policy rendering issue recorded in the previous milestone remains unresolved. The user's `skills-lock.json` edit remains outside the commit.

The development skill's read only scout found no concrete correctness issue in transport settings, response validation, error identity, cancellation, or migrated callers. It confirmed there are no repository consumers of the removed `listDrafts` alias. Raw storage/removal error paths still use the original normalizer and do not currently receive cancellation signals; their behavior was not changed or broadened in this slice.
