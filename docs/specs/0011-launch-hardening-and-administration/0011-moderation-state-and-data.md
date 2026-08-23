# 0011. Moderation state and data

## Summary

Moderation state is separate from publication state. Users and pages can be disabled and restored, while reports, actions, appeals, and audit events preserve the evidence needed to explain each decision. The database enforces target shape, ownership relations, indexes, and bounded retention.

## Requirements

1. `User` has `role` defaulting to `CREATOR`, `moderationStatus` defaulting to `ACTIVE`, a nullable disabled time, a nullable safe disabled reason, and a nonnegative `moderationVersion`.
2. `Page` has a nullable `expiresAt`, separate moderation status defaulting to `ACTIVE`, a nullable disabled time, a nullable safe disabled reason, and a nonnegative `moderationVersion`.
3. `PageReport` has a nonnegative `moderationVersion` and `ModerationAction` records actor, one exhaustive target of `PAGE`, `USER`, `REPORT`, or `APPEAL`, reason, note, prior state, resulting state, request ID, and timestamps.
4. `Appeal` is a separate aggregate linked to one original moderation action. It has `REQUESTED`, `ACCEPTED`, or `REJECTED` state, a moderation version, a bounded external reference, and no creator submission route in this slice.
5. `AdminIdempotencyRecord` stores actor, operation, target, key, canonical payload hash, safe result snapshot, outcome, timestamps, and 24 hour expiry. Its unique key is the database source of truth.
6. `AuditEvent` is append only, bounded, redacted, and survives target deletion through logical target identifiers. The application role cannot update or delete it.
7. `RetentionClaim` and `JobLease` have claim tokens, expiry, attempts, and safe failure codes so a crashed worker can recover.
8. The database has indexes for report queue, moderation target history, audit actor and target history, idempotency lookup, and retention claims. Conditional state transitions and target checks are enforced in application transactions and database constraints.

## Decision

Use the existing relational model. Add `Page.expiresAt` and make the shared public availability predicate compare it with database time. Add typed nullable target foreign keys to moderation actions for `PAGE`, `USER`, `REPORT`, and `APPEAL`, with a database check requiring exactly one matching target. Keep appeals separate from action rows, and append appeal decisions as actions targeting the appeal. Use set null for deleted actors, cascade page deletion through reports, actions, and appeals, cascade user deletion through owned pages and their moderation records, and preserve only logical audit target references after deletion. Increment the target moderation version in the same transaction as every state change. Delete reports, actions, appeals, and audit events at retention time, and delete expired idempotency records after 24 hours.

## State transitions

`User`: `ACTIVE` to `DISABLED` to `ACTIVE`.

`Page`: `ACTIVE` to `DISABLED` to `ACTIVE`, independent of `DRAFT`, `PUBLISHED`, `UNPUBLISHED`, and `ARCHIVED`.

`Report`: `OPEN` to `REVIEWED` or `DISMISSED`, with explicit reopen to `OPEN`.

`Appeal`: administrator external intake creates `REQUESTED`, then `REQUESTED` becomes `ACCEPTED` or `REJECTED`. A decision never restores a page or user automatically.

`ModerationAction.actionType` is one of `REPORT_REVIEW`, `REPORT_DISMISS`, `REPORT_REOPEN`, `PAGE_DISABLE`, `PAGE_RESTORE`, `USER_DISABLE`, `USER_RESTORE`, `APPEAL_CREATE`, `APPEAL_ACCEPT`, or `APPEAL_REJECT`. `reasonCode` uses the existing report reason enum for reports and the matching action code for other targets. Internal notes are trimmed and limited to 500 characters. Database timestamps are UTC and are the only source for versions, retention cutoffs, and resolved times.

Retention claims use a separate row with `recordType`, `recordId`, `claimToken`, `claimedAt`, `claimExpiresAt`, `attempts`, and `lastFailureCode`. The worker claims at most 100 records older than `CURRENT_TIMESTAMP - 730 days` with `FOR UPDATE SKIP LOCKED`, commits the claim, and deletes the complete claimed batch in one transaction. Failure codes are `DB_TIMEOUT`, `SERIALIZATION_RETRY_EXHAUSTED`, `CONSTRAINT_CONFLICT`, and `UNKNOWN`. A claim older than 15 minutes is reclaimable. A five minute `JobLease` prevents duplicate daily runs and is reclaimable after expiry.

## Build plan

1. Add enums, fields, relations, check constraints, indexes, and migration. Satisfies **AC-2**, **AC-6**, **AC-9**, and **AC-10** of the umbrella.
2. Add typed contracts and repository projections that never include private page or response content. Satisfies **AC-5**, **AC-10**, and **AC-12**.
3. Add transaction tests for concurrent changes, deletion behavior, retention selection, and state transitions. Satisfies **AC-8**, **AC-13**, and **AC-16**.

## Rationale

Separate moderation state avoids corrupting the creator lifecycle. Append only actions explain reversible decisions, while typed target relations preserve safe cleanup. Logical audit targets keep accountability after deletion without retaining the deleted content.
