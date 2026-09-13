# Review, refine/secret-letter-editor-redesign, 2026-09-10

**Reviewed by**: inline GPT-5 review (degraded, no contrasting subagent available; author model unavailable)
**Scope**: 96 files, refine/secret-letter-editor-redesign vs main
**Verdict**: Changes requested

## Summary

The branch substantially closes the previous review gaps around the linear Secret Letter question builder and shared audio lifecycle. The configured type check, lint, Jest suites, and UI tests are green, and the earlier audio cleanup, lease recovery, capability, visitor message, and stream piping defects are addressed. Two contract-boundary issues remain: audio completion does not verify the stored object MIME metadata, and malformed question ordering can pass submission authorization even when the public projection fails closed; the overview also has two readiness and content-display regressions.

## Major

### 🟠 Audio completion accepts mismatched stored MIME metadata, `apps/api/src/modules/pages/application/page-audio.service.ts:116`

**Problem**: Completion verifies object length, checksum, and detected binary type, but never compares `object.contentType` returned by storage with the prepared `sourceMimeType`. A valid MP3 uploaded with incorrect or missing R2 content type metadata can therefore be marked `READY`, after which range delivery forwards that incorrect metadata as the response `Content-Type`.

**Why it matters**: The shared audio specification requires the API to reject a content-type mismatch before attachment. Without this check, the verified record and delivered HTTP representation can disagree, weakening the upload integrity boundary and potentially making browser playback unreliable.

**Suggested fix**: Require the storage metadata content type to match the prepared type, in addition to the detected file signature, before calling `markAudioReady`. Treat a missing or mismatched value as `VERIFICATION_FAILED`, queue the source through the existing failure cleanup path, and add a service test covering both mismatched and absent metadata.

### 🟠 Malformed question order is accepted by submission authorization, `apps/api/src/modules/pages/application/secret-letter-response-availability.ts:26`

**Problem**: `isValidSecretLetterQuestion` validates IDs, prompt shape, and choice shape, but ignores question and choice `displayOrder`. The public mapper later validates those fields through the public projection schema, while `findPublishedPageScope` and the locked submission transaction rely only on this predicate. For example, a persisted question with `displayOrder: -1` makes the public page unavailable during projection validation but still lets the submission scope pass and accept a response.

**Why it matters**: AC-7 and AC-11 require malformed stored question data to fail closed, and the public read and locked write must use the same effective availability decision. This mismatch leaves a stale visitor form with a write path that accepts data when the corresponding public projection cannot be rendered.

**Suggested fix**: Validate the full current question collection, including nonnegative integer order, unique contiguous question order, and equivalent choice order, in one shared policy used by public mapping, `findPublishedPageScope`, and the locked submission transaction. Add a repository integration test proving that malformed order disables both read availability and submission.

## Minor

### 🟡 Overview reports a guessed zero question state after query failure, `apps/web/src/features/pages/components/editor-overview.tsx:143`

**Problem**: When the question query errors, `hasQuestions` is false and the readiness row renders `0 visitor questions` with `Required`; the progress ring also counts the question as incomplete. Only the separate retry button and lower Questions detail say `Unavailable`.

**Why it matters**: AC-9 requires a failed query to show an unavailable state and never guess a count. The current card can tell a creator that there are zero questions and invite them to add one even though the server state was not loaded.

**Suggested fix**: Render a neutral `Questions unavailable` state for the readiness row and exclude it from the completion count while `isError` is true. Keep the Retry action adjacent to that state and add a component journey assertion for the failed query.

### 🟡 Overview omits the entered creator sign-off, `apps/web/src/features/pages/components/draft-editor.tsx:924`

**Problem**: `EditorOverview` accepts `creatorName` and displays it in Letter details, but the `DraftEditor` invocation does not pass the watched `creatorName` value. As a result, the overview says `Not added` even after the creator has entered a sign-off; the content preview and publish preview use the value correctly.

**Why it matters**: This makes the new creator-name field appear unsaved or incomplete in the main review surface and can cause a creator to overwrite or recheck a value that is already present.

**Suggested fix**: Pass `creatorName={creatorName}` to `EditorOverview` and cover the saved and unsaved sign-off states in the editor journey.

## Nits

## Strengths

- The linear question mutation path now enforces ownership, page locking, expected versions, complete reorder validation, private creator notes, response-impact confirmation, and message-preserving cleanup.
- The shared audio path now has private proxy delivery, capability-aware projections, password gating, durable cleanup scheduling, expired verification recovery, range handling, and awaited stream error handling.

## Test coverage

`pnpm.cmd check-types`, `pnpm.cmd lint`, `pnpm.cmd test` passed. The Jest run covered 51 suites and 314 tests, and the UI test run covered 15 tests; the configured Playwright suites were reviewed but not executed because their real-page fixtures are environment-gated. Coverage is still missing for stored audio MIME metadata mismatch, malformed question order agreement between public read and locked submission, the overview readiness card on question-query failure, and creator sign-off rendering.
