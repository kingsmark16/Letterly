# Review, feat/data-model-completion, 2026-08-14

**Reviewed by**: GPT 5 (author on unknown model)
**Scope**: 141 files, branch vs main
**Verdict**: Changes requested

## Summary

This change adds the Secret Letter media path across Prisma, NestJS, R2 storage, Next.js public delivery, the editor, public rendering, and tests. The media transaction design is mostly careful, especially around owner scoping, completion claims, safe public projection, and cleanup records. The main issue is that production startup still permits missing required media configuration and silently reuses the auth secret for visitor signing.

## Major

### 🟠 Enforce required production media configuration, `packages/config/src/index.ts:53`

**Problem**: The API config only validates R2 fields when at least one R2 value is present, and `PUBLIC_MEDIA_PROXY_SECRET` is optional. The runtime then falls back to `BETTER_AUTH_SECRET` for public visitor identity signing in `apps/api/src/modules/pages/pages.module.ts:65`, while the web side has the same fallback in `apps/web/src/lib/public-page.ts:27` and `apps/web/app/p/[slug]/media/[imageId]/route.ts:24`.
**Why it matters**: Spec 0006 makes R2 credentials and `PUBLIC_MEDIA_PROXY_SECRET` required for this feature, and the blueprint requires startup validation for required environment values. A production API can boot with all upload and image read paths returning storage errors at runtime, and it can also reuse the Better Auth secret as the media proxy HMAC key. That weakens secret separation for a public route and hides a deploy error until creators or visitors hit the broken media path.
**Suggested fix**: Make production API config require all R2 fields and `PUBLIC_MEDIA_PROXY_SECRET`. Keep any fallback only for local test or development if needed, and add config tests that prove production rejects missing R2 values and rejects a missing media proxy secret.

## Minor

### 🟡 Expired unattached ready images still stream to owners, `apps/api/src/modules/pages/infrastructure/prisma-page-media.repository.ts:557`

**Problem**: `getOwnerImage` scopes by owner, page, image, and `READY` state, but it does not check `expiresAt`. A ready image that was never attached is hidden from owner projections after expiry, yet its direct owner media URL can still stream until cleanup deletes the row and object.
**Why it matters**: Spec 0006 says unready and ready but unattached records expire after 24 hours. If cleanup is delayed or fails, expired temporary media remains readable by the owner route even though the editor recovery model treats it as gone.
**Suggested fix**: Apply the same non expired predicate used by owner listing, or allow attached images while rejecting unattached rows whose `expiresAt` is in the past. Add a repository or controller test for an expired ready unattached image URL.

## Strengths

- The completion flow verifies object metadata and magic bytes, writes only sanitized WebP output, and uses a database claim to avoid double processing.
- Page Save keeps image attachment, removal, captions, order, quota checks, and stale version handling in one transaction.
- Public page and public media responses use safe projections, generic not found errors, and no store headers.

## Test coverage

The branch adds useful unit coverage for media service behavior, Prisma repository transitions, image processing, safe controller mapping, public rendering, and editor persistence. The main test gap is production configuration validation for R2 and `PUBLIC_MEDIA_PROXY_SECRET`. There is also no test proving expired ready but unattached owner media URLs stop streaming.
