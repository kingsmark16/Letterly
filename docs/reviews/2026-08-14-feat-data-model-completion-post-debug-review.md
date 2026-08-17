# Review, feat/data-model-completion, 2026-08-14

**Reviewed by**: gpt-5.5 (author on Codex, GPT-5 family)
**Scope**: 123 files, branch vs main
**Verdict**: Approve with nits

## Summary

The post-debug fixes resolve every finding from the prior final review: completion logs now keep only allowlisted provider metadata, internal media processing failures persist their stable `failureCode`, and media-only edits participate in the browser `beforeunload` warning with browser regression coverage. The nearby completion, cleanup, public media, and editor paths are materially stronger after the fixes. I found one remaining edge-case correctness gap: completion can still process an expired upload row if the scheduled cleanup task has not deleted it yet, even though projections and Save already treat the same row as expired.

## Minor

### 🟡 Expired uploads can still be completed before cleanup deletes them, `apps/api/src/modules/pages/infrastructure/prisma-page-media.repository.ts:220`

**Problem**: `claimImage` fetches the image by page/owner/id only, then returns `ready` or claims any `UPLOADING` row without checking `expiresAt`. That means an unattached record whose `expiresAt` is already in the past can still be processed by `POST /complete` during the gap before the 15-minute cleanup job removes it. The rest of the system disagrees with that: owner projections filter expired images out, and Save requires `expiresAt` to be null or in the future before attachment.

**Why it matters**: Spec 0006 says unready and ready-but-unattached records expire after 24 hours, and completion may proceed after upload URL expiry only when the source record is still unexpired. Returning a fresh `READY` operation response for an already-expired record gives the editor a media URL that cannot be recovered from owner reads or attached by Save, and it spends storage/CPU on an upload the product considers expired.

**Suggested fix**: Treat `expiresAt <= now` as unavailable in `claimImage` before returning `ready` or claiming `UPLOADING`; either return the same safe not-found/not-ready result and let cleanup remove it, or atomically transition/schedule cleanup as part of the claim path. Add a regression test for completing an expired `UPLOADING` row to prove no sanitization/storage write occurs.

## Strengths

- The previous provider log leak is fixed cleanly: completion logging now emits stage, image ID, provider code/name/status only, with a regression that proves storage keys and provider messages are absent.
- The media save path has good transactional guardrails: it validates requested images before content updates, checks attachment update counts, and rolls back on post-validation image races.
- The web editor now treats media-only caption/order changes as unsaved for both publish gating and browser unload warnings, and the Playwright coverage exercises that exact regression.

## Test coverage

The reported verification signal is strong: API unit and end-to-end suites, API/web type checks, web lint, production builds, focused media regressions, and the deterministic Playwright run all passed. New coverage directly addresses the three prior review findings. The remaining gap is a focused repository/service test proving expired upload records cannot be completed or turned into a transient READY response before scheduled cleanup runs.
