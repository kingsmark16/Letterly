# Audio expiry transaction verification

Date: 2026-10-04

Spec: [Audio expiry transaction safety](../specs/0022-repository-structure/0022-audio-expiry-transaction.md).

## Root cause and correction

The previous expiry transaction selected eligible audio and later updated those IDs unconditionally. A completion transaction could commit READY between those steps. Cleanup then overwrote READY with EXPIRED and queued its source for deletion.

The regression test pauses the actual Prisma expiry selection, commits `markAudioReady` through a separate transaction, then resumes expiry. Before the fix it failed with expected READY, received EXPIRED. After the fix it retains READY and records no cleanup task.

Expiry now locks candidate Pages in ascending ID order, then candidate PageAudio rows in ascending ID order, and rechecks eligibility within the original candidate IDs. This follows the existing completion and renewal lock order. Only the locked, still eligible records supply expiry writes and source cleanup keys.

## Real database evidence

The test database was a disposable PostgreSQL 18.6 container, `letterly-cleanup-verification-20261004`, bound only to localhost port 43254. Existing migrations and the trusted catalog seed were applied to `letterly_cleanup_test`. Migration connection variables were explicitly set to that database to avoid local unpooled URL overrides. Existing databases and containers were left untouched.

Five real database cases passed:

1. Completion after initial selection keeps READY and queues no source.
2. Renewal after initial selection retains VERIFYING with its renewed lease and queues no source.
3. Expiry winning first prevents later completion from attaching and queues one abandoned source.
4. A durable cleanup write failure rolls back the state transition.
5. A 75 record backlog expires 50 records and queues 50 sources in the first transaction, then expires the remaining 25 in the next transaction.

These tests use the real Prisma repository, adapter, PostgreSQL transactions, and row locks. Prisma query extensions pause operations or inject a write failure for deterministic scheduling. They do not mock database state or establish production throughput.

## Source cross check

Same model review confirms both locking queries are parameterized, limited to the original candidate IDs, and executed before eligibility recheck and writes. No provider operation occurs while these locks are held. The existing batch bound, expiry predicates, selected columns, transaction timeout, and public interfaces remain intact. There is no schema migration.

This is a same model review, not an independent model review. Image expiry has a related stale selection risk around attachment and source changes and remains a separate open sibling investigation.

The subsequent [image expiry verification](2026-10-04-image-expiry-transaction.md) reproduces and corrects that sibling concern with ordered locks and a current-key recheck.

## Commands and gates

```powershell
$env:DATABASE_URL = 'postgresql://letterly:letterly-local-test@127.0.0.1:43254/letterly_cleanup_test?schema=public'
$env:RUN_REAL_DB_TESTS = '1'
pnpm.cmd --filter api test:e2e --runInBand --runTestsByPath test/pages-audio-cleanup.database.e2e-spec.ts
```

Focused unit checks passed 14 tests in two suites. Audio and cleanup composition and owner audio transport passed 85 tests in three suites. API build and repository lint, formatting, and type gates passed. The final audio repository unit rerun passed all eight tests after tightening the typed query assertions.
