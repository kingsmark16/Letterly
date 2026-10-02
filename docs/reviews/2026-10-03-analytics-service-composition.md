# Analytics service composition boundary

Date: 2026-10-03

## Result

PageAnalyticsService now receives a plain PageAnalyticsRepository constructor input. It imports no NestJS and carries no Injectable/Inject decorators. Its public slug normalization, UTC visit dates, duration forwarding, owner queries, default period, activity construction, safe not found error, and repository error propagation remain unchanged. A full file comparison against the previous Git contents confirmed the only changes are framework wiring removal and constructor formatting.

PagesModule registers pageAnalyticsServiceProvider under the same class token. The typed factory requires PAGE_ANALYTICS_REPOSITORY, keeps its existing Prisma alias, and retains default singleton resolution. Repository overrides and service replacements continue to work. No additional application wiring file or clock abstraction was introduced.

## Verification

Eight new composition cases use the production factory. Real owner/public controllers, schemas, and the HTTP filter are exercised with mocked repositories, public projections, rate limiting, and fixture sessions. The fixed clock is October 3 at 00:15 in Manila, which is still October 2 in UTC. Networking timers remain live, and the clock is restored before application shutdown.

Owner checks verify the authenticated creator is passed despite an untrusted query field, a seven day UTC window crosses September/October, stored activity is retained, missing dates contain the existing zero/null fields, and private response headers remain present. A direct service case verifies the default thirty day window. Public checks verify normalized slug lookup, a page scoped browser hash, UTC visit date, unchanged duration arguments, and rejection of locked projections before analytics lookup or writes. Remaining cases verify unavailable owner mapping, propagation of the original repository failure, required dependency failure, singleton resolution, and service overrides.

| Check | Result |
| --- | --- |
| Focused new composition suite | 8 passed |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 552 passed, API 498 across 61 suites, web 33, database 6, UI 15 |
| API integration and composition | 69 passed, 7 skipped, eight passing and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Boundary probes | Six expected results |
| Service comparison | Only framework wiring removal and constructor formatting differ |

The migrated service framework import rule now includes analytics alongside password, question, and reporting services. Probes reject NestJS/Express imports, including type imports, allow plain repository and period contracts, and confirm database restrictions remain active. Other decorated application services remain migration work.

## Limits and next work

The implementing agent performed verification; no independent fresh model review ran. The tests do not validate live PostgreSQL metric aggregation, ownership queries, shared rate limits, authentication providers, or browser visibility tracking. Public page projections and fixture sessions are mocked, so locked projection rejection does not prove real password validation. Seven database tests remain skipped. Browser journeys, seeds, migrations, deployments, and remote publication were not run.

Next, apply the same composition boundary to PageSubmissionsService while preserving payload hashing, idempotency results, private owner access, response confirmation, and safe errors. Remaining decorated services, broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the known visible no JavaScript fallback issue remain further work. The parent migration stays In Progress.
