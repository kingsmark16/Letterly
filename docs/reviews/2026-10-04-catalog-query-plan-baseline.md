# Catalog and submission query plan baseline

Date: 2026-10-04

Source commit: `69b6ae3`. Raw actual SQL and execution plans: [catalog-query-plans.json](2026-10-04-catalog-query-plans.json).

## Finding

Application response bounds are present, but physical relation fetches are not yet bounded as intended. The overview fetches every active family before Prisma applies its per category take. Version summaries fetch every active version of the selected families before Prisma retains one. Deep cursor predicates are applied as index filters rather than a direct tuple seek in this fixture.

These findings keep the scalability acceptance open. Passing response assertions alone cannot close it.

## Environment and method

A disposable PostgreSQL 18.6 container, `letterly-query-plan-verification-20261004`, used localhost port 43254 and database `letterly_query_plan_test`. All migration URL variables explicitly pointed to this database. Existing migrations and catalog seed were applied. No existing database, deployment, or launch catalog was changed.

The fixture adds 24 categories with 25 families each and three active versions per family, plus one creator page with 2,000 submissions, half unread. The seed contributes one additional active category, two families, and two versions. Synthetic growth registry keys are persistence fixtures only and are not registered template implementations or public API examples.

PostgreSQL `auto_explain` captures the SQL executed by the actual Prisma repositories, with analyze, buffers, and JSON output enabled. Fixture setup is excluded by an initially high logging threshold. `ANALYZE` runs before measurement. This is physical execution evidence, rather than hand written SQL intended to approximate Prisma queries. Times are individual local observations, not production latency estimates.

## Measured results

Plan numbers below are zero based positions in the raw artifact's `plans` array.

| Operation | Returned application records | Physical evidence | Plan |
| --- | --- | --- | --- |
| Overview categories | 25 categories | Sequential scan returns 25 rows, reasonable for this small navigation table | 0 |
| Overview family previews | 98 families, four per growth category plus two launch families | SQL returns all 602 families and scans 1,802 versions for eligibility before application trimming | 1 |
| Overview current versions | One per returned family | SQL returns 290 version rows for 98 families before selecting the newest in the Prisma engine | 2 |
| First global page | 21 families, including lookahead | Template ordering index returns 21 rows; active version eligibility uses the composite version index | 3 |
| Page version summaries | One per family | Version SQL returns 63 rows for 21 families, with no per family LIMIT | 5 |
| Deep forward page | 21 families | Ordering index removes 495 prior rows by a filter, rather than starting at the tuple boundary | 6 |
| Deep reverse page | 21 families | Ordering index removes 108 later rows by a filter | 9 |
| One category page | 21 families | This planner choice scans 1,802 versions and performs 602 Template primary key loops before the page limit | 12 |
| Search page | 21 matching families | Returns 21 through the ordering index; this one broad matching term does not prove selective search cost | 15 |
| Submission summaries, all | 50 items with a next cursor | Ordered submission index returns 51 rows, including lookahead | 19 |
| Exact unread total | 1,000 | Sequential scan examines 2,000 submissions, returning 1,000 and filtering 1,000 | 21 |
| Submission summaries, unread cursor | 50 items with a next cursor | Read-state ordering index returns 51 and filters 25 earlier rows | 23 |

The exact unread total necessarily examines matching records without a stored aggregate. It must not be described as constant work merely because the accompanying list is paginated.

The fixture has no VisitorAnswer or VisitorMessage rows and no journey snapshots. The submission SQL includes a global answer aggregation. This capture cannot establish its cost with populated answers or the byte cost of journey summaries; those remain required follow up measurements.

## Verification

`test/catalog-growth.database.e2e-spec.ts` passes three cases for overview response bounds and current versions, first/deep/reverse/category/search lookahead bounds, and submission list size, unread total, and disjoint cursor results. It deliberately runs only with `RUN_QUERY_PLAN_TESTS=1` and rejects a database URL outside the dedicated localhost test database.

Repository lint, formatting, and type gates passed. No application query correction is claimed in this baseline milestone.

## Reproduction

Start a disposable PostgreSQL server with the existing migrations and seed. Enable `auto_explain` through `shared_preload_libraries`, restart it, and set analyze, buffers, and JSON format. Keep the initial minimum duration high so setup is not logged. The test lowers the threshold for repository reads and restores it before fixture cleanup.

```powershell
$env:DATABASE_URL = 'postgresql://letterly:letterly-local-test@127.0.0.1:43254/letterly_query_plan_test?schema=public'
$env:RUN_QUERY_PLAN_TESTS = '1'
pnpm.cmd --filter api test:e2e --runInBand --runTestsByPath test/catalog-growth.database.e2e-spec.ts
```

Capture the container log before removing it. Parse each JSON object after `plan:` to retain the exact SQL, actual rows, loops, buffers, and timing. The checked in artifact preserves all 27 captured query plans, including the final configuration reload.

## Required follow up

Apply database level limits for overview families and current versions, and use a tuple seek for cursor boundaries. Preserve the repository port, DTO shape, active category/family/version rules, ordering, search semantics, legacy routes, and exact saved version behavior. Repeat these actual plans after the correction. Add populated answer, message, and journey submission evidence before closing submission scalability acceptance.
