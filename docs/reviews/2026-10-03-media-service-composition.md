# Media service composition and logging boundary

Date: 2026-10-03

## Result

PageMediaService now takes plain repository, storage, image processor, and failure logger constructor inputs. NestJS imports/decorators and internal Logger construction are removed. A full file comparison against the previous commit confirmed only framework wiring/imports and the logger constructor input changed. All method bodies, stage tracking, error classification, retry/read/removal behavior, cleanup keys, leases, concurrency counters, and provider error detail extraction remain unchanged.

The new application PageMediaFailureLogger port exposes the existing completion event shape. StructuredPageMediaFailureLogger lives in infrastructure and forwards it through NestJS Logger with the existing PageMediaService context. PagesModule owns the typed pageMediaServiceProvider factory and PAGE_MEDIA_FAILURE_LOGGER useExisting alias. All four dependencies are required; existing repository/storage/processor aliases and the service class token remain intact. Singleton scope keeps processing counters shared across calls.

## Verification

Thirteen new real Nest container cases exercise the production factory through all four port overrides. They cover sanitized completion inputs and output/storage/delete/activation ordering, the three-minute processing lease, provider failures at read_source/write_output/delete_source/mark_ready, exact field-limited logs before failure persistence, safe errors and output cleanup records, processor failure codes without provider logging, two-per-creator and eight-per-instance caps, slot release after failed claims, all four required dependency failures, and service replacement without missing dependencies.

The obsolete decorator-based unit container case was moved to the production factory suite. Existing service unit cases now supply a typed mock logger and continue checking provider message/path exclusion. One infrastructure adapter unit case verifies payload forwarding and logger context. API unit count remains 498 while suite count increases to 62. The focused service/logger unit suites pass sixteen cases.

| Check                              | Result                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Focused production factory suite   | 13 passed                                                                       |
| Focused service/logger unit suites | 16 passed                                                                       |
| Root lint                          | Passed                                                                          |
| Root formatting                    | Passed                                                                          |
| Root type checks                   | Passed                                                                          |
| Root unit tests                    | 552 passed: API 498 across 62 suites, web 33, database 6, UI 15                 |
| API integration and composition    | 154 passed, 7 skipped; fifteen passing and four skipped suites                  |
| Production builds                  | Passed; API rebuilt, unchanged web/database builds reused valid Turborepo cache |
| Boundary probes                    | Seven expected results                                                          |
| Full service comparison            | Only framework wiring/imports and logger constructor input changed              |

Import probes reject NestJS logger/types, Express types, and database types in application media, allow repository/logger ports, and reject framework types in the logger port. No React code changed.

## Limits and next work

Verification was performed by the implementing agent; no independent fresh model review ran. Factory tests mock persistence/storage/image processing and verify orchestration and input forwarding, not live ownership isolation, R2 writes, database leases, or Sharp sanitization. The existing error name/code extraction and logger failure propagation are preserved. Seven database cases remain skipped. Browser journeys, seeds, migrations, deployments, and remote publication were not run.

Next, migrate PageService logging and composition while preserving required repository/template reader inputs, optional app origin/password/journey/metrics inputs, public read retries, locked projections, template identity, and safe errors. Broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the visible no JavaScript fallback issue remain further work. The parent migration stays In Progress.

Durable pages context now records the logger port and composition boundary. Existing product scope statuses remain unchanged because this refactor does not complete another product slice. The parent spec links this implementation contract and verification report.
