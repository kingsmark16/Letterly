# Journey service composition boundary

Date: 2026-10-03

## Result

PageJourneyService now takes a plain repository and optional metrics constructor input. NestJS imports and decorators are removed. A complete file comparison against the previous commit confirmed that only framework wiring changed; graph validation, owner scope, repository writes, error classes, stale version metadata, and metric ordering remain identical.

PagesModule registers pageJourneyServiceProvider under the existing class token. Its typed factory requires PAGE_JOURNEYS_REPOSITORY and optionally injects PAGE_JOURNEY_METRICS. The existing Prisma and structured metrics useExisting aliases remain intact. Construction stays in module composition without another application wiring file.

## Verification

Six new real Nest container cases exercise the production factory with mocked persistence. They cover singleton resolution, repository overrides, valid saves with metrics present or absent, an explicit one-question graph depth of one, bounded validation metadata before persistence, invalid root rejection without a write, owner scope forwarding and unavailable owner errors, stale version details, a required repository failure, and service overrides without missing dependencies.

The initial focused run exposed a test expectation error: semantic validation failures still retain parsed graph counts. The expectation was corrected to match existing behavior. Lint also rejected an any-valued Jest matcher inside an expected object; the final test uses the fixture's explicit issue count. All six final focused cases passed. Existing unit and protected HTTP checks passed; these use mocks and are not a live database/provider path.

| Check                           | Result                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Final focused factory suite     | 6 passed                                                                        |
| Root lint                       | Passed                                                                          |
| Root formatting                 | Passed                                                                          |
| Root type checks                | Passed                                                                          |
| Root unit tests                 | 552 passed: API 498 across 61 suites, web 33, database 6, UI 15                 |
| API integration and composition | 80 passed, 7 skipped; ten passing and four skipped suites                       |
| Production builds               | Passed; API rebuilt, unchanged web/database builds reused valid Turborepo cache |
| Boundary probes                 | Six expected results                                                            |
| Full service comparison         | Only NestJS imports and decorators removed                                      |

Framework import enforcement now includes the journey service. Probes reject NestJS decorators, NestJS types, Express types, and database types while allowing repository interfaces and shared template graph types.

## Limits and next work

Verification was performed by the implementing agent; no independent fresh model review ran. Mocked repository tests prove scope forwarding and composition, not live ownership isolation or immutable revision transactions. Seven database cases remain skipped. Browser journeys, seeds, migrations, deployments, and remote publication were not run.

Next, migrate PageJourneySubmissionService composition, preserving its required repository, optional metrics, canonical payload hash, idempotency and path/version error mapping. Remaining decorated services, broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the known visible no JavaScript fallback issue remain further work. The parent repository migration stays In Progress.

The pages context now records the durable factory boundary. Existing scope statuses remain unchanged because this bounded refactor does not complete another product slice. The parent spec links this implementation contract and verification report.
