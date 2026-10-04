# Page repository unit suite ownership

Date: 2026-10-05

## Result

The original 2578 line repository unit file now has four cohesive owners: owner reads in the existing spec, draft writes in the draft spec, lifecycle and slug operations in the lifecycle spec, and public projections in the public spec. They contain 372, 781, 827, and 482 source lines respectively, counting the final empty line consistently with the artifact. No production source changed.

The shared fixture lives at `apps/api/test/support/prisma-pages-repository-setup.ts`. It owns the existing deterministic crypto and Prisma token mocks, mock client, page record, and fresh repository context. The production compiler already excludes the test directory, and a successful API build emitted no setup module into dist. Each suite imports setup first, then clears mocks and constructs fresh repository state in beforeEach. Draft only helpers remain in the draft suite.

## Preservation evidence

The original suite passed all 81 Jest cases before extraction. After the final move, all four suites passed the same 81 cases in 1.851 seconds. Parameterized and nested cases explain why 59 top level test declarations produce 81 executed cases.

The [syntax tree artifact](2026-10-05-page-repository-test-ownership.json) records the source commit, final source hashes, setup path, and per suite declaration counts. A multiset comparison confirms all 59 original declarations occur exactly once with unchanged syntax, including assertions, titles, nested describes, and parameter arrays. The bodies of createPrismaMock, createPageRecord, draftInput, journeyRecord, and updateDraft are also identical. The setup context performs the original transaction callback binding and repository construction before returning the fresh local values.

The first extraction omitted local draft helpers and loaded a crypto consumer before the centralized mock. The original tests failed, exposing both mistakes. Restoring the unchanged helpers and importing setup first corrected them. The complete focused suite was rerun after moving setup into the excluded test directory. No assertion was weakened or deleted to make it pass.

## Gates and limits

The API build passed. Root lint, formatting, and types passed on the final fixture paths. The full API unit suite passed all 660 cases across 86 suites in 15.111 seconds, including the four extracted suites and adjacent crypto and repository consumers. Expected safe failure logs came from mocked error cases. [GPT-6 Luna approved the final split](2026-10-05-page-repository-test-ownership-luna.md) with no actionable findings, independently checking case preservation, mock ordering, fresh fixture state, discovery, and production exclusion. The reviewer did not rerun the author?s test commands.

These are unit fixtures with mocked Prisma operations. They preserve adapter expectations and transaction order but are not a substitute for isolated PostgreSQL integration tests. No database schema, query, provider, or product behavior changed. The overall repository structure audit remains in progress.
