# Review, feat/data-model-completion, 2026-08-14

**Reviewed by**: GPT-5 Codex review agent (author on unknown model)
**Scope**: 143 files, branch vs main
**Verdict**: Approve with nits

## Summary

This pass re-reviewed the full branch diff with extra focus on the latest media fixes in production config validation, expired media access, completion claims, Save concurrency, cleanup, public delivery, visitor identity signing, and sensitive logging. The important prior media findings are resolved: production API config now requires R2 plus `PUBLIC_MEDIA_PROXY_SECRET`, expired unattached images no longer stream or complete, media Save/Retry/Remove use transactional guards, and completion logs stay on allowlisted metadata. I found one remaining test-adequacy gap around the matching web production configuration path.

## Minor

### 🟡 Web production media-secret validation is untested, `apps/api/src/infrastructure/config.spec.ts:1`

**Problem**: The new regression coverage exercises `loadConfig()` for the API-side production R2 and `PUBLIC_MEDIA_PROXY_SECRET` requirements, but no test exercises `loadWebConfig()`. The web schema has its own production-only branches for `API_ORIGIN`, `BETTER_AUTH_SECRET`, and `PUBLIC_MEDIA_PROXY_SECRET` in `packages/config/src/index.ts:103`, including the media proxy secret requirement at `packages/config/src/index.ts:124`.

**Why it matters**: The public Next.js page and media proxy sign visitor identities before calling the API. A future regression in the web config schema could silently remove the matching startup guard while the API remains protected, leaving production public media/signing behavior dependent on runtime fallback paths instead of explicit deployment validation.

**Suggested fix**: Add focused config tests for `loadWebConfig()` that prove production rejects missing `API_ORIGIN`, `BETTER_AUTH_SECRET`, and `PUBLIC_MEDIA_PROXY_SECRET`, and accepts a complete production web environment. The existing API config test can stay as-is.

## Strengths

- The latest config fix closes the production startup gap for API media: R2 fields and `PUBLIC_MEDIA_PROXY_SECRET` are now required before production boot succeeds.
- The media repository now consistently handles expiry and compare-and-set paths: expired unattached rows are not claimed or streamed, Save rolls back on image races, and Retry/Remove avoid mutating rows that became attached or changed.
- Public delivery remains private-by-construction: public projections expose only same-origin media paths, the API rechecks current published slug plus attached `READY` state before streaming, and responses use `no-store`/`noindex` headers.
- Completion logging has a good privacy shape now: provider failures log event/stage/image ID plus stable provider code/name/status, without storage keys, provider messages, stacks, or credentials.

## Test coverage

API typecheck and web typecheck passed. The API Jest suite passed after rerunning outside the sandbox listener restriction: 22 suites and 125 tests. API e2e passed: 2 suites and 7 tests. Coverage is strong around media service behavior, repository race/expiry handling, image processing, cleanup leasing, public/owner controller mapping, and editor/public browser behavior; the one remaining gap is the untested `loadWebConfig()` production media-secret validation branch noted above.
