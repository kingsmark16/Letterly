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

The job must need attention for upload settlement. Missing proof leaves it blocked. The command records immutable evidence, updates its settlement timestamp and version, and audits the action. It does not complete the job. Exact replay uses the retained proof after Page and ledger removal. Evidence is retained with its job under the 730 day completed job policy, including a retained parent's delay; unfinished work is not age purged. Retention and parent account reconciliation are completed in the later account deletion milestone.

## Resume and verify cleanup

Return to the job detail in the admin console. Review refreshed progress and confirm Retry cleanup. Uncertain retries preserve the exact version and idempotency key. Retry cannot override unresolved attempts, missing upload proof, an active lease, or a completed job. The worker must still delete objects after all settlement gates and the grant deadline, acknowledge each cleanup task transactionally, remove remaining database rows, and record completion.

If another processor is still unresolved, repeat evidence collection for that exact attempt. Never alter a job to COMPLETED manually, clear an unknown state with SQL, or delete a pending task to simulate success. Review target audit history and final page/media counters. Evidence and operational logs must not contain note text, media keys, or private content.

## Activation and rollback

Keep ADMIN_DELETION_ENABLED=false while adding the schema and processing protocol. Hosted processing uses Azure's supplied app, revision, and replica metadata plus a fresh boot UUID. Do not configure or reuse the boot UUID manually.

Before enabling acceptance, drain and retire every older writer and rollback revision. Retain the release inventory, termination and storage settlement proof, and coverage of grants issued before the new ledger. Current media expiry fields do not reconstruct historical retry keys. Legacy processing or grants that cannot be accounted for block activation and require an explicit repair decision. Do not backfill them as settled from age. An application rollback must retain the barrier and processing protocol while any accepted deletion remains unfinished.
