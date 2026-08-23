# 0011. Administration API

## Summary

The API is the only authority for administrator access and moderation state. It exposes a cursor based report queue, safe report detail, narrow action routes, and audit reads under `/api/v1/admin`. Every mutation is confirmed, conditional, idempotent, rate limited, and recorded.

## Requirements

1. Administration requires a current Better Auth session and the current database role `ADMIN`.
2. Report list and detail responses contain operational metadata only.
3. Page and user actions cannot be performed by creators, visitors, disabled users, or administrators without the required role.
4. Mutations return stable error envelopes and safe conflicts.
5. Private administration responses use `private, no-store`; public report responses use `no-store`.
6. Shared Redis or Valkey limits reads to 120 per minute and writes to 30 per minute per administrator.
7. Every cookie authenticated mutation checks the trusted origin and CSRF token before the controller runs. A mismatch returns `403 CSRF_ORIGIN_INVALID`.
8. Cursor payloads are signed base64url JSON with version, `(createdAt, id)` position, normalized filter hash, and size. Invalid or mismatched cursors return `422 INVALID_CURSOR`.
9. Mutation bodies use exact Zod schemas: UUID targets, exact reason enums, `confirm: true`, `expectedModerationVersion` as a nonnegative integer, notes trimmed to 500 characters, and idempotency keys trimmed to 200 characters.
10. A database idempotency record is inserted in the same transaction as the action. Its canonical payload hash, safe result snapshot, and outcome are replayed for the same actor, operation, target, and key. A hash mismatch returns `409 IDEMPOTENCY_CONFLICT`.

## API surface

The umbrella index contains the complete endpoint table. The API must implement report list and detail, report review, dismiss and reopen, page disable and restore, user disable and restore, appeal intake and decisions, and audit list routes. Appeal intake records an externally received support request and does not expose creator writing. Its `externalReference` is a trimmed 1 to 120 character support ticket reference, and its `reasonCode` is one of `INAPPROPRIATE_CONTENT`, `HARASSMENT`, `SPAM`, `PERSONAL_INFORMATION`, or `OTHER`. Request bodies use confirmation, expected moderation version, bounded note, reason where required, and idempotency key fields. List response schemas contain only IDs, enums, UTC timestamps, bounded report text, versions, and counts.

## Decision

Add a dedicated administrator guard and policy service beside the existing Better Auth session guard. The bootstrap command is `pnpm --filter api admin:bootstrap --user-id <id> --confirm`, requires `ADMIN_BOOTSTRAP_SECRET`, locks the user row, is idempotent for an existing administrator, rejects a disabled user, and exits with a nonzero code on a missing user, invalid secret, or missing confirmation. Keep the controller thin. Controllers validate contracts, check trusted origin and CSRF, apply rate limits, call application use cases, and map safe errors. Repositories own ownership predicates, conditional updates, row locks, idempotency records, and audit writes. A Better Auth session creation hook rejects disabled users, and the session guard revokes any session whose user is now disabled before returning `403 ACCOUNT_DISABLED`.

The stable error codes are `ACCOUNT_DISABLED`, `ADMIN_REQUIRED`, `CSRF_ORIGIN_INVALID`, `INVALID_CURSOR`, `STALE_MODERATION_VERSION`, `IDEMPOTENCY_CONFLICT`, `INVALID_CONFIRMATION`, `RATE_LIMITED`, and `RATE_LIMIT_STORE_UNAVAILABLE`. `429 RATE_LIMITED` always has an integer `Retry-After` header. Unknown or foreign administration resources return the same safe `404`.

## Build plan

1. [x] Add administrator role loading, bootstrap command, guard, policy service, and session revocation. Satisfies **AC-1**, **AC-8**, and **AC-11** of the umbrella.
2. [x] Add report queue and detail queries with cursor contracts and safe mappers. Satisfies **AC-4**, **AC-5**, and **AC-12**.
3. Add action use cases, rate policies, idempotency handling, conflict mapping, and audit writes. Satisfies **AC-6**, **AC-7**, **AC-9**, **AC-10**, and **AC-13**.
4. Add API integration and concurrency tests for every role and state boundary. Satisfies **AC-20**.

## Rationale

Using the existing API boundary avoids a second authorization system. Separate action routes make each mutation auditable and testable, while cursor pagination and shared limits keep the queue safe as report volume grows.
