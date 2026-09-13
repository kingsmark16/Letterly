# Review, feat/email-password-auth, 2026-09-14

**Reviewed by**: gpt-5 (author on unavailable in this environment; inline fallback because no contrasting reviewer tool was available)
**Scope**: 38 files, branch vs main at `224a3fe0e21dc4d5b8b28a5522d7d9d4f8431544`, including tracked and untracked implementation files. Lock files were inspected but excluded from the count.
**Verdict**: Approve with nits

## Summary

The change adds Better Auth email and password sign up, verification, sign in,
sign out, password reset, Resend delivery, shared validation, route limits,
safe errors, and Letterly recovery screens while preserving the existing
Google and Facebook configuration and controls. The earlier proxy identity,
HTTP status, public resend timing, provider diagnostics, and production Redis
transport concerns are addressed in the current tree. The implementation is
ready from a correctness and security perspective, with two non blocking
operational and test gate improvements worth scheduling.

Scope: ticked `Review it`. Spec 0018 governs the authentication change;
specs 0016 and 0017 are unrelated presentation and audio work.

## Minor

### 🟡 Mail timeout does not cancel the underlying fetch, `apps/api/src/modules/auth/infrastructure/auth-mail.ts:178`

**Problem**: `withTimeout` rejects after the configured deadline but has no
`AbortController` or cancellation signal. A timed out Resend request can
remain pending while the retry loop starts another request with the same
idempotency key.

**Why it matters**: A stalled provider can leave several sockets or promises
alive for one auth email operation. The idempotency key reduces duplicate
delivery risk, but it does not release the underlying resource.

**Suggested fix**: Thread an abort signal through the Resend transport and
abort each attempt when its timeout expires. Retain the stable idempotency key
and test that a timed out attempt is cancelled before the next retry.

### 🟡 The real Prisma lifecycle suite is opt in rather than part of the normal test gate, `apps/api/test/authentication.database.e2e-spec.ts:14`

**Problem**: The suite covers the real persistence transitions, but
`describeReal` skips all three tests unless `RUN_REAL_DB_TESTS=1`. The
regular `pnpm test` run does not execute the API `test:e2e` project, so the
default gate exercises the Better Auth options and browser requests mostly
through mocks.

**Why it matters**: Verification state changes, reset token consumption,
session revocation, and the OAuth-only reset guard can regress while the
default green test signal remains unchanged.

**Suggested fix**: Run this suite in an isolated database job as part of the
pre-merge or release gate, or document and enforce an equivalent dedicated CI
job. Keep the local opt in guard so ordinary tests never mutate a shared
database.

## Strengths

- The shared Zod contracts enforce the six through 128 character policy,
  normalize email and name fields, and preserve password whitespace.
- Fixed callback destinations, URL token cleanup, credential eligibility
  checks, explicit post-verification sign in, session revocation, HMAC-derived
  atomic rate-limit keys, and production Redis TLS/auth validation align well
  with the security requirements.
- The public resend path now queues verification delivery, so provider latency
  does not disclose whether an address is unverified. The direct Resend
  boundary discards provider response bodies, uses stable idempotency keys,
  bounded transient retries, accessible HTML and plain text, and allowlisted
  operational events.
- The Letterly auth UI retains both social controls and adds labeled,
  keyboard-accessible, reduced-motion-friendly credential and recovery states.

## Test coverage

The current verification history reports the full project gates passing:
API unit tests with **56 suites and 382 tests**, web tests with **15 tests**,
the focused authentication Playwright journey with **34 cases**, type checks,
lint, and build. The focused regression test first failed against the awaiting
callback and passed after the queueing fix. The opt in Prisma suite was invoked
without the opt in flag and exited successfully with its **3 tests skipped**,
because the configured database was not confirmed to be an isolated test
database. Live Resend delivery and production Redis behavior were not exercised
in this environment.
