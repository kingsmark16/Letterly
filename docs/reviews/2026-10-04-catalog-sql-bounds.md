# Catalog SQL bounds verification

Date: 2026-10-04

## Outcome

Catalog overview previews and current version reads now apply their limits inside PostgreSQL. Forward and reverse catalog cursors use a direct tuple index condition. Public contracts, trusted registry resolution, exact saved version identity, and legacy reads retain their existing behavior.

Implementation contract: [catalog SQL bounds](../specs/0022-repository-structure/0022-catalog-sql-bounds.md). Previous measurements: [baseline](2026-10-04-catalog-query-plan-baseline.md). Actual corrected SQL and plans: [query plan artifact](2026-10-04-catalog-sql-query-plans.json).

## Implementation

The existing injected repository delegates statement construction to `catalog-read-queries.ts` in catalog infrastructure. Correlated LATERAL reads select one highest active version and limit overview families before JSON aggregation. Page reads compare `(displayOrder, id)` tuples and bind category, search, cursor, and limit values separately from trusted SQL text. Focused lookup keeps the two family ambiguity limit and retains a null version when an exact active version is unavailable.

No package, index, migration, provider, or public response change is required. Application and domain code remain independent of Prisma and PostgreSQL.

## Physical evidence

A dedicated disposable PostgreSQL 18.6 instance used database `letterly_query_plan_test` on localhost port 43254. The existing migrations and seed were applied. The comparison fixture remains 24 added categories, 600 families, and 1,800 active versions, plus the launch seed. PostgreSQL auto_explain captured the actual repository SQL with analyze and buffers enabled after ANALYZE. The artifact contains 15 plans from the original three case measurement cohort; additional edge cases were tested in a subsequent seven case run.

| Read | Previous physical behavior | Corrected physical behavior | Corrected plan |
| --- | --- | --- | --- |
| Overview families | 602 rows fetched before preview trimming | 98 total; per category LIMIT 4 using the category ordering index | 0 |
| Overview versions | 290 rows for 98 selected families | LIMIT 1 and one version index row for each of 98 families | 0 |
| First global page | 21 families; 63 version summary rows | 21 families; one version index row per family | 1 |
| Deep forward cursor | 495 prior rows removed by filter | Tuple `>` in ordering Index Cond; 21 family rows | 2 |
| Deep reverse cursor | 108 later rows removed by filter | Tuple `<` in ordering Index Cond; 21 family rows | 3 |
| Category page | 1,802 version scan rows and 602 family key loops | 21 category ordering index rows and one version row per family | 4 |
| Broad search | 21 families with version overfetch | 21 families and one version row per family | 5 |

PostgreSQL reports overview family rows as a per loop average of 3.92 across 25 categories: four for each growth category and two for the launch category. These local plans establish the measured relation limits and cursor seeks. They do not establish production capacity or constant work for selective search, inactive categories, or versionless families.

## Verification

All seven real database cases passed: overview and version bounds; first, deep, reverse, category, and search pages; submission baseline; empty and inactive categories with a versionless family; current and exact version behavior with an inactive latest version and ambiguous keys; removed cursor anchors and tied ordering; case insensitive category search and hostile bound search text.

All 82 API test suites passed, totaling 655 tests. This includes the 29 focused catalog repository and production module HTTP cases. HTTP coverage retains response validation, safe errors, cursor filter binding, trusted template capabilities, and private registry key exclusion. The API build and repository lint, formatting, and type checks passed.

## Remaining scope

The compatibility `/api/v1/templates` array is still unbounded and must be retired through the recorded API decision before wider public activation. Category navigation remains unpaginated for the initial dozens target. Substring search has no specialized text index. The earlier submission fixture still has no populated answers, messages, or journey snapshots; its global answer aggregation and exact unread count need separate scalability evidence. This milestone does not close the overall repository restructuring goal.
