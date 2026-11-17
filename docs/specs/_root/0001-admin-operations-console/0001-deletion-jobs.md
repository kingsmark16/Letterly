# Deletion jobs

## Summary

Permanently deleting a creator or page immediately blocks access and starts tracked cleanup. Your administrator can leave the screen and return to see progress or resume a failed job. A completed job proves that applicable database records and uploaded objects have been removed.

## Requirements

Implements parent AC-4 through AC-6 and AC-9 through AC-11. Deletion has no undo or recovery window and sends no new email.

## Decision

Use durable PostgreSQL jobs and the existing media cleanup service. Extend successful cleanup acknowledgement to record job progress before removing its task row. Do not run an account cascade in an HTTP request. (basis: confirmed data model, existing MediaCleanupService and PrismaMediaCleanupRepository, Prisma transactions and explicit idempotency.)

## Feature design

### Data model

All timestamps are UTC. Required means nonnullable. Fields not explicitly nullable are required. Counts and attempts are nonnegative integers. User IDs remain strings, never coerced to UUIDs.

| Record | Fields and constraints |
| --- | --- |
| User and Page additions | Nullable `deletionRequestedAt` timestamp, default null. Presence is an irreversible access barrier until removal. |
| DeletionJob | UUID `id` primary key; `targetType` CREATOR or PAGE; `targetId` string bounded to 200; unique `(targetType,targetId)`; nullable `requestedById` User foreign key with set null; nullable `parentJobId` self foreign key; `reasonCode` existing report reason enum; nullable `note` up to 500 trimmed characters; `state`; `requestedAt`; nullable `startedAt`, `completedAt`, `nextRetryAt`, `leaseOwner`, `leaseExpiresAt`, `lastFailureCode`; `attempts` default 0; `version` default 0; page/database/media progress counts default 0; nullable `uploadsSafeAfter`. |
| DeletionJobMedia | UUID `id`; required `jobId` foreign key; nullable `cleanupTaskId` MediaCleanup foreign key with set null; nullable `completedAt`. Unique nonnull `(jobId,cleanupTaskId)`. A pending link requires a cleanup task; a completed link may have none. No object key is copied here. |
| DeletionAcceptanceReceipt | UUID `id`; required logical actorId, operation CREATOR_DELETE or PAGE_DELETE, idempotencyKey, canonicalPayloadHash, jobId foreign key, and acceptedAt. Unique `(actorId,operation,idempotencyKey)`. Retain with the job, independent of the existing 24 hour idempotency table. Do not retain the confirmation token or raw request. |
| Media processing metadata additions | On image/audio processing owners, persist nullable UUID attemptToken, processingState (IDLE, RUNNING, QUIESCED, or UNCERTAIN) default IDLE, nullable leaseExpiresAt and settledAt timestamps, and outputManifest default empty. The manifest is a distinct sorted array of at most 100 deterministic object keys, each bounded by the existing storage key validation. Keep this internal metadata until processing is quiescent and deletion has queued its keys. Existing source keys are also included. |

Jobs have many media links and zero or many child page jobs. Account children are page jobs; nesting beyond one level is rejected. Completed job retention removes its links and completed child jobs after the parent is also eligible. Never cascade away unfinished jobs. A page job already owned by another request is attached to the account job under lock rather than duplicated, preserving its original requester and reason. Audit the attachment separately. Index `(state,nextRetryAt,requestedAt,id)`, lease expiry, parentJobId, completedAt, and jobId on links.

Progress fields are `pagesTotal`, `pagesCompleted`, `databaseBatchesCompleted`, `mediaTotal`, and `mediaCompleted`. Parent page progress uses child jobs; parent media totals sum direct child and parent links without counting twice. Persist totals before removing their source records. Completion counts update in the acknowledgement transaction, not from counting remaining MediaCleanup rows. Database batch progress is informational, not a percentage of unknown total work. Schema checks prevent negative values and completed counts above known totals.

### Confirmation and endpoints

Paths are relative to `/api/v1/admin`. Every endpoint requires active administrator access and parent API protections.

| Method and path | Input | Output and status |
| --- | --- | --- |
| POST `/creators/:creatorId/deletion-preview` | expectedModerationVersion | 200 impact and signed confirmation token |
| POST `/pages/:pageId/deletion-preview` | expectedModerationVersion | 200 impact and signed confirmation token |
| POST `/creators/:creatorId/deletions` | common action body, typedTargetId, confirmationToken | 202 safe job projection |
| POST `/pages/:pageId/deletions` | same | 202 safe job projection |
| GET `/deletions` | state, targetType, exact targetId, cursor, size | 200 jobs and nextCursor |
| GET `/deletions/:jobId` | UUID | 200 safe job detail and child summary counts |
| GET `/deletions/:jobId/children` | cursor, size | 200 bounded child jobs |
| POST `/deletions/:jobId/retry` | confirm, expectedJobVersion, idempotencyKey | 202 existing job, or 409 invalid state |

Previews consume the read budget and validate origin. Impact includes page, submission, image, audio, pending upload, and related moderation record counts. It never returns their contents. The preview is a warning summary, not a promise that work cannot change. The token binds actor, target, expected version, impact digest, issuance time, and a five minute expiry using the existing signing infrastructure with a distinct purpose. Acceptance locks the same target and recomputes the impact before comparing its digest. A mismatch returns 409 `STALE_DELETION_IMPACT`; expiration requires a new preview. `typedTargetId` must exactly match the route target. Do not put signed tokens in URLs or logs.

After current actor authorization, acceptance first checks DeletionAcceptanceReceipt so a lost 202 can be replayed even after target removal or ordinary idempotency expiry. An exact actor/operation/key and canonical payload hash repeat returns 202 with the same job ID and its current safe projection; changed payload returns 409 IDEMPOTENCY_CONFLICT. The canonical hash covers route target, reason, note, expected version, typed ID, confirm, and confirmation token digest using the existing canonicalization implementation. An existing receipt is checked before preview expiry or target existence. In the acceptance transaction, authorize the current creator role, validate version and preview, set deletionRequestedAt, set moderation DISABLED, revoke creator sessions for account deletion, increment version, create/reuse the unique job, and append audit, ordinary idempotency, and acceptance receipt records. Return only after that transaction commits. Creator job acceptance blocks all its pages through the shared creator predicate. Page acceptance blocks only that page. ADMIN targets and pages owned by administrators are protected.

Receipts contain no target content, email, raw token, or request body. They remain until the associated job is eligible for retention deletion, including any delay for a retained parent. Retry commands retain the existing 24 hour replay horizon because their job remains directly readable; the extended receipt applies specifically to deletion acceptance. Once both job and receipt are purged, no replay guarantee remains and an absent target returns the ordinary safe 404. Retention must remove receipt rows transactionally with the job.

### Response allowlists and list contracts

| Response | Exact fields |
| --- | --- |
| Job summary | id, targetType, targetId, parentJobId, state, requestedAt, completedAt, version, pagesTotal, pagesCompleted, mediaTotal, mediaCompleted |
| Job detail | Summary plus requestedById, reasonCode, note, startedAt, attempts, nextRetryAt, lastFailureCode, databaseBatchesCompleted, childrenTotal, childrenCompleted, childrenNeedingAttention |
| Children response | `{items,nextCursor}`, where each item is a job summary |
| Impact preview | targetType, targetId, expectedModerationVersion, counts, confirmationToken, issuedAt, expiresAt |
| Impact counts | pages, submissions, images, audioTracks, pendingUploads, reports, moderationActions, appeals |

Fields preserve their schema nullability. Impact counts come from current target scoped database COUNT queries; pages is 1 for a page target and its owned page count for a creator. Submission count includes soft deleted submissions that will be purged. Images/audio count their records, not variants; pendingUploads counts unexpired issued grants. Detail note is the optional bounded deletion note, rendered as text. It stays out of lists, logs, analytics, and audit metadata. Preview tokens occur only in that response, never in job DTOs. LeaseOwner, leaseExpiresAt, resumeState, payload hashes, receipt keys, output manifests, storage keys, and internal processing data are never selected into these DTOs.

Job lists sort by `(requestedAt DESC,id DESC)`, default size 25, maximum 100. Children use the same order and limits under the fixed parentJobId. Normalize exact enums, trim targetId to its existing bounded contract, and require targetType whenever targetId is supplied. Signed cursors bind endpoint purpose, parent ID when applicable, all filters, size, and sort version. List envelopes are `{items,nextCursor}`. Exact target lookup returns zero or one retained job within this same envelope. Source every job field from the job row or its persisted progress; childrenNeedingAttention counts children in NEEDS_ATTENTION and childrenTotal/Completed use child job rows. Do not count vanished media tasks as success.

### Worker and concurrency

Job states are `QUEUED`, `DATABASE_CLEANUP`, `WAITING_FOR_CHILDREN`, `MEDIA_CLEANUP`, `RETRY_WAIT`, `NEEDS_ATTENTION`, and `COMPLETED`. No cancel or restore transition exists. Retry stores the prior phase and resumes it. Add `resumeState` nullable phase enum to DeletionJob for that purpose. Each claim has a random leaseOwner fencing token, a five minute lease, and a conditional state/version update. Expired leases can be reclaimed. Every acknowledgement checks current lease ownership. Use database time for lease decisions.

Run the existing Nest lifecycle scheduling pattern every 30 seconds, at most 10 claimed jobs per run with concurrency 2. Database cleanup uses at most 50 pages or 100 related rows per transaction, with at most 10 seconds per transaction. Renew or release the lease between batches. Storage calls run outside database transactions. Automatic retries allow five consecutive failed attempts with delays 1, 2, 4, and 8 minutes before NEEDS_ATTENTION. Manual retry resets the consecutive retry budget, increments version, audits the request, and resumes the same job without deleting evidence. An active lease or completed job cannot be manually retried.

Account work discovers owned pages in bounded `(id ASC)` batches and creates/adopts child jobs before processing them. Keep the disabled User row until every page child is complete, then remove sessions, accounts, verification records actually associated through the existing auth identifiers, and the User. Do not delete unrelated email verification records by a broad pattern. Actor foreign keys use existing set null behavior. Enumerate reports, moderation actions, appeals, responses/answers/messages, journey records, visits, view sessions, and media relations through schema reviewed bounded deletions before parent removal. Avoid relying on an unbounded final cascade. Preserve existing slug reservation tombstone behavior so deleted links are not silently reassigned.

After child discovery, the account job enters WAITING_FOR_CHILDREN and releases its lease. Child state changes schedule parent reconciliation in the same transaction; the ordinary scheduler also reconciles waiting parents so a lost wakeup is harmless. Any child in NEEDS_ATTENTION makes the parent NEEDS_ATTENTION with safe code CHILD_JOB_FAILED and resumeState WAITING_FOR_CHILDREN. Parent counts still distinguish completed, running, and failed descendants. When every child completes, the parent resumes its final database and media phases. A parent cannot complete merely because no currently owned Page rows remain.

Allow manual retry on an eligible failed child independently. Retrying a parent schedules reconciliation and resumes eligible failed descendants in batches of at most 50, reusing their IDs, original reasons, progress, and existing media tasks. Add nullable retryChildrenAfterId as an internal persisted cursor on the parent to continue a large retry wave across scheduler runs. Do not reset or steal active child/task leases or completed work. Reconcile the parent after child retry so it returns to WAITING_FOR_CHILDREN only when no child still needs attention. Record the parent request and each resumed child as safe audit events. A parent can remain attention required while its retry wave is still visiting other failed children.

All creator writes, draft creation, moderation restore, media authorization/finalization, visitor writes, and public reads must reject a deletion barrier. Serialize acceptance with mutations through a shared User then Page row lock order, followed by job/task rows. Include every new count changing public submission/report/upload path when enforcing the confirmation barrier. A count change before acceptance invalidates impact; a write after acceptance is refused. Job retry has its own expected version. Do not leave these predicates only in a browser guard or session cache.

Deletion also coordinates server image/audio processing already running at acceptance. Before a processor writes any source or derived object, persist its complete deterministic output manifest and claim token under the same User then Page barrier lock. A processor checks the token and deletion barrier before starting a storage write and before database finalization. After acceptance, revoke further claims and renewals, prevent a new attempt, and make the running attempt settle its outstanding storage calls without publishing results. A stale processor cannot acknowledge success. Its predeclared output keys remain part of deletion cleanup even if finalization fails.

Lease expiry alone does not prove that a storage write has stopped. Keep processing records and their output manifests until all in flight calls have settled and the attempt is marked QUIESCED. If a crashed or unresponsive processor cannot prove quiescence after its lease expires, mark it UNCERTAIN and the deletion job NEEDS_ATTENTION with PROCESSOR_QUIESCENCE_UNKNOWN. Recovery must establish that the old process is terminated and its outstanding writes have settled before resuming and performing the final object sweep. Manual Retry cannot override UNCERTAIN. Implementation must include an operations runbook for stopping the identified processing instance, establishing storage call completion, and recording the recovered attempt as QUIESCED through an audited internal recovery operation; that operation records attemptToken, operator identity, evidence reference, and database timestamp, never a blanket job success. If completion cannot be established, the job remains attention required. Never declare deletion complete while an attempt can still write. Internal processing manifests contain only bounded deterministic object keys and attempt metadata, never content, and are purged after the final acknowledged sweep. Source uploads remain subject to the separate grant cutoff below.

Before removing media records, enqueue every source and processed image/audio object through existing MediaCleanup and link tasks transactionally. Include already queued tasks for those objects. Store the latest expiry of issued upload grants in uploadsSafeAfter before deleting their records. Do not declare media cleanup complete until outstanding grants expire and their deterministic object keys have been deleted again after that cutoff; a valid earlier grant could recreate an object. Existing pending upload expiry information is the source; if it is not persisted, add it to the upload authorization record in the additive migration. Do not infer an arbitrary safe cutoff. Completed storage deletion of a missing object is success.

Enumerate object metadata and related rows in cursor batches of at most 100. Preserve each MediaCleanup row and its object key until its linked jobs' latest uploadsSafeAfter has passed. The claim query defers these tasks until that cutoff, then deletes the object and acknowledges success. This avoids losing the key before a still valid upload grant can recreate its object. A previously leased task must serialize acknowledgement with job linking and defer row removal when a new link extends the cutoff. Lease fencing still applies.

On media success, verify task lease ownership, stamp every pending job link completedAt, update job progress, and delete the MediaCleanup task in one transaction. Never interpret a missing task as successful cleanup. An unexplained missing pending task moves the job to NEEDS_ATTENTION with `CLEANUP_RECEIPT_MISSING`. Lease loss after a storage call leaves acknowledgement to recovery. Retry reissues safe object deletion. Reuse existing media batch 50 and concurrency 4. A media task in REVIEW makes linked jobs NEEDS_ATTENTION; manual job retry releases only eligible linked REVIEW tasks, never steals active task leases or unrelated work.

Safe failure codes: `DB_TIMEOUT`, `CONSTRAINT_CONFLICT`, `STORAGE_UNAVAILABLE`, `DELETE_FAILED`, `CLEANUP_RECEIPT_MISSING`, `CHILD_JOB_FAILED`, `PROCESSOR_QUIESCENCE_UNKNOWN`, `UNKNOWN`. Do not store stack traces or object keys in job projections. Read progress every five seconds while its screen is visible and work is pending; pause when hidden, on completed state, or after access loss. Leaving the screen never stops server cleanup.

### Retention and monitoring

Daily retention removes at most 100 completed jobs per transaction after 730 days from completedAt, preserving unfinished parents/children and existing audit retention. Persist safe events for deletion requested, completed, retry requested, and attention required using logical target IDs and job IDs. Never put email, note text, or media keys into audit metadata or metric labels. Monitor job counts by state, oldest unfinished age, completions, and bounded failure code counts. Alert on any NEEDS_ATTENTION transition and oldest unfinished age above 24 hours. This adds no external provider.

## Build plan

1. Add nullable barriers, job/link schema, impact preview, and one page deletion with safe progress and storage receipts, parent AC-5, AC-6, AC-9 through AC-11.
2. Add account jobs, child adoption, fencing, bounded database cleanup, outstanding upload handling, and manual resume, parent AC-4 through AC-6, AC-9, AC-11.
3. Add retention, monitoring, list/detail screens, focus and stale confirmation recovery, parent AC-6, AC-9 through AC-11.

## Critical test scenarios

1. A page with images, audio, responses, reports, and pending uploads becomes unavailable at acceptance and reaches completion only after storage cleanup and grant expiry, AC-5 and AC-6.
2. Race account/page deletion, late upload, restore, new page creation, visitor writes, role changes, and two workers. Prove one owner, no access gap, and no orphan objects, AC-4 through AC-6 and AC-9.
3. Lose acceptance responses, crash between storage deletion and acknowledgement, expire leases, exhaust retries, manually resume, and detect a missing receipt, AC-5 and AC-6.
4. Stale preview, incorrect typed ID, administrator target, bad origin, and wrong role fail without work starting. Retention preserves unfinished jobs and redacted audit history, AC-4 through AC-6 and AC-9.
5. Start a processor before acceptance and delay its output write past barrier creation and lease expiry. Prove no premature completion, durable manifest cleanup, and safe recovery of an uncertain processor, AC-5, AC-6, AC-9.
6. Fail multiple account child jobs, resume one independently and the others through a parent retry wave, and prove parent state/count reconciliation with no duplicated or stolen work, AC-6.
7. Replay acceptance after 24 hours and after target removal, verify the same retained job, reject changed payloads, and verify receipt/job retention together, AC-5, AC-6.

## Consequences

Permanent deletion cannot be rolled back. Storage outages can leave a blocked target awaiting cleanup. Bounded cleanup and retained receipts add records but make completion and recovery explainable.

## Rationale

The current cleanup service already leases and retries object deletion. Linking its acknowledged success to durable jobs preserves those protections and avoids treating absence of a task row as proof. Incremental account work keeps large cascades out of request latency.
