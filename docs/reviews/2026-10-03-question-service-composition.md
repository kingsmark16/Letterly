# Question service composition boundary

Date: 2026-10-03

## Result

PageQuestionService now receives a plain PageQuestionsRepository constructor input. It no longer imports NestJS or carries Injectable/Inject decorators. Its errors, result mapping helpers, create/list/update/delete/reorder methods, and exported paths are unchanged. A comparison against the previous Git contents verified the entire file matches after removing framework wiring and formatting the constructor.

PagesModule registers pageQuestionServiceProvider under the existing PageQuestionService class token. The factory requires PAGE_QUESTIONS_REPOSITORY, retains the existing Prisma alias, and creates one singleton. Consumers continue to inject the same class. Repository overrides and service overrides remain supported. The named factory stays in composition code, following the password service pattern, rather than adding application wiring files.

## Verification

Seven new cases exercise the production factory. Five use the real PagesController, contract pipes, question service, and HTTP error filter through Supertest. They cover a successful mutation using authenticated fixture identity despite an untrusted creatorId in the request, repository override selection, creator rate limit delegation, stale version metadata, destructive response confirmation details, unavailable question list mapping, and malformed input rejection before mutation. Two isolated container cases cover a required repository and service token replacement. The success case also confirms singleton resolution.

The first focused run exposed incorrect cache header assumptions in the new tests. The corrected read test checks the existing private, no-store header. Successful creation currently has no explicit cache header; this observation is recorded for a separate response policy pass and was not changed in this composition slice.

Existing repository suites continue to cover question persistence rules. This slice does not claim new live database ownership or transaction verification. Reorder and remaining result mappings were preserved through the full service comparison rather than adding tests that repeat every unchanged switch branch.

| Check | Result |
| --- | --- |
| Focused new HTTP/composition suite | 7 passed |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 552 passed, API 498 across 61 suites, web 33, database 6, UI 15 |
| API integration and composition | 53 passed, 7 skipped, six passing and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Boundary probes | Seven expected results |
| Service comparison | Only framework wiring removal and constructor formatting differ |

The migrated service lint rule now covers both password and question services. Probes verified that question NestJS/Express imports are prohibited, plain repository types remain allowed, existing database restrictions remain active, password framework enforcement remains active, and unmigrated PageService decorator imports retain their prior allowance.

## Limits and next work

The implementing agent performed verification; no independent fresh model review ran. The new HTTP suite uses fixture authentication, mocked repository and rate limiting, and isolated Nest composition. Existing HTTP suites also use mocked dependencies. Seven database tests remain skipped. Browser journeys, live database/provider validation, seeds, migrations, deployments, and remote publication were not run.

Next, apply the same composition boundary to PageReportsService, preserving public scope checks and safe provider failure mapping. Remaining decorated services, broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the known visible no JavaScript fallback issue remain further work. The parent repository migration stays In Progress.
