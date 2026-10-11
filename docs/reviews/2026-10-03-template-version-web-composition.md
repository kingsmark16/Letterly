# Template version composition verification

## Result

Eighteen new cases execute the actual owner query component, public presentation, public route and metadata function, preview composition, and preview route against retained inactive v1 and active v2 registrations. They close the web wrapper evidence gap identified in [the preceding binding report](2026-10-03-template-version-web-bindings.md).

The suite lives in `apps/web/src/features/pages/template-version-composition.test.ts` because it verifies application orchestration and uses TanStack Query. The template implementation folder retains presentation ownership. No production component, canonical registration, launch status, dependency, or page reference changes in this milestone.

## Coverage and limits

The owner tests use the actual DraftEditor, actual query key factory, and a real QueryClient seeded with schema validated published page projections. Distinct saved version IDs and output markers establish version selection. Both saved pages also render within one query client without overwriting each other's cache entries.

Public cases execute the actual presentation dispatcher and Next.js route, including its metadata function. Preview cases execute the actual preview composition and route. Exact saved identities select distinct output and metadata; conflicting or ambiguous known identities return existing unavailable states without catalog fallback. Locked fixtures deliberately include a private body and assert that the route never dispatches a renderer or emits that body.

Registration fixtures use the real metadata resolver and implementation registry. Boundary transports, template bodies, Next.js chrome, and CSS are mocked. This is server rendering evidence, not a future version hydration or live database test. It establishes selection through production orchestration without activating another template or asserting support for arbitrary content models.

The existing Node runner now uses `tsx --tsconfig tsconfig.test.json --experimental-test-module-mocks`. The test config selects automatic JSX for imported TSX, leaving the Next.js application config intact. Native module mocks use uncached exports and install before production wrapper imports. CSS hooks and mocks are restored when the isolated test process finishes. Node emits its expected experimental module mocking notice. No additional testing dependency is installed.

## Verification

| Check | Evidence |
| --- | --- |
| Web unit tests | PASS, 67 tests, including 18 composition cases; rerun after file review |
| Root unit tests | PASS, 775 tests across five workspaces; unchanged API, database and UI inputs reused caches |
| Root lint | PASS, seven workspace tasks |
| Formatting | PASS |
| Root type check | PASS, seven workspace tasks with concurrency two |
| Root production build | PASS, fresh Next.js output; unchanged API and database inputs reused caches |
| API integration | PASS, 595 tests; seven skipped, 25 passing suites and four skipped suites |
| Browser journeys | Prior runtime milestone PASS, 72 desktop/mobile launch cases; not rerun for this test harness change |
| Diff whitespace | PASS |

The service and persistence version proofs remain in [the service report](2026-10-03-template-version-service.md) and [the persistence report](2026-10-03-template-version-persistence.md). Database rollback evidence uses an isolated transaction host, not PostgreSQL. The seven database dependent integration cases remain skipped in this local verification.

A repeat type check initially forwarded the concurrency flag to TypeScript and failed with an unknown compiler option. Running `pnpm exec turbo run check-types --concurrency=2` correctly applied the flag to Turborepo and passed all seven tasks. This was a command invocation correction, with no source change.

## Reconciliation

The final progress paragraph in the governing version retention spec is stale: it says complete owner query components and public routes lack fixture coverage. This suite supplies that coverage. The spec remains In Progress pending a criterion by criterion evidence audit and architecture reconciliation. The parent repository restructuring and overall goal remain In Progress. This is self verification, not an independent review.
