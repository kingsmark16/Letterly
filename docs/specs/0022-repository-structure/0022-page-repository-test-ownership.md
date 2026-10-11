# Page repository test ownership

Date: 2026-10-05

**Status**: Accepted

## Contract

Split the existing broad PrismaPagesRepository unit suite into owner reads, draft writes, lifecycle operations, and public projections. Preserve every test title, parameterized case, assertion, nested suite, and test body. Keep the existing describe label so historic test names remain recognizable. The existing main spec becomes owner read coverage, while colocated named specs own the other responsibilities.

One explicitly named test setup module under `apps/api/test/support/` owns the existing crypto and Prisma token mocks, mock client shape, deterministic page record, and fresh repository fixture. Each spec creates a fresh fixture in beforeEach after clearing mocks. Keep transaction callbacks and updateDraft preparation identical to the original setup. Do not share mutable fixture instances across suites or change production code.

## Verification

Run the original suite before splitting and record its test count. Use syntax tree comparison to prove each original test statement occurs exactly once in the new suites, including parameterized declarations and nested describes. Compare helper bodies before and after export changes. Run all four focused suites through the existing Jest unit command, plus root lint, formatting, and types. Request the existing GPT-6 Luna reviewer to inspect test discovery, mock isolation, and assertion preservation. This is test ownership cleanup under the accepted repository structure plan, not new product behavior or weaker acceptance.

Keep the setup module in the existing test directory excluded from the production compiler configuration. Import it first in each suite so its hoisted Jest module mocks apply before crypto and repository consumers load.
