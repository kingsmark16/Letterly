# Bounded media cleanup evidence

Date: 2026-10-04

Spec: [0022 bounded media cleanup](../specs/0022-repository-structure/0022-bounded-media-cleanup.md).

This records local fixture tests and a same model source cross check. It is not an independent review, a live storage test, a physical PostgreSQL query plan, or a production capacity measurement.

## Acceptance evidence

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC-1 | Image and audio repository tests assert `take: 50`, stable ordering, existing eligibility and selected fields. Existing transaction limits and writes were checked in the diff. | Passed |
| AC-2 | A 75 task backlog makes 13 claims, 12 of size four and one of size two. It processes 50 tasks and leaves 25. A clock fixture confirms later groups receive a fresh five minute deadline relative to elapsed time. | Passed |
| AC-3 | The backlog fixture records peak deletion concurrency four, 50 successful acknowledgements, and zero active deletes at completion. A failed retry write does not release the run while another delete remains pending. | Passed |
| AC-4 | Overlapping calls return the same promise, use the first timestamp, and allow a fresh run after settlement. Nest composition checks cover optional audio, expiry ordering, safe failures, overrides, interval timing, and shutdown cancellation. | Passed |
| AC-5 | Focused API units: 3 suites, 20 tests. Nest composition: 1 suite, 10 tests. API build and repository lint, formatting, and types passed. | Passed |

## Bounds and limits

Each image expiry query returns at most 50 rows. Each row has at most two storage keys, so that transaction prepares at most 100 distinct cleanup entries. Audio expiry returns at most 50 rows and prepares at most 50 source cleanup entries. These are bounds derived from query arguments and projection shape, not database scan measurements.

Each service run claims and attempts at most 50 object deletions. Up to four operations run together; the next group is claimed after the previous group settles. Calls within one API service instance coalesce. Different API instances continue to rely on the existing database task leases. A single very slow operation can still outlast its lease, as before; this change does not add lease renewal.

The schedule still waits fifteen minutes between triggers. Large backlogs can span multiple runs. No production backlog arrival rate or drain capacity was measured.

## Source cross check

The repositories keep their existing transaction boundaries, expiry conditions, cleanup writes, and timeout configuration. The application service keeps framework dependencies out of its policy and orchestration. No database migration, storage provider, public contract, or configuration was added.

The same model cross check found that claiming all 50 tasks before processing groups of four could leave tasks waiting under expiring leases. The implementation now claims each group immediately before processing and accounts for elapsed time in subsequent deadlines. Its regression test simulates a first group taking longer than five minutes.

An existing audio expiry selection and update concurrency concern remains outside this bounded work: selection is followed by an ID based update without a row lock or eligibility recheck. It requires a separate reproduction and transactional fix before the overall persistence audit can close. This milestone preserves that preexisting behavior and does not certify concurrent audio completion safety.

The subsequent [audio expiry transaction verification](2026-10-04-audio-expiry-transaction.md) reproduces and corrects this audio concern with ordered locks and a bounded recheck. It adds actual isolated PostgreSQL backlog and rollback evidence. The original bounded milestone above remains a record of its own narrower fixture checks.

## Commands

```powershell
pnpm.cmd --filter api test --runInBand --runTestsByPath src/modules/pages/application/media-cleanup.service.spec.ts src/modules/pages/infrastructure/prisma-page-media.repository.spec.ts src/modules/pages/infrastructure/prisma-page-audio.repository.spec.ts
pnpm.cmd --filter api test:e2e --runInBand --runTestsByPath test/pages-cleanup-composition.e2e-spec.ts
pnpm.cmd --filter api build
pnpm.cmd check:commit
```
