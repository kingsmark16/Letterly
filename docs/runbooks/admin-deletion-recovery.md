# Admin deletion recovery

This runbook implements the accepted processor and upload settlement contract in `docs/specs/_root/0001-admin-operations-console/0001-deletion-jobs.md`. Recovery records evidence for one existing job. It does not declare deletion complete or override a running worker. The feature remains in progress until its tracked build and verification gates close.

## Select the environment

Use Node 24 and the repository package manager. Select the intended environment's database and auth configuration through its operations secret store. The command requires explicit DATABASE_URL, NODE_ENV, APP_ORIGIN, BETTER_AUTH_URL, and BETTER_AUTH_SECRET values. It does not start the HTTP application or background schedulers.

Supply a current Better Auth administrator session cookie through the temporary `LETTERLY_RECOVERY_SESSION_COOKIE` environment variable. Keep the value out of arguments, terminal output, shell history, files, and evidence. The command verifies the session and current active ADMIN row, including inside its transaction. A bootstrap secret or a supplied actor ID cannot authorize recovery. Operations shell access and its environment credentials are also required.

The child process clears its copy of the cookie. Clear it from the invoking PowerShell session afterward, including after a failed command:

```powershell
Remove-Item Env:\LETTERLY_RECOVERY_SESSION_COOKIE -ErrorAction SilentlyContinue
```

## Identify a processor

Use the safe inspection mode with the exact job and media IDs:

```text
pnpm --filter api admin:recover-media-attempt -- --inspect --job-id <job UUID> --media-type IMAGE --media-id <media UUID>
```

Use AUDIO for an audio attempt. Inspection returns the attempt token, process boot UUID, host snapshot, lease deadline, state, and manifest hash. It never returns object keys, content, credentials, or the session. A replica name or local PID alone cannot identify a process lifetime. The persisted boot UUID distinguishes restarts.

For Azure, identify the exact app, revision, and replica in the stored snapshot. Stop and confirm termination of that process or enclosing replica through the environment's authorized control plane. Retain the termination record tied to the boot UUID. A replacement replica does not prove the old process ended. For a local synthetic drill, retain the spawned process identity and its observed exit, accounting for PID reuse.

Do not infer storage settlement from termination. A request already accepted by R2 can finish after the client has stopped. Lease expiry, an abort signal, a timeout, a successful later delete, a missing HEAD/LIST result, and a waiting period are insufficient proof by themselves.

## Prepare processor evidence

Prepare a strict JSON file with the fields in the accepted contract. Use the inspection result for jobId, mediaType, mediaId, attemptToken, processingInstanceId, and manifestSha256. termination includes the host platform, canonical host identity hash, UTC observedAt, and an `ops:<uuid>` reference. storageSettlement includes its basis, observedAt, and a second reference. Embed exactly the referenced TERMINATION and STORAGE_SETTLEMENT records in evidenceRecords, each with id, kind, and plain text. These IDs belong to this recovery; no shared evidence table exists.

For storageWriteState NONE or SETTLED with no unknown write, NO_UNRESOLVED_WRITE can reference the durable state and termination proof. IN_FLIGHT or UNCERTAIN requires PROVIDER_CONFIRMED proof covering every possible mutation, its manifest scope, process, and processing interval. Obtain substantiated provider support or operational trace evidence. A partial trace or unsupported assertion is insufficient. If proof is unavailable, leave the job attention required.

Keep supporting records redacted. They may contain operational proof and provider request references, but no media keys, signed URLs, page writing, visitor data, credentials, or session values. The complete file and its canonical form must each fit 16 KiB. Each evidence record's text is limited to 8000 characters. The command rejects duplicate JSON keys, unknown fields, incorrect reference kinds, stale identifiers, invalid dates, and changed replay payloads. The software validates structure and current database state; the operator remains responsible for substantiating the claims in the text.

Only after the processing lease has expired and the exact attempt is UNCERTAIN may recovery be recorded:

```text
pnpm --filter api admin:recover-media-attempt -- --job-id <job UUID> --media-type IMAGE --media-id <media UUID> --attempt-token <attempt UUID> --instance-id <boot UUID> --evidence-file <local evidence path> --confirm
```

The transaction records the verified operator, complete evidence, hashes, database timestamp, and safe audit event. It marks only that attempt QUIESCED. Preserve the returned recovery reference. An exact replay returns the original reference, even after cleanup removes the media row; another currently authorized administrator can replay it. Changed evidence conflicts. Recovery does not release active job/task leases or acknowledge media cleanup.

## Establish source upload settlement

Every issued direct upload grant, including an expired or completed grant and grants replaced by retries, must be covered. A client could use one grant more than once before expiry. Expiry stops future authorization but does not establish the outcome of requests already admitted by storage.

```text
pnpm --filter api admin:recover-upload-grants -- --inspect --job-id <job UUID>
```

Wait for the prepared immutable grant snapshot. Inspection returns its count, hash, latest deadline, and settlement timestamp without keys. A page with no grants is settled automatically from the empty ledger and deletion barrier. For a job with grants, prepare a strict JSON file containing exactly schemaVersion 1, jobId, uploadManifestSha256, observedAt, evidenceReference `ops:<uuid>`, and evidenceText. The timestamp must cover the full grant validity windows and be no earlier than the latest deadline. The text must substantiate provider confirmed terminal outcomes or nonacceptance for every potentially admitted request, including repeated use. Keep it within the same byte and text limits and exclude private material.

```text
pnpm --filter api admin:recover-upload-grants -- --job-id <job UUID> --evidence-file <local evidence path> --confirm
```

The job must need attention for upload settlement. Missing proof leaves it blocked. The command records immutable evidence, updates its settlement timestamp and version, and audits the action. It does not complete the job. Exact replay uses the retained proof after Page and ledger removal. Evidence remains with the job for at least 730 days after completion. A child also waits for its parent's retention horizon. The purge removes each job and its evidence together in bounded batches. Unfinished work keeps its evidence.

For a creator deletion, use the individual page child ID with the same commands. This includes children whose Page was already removed by the owner. The creator job stays pending until every expected child has a durable completion. Retry the child directly or confirm retry on the parent to revisit eligible failed children.

## Resume and verify cleanup

Return to the job detail in the admin console. Review refreshed progress and confirm Retry cleanup. Uncertain retries preserve the exact version and idempotency key. Retry cannot override unresolved attempts, missing upload proof, an active lease, or a completed job. The worker must still delete objects after all settlement gates and the grant deadline, acknowledge each cleanup task transactionally, remove remaining database rows, and record completion.

If another processor is still unresolved, repeat evidence collection for that exact attempt. Never alter a job to COMPLETED manually, clear an unknown state with SQL, or delete a pending task to simulate success. Review target audit history and final page/media counters. Evidence and operational logs must not contain note text, media keys, or private content.

## Activation and rollback

Keep ADMIN_DELETION_ENABLED=false while adding the schema and processing protocol. Standard Azure Container Apps supplies `CONTAINER_APP_NAME`, `CONTAINER_APP_REVISION`, and `CONTAINER_APP_REPLICA_NAME`; Azure Container Apps Express supplies per-replica `ADC_INSTANCE_ID` and requires configured `CONTAINER_APP_NAME` (deriving `<revisionName>-<ADC_INSTANCE_ID>` to match the Express control-plane replica name), plus a fresh boot UUID. Never configure or reuse `CONTAINER_APP_REPLICA_NAME`, `ADC_INSTANCE_ID`, or the boot UUID manually.

Before enabling acceptance, drain and retire every older writer and rollback revision. Retain the release inventory, termination and storage settlement proof, and coverage of grants issued before the new ledger. Current media expiry fields do not reconstruct historical retry keys. Legacy processing or grants that cannot be accounted for block activation and require an explicit repair decision. Do not backfill them as settled from age. An application rollback must retain the barrier and processing protocol while any accepted deletion remains unfinished.

### Creator grant ownership enforcement

The additive Prisma migration leaves `PageUploadGrant.creatorId` nullable. New writers record the creator from the locked Page row. Creator previews and new acceptance remain unavailable until the exact database column is required and `ADMIN_DELETION_ENABLED` is enabled. Keep the older write revisions retired before either gate opens.

1. Select the intended database and confirm the application schema and release identity. Pause physical owner page removal for the live backfill. Run `packages/database/prisma/operations/backfill-live-upload-grant-owners.sql` repeatedly with the application schema selected and `psql` configured to stop on error. Each run reports at most 100 attributed rows. Recheck the remaining null count after the last batch.
2. For a null grant whose page is already gone, use an isolated restore or backup of the same environment to establish the exact Page UUID and creator ID. Use `packages/database/prisma/operations/attribute-removed-upload-grant-owners.sql` with those exact `page_id` and `creator_id` variables, one reviewed pair at a time. Check the affected row count and stop if the pairing is absent or contradictory. Retain unresolved rows for a separate repair.
3. Attach the reviewer's identity, time, environment, release ID, restore reference, and reconciliation counts to the restricted release record. Include the retirement and storage evidence above, plus evidence of the durable task handoff or verified cleanup for keys from older removals. Ownership evidence alone does not prove processor or storage settlement.
4. After that record is approved and the older components have drained, apply `packages/database/prisma/operations/enforce-upload-grant-ownership.sql` separately from automatic deployment. It checks null owners, conflicting ownership, and live Page consistency before setting the nonnull constraint. Keep the Prisma field nullable in source so the compatible revision can run before enforcement. An exact authorized acceptance replay continues to work with the creator gate off.

The deletion scheduler emits job state counts, bounded failure codes, completions, retention totals, and the oldest unfinished age through existing safe monitoring. It reports attention transitions and a backlog older than 24 hours. Use the existing operations monitoring destination for alerts. Do not attach grant keys, creator IDs, or proof text to alert tags.
