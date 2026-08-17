# Review, feat/data-model-completion, 2026-08-14

**Reviewed by**: GPT-5, contrasting reviewer model (author on GPT Codex)
**Scope**: 121 files, branch vs main, focused on Secret Letter media
**Verdict**: Blocked

## Summary

The media slice covers the main R2 upload, sanitization, owner save, cleanup, and public render path, with a solid amount of unit and browser coverage. I found one atomicity bug that can commit page content while returning an image save error, plus two major issues in completion throttling and public visitor identity. The feature should not merge until the save transaction is made truly atomic.

## Blockers

### 🔴 Image save errors still commit page content, `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts:415`

**Problem**: `updateDraft` updates the page content and increments `contentVersion` at lines 415 through 432 before it validates that the requested image rows are ready, present, and within byte limits at lines 456 through 492. When those later checks return `invalid_image` or `image_limit`, the interactive Prisma transaction resolves normally, so the earlier page update is committed even though the API returns an error.

**Why it matters**: A creator can submit a Save with a not ready, expired, missing, or oversized image set, receive a `422`, and still have their letter text and content version changed. That breaks the explicit Save contract in spec 0006 AC-4, makes the user think nothing was saved, and can make the next retry stale because the version already advanced.

**Suggested fix**: Move all image validation and quota calculation before the page content update, or throw rollback errors inside the transaction and map them after rollback. Keep the content update, image attachment changes, cleanup task creation, and version increment as one atomic success path only.

## Major

### 🟠 Completion throttling leaves images leased without processing, `apps/api/src/modules/pages/application/page-media.service.ts:188`

**Problem**: `completeUpload` claims the image first, which sets the database state and processing lease through `claimImage`, then calls `acquireProcessingSlot`. If the per creator or per instance active completion limit is already full, `acquireProcessingSlot` throws before the processing `try` block starts. The service returns `429`, but the image has already been moved to `SANITIZING` with a lease.

**Why it matters**: A rate limited completion should fail without partial state. Instead, the image appears to be actively processing for up to 180 seconds, and retry or complete calls return `IMAGE_PROCESSING` even though no worker is touching it. This violates spec 0006 AC-10 and AC-11, and it creates a needless recovery delay under normal concurrency.

**Suggested fix**: Acquire the in process slot before claiming the row, or add a rollback path that clears the claim when no slot is available. Add coverage where the active limit is exceeded after a claim attempt, and assert that the image remains immediately retryable or still `UPLOADING`.

### 🟠 Public visitor identity trusts spoofable forwarded headers, `apps/web/src/lib/visitor-identity.ts:20`

**Problem**: `getTrustedVisitorAddress` reads `x-forwarded-for` and `x-real-ip` directly from the incoming browser request headers, and the media route signs that value for the API at `apps/web/app/p/[slug]/media/[imageId]/route.ts:27`. The configured `TRUSTED_PROXY_COUNT` at `packages/config/src/index.ts:29` is not used here, so the route signs a visitor address that a client can spoof by sending its own forwarded header.

**Why it matters**: Public media reads are limited to 600 requests per minute per visitor. A visitor can vary `X-Forwarded-For`, receive a valid signed identity for each value, and bypass the `publicMediaReads` limit. The same helper is also used for public page reads. This contradicts spec 0006 AC-10, which requires the canonical visitor key to come from forwarded headers only through configured trusted proxies.

**Suggested fix**: Derive the visitor address from a trusted platform request IP when available. If forwarded headers must be parsed, use the configured trusted proxy count and ignore client supplied hops outside that trusted boundary. Apply the same helper to public page and public media routes, then add tests that spoofed forwarded headers do not change the signed visitor key.

## Strengths

1. The R2 upload path keeps object keys server generated and verifies checksum, content type, magic bytes, dimensions, and sanitized WebP output before `READY`.
2. The public projection and media stream keep storage keys private and use same origin `no-store` image routes.

## Test coverage

The branch has useful unit coverage for image processing failures, cleanup tasks, public media streaming, and public browser rendering. The missing coverage is around the exact failure modes above: image save rollback on invalid image inputs, active completion limit after a claim, and spoofed forwarded headers through the Next.js public routes.
