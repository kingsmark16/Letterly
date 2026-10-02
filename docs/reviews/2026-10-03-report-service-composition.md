# Report service composition boundary

Date: 2026-10-03

## Result

PageReportsService now receives a plain PageReportsRepository constructor input. It imports no NestJS and has no Injectable/Inject decorators. Its public page scope lookup, slug normalization, report creation, receipt projection, safe error classes, and exported paths are unchanged. A comparison against the previous Git contents confirmed the entire service differs only in framework wiring removal and constructor formatting.

PagesModule registers pageReportsServiceProvider under the same PageReportsService class token. The factory requires PAGE_REPORTS_REPOSITORY and retains its existing Prisma alias and default singleton scope. Repository overrides and service token replacements continue to work. The named declaration remains in module composition, following the password and question service pattern.

## Verification

Eight new cases exercise the production factory. Six run through the real PublicPagesController, request/response schemas, report service, and HTTP exception filter. They cover anonymous receipt creation, normalized slug/message inputs, safe public response headers, hashed browser identity passed to rate limiting, scope/limit/write ordering, unavailable pages before creation, a page disappearing after scope lookup, safe failures at either repository stage, and malformed request rejection before lookup or writes. Two isolated containers verify required dependency failure and a service token override. The success case verifies singleton resolution and repository override selection.

The first broad lint run found two unnecessary nonnull assertions in test call order checks. They were removed. Lint, type checks, formatting, and the focused eight cases passed after that test only correction. Full unit/integration suites and production builds had already passed with the same production source and runtime assertions.

| Check | Result |
| --- | --- |
| Focused HTTP/composition suite | 8 passed, including final test correction |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 552 passed, API 498 across 61 suites, web 33, database 6, UI 15 |
| API integration and composition | 61 passed, 7 skipped, seven passing and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Boundary probes | Six expected results |
| Service comparison | Only framework wiring removal and constructor formatting differ |

ESLint now applies the migrated service framework restriction to reporting alongside password and question services. Probes confirm NestJS/Express imports, including type imports, are rejected; plain repository and report request types remain allowed; existing database restrictions still apply. The broader application layer still contains decorated services and is not fully framework independent.

## Limits and next work

Verification was performed by the implementing agent; no independent fresh model review ran. The new HTTP suite uses real anonymous routes and Nest composition with mocked repository and rate limiting. It does not validate live PostgreSQL availability, report transactions, shared Redis limits, moderation, or authentication providers. Seven database tests remain skipped. Browser journeys, seeds, migrations, deployments, and remote publication were not run.

Next, apply the same composition boundary to PageAnalyticsService while preserving UTC day calculations, owner queries, visitor metrics, and repository error behavior. Remaining decorated services, broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the known visible no JavaScript fallback issue remain further work. The parent repository migration remains In Progress.
