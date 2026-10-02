# Page service composition and logging boundary

Date: 2026-10-03

## Result

PageService now takes plain constructor inputs without NestJS imports/decorators or internal Logger construction. A full file comparison against the previous commit confirmed only framework wiring/imports and a required logger constructor input changed. All use case bodies, template checks, lifecycle/error mapping, public retry logic, password checks, locked/public projections, and metric behavior remain identical. Internal direct-construction unit tests now pass the logger before the optional arguments.

PublicPageReadFailureLogger exposes the existing field-limited warning event. StructuredPublicPageReadFailureLogger lives in infrastructure and forwards it through NestJS Logger with the existing PageService context. PagesModule owns pageServiceProvider and the logger useExisting alias. Pages repository, template reader, and logger are required; app origin, password service, journey service, and metrics retain optional token injection. The localhost origin default, class token, singleton scope, aliases, and overrides remain intact.

PageService was the last production pages application NestJS consumer. The previous per-service import restriction is now a folder rule covering production application/domain files and excluding unit tests. Database/storage/image provider restrictions remain independently enforced. A scan of all 51 production pages application/domain TypeScript files found no NestJS/Express imports. This completes the pages framework import boundary, not the overall repository migration.

## Verification

Sixteen new real Nest container cases exercise the production factory with mocked ports. They cover absent/present origin and its default URL, normalized public slugs and singleton resolution, optional password checks with locked/unlocked results, proof reader invocation with the trusted page ID, password version/token forwarding, valid journey defaults and optional metrics, present/absent journey publication dependencies with conflict/unavailable metrics, all three public warning stages, safe metadata, bounded transient retry attempts, all three required dependencies, and service overrides without missing dependencies.

The initial container fixture referenced a nonexistent settings property and was corrected to explicit settings. A long string did not trigger the existing public projection schema; the final malformed projection fixture uses an invalid image ID. No production schema or validation changed. The final focused factory suite passed all sixteen cases. Fifty existing/new service/logger unit cases pass, including 100/200ms retry delay checks, password failures, template/publish behavior, warning metadata, and infrastructure logger context.

| Check                              | Result                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Focused production factory suite   | 16 passed                                                                       |
| Focused service/logger unit suites | 50 passed                                                                       |
| Root lint                          | Passed                                                                          |
| Root formatting                    | Passed                                                                          |
| Root type checks                   | Passed                                                                          |
| Root unit tests                    | 553 passed: API 499 across 63 suites, web 33, database 6, UI 15                 |
| API integration and composition    | 170 passed, 7 skipped; sixteen passing and four skipped suites                  |
| Production builds                  | Passed; API rebuilt, unchanged web/database builds reused valid Turborepo cache |
| Boundary probes                    | Ten expected results                                                            |
| Full service comparison            | Framework wiring/imports and logger constructor input only                      |

Probes reject NestJS logger/types, Express types, and database types; permit repository/logger ports; reject framework types in the domain, logger interface, and an application file outside the former enumeration; and permit NestJS logging in unit tests. No React code changed.

## Limits and next work

Verification was performed by the implementing agent; no independent fresh model review ran. Factory tests mock persistence and optional services and prove composition/orchestration, not live database ownership or authenticated provider sessions. Logger metadata extraction and failure propagation are preserved. Seven database cases remain skipped. Browser journeys, seeds, migrations, deployments, and remote publication were not run.

Next, extract the owner analytics endpoint from PagesController into a focused presentation controller, preserving its HTTP path, authentication guard, UUID/query validation, private cache header, owner scope, and error mapping. Broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the visible no JavaScript fallback issue remain further work. The parent migration stays In Progress.

Durable pages context records the PageService factory/logging contract and folder-wide framework import boundary. Existing product scope statuses remain unchanged because this refactor does not complete another product slice. The parent spec links this implementation contract and verification report.
