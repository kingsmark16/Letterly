# Image expiry transaction verification

Date: 2026-10-04

Spec: [Image expiry transaction safety](../specs/0022-repository-structure/0022-image-expiry-transaction.md).

## Reproductions and correction

The first test pauses the real expiry query, commits `markImageReady` with a new output key, then resumes expiry. Before the fix, the row was deleted but no cleanup record existed for that output. After the fix, the current output is queued before deletion.

The second test pauses expiry, attaches a READY image through `PrismaPagesRepository.updateDraft`, then resumes expiry. The cleanup caller's explicit cutoff is ahead of the attachment caller's clock, while the image is eligible for attachment on that caller. Before the fix, the attached row survived but its output was queued for deletion. After the fix, the locked recheck skips it. This deliberately exercises different caller clock cutoffs, not a claim that the normal attachment route accepts expired images.

Expiry now locks candidate Pages before PageImage rows, both in ascending ID order, then rechecks the original candidates. Cleanup keys come from those current locked rows. Existing eligibility, deduplication, conditional deletion, transaction limits, and batch size remain in force.

## Database evidence

The disposable PostgreSQL 18.6 container `letterly-image-cleanup-verification-20261004` used localhost port 43254 and database `letterly_image_cleanup_test`. Existing migrations and catalog seed were applied with all migration URL variables explicitly pointing to this database. No existing database was modified.

Six image cases passed:

1. Sanitization changes are reflected in cleanup keys.
2. Draft attachment after selection preserves its row and output.
3. Retry preserves the replacement upload and queues only its superseded source.
4. Expiry winning prevents later sanitization completion.
5. A deletion failure rolls back cleanup records and retains the image.
6. A 75 record backlog with two keys per row deletes 50 records and queues 100 keys, then deletes 25 and queues another 50.

The five sibling audio database cases also passed in the same isolated database. Prisma query extensions supply deterministic pause points and injected failures; state changes, reads, locks, and rollback use the real repositories and PostgreSQL.

## Source cross check and limits

The two locking queries are parameterized and confined to at most 50 original IDs. The parent lock order agrees with draft attachment. The image lock stabilizes fields changed by sanitizer completion and retry, even though those operations do not hold a Page lock. The second selection cannot expand beyond the original candidates. No provider operation or new schema is added.

This is a same model review, not an independent review. The tests establish the listed transaction behavior and row/key counts, not production backlog capacity or physical PostgreSQL scan bounds.

The test execution emitted a pg warning about concurrent queries on one client, both before and after this correction. Its origin has not been localized to application code, the driver adapter, or the controlled query pause. The listed state assertions passed, but the warning remains a separate investigation before a future pg major upgrade.

A rerun with `NODE_OPTIONS=--trace-deprecation` passed all six image cases. The trace reaches `PgTransaction.performIO` and Prisma's query interpreter `Array.map` path. It contains no application caller that establishes a repository scheduling defect, so no unrelated query rewrite or dependency upgrade was made.

## Verification gates

The image repository and media service unit suites passed 23 tests. Real PostgreSQL image and audio suites passed 11 tests. Media composition, public media transport, and cleanup composition passed 62 tests. API build and repository lint, formatting, and type gates passed. The attachment regression also passed after parsing the canonical defaults into the mutable content fixture required by strict TypeScript.
