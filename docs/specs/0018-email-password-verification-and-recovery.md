# 0018. Email password verification and recovery

**Date:** 2026-09-14

**Status:** Accepted

## Summary

Extend the existing Better Auth credential flow with email verification, email only password recovery, secure validation, route specific rate limits, and safe transactional email delivery through Resend.

The existing Letterly sign in design stays in place. Google and Facebook sign in and their callbacks stay unchanged. Better Auth continues to own password hashing, credential records, signed email verification tokens, reset tokens, sessions, and cookie behavior. Prisma remains the existing persistence adapter.

A new credential account must verify its email before its first email and password sign in. Verification does not create a session automatically. Password recovery sends a one hour reset link only for users who already have a credential account. A successful reset revokes every active session for that user.

## Context

This is an enhancement to the existing email and password sign up, sign in, and sign out slice. Verification, reset, recovery, validation, rate limiting, and email delivery are grouped because they share the same Better Auth lifecycle and security boundary.

Letterly is a private beta with sensitive email addresses, passwords, sessions, and private letter content. The design must prevent account enumeration, brute force attempts, token leakage, unsafe redirects, and unbounded email sending.

The existing Prisma schema already contains the Better Auth User, Account, Session, and Verification models. No schema migration is required. Better Auth email verification uses a signed token and marks User.emailVerified. Better Auth password reset uses a short lived value in the Verification table and consumes it during reset.

Account linking, multi factor authentication, phone recovery, support initiated recovery, and a second authentication provider are outside this feature.

## Requirements

Each acceptance criterion is independently testable.

### AC 1. Existing sign in experience

The existing Letterly sign in design supports email and password sign up, sign in, sign out, email verification, verification resend, forgot password, and password reset.

The Google and Facebook buttons, provider configuration, callback routes, and OAuth user experience remain unchanged.

### AC 2. Shared input validation

Email input is trimmed, normalized to lowercase, and rejected when invalid or longer than 254 characters.

Name input is trimmed and rejected when empty or longer than 80 characters.

Password input is never trimmed. It must contain at least 6 characters and at most 128 characters. No additional composition rule is introduced.

The same limits are enforced at the server boundary and represented in the shared client contract. Client validation is an early feedback layer only.

### AC 3. Credential sign up

A valid sign up creates or preserves a Better Auth credential account with a Better Auth password hash and User.emailVerified set to false until verification completes.

Sign up does not create an authenticated session. Public completion behavior is safe and does not disclose whether the address already belongs to an account.

An email already attached to any User returns the same generic completion response. Existing credential and OAuth accounts are neither linked nor modified. A duplicate sign up does not send another verification message; an unverified credential user uses the explicit resend action.

### AC 4. Verification email delivery

A new unverified credential account receives a verification email through a server side Resend adapter.

If Resend fails, the account is preserved, the caller receives a safe generic result, and the server records only safe operational details such as event type, request id, provider error category, and retry outcome.

Provider credentials, full provider responses, email addresses, tokens, passwords, and private content are not logged.

### AC 5. Verified credential sign in

Email and password sign in succeeds only after User.emailVerified is true.

An invalid credential or unverified sign in receives one safe sign in failure response and no session. The response does not disclose whether a matching account exists or whether the password was correct. The resend action is available without identifying the account state.

Verification resend is an explicit action. Sign in does not automatically send a new verification message on every failed attempt.

### AC 6. Email verification

A valid verification link is accepted for 24 hours and marks the matching user verified. The server generated link targets the fixed application route APP_ORIGIN/verify-email; arbitrary client callback URLs are ignored or rejected.

Verification redirects only to an approved same origin application path. Verification does not create a session automatically. The user must return to the sign in screen and enter the password explicitly.

A replay after successful verification is a safe idempotent no op that does not create a session. A malformed, expired, or invalid token is handled with a safe error state.

### AC 7. Password recovery request

Password recovery accepts an email address and uses the fixed application route APP_ORIGIN/reset-password. Arbitrary client redirect targets are ignored or rejected.

The public response is the same safe generic response for an unknown address, a verified address, an unverified address, an OAuth only user, and a credential user.

A reset email is sent only when the user already has an Account record with providerId equal to credential. OAuth only users do not receive a reset email. Password reset submission independently checks the same credential Account requirement before Better Auth can create or update a credential account, so an OAuth only user cannot become a credential user through a leaked or fabricated reset token.

Reset links are valid for one hour.

### AC 8. Password reset

A valid reset submission accepts a new password between 6 and 128 characters, requires the web confirmation value to match the new password exactly, consumes the reset token, updates the Better Auth password hash, and revokes all active sessions for that user.

An invalid, expired, reused, or malformed token does not change credential data or sessions. Public errors do not reveal whether a token belonged to a real account.

### AC 9. Rate limits

The Better Auth routes use these limits per client IP.

| Operation | Limit |
| --- | --- |
| Email sign in | 5 requests per minute |
| Email sign up | 3 requests per minute |
| Sign out | 10 requests per minute |
| Verification resend, POST /send-verification-email | 3 requests per hour |
| Verification link request, GET /verify-email | 10 requests per hour |
| Password reset request, POST /request-password-reset | 3 requests per hour |
| Password reset submission, POST /reset-password | 5 requests per hour |

The route specific limits run before account or token lookup and apply to every request, including unknown emails and invalid tokens. They apply in addition to the existing general Better Auth protection.

### AC 10. Shared rate limit storage

Production rate limiting uses the existing shared Redis path and HMAC derived keys. Raw IP addresses, email addresses, passwords, and tokens are never used as Redis keys or values.

Development and test use the existing in memory store. Production fails closed for all seven operations listed in AC 9 when the shared rate limit store is unavailable. The operation makes no authentication or password state change and returns a safe temporary failure response. The reset token handoff GET route remains covered by the existing general Better Auth protection unless a separate limit is added later.

Redis production access uses TLS, authentication, a least privilege ACL, and a network boundary that does not expose Redis publicly.

### AC 11. Safe errors and logging

Public responses do not expose account existence, OAuth provider details, password state, token state, Resend response bodies, stack traces, or internal database details.

Operational logs contain a request id, safe event name, bounded provider error category, route, outcome, and retry metadata where relevant. Logs do not contain passwords, reset or verification tokens, authorization cookies, raw email addresses, or private letter content.

### AC 12. Transactional email quality

Verification and reset messages are sent from a verified Resend domain and include accessible HTML and plain text alternatives.

Each message identifies the action, states its expiry, uses descriptive link text, explains what to do when the request was not made by the recipient, and does not include private letter content.

The server checks the Resend SDK error result directly. Idempotency keys are derived from a stable event and token digest without exposing the raw token. Only transient provider responses such as rate limits, temporary server errors, or network failures are retried with a bounded timeout and exponential backoff with jitter. Permanent validation and sender errors are not retried.

Verification and reset pages capture tokens only for the intended request, replace the token bearing URL in browser history, use no-referrer and no-store behavior, exclude query strings from analytics, and never expose tokens in logs, errors, or rendered content.

### AC 13. Automated coverage

The implementation includes unit tests, API integration tests, and Playwright browser coverage for the acceptance criteria.

Coverage includes password boundaries, normalization, verification, resend, reset, session revocation, token reuse, safe redirects, safe errors, provider failure, retry policy, rate limits, shared storage failure, email content, accessibility, and preservation of Google and Facebook flows.

### AC 14. Documentation and configuration

Documentation describes the credential lifecycle, verification and reset expiry, rate limits, safe error behavior, required Resend configuration, verified sender setup, Redis production requirements, and local test configuration.

## Options considered

### Option 1. Extend the existing Better Auth integration

Keep Better Auth as the authority for credentials, verification, reset tokens, hashing, sessions, and cookies. Add a small Resend delivery adapter, route configuration, credential account gating, shared limits, and UI states.

Advantages are minimal new security sensitive code, direct reuse of the current Prisma adapter, preservation of existing OAuth behavior, and one session model.

Costs are that Better Auth callback behavior must be tested carefully and the provider adapter must translate provider failures safely.

### Option 2. Add a hosted authentication provider

Move credential lifecycle and recovery to another hosted service.

Advantages are less local auth code and provider managed email workflows.

Costs are a second user and session authority, migration and account linking risk, new vendor coupling, and unnecessary change to the current Better Auth and Prisma setup.

### Option 3. Build custom credential and recovery endpoints

Implement password hashing, verification tokens, reset tokens, session rules, and email orchestration outside Better Auth.

Advantages are complete local control.

Costs are duplicating security sensitive functionality already present, expanding the attack surface, and increasing the chance of behavior drifting from the existing OAuth session model.

## Decision

Choose Option 1. Extend the current Better Auth and Prisma integration, with Resend behind a server side mail port and the current HMAC backed rate limit service reused for the new routes.

Configure Better Auth with these decisions:

| Setting | Value |
| --- | --- |
| Email and password enabled | true |
| Minimum password length | 6 |
| Maximum password length | 128 |
| Require email verification | true |
| Send verification on sign up | true |
| Send verification on sign in | false |
| Verification expiry | 86400 seconds |
| Automatic sign in after verification | false |
| Automatic sign in after sign up | false |
| Reset token expiry | 3600 seconds |
| Revoke sessions after password reset | true |

The reset email callback checks for an existing credential Account before sending. This prevents an OAuth only user from receiving a reset link and prevents the default reset path from creating a credential account through an email that was never eligible for password recovery.

The email provider boundary returns a safe success or failure result to the application. The Resend implementation handles result objects, idempotency, timeout, bounded transient retries, accessible content, and redacted operational logging.

## Rationale

The current Better Auth integration already provides the safest reusable primitives for this feature. Reusing it keeps hashing, verification token signing, reset token consumption, session cookies, CSRF and origin checks, and Prisma persistence under one authority.

The explicit sign in after verification is a deliberate security decision. Verification proves control of the inbox but does not prove knowledge of the password. Requiring the password again avoids creating a session on a link click, works better with shared devices and link scanners, and matches the configured automatic sign in false behavior.

The six character minimum follows the product decision for this revision. The maximum of 128 prevents unbounded hashing work while remaining compatible with normal password managers.

Email only recovery is the supported recovery boundary. The generic response and credential account gate reduce enumeration and avoid changing Google and Facebook account behavior.

## Feature design

### Data model

No database migration is needed.

| Existing model or value | Purpose | Source |
| --- | --- | --- |
| User.email | Normalized unique login identifier | Existing Prisma User model |
| User.emailVerified | Credential verification gate | Existing Prisma User model and Better Auth |
| Account.providerId | Distinguishes credential from Google or Facebook | Existing Prisma Account model |
| Account.password | Better Auth password hash | Existing Prisma Account model |
| Session | Authenticated session and reset revocation target | Existing Prisma Session model |
| Verification | Short lived password reset value | Existing Prisma Verification model |
| Signed verification token | Email verification proof | Better Auth signed token, not persisted as a database row |
| Password policy | Six through 128 characters | Shared auth contract constants |
| Application origin | Approved callback and redirect base | Validated application configuration |
| Rate limit key | Per route and IP throttle identity | HMAC derived key in the existing rate limit service |
| Resend message | Verification or reset delivery | Server side Resend adapter |

The signed email verification token is intentionally not added to the Prisma schema. The reset value remains in the existing Verification table and is consumed by Better Auth so it cannot be reused.

### State transitions

A credential sign up creates or preserves an unverified credential account, sends verification, and leaves the browser unauthenticated.

Unverified account -> valid verification -> verified account.

Verified account plus valid password -> authenticated session.

Unverified account plus password -> safe verification required response with no session.

Credential account plus reset request -> generic response and, when eligible, one hour reset message.

Valid reset token plus new password -> new password hash, all sessions revoked, token consumed.

OAuth only account plus reset request -> same generic response and no reset message.

### API and Better Auth routes

| Route | Method | Input | Result |
| --- | --- | --- | --- |
| /api/auth/sign-up/email | POST | name, email, password | Generic completion, no session |
| /api/auth/sign-in/email | POST | email, password | Session only for verified credentials |
| /api/auth/sign-out | POST | Current session cookie | Session removed |
| /api/auth/send-verification-email | POST | email | Generic completion |
| /api/auth/verify-email | GET | signed token | Verified state or safe error redirect |
| /api/auth/request-password-reset | POST | email | Generic completion |
| /api/auth/reset-password/:token | GET | reset token | Safe redirect to reset UI |
| /api/auth/reset-password | POST | new password, reset token | Reset status and session revocation |

The existing controller continues to forward the raw request to Better Auth so request bodies are not parsed before Better Auth handles them.

Callback values are selected from fixed application routes: APP_ORIGIN/verify-email for verification and APP_ORIGIN/reset-password for password recovery. The server supplies these values to Better Auth. An external URL, non HTTPS production URL, credentials embedded in a URL, fragment, unsafe scheme, or unapproved path is rejected or replaced by the fixed safe destination.

### Web surfaces

The existing /sign-in page retains its Letterly layout and OAuth controls. It gains a Forgot password action and a Resend verification email action.

The /sign-up page retains the same visual system and shows a safe check your email completion state.

The /verify-email page handles successful verification, already verified replay, expired links, invalid links, and a clear path back to sign in.

The /forgot-password page accepts an email address and always shows the same generic completion state.

The /reset-password page accepts a new password and confirmation, displays only safe validation or reset state, and returns the user to explicit sign in after a successful reset.

All fields have visible labels, keyboard access, focus states, associated errors, and reduced motion behavior.

### Public response contract

Sign up, verification resend, and password reset request return one generic completion response for new, duplicate, unknown, verified, unverified, OAuth only, ineligible, and provider failure cases. The UI message does not say whether an account exists or whether a message was delivered.

Sign in returns one safe failure response for invalid credentials and unverified credentials. It never returns a public error that confirms a matching account or a correct password. The resend action is available independently.

Verification returns a safe success state for valid and already verified requests and one generic error state for malformed, expired, or invalid tokens. Reset submission returns a safe success state only after the credential and token checks succeed and one generic invalid reset state otherwise.

The rate limiter returns a safe 429 response when a route limit is reached. A production shared store failure returns a safe temporary failure response and performs no protected operation. None of these responses expose provider, database, token, or account state.

### Value sourcing

| Action or display value | Named source |
| --- | --- |
| Normalized email used by an auth action | Shared Zod auth contract |
| Displayed name | Trimmed sign up input |
| Password policy text | Shared minimum and maximum constants |
| Credential eligibility | Better Auth Account providerId credential |
| Verification state | Better Auth User.emailVerified |
| Verification result | Better Auth signed token handler |
| Verification expiry text | Auth configuration of 86400 seconds |
| Reset eligibility | Existing credential Account query |
| Reset expiry text | Auth configuration of 3600 seconds |
| Reset token validity | Better Auth Verification consumption |
| Session after sign in | Better Auth session handler and cookie |
| Session revocation result | Better Auth password reset callback and Session store |
| Rate limit decision | Existing route and IP rate limit service |
| Safe public error | Auth presentation error mapping |
| Request correlation | Existing request context |
| Callback destination | APP_ORIGIN plus the fixed verification or reset route |
| Email sender and reply to | Validated Resend configuration |
| Email content | Server side accessible transactional templates |
| Provider failure log fields | Redacted mail adapter operational event |

### Invariants

1. A credential lookup uses the normalized email and the unique User.email constraint.
2. Passwords are never trimmed, logged, returned, or stored in plaintext.
3. An email and password session requires a verified user.
4. Email verification never creates a session automatically.
5. Google and Facebook configuration and callback behavior are unchanged.
6. Password reset email and password reset submission are permitted only for an existing credential Account.
7. Reset tokens expire after one hour, are consumed once, and revoke all active sessions after success.
8. Verification links expire after 24 hours. A replay after verification is a safe idempotent no op.
9. Callback targets are fixed, same origin application paths.
10. Public responses are generic and provider independent.
11. Resend is called only from the server with a verified sender and both HTML and plain text content.
12. Production rate limit keys are HMAC derived and shared through Redis. Protected operations fail closed when Redis is unavailable.
13. Sensitive values do not enter logs, metrics, analytics, cache keys, or public errors.
14. Verification and reset pages remove token values from browser history and referrers after capture.

### Security model

The API and Better Auth handler are the authority for all credential, verification, reset, and session decisions. The browser is an untrusted input surface.

The existing secure cookie, SameSite, CSRF, trusted origin, and request context behavior remains active. Verification and reset routes accept only application controlled callback paths.

Dummy work and generic completion responses are preserved so timing and response differences do not disclose account existence. The reset credential gate is performed before sending mail, and no provider response body is exposed.

Production Redis uses TLS, authentication, least privilege ACL credentials, and restricted network access. Resend credentials are server only. Email templates do not include private Letterly content.

### Configuration

Production requires:

| Variable | Purpose |
| --- | --- |
| BETTER_AUTH_URL | Better Auth public origin |
| BETTER_AUTH_SECRET | Better Auth signing secret |
| RESEND_API_KEY | Server side Resend credential |
| RESEND_FROM_EMAIL | Verified sender identity |
| RESEND_REPLY_TO | Optional reply destination |
| REDIS_URL | Shared production rate limit storage |
| APP_ORIGIN | Approved browser callback origin and fixed callback base |

Tests use a fake mail adapter and deterministic clock where needed. Development without a Resend key may use a safe disabled sender result for local UI work, while production configuration validation fails startup when required mail settings are absent.

### Critical test scenarios

| Scenario | Acceptance criteria |
| --- | --- |
| Sign up, receive fake verification message, verify, sign in explicitly, sign out | AC 1, AC 3, AC 5, AC 6 |
| Password lengths 5, 6, 128, and 129 | AC 2, AC 8 |
| Email case, whitespace, invalid syntax, and maximum length | AC 2 |
| Unverified sign in and explicit verification resend | AC 5, AC 9, AC 11 |
| Valid, expired, malformed, and replayed verification link | AC 6, AC 11 |
| Reset request for unknown, OAuth only, unverified credential, and verified credential user | AC 7, AC 11 |
| OAuth only reset token submission is rejected without creating a credential Account | AC 7, AC 8 |
| Valid reset revokes two active sessions and cannot be reused | AC 8 |
| Provider failure preserves account and produces safe response and safe log | AC 4, AC 11, AC 12 |
| Resend transient retry and permanent error behavior | AC 4, AC 12 |
| Per route limits, shared Redis behavior, and unavailable Redis fail closed | AC 9, AC 10 |
| External, unsafe, or credential bearing redirect attempts | AC 6, AC 7, AC 11 |
| Token is removed from the browser URL and excluded from referrer and analytics data | AC 11, AC 12 |
| Keyboard and assistive technology flow through all new form states | AC 1, AC 13 |
| Google and Facebook sign in regression journey | AC 1, AC 13 |

## Build plan

1. Update shared auth contracts, password constants, normalization, and reset or verification boundary types. Add focused validation tests. Covers AC 2, AC 8, and AC 13.
2. Add the server mail port, Resend adapter, accessible templates, configuration validation, safe result mapping, idempotency, timeout, bounded transient retry, and fake mail implementation. Covers AC 4, AC 11, AC 12, and AC 14.
3. Configure Better Auth verification and reset behavior, add the credential gate for reset delivery and reset submission, preserve OAuth settings, and add safe auth error mapping. Covers AC 1, AC 3, AC 4, AC 5, AC 6, AC 7, and AC 8.
4. Add the exact verification and reset route limits to the existing HMAC backed limiter and prove Redis outage behavior. Covers AC 9, AC 10, and AC 11.
5. Extend the existing Letterly auth UI with verification, resend, forgot password, reset password, fixed callbacks, token URL hygiene, safe states, accessible errors, confirmation matching, and six through 128 copy. Covers AC 1, AC 2, AC 5, AC 6, AC 7, AC 8, and AC 13.
6. Add unit, API integration, and browser tests for the complete lifecycle, provider failures, rate limits, redirects, email content, and OAuth regression. Covers AC 1 through AC 13.
7. Update authentication and setup documentation and record the required sender, Redis, environment, and verification operations. Covers AC 12, AC 13, and AC 14.

## Migration plan

### Strategy

Use a code and configuration rollout with no database migration. Existing Better Auth tables and OAuth accounts remain intact.

### Phases

1. Deploy the implementation with fake mail and focused automated coverage in test environments.
2. Configure the verified Resend sender, production secret, Redis TLS and ACL settings, and approved application origin.
3. Run controlled sign up, verification, explicit sign in, reset, session revocation, OAuth, provider failure, and rate limit smoke journeys.
4. Monitor safe delivery failure events, rate limit rejection counts, verification completion, reset completion, and authentication errors without recording sensitive values.

Existing email and password accounts that are not verified will be required to verify before their next successful credential sign in. Existing Google and Facebook users are not changed.

### Rollback

Revert the application deployment and mail configuration. Do not delete User, Account, Session, or Verification rows. Existing OAuth behavior remains recoverable. Unused verification and reset values expire under their configured lifetimes.

### Risks

A missing verified sender, invalid Resend key, Redis outage, or incorrect application origin can delay verification and recovery. Production rollout requires configuration validation and controlled smoke tests before exposing the flow broadly.

## Consequences

Positive consequences are verified credential ownership, self service email recovery, session revocation after reset, safe per route throttling, reuse of Better Auth and Prisma security primitives, and unchanged Google and Facebook sign in.

Negative consequences are a dependency on Resend and sender domain configuration, free tier delivery limits, the extra explicit sign in step after verification, and a temporary recovery delay when the email provider is unavailable.

Neutral consequences are no Prisma migration, no custom token table, safe idempotent verification replay, and no delivery webhooks, bounce workflow, multi factor authentication, account linking, or password change dashboard in this slice.

## Follow-up

1. Verify SPF, DKIM, and DMARC for the production Resend sender before rollout.
2. Store Resend and Redis secrets in the production secret manager.
3. Decide later whether delivery webhooks and bounce suppression need a separate feature.
4. Reconcile older scope and specification text that describes authentication as OAuth only after this feature is shipped.
5. Add the newly installed Resend, email, password, and Redis skill references to durable project context during /sync.
