# Letterly authentication

Letterly uses Better Auth with the existing Prisma adapter for account data and
sessions. Email and password authentication now works beside the existing
Google and Facebook sign in actions. The OAuth providers and their callbacks
are unchanged.

## Credential lifecycle

The browser uses the same origin Better Auth routes:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/auth/sign-up/email` | POST | Create or preserve an account and begin verification |
| `/api/auth/sign-in/email` | POST | Sign in a verified credential account |
| `/api/auth/sign-out` | POST | Revoke the current session |
| `/api/auth/send-verification-email` | POST | Explicitly request another verification message |
| `/api/auth/verify-email` | GET | Consume a verification link |
| `/api/auth/request-password-reset` | POST | Request password recovery by email |
| `/api/auth/reset-password/:token` | GET | Move a reset token to the reset page |
| `/api/auth/reset-password` | POST | Set a new password and revoke sessions |

Better Auth owns password hashing, credential comparison, signed verification
tokens, reset token consumption, session creation, cookie behavior, and origin
checks. Prisma remains the persistence adapter. No database migration is
needed for this flow.

## Sign up and verification

The shared contract trims and lowercases email addresses, trims the display
name, limits names to 80 characters, and accepts passwords from 6 through 128
characters. Passwords are never trimmed and are never written to logs. There
is no additional password composition rule.

Sign up never creates a session. A new credential account starts unverified and
receives a verification message. Duplicate sign up requests return the same
generic completion result, do not link or modify an existing Google, Facebook,
or credential account, and do not send another message. An unverified user can
choose the explicit resend action instead.

Verification links are valid for 24 hours and use the fixed destination
`APP_ORIGIN/verify-email`. Verification does not create a session. The user
must return to sign in and enter the password. A successful replay is a safe
idempotent no op. Invalid, expired, or malformed links show a generic error.

The verification page captures the token for the intended request, removes the
token from the browser address and history, sends no referrer, uses no store
cache behavior, excludes query strings from analytics, and never renders or
logs the token.

## Sign in and sign out

Email and password sign in succeeds only when the credential account has a
verified email. Invalid credentials and unverified credentials return the same
safe public failure and create no session. The sign in page keeps the Letterly
layout and the Google and Facebook controls, and adds links for password
recovery and verification resend.

Sign out revokes the current Better Auth session and expires its cookie. The
server maps internal failures to safe public messages. Provider, database,
account, password, token, and stack details are not returned to the browser.

## Password recovery

Recovery is email only. The request page always returns the same generic
completion message for an unknown address, a verified or unverified address, an
OAuth only user, and a credential user. A message is sent only when the user
already has a Better Auth `Account` with `providerId` set to `credential`.

An OAuth only user does not receive a reset message and cannot become a
credential user through a reset token. The same credential account check is
performed again when the reset is submitted.

Reset links are valid for one hour and use the fixed destination
`APP_ORIGIN/reset-password`. The reset page requires a new password and an
exact confirmation match. The server validates the password independently,
consumes the token, stores a Better Auth password hash, and revokes every
active session after a successful reset. Invalid, expired, reused, or
malformed tokens make no credential or session change and produce one generic
error state.

The reset page removes the token from the browser address and history after
capture. It never puts the token in a referrer, cache, analytics event, log,
error, or rendered message.

## Rate limits

The following limits apply per client IP and run before account or token
lookup. They apply to unknown emails and invalid tokens as well as valid
requests.

| Route | Limit | Window |
| --- | ---: | ---: |
| `/sign-in/email` | 5 requests | 60 seconds |
| `/sign-up/email` | 3 requests | 60 seconds |
| `/sign-out` | 10 requests | 60 seconds |
| `/send-verification-email` | 3 requests | 1 hour |
| `/verify-email` | 10 requests | 1 hour |
| `/request-password-reset` | 3 requests | 1 hour |
| `/reset-password` | 5 requests | 1 hour |

The general Better Auth limit of 100 requests per 10 seconds remains active
for other auth routes. Rate limit keys are HMAC derived with
`BETTER_AUTH_SECRET`. Raw IP addresses, emails, passwords, and tokens are not
stored as rate limit keys or values.

Development and test use the existing in memory store. Production requires
the shared Redis store and fails closed for the seven protected operations when
Redis is unavailable. The failed operation makes no authentication or password
state change and returns a safe temporary failure. Production Redis must use a
`rediss://` URL with authentication, a least privilege ACL, and a private
network boundary. The application rejects a missing, non-TLS, or
unauthenticated production Redis URL at startup.

The API only trusts client IP forwarding from addresses listed in
`TRUSTED_PROXY_IPS`. The controller removes caller supplied forwarding headers
and gives Better Auth one canonical internal IP header. For direct API traffic,
leave `TRUSTED_PROXY_IPS` empty.

## Email delivery

Verification and reset messages use the server side Resend adapter. Configure a
verified sender domain before enabling the production flow. Each message has
accessible HTML and plain text content, identifies the action and expiry,
provides descriptive link text, and explains what to do when the request was
not made by the recipient.

Required production settings, plus the proxy setting when the API is behind a
reverse proxy:

| Setting | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Server side Resend credential |
| `RESEND_FROM_EMAIL` | Sender on a verified Resend domain |
| `RESEND_REPLY_TO` | Optional reply address |
| `APP_ORIGIN` | Approved browser origin and fixed callback base |
| `BETTER_AUTH_URL` | Better Auth service URL |
| `REDIS_URL` | Shared production rate limit storage; use `rediss://` with authentication |
| `TRUSTED_PROXY_IPS` | Comma separated proxy IP addresses or CIDR ranges, when needed |

The adapter sends idempotency keys derived from an event and token digest. It
uses a bounded timeout and retries only transient provider failures, such as
rate limits, temporary provider errors, and network failures. Permanent sender
or validation failures are not retried. Provider response bodies, credentials,
addresses, tokens, passwords, and private letter content are not logged.

If delivery fails, the account remains intact and the caller receives a safe
generic result. The server log contains only a request id, safe event type,
route, bounded error category, outcome, attempt count, and retry information.

In development and test, omit the Resend settings and inject the fake mail
sender used by the tests. Production configuration validation requires the
Resend API key and sender.

## Verification and tests

Run the API unit and integration style tests with:

```bash
pnpm --filter api test -- --runInBand
```

Run the focused authentication browser journeys with:

```bash
pnpm --filter web test:e2e -- e2e/auth-sign-in.spec.ts
```

The real Prisma lifecycle suite is opt in because it creates and removes test
records in the configured database. Run it only against an isolated test
database. In PowerShell, use:

```bash
$env:RUN_REAL_DB_TESTS = "1"
pnpm --filter api test:e2e -- authentication.database.e2e-spec.ts
Remove-Item Env:RUN_REAL_DB_TESTS
```

The normal project gates remain:

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
```
