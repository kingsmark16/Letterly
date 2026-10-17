# 0024. OAuth only authentication

**Date:** 2026-10-15

**Status:** In Progress

## Summary

Letterly will use Google and Facebook for account creation and sign in in every environment. Email and password sign in, sign up, verification, and recovery will be removed from the app and API, along with their Resend mailer and configuration. Existing user, account, session, and verification records stay in the database; users who only have a password account must already have a linked OAuth provider to continue.

## Context

The current authentication implementation includes credential sign in and account creation, email verification, password recovery, and transactional mail delivery. The staging deployment cannot use that flow without a Resend API key, and the product decision is to remove email and password authentication altogether rather than provision another mail service.

Authentication records also support OAuth sessions and may contain existing password credentials. Deleting or reshaping those records would risk account and session data unrelated to removing the credential entry points. The public sign in and sign up routes must continue to support OAuth account creation, and protected API routes must keep validating the existing Better Auth session.

## Requirements

**User stories**:
- As a creator, I want to create an account and sign in with Google or Facebook so that I can keep managing my Letterly pages.
- As a Letterly operator, I want credential authentication and its mail delivery removed in every environment so that deployment does not depend on a Resend account.
- As an existing user, I want my account and session records preserved so that removing a sign in method does not delete my Letterly data.

**Acceptance criteria**:
- **AC-1**: The `/sign-in` and `/sign-up` pages offer Google and Facebook OAuth account creation and sign in, and contain no email/password credential controls or Coming soon credential message.
- **AC-2**: API email/password sign in and sign up requests are rejected in every runtime. The API does not create new credential accounts.
- **AC-3**: Email verification, verification resend, password reset request, password reset, and credential password management endpoints are unavailable in every runtime; no verification or reset email can be sent.
- **AC-4**: Google and Facebook provider configuration, OAuth callbacks, same-origin return path validation, session reads, sign out, and protected-resource session checks continue to work as before.
- **AC-5**: The credential form, recovery screens, their route entries, and reset-token URL handling are removed. Visiting retired recovery URLs does not render a credential or recovery form.
- **AC-6**: The API runtime configuration schema, examples, infrastructure descriptions, and application documentation contain no Resend settings or email/password enable switch. OAuth credentials remain server side.
- **AC-7**: Existing User, Account, Session, and Verification data is preserved without a database schema migration, deletion, or mutation. Existing password-only accounts cannot sign in unless an OAuth provider is already linked to that account.
- **AC-8**: Auth module guidance, web auth guidance, the concise blueprint summary, and scope documentation describe OAuth-only authentication. Spec 0018 is marked superseded by this spec.

## Options considered

### Option 1: Remove credential authentication and mail delivery

Disable and remove the credential flow across the web app, API, configuration, and documentation, while preserving the OAuth paths and database schema. (basis: user-confirmed scope feature 22)

**Pros**:
- Removes the Resend dependency in all environments and leaves one supported account access path.
- Keeps user and OAuth session records intact without a migration.
- Matches the explicit product decision to remove email and password sign in and sign up.

**Cons**:
- Users who only have a password account lose access until an OAuth provider is linked.
- Restoring credential authentication later would require a new design, mail provider configuration, and implementation.

### Option 2: Keep credential authentication and provision Resend

Retain the current credential flows and configure a verified Resend sender for staging and production. (basis: the prior accepted credential flow in spec 0018)

**Pros**:
- Existing password-only users retain their current sign in method.
- Keeps the previously built credential and recovery screens available.

**Cons**:
- Adds a transactional email dependency, credentials, sender setup, and operational ownership.
- Conflicts with the user's decision to remove credential authentication in every environment.

### Option 3: Keep credential code dormant behind an environment switch

Hide or disable credential authentication for selected deployments while retaining the implementation and configuration. (basis: the earlier staging-only deployment approach and the user's later all-environments direction)

**Pros**:
- Could support a later staged reintroduction without rebuilding the flow.
- Would avoid enabling email delivery on deployments that do not configure it.

**Cons**:
- Leaves unused credential routes, recovery pages, validation, and mail integration to maintain and secure.
- Does not meet the requirement that email and password authentication be completely removed from every environment.

## Decision

**Chosen option**: Option 1: Remove credential authentication and mail delivery.

Remove email/password sign in, sign up, verification, recovery, and credential password management from all environments while keeping Google and Facebook OAuth and all existing authentication records. (basis: the confirmed scope for feature 22; the repository's Better Auth and shared-contract boundaries)

**Implementation skills**: `nestjs-best-practices` (`Kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

The staging deployment revealed that credential authentication depends on transactional email configuration that is not available. The user has chosen to remove this feature for every environment, so an environment switch or new mail provider would add operational work without satisfying the requested product behavior.

The existing database schema stores OAuth accounts and sessions alongside credential data. Disabling credential routes and deleting only their application integration preserves those records and keeps the existing OAuth and protected-resource flows. The access cost is explicit: an account with no linked OAuth provider cannot use the removed password path.

## Feature design

**Data model sketch**:

No schema change. Preserve the existing Better Auth User, Account, Session, and Verification models and their rows. Do not delete credential Account rows or alter email verification state as part of this change. New authentication accounts are created through the existing Google or Facebook OAuth flow.

**State transitions**:

OAuth sign in continues to create or reuse an OAuth-linked user and session according to the current Better Auth configuration. Password-only users remain unchanged in storage and have no supported credential sign-in transition after this change.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/auth/sign-in/social` | POST | configured provider, safe callback URL | OAuth redirect | public | existing safe OAuth errors |
| `/api/auth/callback/:provider` | GET | OAuth provider callback parameters | session cookie and redirect | OAuth provider | existing Better Auth callback errors |
| `/api/auth/get-session` | GET | request session cookie | current session or null | session cookie | existing Better Auth response |
| `/api/auth/sign-out` | POST | request session cookie | cleared session | session cookie | existing Better Auth response |
| Credential sign-in, sign-up, verification, recovery, and password-management paths | any | none | unavailable response | none | 404 |

The existing NestJS catch-all remains the boundary for Better Auth requests. It explicitly rejects the retired credential route group before delegating to Better Auth; Better Auth also has email/password authentication disabled. OAuth and session routes continue through the existing handler.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Start OAuth sign in or account creation | provider, callback URL, safe error state | Google/Facebook button input; existing `parseSafeReturnPath`; fixed sign-in route for provider errors |
| Read the current session | session or null | Better Auth session cookie and existing Prisma adapter |
| Reject retired credential operation | 404 status and generic not-found body | NestJS auth route boundary; no request body is reflected |
| Preserve existing authentication data | existing user, account, session, and verification rows | current Prisma schema and database; this feature runs no migration or data update |

**Key invariants**:
- Google and Facebook remain the only supported account creation and sign-in providers.
- No runtime configuration can re-enable email/password authentication.
- No email verification or password recovery callback sends mail.
- Existing auth rows are neither migrated nor deleted.
- Provider secrets remain server side, and OAuth return paths stay same-origin and safe.

**Security model**:

OAuth initiation and callbacks remain public and use Better Auth's existing trusted-origin, OAuth state, cookie, and callback validation. Session data and protected resource authorization continue to be checked by the API. The auth controller rejects retired credential paths without parsing or logging their bodies. Google and Facebook client secrets remain in validated server configuration. No OAuth account-linking behavior is added; password-only users need an OAuth provider already linked to their existing account.

**Configuration required**:

No new configuration is required. Remove `EMAIL_PASSWORD_AUTH_ENABLED`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_REPLY_TO` from the API schema, examples, environment validation, infrastructure comments, and deployment documentation. Keep current optional Google/Facebook OAuth settings and Better Auth secrets.

**Critical test scenarios**:
- OAuth account creation and sign in remain available from both entry pages, verifying **AC-1** and **AC-4**.
- Credential sign-in and sign-up requests receive 404 and create no credential accounts, verifying **AC-2**.
- Verification, resend, reset, and password-management routes receive 404 and trigger no mail delivery, verifying **AC-3**.
- Session read, sign-out, OAuth callbacks, and a protected route retain their existing behavior, verifying **AC-4**.
- Recovery URLs do not render credential forms and reset tokens are no longer processed by the web proxy, verifying **AC-5**.
- Runtime configuration and examples no longer define mail settings or a credential enable switch, and the application boots without them when its remaining required settings are configured, verifying **AC-6**.
- Database auth records and schema remain unchanged, verifying **AC-7**.

## Build plan

1. Disable email/password in Better Auth and reject its sign-in, sign-up, verification, recovery, and credential password-management routes at the NestJS auth boundary. Retain OAuth, sessions, sign-out, cookies, and database hooks unrelated to credentials, satisfying **AC-2**, **AC-3**, and **AC-4**.
2. Remove shared credential schemas and mail interfaces, the Resend adapter, credential/recovery UI, recovery routes, and reset-token proxy handling. Keep the sign-in and sign-up pages as OAuth entry points, satisfying **AC-1**, **AC-3**, and **AC-5**.
3. Remove credential and Resend configuration and reconcile API, web, contracts, infrastructure, authentication, blueprint, scope, and spec guidance; make no database migration or data change, satisfying **AC-6**, **AC-7**, and **AC-8**.
4. Update existing auth-focused automated checks to assert the retained OAuth/session surface and remove obsolete credential-flow expectations; run the applicable non-test type, lint, format, and build checks, satisfying **AC-1** through **AC-8**.

## Consequences

**Positive**:
- The application no longer needs Resend to create or access accounts.
- All environments expose the same OAuth-only authentication behavior.
- Existing auth records and protected resource session checks remain in place.

**Negative / tradeoffs**:
- Users with no linked OAuth provider lose access through the removed password path. They must use an account whose Google or Facebook identity is already linked; this change does not link accounts automatically.
- Verification and self-service password recovery are no longer available. Access recovery for an OAuth provider is handled by that provider.

**Neutral**:
- Better Auth's existing User, Account, Session, and Verification tables remain for OAuth and historical account data.
- Historical reviews and the original blueprint DOCX may still describe the previous credential flow; this spec and the concise working blueprint define the current behavior.

## References

**Project sources**:
- `AGENTS.md` and feature 22 in `docs/scope/scope.md`
- `docs/specs/0018-email-password-verification-and-recovery.md` (superseded)
- `apps/api/src/modules/auth/AGENTS.md`
- `apps/web/src/features/auth/AGENTS.md`
- `packages/contracts/AGENTS.md`

**Practices & standards**:
- Least privilege and explicit deny-by-default at the API boundary
- Preserve stored data when removing an access path unless a separately approved data migration is required
