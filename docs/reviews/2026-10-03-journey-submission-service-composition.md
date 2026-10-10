# Journey submission service composition boundary

Date: 2026-10-03

## Result

PageJourneySubmissionService now takes plain repository and optional metrics constructor inputs. NestJS imports and decorators are removed. A complete file comparison against the previous commit confirmed only framework wiring changed. Canonical hashing, raw repository input, observed password version, scope lookup, all result/error mappings, metrics ordering and failure behavior, and exported paths remain identical.

PagesModule registers pageJourneySubmissionServiceProvider under the existing class token. Its typed factory requires PAGE_JOURNEY_SUBMISSIONS_REPOSITORY and optionally injects PAGE_JOURNEY_METRICS. Existing Prisma and structured metrics useExisting aliases remain intact. Composition stays in the module without an additional application wiring file.

## Verification

Thirteen new real Nest container cases exercise the production factory with mocked persistence. Accepted submissions with metrics present or absent verify singleton resolution, repository overrides, raw payload/password version forwarding, a fixed canonical SHA256 digest, and exact redacted metrics after the repository call. The expected digest was independently calculated from explicit canonical JSON containing the normalized slug, graph version, ordered answer path, outcome key, and trimmed visitor message; the test does not calculate its expected digest using production code.

Six result cases verify unavailable page, unsupported capability, invalid branch, version conflict, duplicate, and idempotency conflict errors with their exact bounded metric outcomes. Repository failures with metrics present or absent preserve the original error object. Scope lookup, required repository failure, and service overrides without missing dependencies are also covered.

| Check                            | Result                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Focused production factory suite | 13 passed                                                                       |
| Root lint                        | Passed                                                                          |
| Root formatting                  | Passed                                                                          |
| Root type checks                 | Passed                                                                          |
| Root unit tests                  | 552 passed: API 498 across 61 suites, web 33, database 6, UI 15                 |
| API integration and composition  | 93 passed, 7 skipped; eleven passing and four skipped suites                    |
| Production builds                | Passed; API rebuilt, unchanged web/database builds reused valid Turborepo cache |
| Boundary probes                  | Six expected results                                                            |
| Full service comparison          | Only NestJS imports and decorators removed                                      |

Framework import enforcement includes journey submissions. Probes reject NestJS decorators/types, Express types, and database types while allowing repository interfaces and Node crypto. Existing service and protected HTTP checks pass; those suites use mocks and do not prove a live provider path.

## Limits and next work

Verification was performed by the implementing agent; no independent fresh model review ran. Mocked persistence proves composition and input forwarding, not live path validation, ownership isolation, immutable snapshots, or idempotency transactions. Seven database cases remain skipped. Browser journeys, seeds, migrations, deployments, and remote publication were not run.

Next, migrate PageAudioLinkService composition while preserving its required repository, metadata provider, metadata cache, and feature flag inputs, plus URL normalization, audio slot rules, and metadata fallback/error behavior. Remaining decorated services, broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the known visible no JavaScript fallback issue remain further work. The parent repository migration stays In Progress.

The pages context records the durable constructor boundary and tests. Existing scope statuses remain unchanged because this refactor does not complete another product slice. The parent spec links the implementation contract and verification report.
