# Review, codex/staging-disable-email-password-auth, 2026-10-15

**Reviewed by**: GPT-5 (author on GPT-6)
**Scope**: 43 files, branch vs `origin/staging`
**Verdict**: Changes requested

## Summary

The change removes credential forms, recovery routes, Resend delivery, and credential configuration while retaining the Google and Facebook OAuth configuration, session handling, and existing database records. The API applies both Better Auth configuration and a NestJS route boundary to retire credential endpoints, which is a sound defense in depth approach. The staging and production setup documentation now consistently removes authentication mail dependencies; the remaining release blocker is direct regression coverage for the API denial boundary.

## Major

### Major: Retired credential endpoints have no regression coverage, `apps/api/src/modules/auth/auth.controller.ts:73`

**Problem**: The new branch that returns a 404 before calling Better Auth is not exercised by `auth.controller.spec.ts`; its only test creates a request without a `path` and only asserts the normal forwarding path. `better-auth.spec.ts` also does not assert `emailAndPassword.enabled` is `false`. This leaves every requirement that credential, verification, recovery, and password management routes are unavailable dependent on untested string matching and an unverified third party option.

**Why it matters**: This is the security and product boundary that prevents credential accounts from being created and prevents verification or reset email behavior from returning. A path spelling, normalization, or later Better Auth configuration regression could silently re enable part of the retired surface even though the OAuth browser checks remain green.

**Suggested fix**: Add focused controller tests for each exact retired path plus the reset token subpath, asserting a generic 404 and that the Better Auth handler is not called. Add a Better Auth options assertion for `emailAndPassword: { enabled: false }`; retain the existing OAuth provider and session assertions. The configured test suites already support these unit level checks.

## Strengths

- Better Auth now explicitly disables email/password authentication while preserving the existing Google/Facebook provider pairs, rate limit storage, trusted origins, secure cookies, and OAuth proxy behavior.
- The credential and mail implementation is removed across UI, API configuration, package dependencies, examples, and current authentication guidance without a database migration or record deletion.
- The retained sign in and sign up browser coverage checks OAuth controls, keyboard access, safe callback paths, provider failures, existing sessions, and sign out.

## Test coverage

The configured Jest and Playwright suites were not run for this review, as directed. The edited browser tests cover the OAuth only entry screens and retained OAuth/session behavior. They do not cover the new API endpoint denial branch, and the Better Auth options test does not assert the new credential disable flag; those are the major coverage gaps above. The author reported that lint, format, typecheck, and build checks passed.
