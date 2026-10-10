# Cleanup scheduling boundary

Date: 2026-10-03

## Result

MediaCleanupService now owns plain cleanup work and implements MediaCleanupRunner. NestJS imports, decorators, timer state, and lifecycle methods moved out of application code. Its repository/storage dependencies remain required, and its audio repository remains optional through mediaCleanupServiceProvider in PagesModule. The existing service class token, singleton scope, provider aliases, and immediate calls remain intact.

Infrastructure MediaCleanupScheduler owns the original 15-minute timer, unref call, suppressed asynchronous scheduled failures, and cancellation on module shutdown. PagesModule registers one scheduler alongside the cleanup factory. No immediate startup run or new overlap policy is added. MEDIA_CLEANUP_INTERVAL_MS now lives with the scheduler; repository search found no consumer of its former application export.

The new application/media-cleanup.ts interface exposes runOnce(now?). PageAudioService now imports this interface instead of the concrete cleanup class. Module injection still uses MediaCleanupService, preserving existing class-token overrides. A full comparison confirmed audio logic changed only its cleanup dependency type, cleanup runOnce/task processing is byte-for-byte unchanged, and timer hooks were copied with runner delegation as the only behavior-reference change.

## Verification

Ten new real Nest container checks cover cleanup factory singleton resolution and overrides, optional audio expiry present or absent, image/audio expiry order, UUID worker identity, five-minute leases, 50-task batch size, deletion success, safe storage/generic deletion failure codes, required repository/storage dependencies, and service replacement without missing dependencies.

Three of those ten checks exercise real Nest module initialization/shutdown with fake time and a mock runner. They verify exactly one timer, a 900000ms interval, hasRef false after unref, no startup invocation, first execution at fifteen minutes, shutdown cancellation, no execution after early shutdown, and successful subsequent scheduling after a rejected run. The unchanged audio composition suite also passes its sixteen immediate cleanup/upload/range checks.

| Check                                        | Result                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| Focused cleanup and audio composition suites | 26 passed: 10 cleanup and 16 audio                                              |
| Root lint                                    | Passed                                                                          |
| Root formatting                              | Passed                                                                          |
| Root type checks                             | Passed                                                                          |
| Root unit tests                              | 552 passed: API 498 across 61 suites, web 33, database 6, UI 15                 |
| API integration and composition              | 141 passed, 7 skipped; fourteen passing and four skipped suites                 |
| Production builds                            | Passed; API rebuilt, unchanged web/database builds reused valid Turborepo cache |
| Boundary probes                              | Seven expected results                                                          |
| Source comparison                            | Cleanup processing unchanged; timer delegation and audio dependency type only   |

Import probes reject NestJS decorators/lifecycle types, Express types, and database types in application cleanup, allow repository/storage ports, and reject framework types in the runner interface. No React code changed.

## Limits and next work

Verification was performed by the implementing agent; no independent fresh model review ran. Factory tests mock repositories/storage, and scheduler lifecycle tests replace the runner. They do not prove live database task leasing, multi-worker concurrency, object deletion, or a fifteen-minute wall-clock production run. Existing interval overlap behavior remains unchanged. Seven database cases remain skipped. Browser journeys, seeds, migrations, deployments, and remote publication were not run.

Next, move PageMediaService's bounded failure logging behind an application interface and migrate its constructor composition, preserving image concurrency counters, processing leases, completion failure cleanup, and safe error mapping. PageService logging/composition, broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the visible no JavaScript fallback issue remain further work. The parent migration stays In Progress.

Durable pages context now records scheduler ownership and the runner interface. Its owned audio convention line was corrected to reflect the interface. Existing product scope statuses remain unchanged because this refactor does not complete another product slice. The parent spec links the implementation contract and verification report.
