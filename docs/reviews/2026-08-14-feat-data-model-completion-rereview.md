# Review, feat/data-model-completion, 2026-08-14

**Reviewed by**: GPT-5 review agent (author on GPT Codex)
**Scope**: 123 files, branch vs main, focused on Secret Letter media fixes
**Verdict**: Changes requested

## Summary

The direct invalid image Save bug is fixed for ordinary invalid inputs, and the completion lease path now reserves capacity before claiming a processing lease. The forwarding header fix closes the prepended `X-Forwarded-For` spoof case, but it still trusts `X-Real-IP` outside the configured proxy hop calculation. I found one high confidence related Save concurrency gap where a requested image can change after validation and the page content version can still commit.

## Disposition of original findings

1. Original blocker, image validation before content writes. The direct case is resolved because requested images are validated before `page.updateMany` runs. A related concurrent mutation gap remains in the same Save path, listed as Major 1.

2. Original major, capacity before processing lease. Resolved. `completeUpload` reserves the in process slot before it calls `claimImage`, and the slot is released in `finally`.

3. Original major, trusted public visitor identity. The prepended `X-Forwarded-For` spoof case is resolved. The broader original concern is not fully resolved because `X-Real-IP` is still accepted without the trusted proxy boundary, listed as Major 2.

## Major

### 🟠 Save can still succeed after a requested image changes concurrently, `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts:551`

**Problem**: `updateDraft` now validates requested images before updating page content, but the later per image `updateMany` result is ignored. If a ready unattached image is removed, retried, or expired after validation but before the attachment write, the page update at lines 455 through 472 can still commit and the transaction can still return `updated`. Directly related media writes also use stale read checks followed by unconstrained final writes, for example retry updates by id at `apps/api/src/modules/pages/infrastructure/prisma-page-media.repository.ts:419` and remove deletes by id at `apps/api/src/modules/pages/infrastructure/prisma-page-media.repository.ts:479`.

**Why it matters**: A creator can save a letter from one tab while another tab retries or removes the same ready image. The API can report a successful Save, increment `contentVersion`, and leave the requested image unattached or deleted. That breaks AC-4 and AC-5, where Save owns the gallery mutation and removal of attached images must happen only through Save.

**Suggested fix**: Make the requested attachment writes conditional and verify that every requested image update affects exactly one row. If any post content update image guard fails, throw a typed rollback error inside the transaction and map it to `INVALID_IMAGE` after rollback. Add the same final write guards to retry and remove so they cannot mutate a row that became attached after their initial read. Add regression tests for Save racing remove or retry on a ready unattached image.

### 🟠 `X-Real-IP` is still trusted outside the proxy hop calculation, `apps/web/src/lib/visitor-identity.ts:37`

**Problem**: `getTrustedVisitorAddress` applies `TRUSTED_PROXY_COUNT` to `X-Forwarded-For`, but when that header is absent it falls back to `X-Real-IP`. The Next public page and public media routes then sign that address at `apps/web/src/lib/public-page.ts:29` and `apps/web/app/p/[slug]/media/[imageId]/route.ts:30`. That header is not selected through the trusted proxy hop boundary described by the spec.

**Why it matters**: In any deployment path where `X-Forwarded-For` is absent or not overwritten, a visitor can vary `X-Real-IP`, receive a valid signed visitor identity, and bypass the public page and public media rate limit buckets. Spec 0006 says the canonical visitor key comes from `X-Forwarded-For` only through the configured trusted proxy, with local development using the socket address.

**Suggested fix**: Remove the raw `X-Real-IP` fallback from this helper. If a fallback is needed, use a platform supplied socket or request IP that is not client controlled, or return `unknown` when no trusted forwarded address exists. Add tests for `TRUSTED_PROXY_COUNT=1` with no `X-Forwarded-For` and a spoofed `X-Real-IP`, and assert the signed visitor key does not change.

## Strengths

1. The direct Save validation fix is in the right order now, with requested image validation at lines 415 through 452 before the page content update at line 455.

2. The completion service now releases active capacity in `finally`, which closes the leaked slot risk for errors after a reservation.

3. The added tests target the three original review findings instead of only covering the happy path.

## Test coverage

The reported verification is strong: API unit tests, API end to end tests, desktop and mobile Playwright, type checks, lint, formatting, and production build all passed. The branch now covers direct invalid image Save rollback, capacity before lease claim, and prepended `X-Forwarded-For` spoofing. Missing coverage remains for the two major findings: Save racing ready image retry or remove, and `X-Real-IP` with a positive trusted proxy count.
