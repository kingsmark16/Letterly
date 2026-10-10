# Draft persistence adapter milestone

Date: 2026-10-03

## Result

Draft persistence initialization now uses registered template adapters. PageService passes canonical registry key and pinned version from its existing trusted active template lookup into the internal CreateDraftInput port. HTTP requests still supply the template version ID through the existing contract; no browser supplied registry identity was introduced.

Secret Letter owns content/settings parsing and performs no journey writes. Choose Your Heart owns compatibility content/settings parsing, constraint deferral, and first revision creation. Its graph persistence helper moved out of the shared repository without changing UUID sources, revision numbers, question/outcome relationships, choice order, maxDepth, or draft revision selection.

The repository retains generated slug allocation, nested slug reservation, owner selection, page creation, and five attempts for unique violations. Prepared operations receive the current transaction for each attempt. After page creation, the repository checks stored registry, renderer, and version against trusted input inside that transaction before additional template writes and commit.

## Behavior and boundaries

Unsupported identities have no default adapter. Missing journey data and journey data supplied to Secret Letter are rejected before opening a transaction. Invalid settings are also rejected before writes. Stored template mismatches raise the existing safe template definition error within the transaction. Template write failures propagate through the transaction callback so Prisma can roll back.

Draft persistence adapters do not construct a Prisma client or call the outer repository client. Their transaction type contains only constraint deferral and the journey delegates needed by the existing initialization. ESLint blocks framework, concrete repository, and service imports, and rejects PrismaClient imports. The existing owner projection and application policy boundaries remain intact.

## Verification

| Check | Result |
| --- | --- |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 531 passed, API 477, web 33, database 6, UI 15 |
| API integration | 39 passed, 7 skipped, four passing suites and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Import probes | Framework, concrete repository, service, and PrismaClient imports blocked; four intended imports allowed |

Thirteen new repository cases cover unsupported identity/version, incompatible or missing journey input, malformed settings, supplied transaction ownership, operation order, stored identity mismatch, write failure propagation, collision retries, collision exhaustion, and absence of journey work for Secret Letter. Existing service assertions now verify trusted identity propagation for both templates. Existing initialization tests still verify slug reservation and journey row creation.

## Limits and next work

Verification was performed by the implementing agent, not an independent fresh model reviewer. Transaction tests use distinct mocks and prove callback routing and failure propagation; they do not prove rollback against a live database. HTTP integration suites use mocked application dependencies, and seven database checks remain skipped. Browser tests, live providers, seeds, migrations, and deployments were not run for this slice. Prior fixture browser results remain historical evidence.

The overall structure migration stays In Progress. A useful next slice is moving the Prisma specific public availability query builder from application into infrastructure, as required by the parent structure spec. Draft update compatibility assumptions and stored content types still need further review. The known visible no JavaScript fallback issue remains unresolved.
