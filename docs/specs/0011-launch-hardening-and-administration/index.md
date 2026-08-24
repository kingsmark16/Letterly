# 0011. Launch hardening and administration

**Date**: 2026-08-24
**Status**: Proposed

## Summary

This feature gives trusted administrators the controls needed for a safe private beta. It adds reversible page and user moderation, a protected report queue, audit history, appeals state, privacy safe monitoring, and recovery checks. It stays inside the existing modular monolith and keeps administrator access away from private letter and response content.

## Structure

1. [Moderation state and data](0011-moderation-state-and-data.md), the records, relationships, state machine, and invariants behind moderation.
2. [Administration API](0011-administration-api.md), the protected contracts, authorization policy, and safe error behavior.
3. [Administration interface](0011-administration-interface.md), the public report entry point and private administrator workflow.
4. [Operational readiness](0011-operational-readiness.md), monitoring, retention, backups, policies, and launch review.

The child decisions share one contract. The API is the authorization boundary. A page is public only when its publication state and moderation state both allow it. Reports, moderation actions, audit events, and private page data never enter public projections, shared caches, logs, or analytics.

## Requirements

**User stories**:

1. As a trusted operator, I want to review reports and disable abusive pages or users so that Letterly is safe to use.
2. As a creator, I want a disabled page or account to have a clear safe state and a recovery path without exposing the reporter.
3. As a visitor, I want to report a public page without creating an account and without exposing my identity.
4. As a product operator, I want an audit trail and tested recovery process so that safety decisions are explainable and the beta can be operated responsibly.

**Acceptance criteria**:

1. **AC-1**: A trusted one time bootstrap command can grant `ADMIN` to an explicit existing Better Auth user. No browser route can grant or escalate the administrator role. Normal users default to `CREATOR`.
2. **AC-2**: `User` and `Page` each have `ACTIVE` or `DISABLED` moderation state, nullable disabled time and safe disabled reason, separate from page publication state. A page is publicly available only when its page lifecycle, current slug, creator state, and page moderation state all allow it.
3. **AC-3**: A visitor can submit a reason and optional bounded message through the existing public report route without an account. The route accepts only a current published and enabled page that is not expired, applies the existing five reports per page and anonymous identity per ten minute shared limit, and returns a safe unavailable result after unpublish, expiry, or disable.
4. **AC-4**: `GET /api/v1/admin/reports` requires an administrator session, supports cursor pagination with a default size of 20 and maximum of 50, filters for status, reason, page, and user, orders newest first by timestamp and UUID, and returns only safe report summaries.
5. **AC-5**: `GET /api/v1/admin/reports/:reportId` returns the report reason and message, safe page and creator identifiers, current moderation state, appeal state, and ordered moderation actions. It never returns page content, images, passwords, visitor responses, browser tokens, raw IP addresses, or secrets.
6. **AC-6**: Report actions support review, dismissal, and explicit reopen. `OPEN` may become `REVIEWED` or `DISMISSED`; either closed state may return to `OPEN` only through an explicit administrator action. Every action records its actor, reason, optional note, previous state, resulting state, and request ID.
7. **AC-7**: Administrator page actions support disable and restore. They require explicit confirmation, an expected moderation version, a reason for disable, an optional note of at most 500 characters, and an idempotency key of at most 200 characters. Repeating the current action is an idempotent success. A stale action returns a safe conflict and makes no change.
8. **AC-8**: Administrator user actions support disable and restore. Disabling a user revokes all current sessions in the same transaction, prevents authenticated mutations, hides the user's public pages, rejects new visitor responses, and preserves recoverable records. The final active administrator and the acting administrator cannot be disabled.
9. **AC-9**: Appeal records are created only by an administrator through the external support intake route, because creator appeal submission is outside this slice. Appeal state supports `REQUESTED`, `ACCEPTED`, and `REJECTED`. Only an administrator can change appeal state. An accepted appeal does not restore access by itself; restoration remains an explicit administrator action.
10. **AC-10**: Every successful or failed administrator sign in, role bootstrap, report action, page action, user action, appeal intake or decision, and purge outcome creates an immutable safe audit event with actor when available, target type and identifier, event type, request ID, outcome, bounded allowlisted metadata, and UTC creation time. Audit events contain no secrets, private content, raw IP addresses, cookies, or tokens.
11. **AC-11**: All administration routes require a current Better Auth session and `ADMIN` role at the API boundary. Administration reads are limited to 120 per minute and writes to 30 per minute per administrator through shared Redis or Valkey. Protected writes fail closed when the shared store is unavailable.
12. **AC-12**: Creators may read and change only their own page data. Visitors may submit only public reports and responses through public routes. Administrators may read report and moderation metadata but never page content or visitor responses. Missing and foreign administration resources use safe not found behavior.
13. **AC-13**: Every moderation mutation uses a conditional database transaction and a database idempotency record scoped to actor, operation, target, and key. Concurrent actions have one winner and one stale conflict. Repeating an idempotency key with the same payload returns the original safe result snapshot. A different payload with the same key returns a safe conflict.
14. **AC-14**: The public page report interface has a labeled reason control, optional bounded message, validation, loading, success, unavailable, rate limited, and retry states. The administrator interface has a responsive report queue, filters, detail history, explicit confirmation dialogs, page and user controls, appeal state, empty and error states, keyboard focus management, touch targets of at least 44 pixels, and reduced motion support. It follows `apps/web/design.md`.
15. **AC-15**: A creator whose page or account is disabled sees a safe unavailable or disabled notice and a recovery contact path without reporter identity, report text, page secrets, or private response content. A disabled public page is noindex and no store like other unavailable public pages.
16. **AC-16**: A daily bounded retention task claims reports, moderation actions, appeals, audit events, and expired idempotency records older than 730 days or their defined expiry. It deletes the claimed moderation records in one transaction, retries failed batches on a later run, and records a bounded failure code. A failed batch never partially deletes a record, and a crashed claim becomes available again after 15 minutes.
17. **AC-17**: Production monitoring sends only allowlisted errors, metrics, and traces to Sentry, with redaction before transport. Local structured logs contain request ID, route, method, status, duration, stable error code, moderation outcome, and safe technical metadata only. Monitoring failure does not fail user requests.
18. **AC-18**: The launch runbook documents Neon point in time restore with a recovery point target of at most 5 minutes and a recovery time target of at most 60 minutes, separate staging and production resources, and a staging restore drill before launch and at least quarterly afterward. The drill proves that migrations, authorization, public availability, reports, and moderation state recover correctly, records evidence in `docs/runbooks/evidence/launch-hardening/`, and is approved by the API owner and the security or privacy reviewer before the temporary branch is removed.
19. **AC-19**: Before public launch, the team completes a documented security and accessibility checklist covering role enforcement, ownership isolation, privacy headers, rate limits, CSRF and trusted origins, session revocation, keyboard access, focus, labels, errors, responsive layouts, reduced motion, and no sensitive analytics. Privacy, acceptable use, and copyright policies are published, and legal and child safety review is recorded.
20. **AC-20**: Unit, API integration, database concurrency, and Playwright coverage proves the report flow, queue pagination, ownership isolation, role enforcement, disable and restore lifecycle, stale and idempotent mutations, session revocation, appeal transitions, audit redaction, purge retry, privacy headers, monitoring redaction, accessible states, mobile layout, and the staging restore smoke path.

## Decision

**Chosen option**: Integrated launch administration in the existing modular monolith.

Add a moderation module shared by the NestJS API and Next.js administration interface. Keep PostgreSQL on Neon authoritative for state and audit records, Better Auth authoritative for sessions, Redis or Valkey authoritative for shared limits, and Cloudflare R2 unchanged. Use Sentry for production error monitoring with a strict redaction contract. Run retention through the existing NestJS lifecycle scheduler with database claims, and use Neon point in time restore and isolated branches for recovery verification.

**Implementation skills**: `better-auth-security-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-security-best-practices/`) · `neon` (`neondatabase/agent-skills`, `.agents/skills/neon/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`)

## Feature design

**Data model sketch**:

1. `User` keeps its Better Auth identity fields and adds required `role` (`CREATOR` or `ADMIN`) and required `moderationStatus` (`ACTIVE` or `DISABLED`), plus nullable `disabledAt` and nullable bounded `disabledReason`. A user owns many pages, sessions, and accounts, and may be the actor on many moderation actions and audit events. Actor foreign keys use set null when an account is deleted.
2. `Page` keeps its publication lifecycle, adds nullable `expiresAt`, required `moderationStatus`, nullable `disabledAt`, nullable `disabledReason`, and a nonnegative `moderationVersion`. A page belongs to one creator, has many reports, and has many moderation actions. Page deletion cascades reports and moderation actions.
3. `PageReport` keeps its existing UUID, page foreign key, reason, optional message, status, and timestamps. One report may have many moderation actions. Its queue index covers status and creation time.
4. `ModerationAction` is a new UUID record with an exhaustive logical target union of `PAGE`, `USER`, `REPORT`, or `APPEAL`. It stores `targetType`, `targetId`, exactly one matching nullable typed foreign key, nullable actor user foreign key, nullable report foreign key when the action is linked to a report, action type, reason code, optional bounded internal note, previous state, resulting state, request ID, and timestamps. A database check requires exactly one typed target foreign key and matches it to `targetType`. Action history is append only. Page deletion cascades reports, actions, and appeals; user deletion cascades owned pages and their moderation records. Audit rows retain only logical identifiers after deletion.
5. `Appeal` is a separate aggregate with a UUID, the original moderation action foreign key, `REQUESTED`, `ACCEPTED`, or `REJECTED` state, a bounded external reference, a bounded reason code, a moderation version, request and resolution times, and an optional resolved actor. Appeal decisions append `ModerationAction` rows targeting the `APPEAL`; appeal state is not stored on action rows.
6. `AuditEvent` is a new UUID record with nullable actor user foreign key, an allowlisted event type, logical target type and identifier, request ID, outcome (`SUCCESS`, `DENIED`, `CONFLICT`, or `FAILURE`), bounded safe metadata JSON, and creation time. Target identifiers do not use foreign keys so audit rows survive target deletion. Indexes cover target and time, and actor and time. The application database role cannot update or delete audit rows; the retention worker is the only deletion path.
7. `AdminIdempotencyRecord` is a new UUID record with actor ID, operation, target type and ID, key, canonical payload hash, bounded safe result snapshot, outcome, created time, and expiry time. A unique constraint on actor, operation, target, and key is the source of truth. Records expire after 24 hours and replay only safe response fields.
8. `RetentionClaim` and `JobLease` records provide claim tokens, attempt counts, failure codes, and expiry times. Claims use `SELECT FOR UPDATE SKIP LOCKED`, expire after 15 minutes, and are retried by a later run. The daily lease uses a five minute expiry so a crashed scheduler cannot block future work.
9. No new visitor identity, response content, password, raw IP, media key, or unrestricted administrator content record is added. Reports, moderation actions, appeals, audit events, and expired idempotency records are deleted according to AC-16.

**State transitions**:

`User moderation`: `ACTIVE` → `DISABLED` → `ACTIVE`. The disable transition revokes sessions and blocks access. Repeating the current transition is an idempotent success.

`Page moderation`: `ACTIVE` → `DISABLED` → `ACTIVE`. Publication state remains independent. Public availability requires both states to allow access.

`Report`: `OPEN` → `REVIEWED` or `DISMISSED`; `REVIEWED` or `DISMISSED` → `OPEN` only through explicit reopen.

`Appeal`: an administrator creates an external intake record in `REQUESTED`, then `REQUESTED` becomes `ACCEPTED` or `REJECTED`. Accepted appeals do not perform restoration automatically. A new append only action targets the appeal for every decision.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/public/pages/:slug/reports` | POST | `reason` required, `message` optional | `accepted`, `reportId` | Public browser identity | `404` unavailable, `422` invalid, `429` limited, `503` store unavailable |
| `/api/v1/admin/reports` | GET | `cursor` optional, `size` optional, status, reason, page, user filters optional | safe report summaries, `nextCursor` | Better Auth plus `ADMIN` | `401` unauthenticated, `403` forbidden, `422` invalid cursor, `429` limited |
| `/api/v1/admin/reports/:reportId` | GET | report ID | report detail, current states, ordered actions | Better Auth plus `ADMIN` | `403` forbidden, `404` not found, `503` unavailable |
| `/api/v1/admin/reports/:reportId/review` | POST | `confirm`, expected moderation version, note optional, idempotency key | updated report, version, and action | Better Auth plus `ADMIN` | `409` stale or idempotency conflict, `422` confirmation, `429` limited |
| `/api/v1/admin/reports/:reportId/dismiss` | POST | `confirm`, expected moderation version, note optional, idempotency key | updated report, version, and action | Better Auth plus `ADMIN` | `409` stale or idempotency conflict, `422` confirmation, `429` limited |
| `/api/v1/admin/reports/:reportId/reopen` | POST | `confirm`, expected moderation version, note optional, idempotency key | updated report, version, and action | Better Auth plus `ADMIN` | `409` stale or idempotency conflict, `422` confirmation, `429` limited |
| `/api/v1/admin/pages/:pageId/disable` | POST | `confirm`, reason, expected moderation version, note, idempotency key | page moderation state, version, and action | Better Auth plus `ADMIN` | `404` not found, `409` stale, `422` invalid or confirmation, `429` limited |
| `/api/v1/admin/pages/:pageId/restore` | POST | `confirm`, expected moderation version, note, idempotency key | page moderation state, version, and action | Better Auth plus `ADMIN` | `404` not found, `409` stale, `422` invalid or confirmation, `429` limited |
| `/api/v1/admin/users/:userId/disable` | POST | `confirm`, reason, expected moderation version, note, idempotency key | user moderation state, version, revoked session count, and action | Better Auth plus `ADMIN` | `404` not found, `409` protected or stale, `422` invalid or confirmation, `429` limited |
| `/api/v1/admin/users/:userId/restore` | POST | `confirm`, expected moderation version, note, idempotency key | user moderation state, version, and action | Better Auth plus `ADMIN` | `404` not found, `409` stale, `422` invalid or confirmation, `429` limited |
| `/api/v1/admin/appeals` | POST | target moderation action, external reference, reason, idempotency key | requested appeal and version | Better Auth plus `ADMIN` | `404` target missing, `409` duplicate or idempotency conflict, `422` invalid, `429` limited |
| `/api/v1/admin/appeals/:appealId/accept` | POST | `confirm`, expected moderation version, note, idempotency key | appeal state, version, and action | Better Auth plus `ADMIN` | `404` not found, `409` stale or invalid transition, `422` confirmation, `429` limited |
| `/api/v1/admin/appeals/:appealId/reject` | POST | `confirm`, expected moderation version, note, idempotency key | appeal state, version, and action | Better Auth plus `ADMIN` | `404` not found, `409` stale or invalid transition, `422` confirmation, `429` limited |
| `/api/v1/admin/audit-events` | GET | target filters, actor filter, cursor, size | safe audit rows, `nextCursor` | Better Auth plus `ADMIN` | `403` forbidden, `422` invalid cursor or filter, `429` limited |

All administration responses use `Cache-Control: private, no-store`. Public report responses use `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, and a dynamic response path. All errors use the existing stable error envelope and never contain private content. Cursors are signed base64url JSON containing version, `(createdAt, id)` sort position, and a SHA-256 hash of the normalized filters. A cursor with an invalid signature, version, filter hash, or size returns `422 INVALID_CURSOR`. List filters are exact enums for status and reason, UUIDs for page and user, and size 1 through 50 with default 20. Responses have explicit Zod schemas and include only IDs, enums, UTC timestamps, bounded reason text, moderation versions, and counts.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Bootstrap administrator | user role | explicit user ID input and existing `User.id` |
| Public report | report ID and accepted state | database generated `PageReport.id` and transaction result |
| Report queue | reason, status, page ID, creator ID, times, action count | `PageReport`, `Page`, `User`, and count query under admin scope |
| Report detail | report message and ordered actions | `PageReport.message` and `ModerationAction.createdAt` ordering |
| Disable page | previous and resulting state, moderation version | locked `Page.moderationStatus`, `Page.moderationVersion`, and requested action |
| Disable user | session revocation count and resulting state, moderation version | locked `User.moderationStatus`, `User.moderationVersion`, and deleted session rows |
| Appeal intake | appeal ID and requested state | database generated `Appeal.id` and transaction result |
| Appeal decision | appeal state, version, and resolved time | locked `Appeal` row and database transaction clock |
| Audit row | request ID and outcome | API request context and transaction result |
| Purge | deleted count and failure count | bounded database batch result and safe failure code |
| Recovery drill | restored schema and smoke result | Neon restore branch, migration status, and scripted smoke checks |

**Key invariants**:

1. The API, never the browser, decides administrator role and moderation state.
2. A disabled user cannot create, save, publish, mutate, or read private creator data through an authenticated route. A disabled page cannot be public or accept visitor responses.
3. A page, user, report, or appeal cannot be changed from a stale moderation version. One concurrent conditional transaction wins.
4. The acting administrator cannot disable itself, and the final active administrator cannot be disabled.
5. Moderation actions and audit events are append only. A new action records the exact prior and resulting state. Successful mutations write their action, idempotency record, and success audit event in one database transaction. Failed or denied attempts write only a failure or denial audit event after the outcome is known. Audit event types are `AUTH_SIGN_IN_SUCCEEDED`, `AUTH_SIGN_IN_DENIED`, `ADMIN_BOOTSTRAPPED`, `REPORT_CREATED`, `REPORT_REVIEWED`, `REPORT_DISMISSED`, `REPORT_REOPENED`, `PAGE_DISABLED`, `PAGE_RESTORED`, `USER_DISABLED`, `USER_RESTORED`, `APPEAL_CREATED`, `APPEAL_ACCEPTED`, `APPEAL_REJECTED`, `RETENTION_SUCCEEDED`, and `RETENTION_FAILED`. The actor is nullable for denied anonymous sign in.
6. Audit event metadata is an allowlist of bounded counts, operation names, stable error codes, provider names, and moderation versions, limited to 2 KiB. It never contains request bodies, page content, response content, credentials, cookies, tokens, email addresses, raw IP addresses, URLs, slugs, or DOM text.
7. Public and private projections are separate. Administration never reuses an owner content mapper.
8. Retention purge deletes only records selected by an unexpired claim. A batch is one transaction, so a failure rolls back the whole batch. The claim token, attempt count, and failure code are safe and retryable.
9. All list queries use cursor pagination and indexes. No queue or audit endpoint loads an unbounded collection.

**Security model**:

Better Auth authenticates the session. A session creation hook rejects disabled users with `ACCOUNT_DISABLED`; the session guard rechecks current moderation state and revokes a stale session before returning `403 ACCOUNT_DISABLED`. A dedicated API administrator guard loads current `User.role` and `User.moderationStatus` before every administration request. All cookie authenticated mutations require a trusted `Origin` matching Better Auth `trustedOrigins` and a valid CSRF check; failures return `403 CSRF_ORIGIN_INVALID`. Creator ownership remains page scoped. Public visitors can submit reports only for pages passing one shared availability predicate: current slug, `PUBLISHED` status, `Page.expiresAt IS NULL OR Page.expiresAt > database now`, active creator, active page, and valid unlock proof where required. The same predicate runs for public reads, unlocks, media, reports, responses, and submissions inside the database transaction, so already unlocked pages and in flight submissions cannot bypass a disable or expiry. Next.js public routes are dynamic and no store. Administrators can read report and moderation metadata, but not letter content, images, passwords, visitor responses, browser tokens, raw IP addresses, or secrets. The feature has no formal regulated certification scope, but it treats creator and visitor writing as sensitive personal data, supports users of any age, and requires legal and child safety review before public launch.

**Configuration required**:

1. `SENTRY_API_DSN`: production API error monitoring destination.
2. `NEXT_PUBLIC_SENTRY_DSN`: browser error monitoring destination, containing no secret.
3. `SENTRY_ENVIRONMENT`: deployment environment label.
4. `ADMIN_BOOTSTRAP_SECRET`: one time secret for the explicit administrator bootstrap command.
5. `MODERATION_RETENTION_DAYS`: default 730 days.
6. `MODERATION_PURGE_INTERVAL_SECONDS`: default 86400 seconds.
7. `MODERATION_PURGE_BATCH_SIZE`: default 100 records per claimed batch.
8. `ADMIN_READ_RATE_LIMIT`: default 120 per minute per administrator.
9. `ADMIN_WRITE_RATE_LIMIT`: default 30 per minute per administrator.
10. `PUBLIC_SUPPORT_CONTACT_URL`: safe recovery contact shown to disabled creators.
11. `ADMIN_CURSOR_SIGNING_SECRET`: server only secret used to sign cursor payloads.

Existing `DATABASE_URL` uses pooled runtime connections and a direct connection for migrations, dumps, and restore work. Existing `REDIS_URL` remains required for staging and production shared limits. Redis keys are `admin:read:<userId>`, `admin:write:<userId>`, and `public:report:<pageId>:<browserIdentity>`. A limit response is `429 RATE_LIMITED` with an integer `Retry-After` header. A protected write returns `503 RATE_LIMIT_STORE_UNAVAILABLE` when Redis is unavailable. All secrets use the deployment secret store.

**Critical test scenarios**:

1. Happy path: submit a public report, review it, disable its page, inspect the safe action history, and restore the page, verifying **AC-3**, **AC-6**, **AC-7**, and **AC-14**.
2. Failure case: race two administrators, retry one action with the same idempotency key, run a partial purge failure, and verify one moderation winner, safe replay, and later recovery, verifying **AC-13** and **AC-16**.
3. Auth and permission: a creator, visitor, disabled user, and non administrator attempt administration reads or writes and receive safe denial without private data. A disabled session, bad origin, expired page, and already unlocked page are also tested, verifying **AC-8**, **AC-11**, **AC-12**, and **AC-15**.
4. Privacy: inspect report, audit, error, Sentry, public, owner, and administration payloads and verify no private content, raw identity, credentials, or tokens cross a boundary, verifying **AC-5**, **AC-10**, **AC-12**, and **AC-17**.
5. Recovery: restore an isolated Neon branch, apply migrations, run health and moderation smoke checks, write evidence under `docs/runbooks/evidence/launch-hardening/`, obtain the two required approvals, and remove the temporary branch, verifying **AC-18**.

## Build plan

The project uses a Tracer Bullet approach. Each step extends one real path through the database, API, web interface, and operation process before adding breadth.

1. Add the Prisma migration and shared contracts for roles, moderation state, reports, moderation actions, appeals, idempotency records, retention claims, audit events, check constraints, indexes, retention fields, and safe projections. Seed no administrator automatically. Satisfies **AC-1**, **AC-2**, **AC-6**, **AC-9**, **AC-10**, **AC-13**, and **AC-16**.
2. Add the one time bootstrap command, current user state lookup, administrator guard, policy service, session revocation transaction, and new error codes. Satisfies **AC-1**, **AC-8**, **AC-11**, **AC-12**, and **AC-13**.
3. Harden the shared public availability predicate and every public read, unlock, media, response, and submission path so report creation and public responses reject disabled, unpublished, or expired pages with safe no store behavior. Satisfies **AC-3**, **AC-12**, and **AC-15**.
4. Implement the administrator report list and detail queries with cursor pagination, filters, safe projections, indexes, and private cache headers. Satisfies **AC-4**, **AC-5**, **AC-11**, and **AC-12**.
5. Implement report review, dismissal, reopen, page disable and restore, user disable and restore, appeal intake and decisions as conditional idempotent transactions that append action and audit rows. Satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, and **AC-13**.
6. Build the public report form and the protected administration interface using existing design tokens and UI primitives. Add queue, filters, detail history, confirmation dialogs, safe owner unavailable states, mobile navigation, focus handling, live status messages, and reduced motion behavior. Satisfies **AC-3**, **AC-14**, and **AC-15**.
7. Add shared Redis or Valkey administrator rate policies, Sentry initialization and redaction, allowlisted structured logs, safe metrics, configuration validation, and health or readiness checks for required operational dependencies. Satisfies **AC-11**, **AC-16**, and **AC-17**.
8. Add the claimed daily retention task, retry and alert behavior, Neon restore runbook, staging restore drill script, policy documents, security checklist, accessibility checklist, and launch sign off record. Satisfies **AC-16**, **AC-18**, and **AC-19**.
9. Add unit, API integration, database concurrency, and Playwright coverage for all critical scenarios, then run lint, type checks, builds, migrations, API tests, web tests, and the isolated restore smoke path. Satisfies **AC-20**.

## Migration plan

**Strategy**: feature flagged, additive migration.

**Phases**:

1. Add nullable moderation fields, new tables, indexes, and contracts. Deploy code that reads missing moderation state as active and writes the new fields for new and changed records. Backfill existing users and pages to `ACTIVE`, users to `CREATOR`, and moderation versions to zero.
2. Enable the API guard, shared availability predicate, public report route, and administration routes behind the launch configuration. Verify the tracer bullet in staging, then enable the public report entry point and administrator console.
3. Make moderation fields required after the backfill proves complete, remove compatibility fallbacks, and keep the old page deletion cascade while retaining logical audit targets.

**Rollback**: disable the launch configuration and administrator routes, keep the additive columns and records, and redeploy the previous application. Do not roll back the migration after any moderation record exists.

**Risks**: an incomplete backfill could expose an incorrect default state, a stale public cache could outlive a disable, and a compatibility fallback could bypass the shared availability predicate. Readiness blocks the rollout until the backfill count, cache headers, and predicate tests pass.

## Monitoring and readiness contract

Sentry captures unhandled API 5xx errors and browser errors only. API traces are sampled at 10 percent, errors at 100 percent. A browser `beforeSend` hook removes request URLs, query strings, hashes, form values, DOM text, breadcrumbs, user identity, and page or report identifiers before transport. No session replay is enabled. Structured logs and metrics use only these labels: route name, operation, outcome, stable error code, provider, and environment.

The required metrics are `admin_request_total`, `admin_mutation_total`, `public_report_total`, `moderation_purge_total`, `moderation_purge_age_seconds`, and `restore_drill_total`. Alerts fire for API 5xx above 1 percent for five minutes, any protected write that fails closed because Redis is unavailable, two consecutive purge failures, a purge age above 48 hours, or a missed quarterly restore drill. Liveness checks only the process. Readiness checks database connectivity, Redis connectivity, required configuration, and migration version; Sentry is not a readiness dependency and monitoring failure never fails a user request.

## Consequences

**Positive**:

1. Moderation is reversible, explainable, and protected by the same API boundary as creator data.
2. Reports and audit history are available without giving administrators broad access to sensitive confession content.
3. The feature adds no separate moderation service, queue platform, or search system.
4. Recovery and privacy checks become launch evidence instead of informal promises.

**Negative and tradeoffs**:

1. The existing Better Auth user record and every page availability query gain new state checks.
2. Audit events and moderation history increase storage and require a purge task and operational alerting.
3. Sentry setup, Neon restore drills, policy review, and manual launch sign off add work before public release.
4. A separate administrator workflow is less flexible than unrestricted support access, by design.

**Neutral**:

1. Automated moderation, public search, notifications, permanent user deletion, and a full appeal inbox remain outside this slice.
2. The first administrator must be provisioned through a controlled operator command.

## Follow-up

1. [ ] Create the Sentry projects and redaction rules for staging and production before implementation reaches monitoring work.
2. [ ] Confirm Neon plan history windows and document the selected recovery point and recovery time targets before the restore drill.
3. [ ] Publish privacy, acceptable use, and copyright policy text after legal and child safety review.
4. [ ] Decide whether a full appeal inbox or creator notification belongs in a later slice.
5. [ ] Capture the new administrator and moderation conventions in the relevant `AGENTS.md` files during `/sync`.

## Rationale

Reasoning and alternatives are recorded in [rationale.md](rationale.md).
