# Review, feat/data-model-completion, 2026-08-15

**Reviewed by**: GPT-5 Codex review agent (author on unknown model)
**Scope**: 148 files, uncommitted
**Verdict**: Changes requested

## Summary

The change adds a broad, well structured path for publishing, private media, passwords, branching questions, visitor submissions, reports, and owner response access. The media work retains the strong transactional and privacy controls from the earlier passes, and the new contracts keep sensitive records out of public responses. The main remaining issues are cross layer browser identity failures, rate limits that do not enforce their stated windows, and question edit paths that can preserve invalid responses or empty submissions.

## Major

### 🟠 The browser token cookie never reaches the normal public page visitor, `apps/web/src/lib/public-page.ts:47`

**Problem**: The Next server component fetches the public page directly from the API. The API creates `letterly_browser` with `Set-Cookie` when that upstream request has no token, but this helper reads only the JSON body and never forwards the upstream cookie to the browser. The browser never calls the API public page read itself, and no other web path creates this cookie.

**Why it matters**: `POST /api/v1/public/pages/:slug/submissions` rejects every request without this cookie. A visitor using the real `/p/[slug]` route therefore cannot satisfy the browser token contract, even though direct controller tests pass with a hand supplied cookie. Reports also lose their preferred browser scoped rate limit identity and fall back to the proxy address.

**Suggested fix**: Issue the HTTP only browser token at a browser facing Next boundary, or proxy the public read through a route handler that deliberately forwards `Set-Cookie`. Add a browser test that opens `/p/[slug]`, confirms the cookie exists, and submits without seeding it manually.

### 🟠 Public unlock requests use the shared Next proxy address, `apps/web/src/features/pages/components/locked-letter.tsx:19`

**Problem**: Unlock calls the shared Axios client through the generic Next rewrite. Unlike the server public page and media routes, this path does not add a signed visitor identity. The API then falls back to `request.ip` in `apps/api/src/infrastructure/http/visitor-identity.ts:60`. Express is not configured to trust a controlled proxy chain, so deployed requests resolve to the Next server address rather than the visitor address. A report without the missing browser cookie follows the same fallback.

**Why it matters**: All visitors unlocking the same page share one rate limit bucket. One visitor can consume the allowance and deny unlocks to everyone else, while deployments with multiple proxy instances get inconsistent enforcement.

**Suggested fix**: Put unlock and the report fallback behind a Next route handler that derives the trusted visitor address and signs the internal identity header, as the public media route already does. Keep the API verification and add an integration test with two distinct forwarded visitors plus one spoofed header.

### 🟠 Unlock and report limits reset every minute, `apps/api/src/infrastructure/http/rate-limit.service.ts:232`

**Problem**: The unlock key hashes the current minute into the identity, and the report key does the same at line 246. The Redis bucket lives for 15 minutes or 10 minutes, but callers switch to a fresh key at each minute boundary.

**Why it matters**: The stated limits are 10 unlock attempts per 15 minutes and 5 reports per 10 minutes. The implementation permits that allowance again every minute, weakening password brute force protection by up to 15 times and report abuse protection by up to 10 times.

**Suggested fix**: Use a stable server derived identity for the full policy window, or include a window number computed from the policy duration rather than one minute. Add fake clock tests that cross minute boundaries inside the same 10 minute and 15 minute windows.

### 🟠 Question edits calculate response impact from the old graph, `apps/api/src/modules/pages/infrastructure/prisma-page-questions.repository.ts:426`

**Problem**: The repository validates the replacement edges, then calls `collectSubtree` on the original rows. If an edit makes an existing root question a new descendant, answers for that newly attached subtree are not counted, do not trigger confirmation, and are not deleted on the confirmed retry.

**Why it matters**: Existing submissions can retain answers that were originally valid as root answers but no longer follow the selected parent branch. This breaks the response impact rule and leaves creator data inconsistent with the published question graph.

**Suggested fix**: Build the final graph first and calculate the affected question set from that final graph, while also including descendants removed from the old graph. Count distinct affected submissions and delete the complete affected answer set in the same transaction.

### 🟠 Destructive question edits leave empty submissions behind, `apps/api/src/modules/pages/infrastructure/prisma-page-questions.repository.ts:437`

**Problem**: Confirmed update and delete paths remove `VisitorAnswer` rows only. They never delete a `VisitorSubmission` that now has no answers and no `VisitorMessage`.

**Why it matters**: The governing data model explicitly requires deletion of an empty submission after a destructive question edit. Owners instead receive response summaries with zero answers and no message, and the browser token uniqueness record continues to block that visitor from making a meaningful replacement submission.

**Suggested fix**: After deleting affected answers, delete submissions that have no remaining answers and no visitor message, inside the same transaction. Cover both update and delete paths with a real database test.

### 🟠 Published question edits race with visitor submissions, `apps/api/src/modules/pages/infrastructure/prisma-page-questions.repository.ts:426`

**Problem**: Question mutations count and delete existing answers without sharing a lock or version boundary with `submitVisitorResponse`. A visitor can read the old graph after the edit counted zero responses. A plain message answer can then survive the edit without confirmation, while a choice answer can race choice deletion and produce a foreign key or answer form constraint failure. Those database errors are not mapped to a safe retry result.

**Why it matters**: Normal traffic on a published page can bypass the destructive edit rule or return an internal error to either the creator or visitor. Mocked Prisma tests cannot exercise this ordering.

**Suggested fix**: Serialize question graph mutations and submissions on the same page row or another database lock, then revalidate the graph and page state inside that boundary. Map a losing visitor write to a safe branch conflict and add a database concurrency test.

### 🟠 Question and answer rules bypass the trusted template definition, `apps/api/src/modules/pages/infrastructure/prisma-page-questions.repository.ts:245`

**Problem**: Question creation and updates load only page status and content version. They never resolve the page template or verify that it declares the questions capability. Submission validation also treats a missing answer as valid at `apps/api/src/modules/pages/infrastructure/prisma-page-submissions.repository.ts:157`, with no page required answer setting or trusted template rule.

**Why it matters**: The core model requires the API to reject capabilities a template does not support and to distinguish required from optional question flows. A future template can receive unsupported question records, and a required flow currently accepts incomplete displayed branches.

**Suggested fix**: Resolve the immutable template registry entry for question mutations and submissions. Enforce its capability and the page answer mode before writing, and add tests for a template without questions plus required and optional branch behavior.

## Strengths

- Owner response reads, marks, and deletes scope by creator, page, and submission, preserving the safe not found boundary.
- Submission writes store prompt and choice snapshots, keep visitor messages separate, and use database uniqueness for browser and idempotency protection.
- Password ciphertext uses authenticated encryption, unlock proofs store only hashed random tokens, and locked public projections omit confession content.
- The existing media path still validates and sanitizes private objects, keeps storage keys out of projections, and checks current publication before public streaming.

## Test coverage

API and web type checks passed, Prisma validation passed, and all 36 API Jest suites passed with 172 tests. The new tests cover core branch validation, idempotency, ownership, password cookies, reports, and repository mapping. They do not exercise the Next to API cookie handoff, proxy identity on browser unlocks, rate window rollover, final graph response impact, empty submission cleanup, or concurrent question edits and submissions. Those missing paths align with the major findings above.
