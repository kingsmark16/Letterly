# 0022. Submission SQL bounds

Date: 2026-10-04

## Decision

Limit owned submission rows in PostgreSQL before counting answers or checking messages. Use a parameterized tuple cursor on the existing `(pageId, submittedAt, id)` or read state ordering index. Keep ownership checks and exact unread counts inside the existing RepeatableRead transaction.

Store a nullable `journeyAnswerCount` on VisitorSubmission. Validated journey creation stores its snapshot answer length atomically. Letter creation stores zero. Deletion clears snapshot and count together. Existing rows remain null after an additive migration so older API versions can keep writing during a rolling deployment. List queries fetch snapshots only for selected legacy rows whose count is null and whose stored letter answer count is zero. Existing full Zod validation remains the fallback; malformed snapshots still contribute zero.

Provide an explicit bounded backfill command that validates legacy snapshots with the same shared schema. Each invocation handles at most 100 rows, writes guarded counts without overwriting a concurrent writer or deletion, and prints counts without private content. Release operators can repeat it until no live null counts remain after older writers retire. No provider or public DTO changes are introduced.

## Requirements

1. Select at most `size + 1` live submission rows belonging to the authorized page, applying the optional unread filter and descending `(submittedAt, id)` tuple boundary before relation work.
2. Scope answer count index reads and message existence reads to those identities. Do not aggregate answers from other pages or preceding cursor rows.
3. Stored letter answer count takes precedence over journey fallback exactly as before. Summaries expose only ID, read state, date, count, and message presence. A missing or unauthorized page returns not found without querying its submissions.
4. Validate new journey snapshots before storing their summary count. Preserve older valid, malformed, null, and deleted snapshot behavior with the bounded compatibility fallback.
5. Backfill is restartable and bounded. It skips deleted rows, does not resurrect private snapshots, does not print them, and protects concurrent metadata writes with a null count predicate.
6. Verify all and unread pages, tied dates, deleted or missing anchors, ownership isolation, exact unread totals, empty results, stored and legacy journey counts, malformed snapshots, deletion, and backfill boundaries against disposable PostgreSQL. Repeat actual plans with 2,000 owned and 2,000 unrelated submissions, 5,335 total answers, 1,000 messages, and 667 journey snapshots.
7. API unit and HTTP integration checks, migration deployment, Prisma validation, build, lint, formatting, and types pass. Preserve existing migration history and unrelated user changes.

## Rationale and alternatives

The [populated baseline](../../reviews/2026-10-04-populated-submission-baseline.md) proves the existing Prisma relation count aggregates all answers. A small PostgreSQL statement in page infrastructure can bound the selected rows and use their existing child indexes. An additional generic query framework or preview relation mode is unnecessary.

Counting raw JSON array entries would change malformed snapshot behavior. Replicating Zod text and grapheme rules in SQL would create a second validation owner. A validated derived count avoids fetching journey bodies for new or backfilled summaries. A nullable additive field with the existing fallback preserves older writers and rollback compatibility. No immediate destructive nonnull contraction is required.

The autonomous repository mandate authorizes this engineering correction. The existing same model cross check choice is used: count provenance, legacy fallback, bounded backfill, concurrency guards, deletion, deployment order, and private log handling are specified before implementation.

## Limitations and rollout

Exact unread totals still examine matching rows. Legacy rows require a bounded snapshot read until backfill completes. PostgreSQL may examine candidates with deleted rows to find the requested page. Apply the additive migration before API deployment, allow old writers to retire, then run the explicit backfill. Do not run it against a remote environment as part of this implementation task. Keep the migration during rollback and use a future forward migration for any eventual contraction.
