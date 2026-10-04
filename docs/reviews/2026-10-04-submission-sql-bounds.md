# Submission SQL bounds verification

Date: 2026-10-04

## Outcome

Submission summaries select a bounded page before counting answers or checking messages. New and backfilled journey summaries use a stored validated count and make no snapshot body reads. Legacy null counts retain the existing full schema validation for the selected rows. Public response fields, owner isolation, exact unread totals, and saved private details are preserved.

Contract: [submission SQL bounds](../specs/0022-repository-structure/0022-submission-sql-bounds.md). Baseline: [populated submission measurement](2026-10-04-populated-submission-baseline.md). Actual corrected SQL: [execution plans](2026-10-04-submission-sql-query-plans.json).

## Implementation and deployment

`submission-summary-query.ts` owns the trusted SQL and separate positional values. Its materialized selected page applies live page scope, read filter, tuple cursor, and size plus one before correlated answer count and message LIMIT 1 reads. The existing repository checks ownership and retains RepeatableRead for list and exact count consistency.

The additive `20261004130000_submission_journey_summary` migration adds nullable `journeyAnswerCount` with a nonnegative constraint. Letter writes store zero; journey writes store the answer length after shared snapshot validation; deletion clears snapshot and count together. The column remains nullable for older API writers and rollback compatibility.

The explicit backfill command validates at most 100 live null count rows per invocation with the shared Zod schema. Guarded updates skip a concurrent metadata change or deletion. It writes zero for null or malformed snapshots and prints selected and updated counts only. Its selection may examine preceding already filled IDs; the 100 row processing bound is not a claim of constant database scan cost. Follow the [release runbook](../runbooks/api-release.md) after old writers retire. No remote database or deployment was changed during this work.

## Actual database evidence

The disposable PostgreSQL 18.6 instance used the dedicated localhost `letterly_query_plan_test` database. All 19 migrations and the catalog seed were applied. The original populated cohort has 2,000 owned and 2,000 unrelated submissions, 5,335 total answers, 1,000 visitor messages, and 667 journey snapshots. ANALYZE precedes actual repository auto_explain capture with analyze and buffers. The artifact contains first all page and next unread page list and count plans from a successful run.

| Read | Previous behavior | Corrected behavior | Plan |
| --- | --- | --- | --- |
| All summaries | 2,000 owned candidate rows plus global aggregation of 5,335 answers | 51 rows through the page ordering index, 51 scoped answer lookups totaling 85 rows | 0 |
| Unread cursor summaries | 975 candidates plus the same global answer aggregation | 51 rows through the read state ordering index with a tuple Index Cond, 51 scoped answer lookups totaling 85 rows | 2 |
| Message presence | Separate selected ID lookup | Correlated unique index lookup with LIMIT 1 for each selected ID, 25 matches on the all page and 51 on the unread page | 0, 2 |
| Journey summaries | Full snapshot JSON projected for every selected journey | Legacy snapshot subplan has zero loops when counts are present | 0, 2 |
| Exact unread total | Scans matching submission predicate | Preserved exact 1,000; still scans 4,000 fixture rows | 1, 3 |

Per loop answer rows are reported as the rounded average 1.67 across 51 loops. The first implementation's EXISTS expression was optimized into a full message scan. The final correlated LIMIT 1 read removes that scan in both measured plans. These local plans prove the measured row scopes and tuple seeks; they do not certify production throughput or constant cost when filtering deleted records.

## Verification

The growth fixture passes eleven real database cases. It covers catalog compatibility, accurate letter and journey summary counts, messages, all and unread cursors, 100/100/5 backfill batches, valid and malformed legacy snapshots, skipped deleted rows, tied dates, a physically removed anchor, unauthorized and missing pages, empty pages, exact unread totals, and nonnegative count enforcement. Two controlled row lock races prove backfill skips both a concurrent count update and a concurrent deletion without restoring cleared snapshot content.

Existing real writer tests pass three cases across letter and journey HTTP/database paths, with stored count assertions. All 83 API unit suites pass 660 tests; the four focused production module HTTP suites pass 82 cases. API build, Prisma validation, repository lint, formatting, and types pass. The explicit backfill CLI was also run against the empty disposable database and returned zero selected and updated.

The controlled lock test initially attempted to deserialize a PostgreSQL void function through `$queryRaw`; it now uses `$executeRaw` for that diagnostic function. Existing pg driver queue deprecation warnings also appeared in the broader real writer tests. They are retained as the previously recorded driver investigation and do not invalidate the passing behavior tests.

## Remaining scope

Complete backfill in each deliberately selected deployment after retiring older writers to remove its legacy snapshot reads. Exact unread counts remain proportional to matching records. No public DTO, trusted template identity, private detail schema, or template activation changed. The overall repository review and remaining verification work continue.
