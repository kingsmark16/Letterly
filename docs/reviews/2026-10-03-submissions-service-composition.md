# Submissions service composition boundary

Date: 2026-10-03

## Result

PageSubmissionsService now receives a plain PageSubmissionsRepository constructor input. It imports no NestJS and has no Injectable/Inject decorators. Payload canonicalization and hashing, every submit result mapping, public scope lookup, owner list/detail/read/delete methods, deletion confirmation, error classes, and cursor exports remain unchanged. A full file comparison confirmed only framework wiring removal and constructor formatting differ from the previous commit.

PagesModule registers pageSubmissionsServiceProvider under the existing class token. The typed factory requires PAGE_SUBMISSIONS_REPOSITORY, retains the Prisma alias and default singleton scope, and supports existing repository and service overrides. Composition stays in the module rather than adding application wiring files.

## Verification

Five new real Nest container cases exercise the production factory with mocked persistence. They verify singleton resolution, repository override selection, an independently calculated fixed SHA256 digest for the canonical answer/message fixture, preservation of raw repository input and observed password version, owner list/detail scope forwarding, unavailable owner errors, deletion confirmation before any persistence call, required dependency failure, and service overrides. The known digest was calculated from the explicit canonical JSON fixture; the test does not call the production hash helper to construct its expected value.

Existing unit cases retain idempotency conflict, invalid branch, payload hash, and deletion error coverage. Existing protected HTTP suites still construct PagesModule and pass their password guard, visitor submission, unavailable page, and safe response checks. Those HTTP suites mock application dependencies; the new factory suite is a container test rather than a new HTTP route suite.

| Check | Result |
| --- | --- |
| Focused new factory suite | 5 passed |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 552 passed, API 498 across 61 suites, web 33, database 6, UI 15 |
| API integration and composition | 74 passed, 7 skipped, nine passing and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Boundary probes | Six expected results |
| Service comparison | Only framework wiring removal and constructor formatting differ |

The framework import restriction now covers submissions alongside the other migrated services. Probes reject NestJS/Express imports, including type imports, allow the plain repository and Node crypto helper, and confirm database imports remain blocked. Other decorated services remain migration work.

## Limits and next work

Verification was performed by the implementing agent; no independent fresh model review ran. Factory cases use mocked persistence and prove scope forwarding, not live database ownership isolation, locking, or idempotency transactions. Protected HTTP cases use mocks and do not prove a live provider path. Seven database tests remain skipped. Browser journeys, seeds, migrations, deployments, and remote publication were not run.

Next, migrate PageJourneyService composition while preserving its required repository, optional metrics, graph validation, immutable revision behavior, and safe errors. Remaining decorated services, broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the known visible no JavaScript fallback issue remain further work. The parent repository migration stays In Progress.
