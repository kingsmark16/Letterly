# Review, feat/data-model-completion, 2026-08-14

**Reviewed by**: gpt-5.5 (author on Codex, GPT-5 family)
**Scope**: 122 files, branch vs main
**Verdict**: Changes requested

## Summary

The final media pass materially improves the risky areas from the earlier reviews: `updateDraft` now validates images before content writes and rolls back if attachment rows change, Retry and Remove have compare-and-set guards, cleanup rows are durable before external deletion, and the public visitor helper no longer trusts `X-Real-IP`. The main remaining production issue is that image completion logs provider-controlled error text and stack-derived locations, which violates the branch’s own logging/privacy rules. I also found two smaller issues around safe failure-code persistence and unsaved media-change navigation warnings.

## Major

### 🟠 Provider error text can leak unsafe storage details into logs, `apps/api/src/modules/pages/application/page-media.service.ts:245`

**Problem**: On non-processing completion failures, `completeUpload` passes `storageErrorDetails(error)` directly into `this.logger.error`. That helper copies `candidate.message` and a stack-derived `errorLocation` into structured logs at lines 408 and 410. Those values are controlled by the storage/client/provider error object rather than by the spec’s allowlist.

**Why it matters**: The project context explicitly says not to log storage keys, private letter content, credentials, or unsafe provider details, and spec 0006 limits media logs to request/lifecycle/error-code style metadata. R2/S3-style failures can include request URLs, object identifiers, bucket/key details, or SDK internals in messages/stacks depending on the failure source. Once written to logs, those details are durable and hard to scrub.

**Suggested fix**: Log only allowlisted, stable metadata such as `event`, `stage`, `imageId`, safe failure code, provider error name/code, and HTTP status. Drop raw `message` and stack-derived location from this path, or pass them only through a redacted logger with tests proving storage keys and provider messages are not emitted.

## Minor

### 🟡 Internal image failures persist the generic message instead of the safe failure code, `apps/api/src/modules/pages/application/page-media.service.ts:239`

**Problem**: When the caught error is `MediaImageProcessingFailedError`, the stored `failureCode` is `error.message`, not the constructor’s `failureCode`. For cases like `SOURCE_MISSING` or the `IMAGE_NOT_READY` compare-and-set miss, the database receives `"Image processing failed"` rather than the stable code.

**Why it matters**: Owner recovery projections expose `failureCode` as safe state. Persisting a prose message breaks the intended allowlisted-code contract and makes retry/remove diagnostics less precise.

**Suggested fix**: Use `error.failureCode` for `MediaImageProcessingFailedError`, and add a regression assertion for the source-missing or mark-ready CAS-miss path.

### 🟡 Browser close/reload does not warn for unsaved media-only edits, `apps/web/src/features/pages/components/draft-editor.tsx:203`

**Problem**: The `beforeunload` guard checks only `form.formState.isDirty`. Media changes set `mediaDirty`, and the in-app Leave link honors it, but a browser tab close or reload with only image reorder/caption/add/remove changes returns early without prompting.

**Why it matters**: Spec 0006 treats ready images, order, captions, replacements, and removals as unsaved editor changes until Save. A creator can lose media-only edits by reloading even though the app correctly warns for text-only edits and in-app navigation.

**Suggested fix**: Include `mediaDirty` in the `beforeunload` condition and dependency list, matching the existing in-app leave guard.

## Strengths

- The updateDraft media save path now validates requested image rows before changing content, verifies every attachment update count, and maps a post-validation image race to rollback-safe `INVALID_IMAGE`.
- Retry and Remove now use compare-and-set predicates and regression tests for rows that change between the initial read and final write.
- Public media still rechecks current publication state before streaming, uses same-origin `no-store` routes, and the browser tests cover public image failure/reload behavior plus trusted forwarding-header cases.

## Test coverage

The reported verification signal is strong: API unit, API end-to-end, API/web type checks, web lint, API and Next production builds, focused visitor identity coverage, and the deterministic Playwright run all passed. The regression tests specifically cover the previously risky updateDraft image race, Retry/Remove CAS behavior, cleanup leasing, and trusted forwarded-header behavior. Missing coverage remains for the logging redaction rule, the internal `MediaImageProcessingFailedError.failureCode` persistence path, and the media-only `beforeunload` guard.
