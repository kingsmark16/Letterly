# Populated submission query baseline

Date: 2026-10-04

Source application commit: `9af793d`. Actual repository SQL and plans: [populated submission plans](2026-10-04-populated-submission-query-plans.json).

## Finding

A paginated submission response does not bound its answer aggregation. Both measured list queries aggregate every VisitorAnswer row before joining the selected submissions. The list also fetches complete journey snapshots to derive the fallback answer count, though no snapshot body appears in its response.

This evidence keeps submission scalability acceptance open. The exact unread count remains a separately documented operation that examines matching records.

## Fixture and method

The existing guarded growth fixture runs against a dedicated PostgreSQL 18.6 database on localhost port 43254. It rejects any URL outside `letterly_query_plan_test` on localhost. Existing migrations and seed are applied before the fixture. All identities and content are synthetic; no application provider or existing database is used.

The owned page has 2,000 submissions: 667 with five stored letter answers each (3,335 answers), 667 with four answer journey snapshots, and 666 with neither. Every second submission has a visitor message, totaling 1,000. Journey prompts, choices, titles, and result messages use their schema text maxima. Half the owned submissions are unread. An unrelated page has another 2,000 submissions and 2,000 answers. The category fixture retains its 24 categories, 600 families, and 1,800 versions.

After ANALYZE, auto_explain captures actual repository reads with analyze, buffers, and JSON output. The artifact retains the two successful list cohorts, each consisting of list, message existence lookup, and exact unread count. Earlier failed fixture runs are excluded. No hand written approximation of Prisma SQL is measured.

## Results

| Operation | Response or SQL output | Physical reads | Artifact plan |
| --- | --- | --- | --- |
| First all-submission page | 51 SQL summaries, 50 response items | Submission sequential scan returns 2,000 owned rows and filters 2,000 unrelated rows; answer aggregation scans all 5,335 answers | 0 |
| First page message existence | 25 message rows | Bounded lookup through selected submission IDs | 1 |
| Exact unread total | 1,000 | Submission sequential scan returns 1,000 and filters 3,000 | 2 |
| Next unread page | 51 SQL summaries, 50 response items | Submission bitmap scan returns 975 candidates; answer aggregation again scans all 5,335 answers | 3 |
| Unread page message existence | 51 message rows | Bounded lookup through selected submission IDs | 4 |
| Exact unread total | 1,000 | Same full count predicate, unaffected by page cursor | 5 |

The planner choices are specific to this local fixture. The unscoped `WHERE 1=1 GROUP BY submissionId` answer aggregation is present in the actual SQL, so its cross page scope does not depend on a timing estimate. Both list projections include the full `journeySnapshot` JSON field. This capture does not measure network bytes or production latency.

## Verification and cleanup

All seven real database cases passed, including 50 item limits, exact unread totals, disjoint cursor pages, correct letter and journey answer counts, message flags, and absence of private body properties from summaries. Repository lint, formatting, and type gates passed.

Fixture setup initially used an invalid question enum, corrected to the existing `PLAIN_MESSAGE` value. Populated teardown exposed the question foreign key RESTRICT rule; cleanup now deletes this fixture's submissions before deleting its owner and pages. A fresh synthetic fixture run verified the correction. The disposable container and temporary log are removed after durable capture.

## Required correction

Limit the ordered owned submission identities before answer aggregation. Count answers only for selected identities, compute the existing valid journey fallback without fetching complete snapshots into the list projection, and preserve ownership, soft deletion, read filters, cursor ordering, snapshot consistency, exact unread total, and safe summary DTOs. Repeat the populated plans after the correction. Do not replace the exact count with an estimate or change its response contract as part of the query correction.
