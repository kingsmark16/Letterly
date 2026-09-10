# Review, refine/secret-letter-editor-redesign, 2026-09-09

**Reviewed by**: GPT-5.6-Sol (author on primary GPT-5 session)
**Scope**: 87 files, refine/secret-letter-editor-redesign vs main
**Verdict**: Blocked

## Summary

This branch redesigns the Secret Letter creator and visitor experience and adds private page audio from upload through playback and cleanup. The audio boundary has strong ownership and projection work, but page deletion can permanently orphan private audio objects, so this branch is blocked. The change also has recovery, capability, visitor response, and stream resilience gaps, and the configured type check currently fails.

## Blockers

### 🔴 Page deletion loses audio cleanup keys, `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts:1118`

**Problem**: `deleteOwnedPage` reads and queues only `PageImage` storage keys before deleting the page. It does not read any `PageAudio.sourceStorageKey`. The page deletion then cascades the audio rows, so their object keys are lost before a cleanup task can be created.
**Why it matters**: Deleting a letter can leave its private audio object in Cloudflare R2 forever. This breaks the promised deletion and retention behavior and leaves user media outside the database lifecycle with no durable way to find or remove it.
**Suggested fix**: Read every audio object key for the owned page inside the same transaction, add those keys to `MediaCleanup`, and only then delete the page. Add repository coverage proving current, failed, expired, and pending audio objects are all queued before their rows cascade.

## Major

### 🟠 Expired verification leases cannot recover, `apps/api/src/modules/pages/infrastructure/prisma-page-audio.repository.ts:105`

**Problem**: `claimAudio` accepts only `UPLOADING`. Once a record enters `VERIFYING`, every later completion returns `not_ready`, even after `processingLeaseExpiresAt` has passed. `expireAudio` also excludes `VERIFYING`, and retry accepts only `FAILED` or `EXPIRED`.
**Why it matters**: A process crash or lost request after the claim leaves the upload stuck forever. The creator cannot complete it, retry it, or rely on cleanup to expire it, which violates the bounded lease and failure recovery design.
**Suggested fix**: Let completion reclaim a `VERIFYING` record whose lease has expired, using one atomic conditional update. Also include abandoned verification records in expiry cleanup and add concurrency and expired lease tests.

### 🟠 Audio ignores trusted template capability rules, `apps/api/src/modules/pages/application/page-audio.service.ts:50`

**Problem**: Upload preparation checks ownership through the repository but never loads the trusted template or confirms that it exposes audio. Public mapping also includes ready audio for any template, and the metadata represents audio as a simple capability instead of the specified `hidden`, `optional`, and `required` policy.
**Why it matters**: A creator can attach and directly stream audio on templates that did not opt into it. Future required audio templates also cannot enforce a ready track during publication, so AC 1 and AC 12 are not implemented at the server boundary.
**Suggested fix**: Resolve the trusted template audio policy for prepare, retry, projection, streaming, and publication. Reject hidden audio with the existing unsupported capability error, expose optional audio only where declared, and require a ready current track when the policy is required. Add tests for all three policies.

### 🟠 Secret Letter no longer supports private visitor messages, `apps/web/src/features/pages/components/visitor-response-form.tsx:399`

**Problem**: The redesigned form removed the visitor message field and submits only `answers` and the idempotency key. It also disables submission unless at least one question has an answer, even when `visitorMessageEnabled` is true.
**Why it matters**: This silently removes an accepted feature from spec 0008. Visitors can no longer send the optional private message described by the public contract, and a message only response is impossible even though the API still supports it.
**Suggested fix**: Restore the message input when `visitorMessageEnabled` is true, use the trusted prompt, privacy text, and length limit, include the trimmed value in the request, and allow either a valid answer or a nonempty message. Restore browser coverage for message only and answer plus message submissions.

### 🟠 Stream failures are not handled after piping begins, `apps/api/src/modules/pages/pages.controller.ts:1330`

**Problem**: Both owner and public audio handlers call `stream.body.pipe(response)` without awaiting completion or attaching a source error handler. The surrounding `try` block cannot catch an asynchronous stream error after the method returns.
**Why it matters**: A transient R2 failure during playback can emit an unhandled stream error, leave the HTTP response hanging, or terminate the Node process depending on runtime handling. This affects both creator preview and public playback.
**Suggested fix**: Use an awaited stream pipeline or equivalent error aware bridge. Before headers are sent, map failure to the safe storage error. After headers are sent, destroy the response cleanly. Add a controller test with a source stream that fails after emitting data.

### 🟠 The configured type check fails, `apps/api/src/infrastructure/storage/r2-storage.spec.ts:130`

**Problem**: `pnpm check-types` fails at lines 130 and 240 because the mocked `send` call has an empty tuple type, so indexing `mock.calls[0][0]` is treated as reading `undefined` and its direct cast to `S3Command` is rejected.
**Why it matters**: The required commit gate is red, so this branch cannot pass the repository merge checks even if the Jest assertions run successfully.
**Suggested fix**: Give the mocked client send function an explicit command argument type, or narrow the captured call through `unknown` after asserting that a call exists. Run the full type check again after correcting both occurrences.

## Minor

### 🟡 Successful retries leave a stale retry warning, `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts:465`

**Problem**: The owner projection always selects the newest `FAILED` or `EXPIRED` audio record as `audioRetry`, even when a newer ready replacement is current. Retrying does not consume or otherwise distinguish the old failed record.
**Why it matters**: After a successful retry, the editor can continue showing `Upload needs attention` beside the ready player and offer another retry for an obsolete object.
**Suggested fix**: Return a retry candidate only when it represents the latest unresolved attempt after the current ready track, or record that a failed attempt was superseded. Add a projection test for failure followed by successful retry.

### 🟡 Informational duration can reject an otherwise valid file, `packages/contracts/src/pages.ts:118`

**Problem**: The upload request rejects durations above one hour even though the specification says duration is informational and acceptance is based on MP3 or M4A type and the 25 MiB size limit.
**Why it matters**: A sufficiently compressed valid audio file longer than one hour cannot be uploaded, despite meeting the documented acceptance rules.
**Suggested fix**: Remove the product duration limit or record a separately approved limit in the governing spec. Keep finite positive validation without making browser metadata determine upload eligibility.

## Nits

- ⚪ `apps/web/package.json:30`, `three` and `@types/three` are added but no application file imports them, so they add install weight and maintenance surface without supporting this change.

## Strengths

- The owner and public audio reads use page ownership, publication availability, password proof, private no store headers, and same origin proxy URLs without exposing R2 keys or signed URLs.
- The focused audio tests cover checksum rejection, atomic current track replacement, cleanup scheduling, range propagation, keyboard controls, mute behavior, manual playback, and reduced motion behavior.

## Test coverage

The branch adds useful Jest and Playwright coverage for the main upload, verification, replacement, removal, range, player, and protected page paths. Coverage is missing for page deletion with audio, expired verification lease recovery, hidden and required template policies, stream failures after piping begins, stale retry projection cleanup, and the removed Secret Letter visitor message journeys. The configured `pnpm check-types` gate fails in `r2-storage.spec.ts` at lines 130 and 240, so the branch is not currently green.
