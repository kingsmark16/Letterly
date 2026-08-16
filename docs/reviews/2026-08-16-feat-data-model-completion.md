# Review, feat/data-model-completion, 2026-08-16

**Reviewed by**: gpt-5.6-sol (author on Codex GPT-5)
**Scope**: 203 files, branch vs main
**Verdict**: Changes requested

## Summary

This branch implements the Secret Letter media, protected sharing, visitor response, and creator response-dashboard slices across the database, API, and web application. The previously reported editor data-loss path, password-transition race, disabled-response preflight ordering, dashboard mutation recovery, and response-detail retry gaps are now fixed with focused regressions. The remaining merge concern is that the required privacy-sensitive response lifecycle is still tested through mocked service and network boundaries rather than the real controller-to-database and browser-to-API paths.

## Major

### 🟠 Required response privacy lifecycle coverage remains mocked, `apps/api/test/pages-submissions.e2e-spec.ts:91`

**Problem**: The Supertest suite mounts the Nest transport but replaces `PageSubmissionsService`, `PagePasswordService`, `RateLimitService`, the Prisma client, and `PrismaPageSubmissionsRepository`. It therefore proves request parsing and controller ordering, not the submission service, locked repository transaction, persistence, and database constraints. The Playwright response suite likewise fulfills every owner-response request in the browser at `apps/web/e2e/visitor-responses.spec.ts:88` and never opens the public visitor form or sends a real submission.

**Why it matters**: Spec 0008 AC-16 explicitly requires integration and browser proof for the public form, validation and branch failures, idempotent retry, duplicate protection, rate limiting, protected unlock, response-toggle and unpublish behavior, ownership isolation, read/delete lifecycle, privacy headers, and question cleanup. The current suites cannot detect regressions across the controller, service, transaction, cookie/proxy, and database boundaries that enforce those privacy and once-per-browser guarantees.

**Suggested fix**: Add database-backed Supertest coverage through the real submission service and repository for the full public and owner lifecycle, including protection and publication transitions. Add a Playwright journey that enables responses, authors a question, publishes, opens `/p/:slug`, submits through the same-origin proxy, retries with the same key, and completes the owner read/delete lifecycle. Keep the focused mocked suites as transport and UI-state tests.

## Strengths

- Saving the response toggle parses and preserves the complete private settings shape, including encrypted password configuration, and the regression test locks in that compatibility.
- Submission and question writes share a page-row lock; the transaction now compares an explicit observed protection state, and the public scope rejects disabled responses before password evaluation.
- Owner response queries consistently enforce creator and page predicates, exclude tombstones, and omit browser and idempotency values from presentation records.
- Focused browser tests now prove question mutations preserve dirty editor fields and that detail, read, and delete failures are announced with explicit retry controls.

## Test coverage

`pnpm --filter api test` passes 36 suites and 192 tests. `PUBLIC_MEDIA_PROXY_SECRET=ci-only-proxy-secret-12345678901234567890 pnpm --filter api test:e2e` passes 3 suites and 12 tests, including disabled protected-form ordering. `pnpm --filter web lint` and `pnpm --filter web check-types` pass. The focused `visitor-responses.spec.ts` Playwright run passes 5 tests with 1 mobile-project test skipped, including the fail-once response-detail retry. Unit and focused UI coverage is strong around result mapping, response-graph validation, settings preservation, password-state rechecks, disabled-response scope, editor preservation, and error recovery; the remaining gap is end-to-end behavioral integration through the real visitor form, proxy, service, repository transaction, and database lifecycle.
