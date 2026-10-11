# Page browser endpoint ownership

## Result

All 38 remaining browser request and media helper functions now live in `apps/web/src/features/pages/api/`, grouped by lifecycle, questions, journeys, images, audio, uploads, public actions, submissions, and analytics. The page query key factory moved to `api/query-keys.ts`. The existing creator list endpoint remains in the same API folder.

Twenty one consumers import those owners directly. Safe error imports point to the shared `src/lib/api/errors.ts`. Both former files, `src/lib/api-client.ts` and `src/lib/page-keys.ts`, are removed without compatibility barrels. The template composition test mocks the new lifecycle module. The template boundary lint rule retains its feature/transport restrictions and removes the obsolete central file pattern.

This implements endpoint and query key ownership in [the repository structure decision](../specs/0022-repository-structure/index.md). No route, database, provider, dependency, launch registration, or UI behavior changes.

## Preservation evidence

A TypeScript parser comparison against HEAD checks all 38 complete function declarations, exactly once across the new modules. Their source is identical after newline normalization. The query key factory is also identical, preserving existing caches and invalidation identity.

A second parser comparison checks all 21 consumers' non import statements. They are identical, apart from the explicit test mock target update. This establishes preserved query/mutation orchestration, form state, upload recovery, and private response retry behavior. The new module imports are resolved by lint, type checking, production compilation, and the exercised browser paths.

Signed uploads still use their existing timeout, content type, checksum header, progress bounds, and safe error conversion. Audio upload still delegates to the shared source upload helper. The SHA-256 browser/fallback paths remain unchanged. Public actions retain same origin routing, slug encoding, payload schemas, and journey idempotency headers. Owner requests retain their original parameters, schemas, methods, and response parsing through the same shared Axios client.

## Verification

| Check | Outcome |
| --- | --- |
| Function/query key declaration preservation | PASS, 38 declarations and the query key factory |
| Consumer statement preservation | PASS, 21 consumers |
| Obsolete source/import search | PASS, former files and application references removed |
| Web unit tests | PASS, 67 tests |
| Root unit tests | PASS, 775 tests across five workspaces; four unchanged workspace inputs reused caches |
| Root lint | PASS, seven tasks, fresh web lint |
| Formatting | PASS after formatting the shortened lint pattern |
| Web type check | PASS, generated route types and TypeScript |
| Root type check | PASS, seven tasks with concurrency two, fresh web check |
| Root production build | PASS, fresh normal Next.js output after browser fixtures; unchanged API/database builds reused caches |
| Browser fixtures | PASS, 72 desktop/mobile tests, fresh fixture build and normal server teardown |
| Diff whitespace | PASS |

Browser coverage includes creator reads/saves/deletion, dirty journey refresh recovery, unsupported template identity, private response read/delete/retry states, catalog preview focus, public response idempotency, and readable public projections. Those journeys use fixture API responses and do not prove live database, identity provider, or storage behavior. Byte transfer and every endpoint operation are not individually exercised by these browser cases; exact declaration preservation is the evidence for unchanged unexercised functions. No bundle or performance improvement is claimed.

The server logged early destination stream closes during navigation, as in earlier fixture runs. All assertions passed; those logs are not claimed fixed. API integration was not repeated because no API source or behavior changed.

## Context and follow-up

Web, page feature, and browser transport context now name the real endpoint and error owners. The shared transport has no feature imports. Direct feature imports follow Vercel React's module ownership guidance while public package exports remain respected.

The creator list endpoint already passes TanStack Query's AbortSignal to Axios. Other read endpoints preserve their existing signatures and still need signal plumbing as a separate React alignment step. This ownership milestone does not claim cancellation completeness. The overall restructuring remains In Progress, and this report records self verification rather than an independent review.
