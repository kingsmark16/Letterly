# 0008. Visitor responses and creator dashboard

**Date**: 2026-08-16
**Status**: In Progress

## Summary

Creators can turn on a private response form for an individual page. A visitor can answer the page questions, add an optional private message, and submit once from a browser. The creator can then read, filter, mark, and delete responses in a private page view.

The design reuses the existing response tables, page save flow, rate limits, and ownership checks. It adds the missing public question projection, response setting, and web experiences without adding a new service or database table.

## Context

The data model already contains page questions, visitor submissions, answer snapshots, and optional visitor messages. The API also has application services and owner routes for creating, listing, reading, marking, and deleting submissions. The public page does not yet expose a safe question graph or render the response form, and the creator editor and dashboard do not yet expose response availability or response details.

Responses contain personal writing and may be submitted by visitors of any age. Visitors do not have accounts. The API must remain the authorization boundary, a retry must not create a second response, and a response must never enter another creator's dashboard, a public projection, a shared cache, logs, or analytics.

The project uses a tracer bullet approach. The feature therefore needs one complete path through the real page settings, database records, public route, anonymous form, creator route, and browser tests before it grows to notifications, moderation, or the second template.

## Requirements

**User stories**:

1. As a creator, I want to enable private responses for one page so that visitors can send a response only when I choose to receive them.
2. As a visitor, I want to answer supported questions and optionally write a private message without creating an account.
3. As a visitor, I want a retry after a network timeout to remain safe and not create a duplicate response.
4. As a creator, I want to see response status and content only for pages I own.
5. As a creator, I want to mark a response read or permanently delete it.

**Acceptance criteria** (the contract):

1. **AC-1**: A creator can enable or disable `responsesEnabled` in the existing page editor. The value is a validated page setting, defaults to `false` for new pages, and missing values on older pages are treated as `false`. Saving it uses the existing page content version and ownership checks.
2. **AC-2**: An enabled, published page returns a safe public response description containing the response flag, the trusted template's question requirement, a safe question and choice graph, and whether a visitor message is supported. The graph contains no creator messages, private settings, password data, or executable content. A disabled page returns no usable response form. A locked page returns no question graph before unlock.
3. **AC-3**: The public page renders an inline response section after the letter and question flow only when the safe public response description is enabled. It supports the returned question path, an optional private message, keyboard access, readable labels, loading, validation, success, duplicate, locked, unavailable, and rate limited states.
4. **AC-4**: `POST /api/v1/public/pages/:slug/submissions` accepts validated answers, an optional message, and a client idempotency key. It requires the browser cookie whose server hash is scoped to the page. Protected pages also require a current page scoped unlock proof. The API accepts only published pages with responses enabled and a supported template capability.
5. **AC-5**: A valid submission stores one `VisitorSubmission`, its answer snapshots, and its optional message in one transaction. It accepts at least one valid answer or a nonempty message, follows the current question branch, and enforces the template's required answer rule.
6. **AC-6**: A page and browser can have only one accepted response. Repeating the same idempotency key with the same payload returns `{ accepted: true }` without another write. Reusing that key with a different payload returns a safe conflict. A different request from the same browser returns a safe duplicate response. Deleting a response does not reset this rule because a minimal server tombstone retains the page scoped uniqueness values while response content is removed.
7. **AC-7**: Public submission requests use the route specific visitor submission limit keyed by page scope and hashed browser identity. Staging and production use shared Redis or Valkey, while local memory is allowed only for development. The response and submission routes use `Cache-Control: no-store` and never log or send response content, browser tokens, or idempotency values to analytics.
8. **AC-8**: `GET /api/v1/pages/:pageId/submissions` returns only the authenticated owner's summaries, supports `all` and `unread` filters, cursor pagination with a default size of 20 and maximum of 50, and an exact `unreadCount` from the same page ownership scope. It uses an indexed query ordered by submission time and id.
9. **AC-9**: `GET /api/v1/pages/:pageId/submissions/:submissionId` returns the stored prompt and choice snapshots in submitted order, answer text, optional visitor message, read state, page id, and submission time only to the page owner. It never returns browser hashes, idempotency values, visitor identity, tombstones, or another page's response.
10. **AC-10**: The owner can call `POST /api/v1/pages/:pageId/submissions/:submissionId/read` to set a response to `READ`. The operation is idempotent and owner only.
11. **AC-11**: The owner can call `DELETE /api/v1/pages/:pageId/submissions/:submissionId` with explicit confirmation. The operation permanently removes the response answers and message, retains only a non display tombstone needed for duplicate protection, and returns `{ deleted: true }`. Page deletion cascades to tombstones. Unpublishing preserves responses.
12. **AC-12**: Anonymous visitors and other creators cannot list, open, mark, or delete another page's responses. Missing and foreign owner resources use the same safe not found outcome. A stale public form after unpublish or disable cannot submit.
13. **AC-13**: If a question edit affects existing answers, the existing API reports the affected response count, requires explicit creator confirmation, and then removes the affected answer tree and submissions left without answers or a message in one transaction. Unaffected responses remain.
14. **AC-14**: The creator response view is available at `/dashboard/letters/:pageId/responses`, is linked from the existing dashboard and editor, and supports a responsive list and detail view. Desktop may show list and detail together. Mobile stacks them with clear back navigation. Loading, empty all, empty unread, retryable error, unavailable page, pending read, and confirmed delete states preserve focus and announce status changes.
15. **AC-15**: A visitor form keeps entered values in the current page while a request fails, never persists response content in local storage, and reuses the same idempotency key for an explicit retry. Creator mutations do not retry automatically.
16. **AC-16**: Unit, API integration, and Playwright coverage proves the happy path, validation and branch failures, idempotent retry, duplicate protection, rate limiting, protected page unlock, response toggle, unpublish behavior, ownership isolation, read and delete lifecycle, no-store privacy headers, accessible empty and error states, and question edit cleanup.
17. **AC-17**: The creator editor provides a minimal question authoring path for supported pages. The owner can create, update, order, branch, and delete supported choice and plain message questions through the existing question routes. Changes that affect responses use the existing `RESPONSE_IMPACT` confirmation contract and preserve the page content version rules.
18. **AC-18**: Every stored answer has a stable submission order. Owner list and unread count queries exclude tombstones and use indexes that cover the page, read filter, submission time, and id cursor. Question cleanup uses the same tombstone path when a submission has no remaining answer or message.

## Options considered

### Option 1: Extend the existing response model and routes

Use the current relational response records and owner routes. Add the response setting to validated page settings, extend the safe public page projection with a question graph, and build the visitor and creator interfaces around those contracts.

**Pros**:

1. Reuses existing transactions, constraints, browser identity, rate limits, and ownership policies.
2. Keeps the tracer bullet small and understandable for the current team.
3. Preserves response snapshots and the existing question edit safety rules.

**Cons**:

1. The public page projection and shared contracts need a careful extension.
2. The response page must coordinate page data, list data, and detail data without shared caching.

### Option 2: Add a separate response configuration and inbox service

Create new response configuration records, a separate inbox resource, and an account wide aggregation API.

**Pros**:

1. Future response preferences and cross page views could be added without changing page settings.

**Cons**:

1. It adds tables, authorization paths, and aggregation behavior before the product needs them.
2. It creates more ways for private responses to cross page or creator boundaries.

### Option 3: Store each response as one JSON document

Put all answers and messages into one JSON field and return that document to the owner.

**Pros**:

1. It would reduce relation reads for a small prototype.

**Cons**:

1. It weakens answer uniqueness, snapshots, deletion rules, and question edit cleanup.
2. It makes branch validation and indexed response queries harder.

## Decision

**Chosen option**: Option 1, extend the existing response model and routes.

Keep the current relational response records and API boundaries. Store the response toggle in validated `Page.settings`, expose a safe response description and question graph in the unlocked public page projection, and build the anonymous form and owner view on the existing REST contracts.

The public response description is part of the public page read rather than a second question endpoint. This is the recommended implementation detail because it avoids an extra request and keeps page availability, unlock state, response availability, and question data from drifting. A separate public question endpoint is the runner up and remains a possible optimization only after measured need.

The owner list response adds `unreadCount` beside its cursor. This keeps the exact count in the same ownership boundary and avoids a separate count endpoint.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `prisma-client-api` (`prisma/skills`, `.agents/skills/prisma-client-api/`) · `better-auth-security-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-security-best-practices/`)

## Rationale

The existing response tables already have the right ownership, uniqueness, snapshot, and cascade behavior. Extending them avoids a second source of truth and lets the API continue to enforce all privacy rules in one feature module. A small schema migration adds only the fields needed to make permanent duplicate protection and stable answer ordering true after deletion and pagination. A page setting is enough for the first release because the only new preference is whether the form is enabled.

The public graph must be safe and complete for the visitor UI, but it must not expose private creator configuration. Returning it with the unlocked page projection removes a request waterfall and makes locked pages simple: no confession content or question graph is returned until unlock succeeds. The dashboard stays per page because the product requirement is creator privacy, not an account wide inbox.

## Feature design

**Data model sketch**:

1. `Page` remains the owner and lifecycle record. `Page.settings.responsesEnabled` is a required boolean in the trusted template settings schema. New defaults set it to `false`. Older JSON without the key is read as `false` until saved.
2. `VisitorSubmission` keeps `id`, `pageId`, `browserTokenHash`, `idempotencyKey`, `idempotencyPayloadHash`, `readState`, `submittedAt`, and nullable `deletedAt`. It has unique `(pageId, browserTokenHash)` and unique `(pageId, idempotencyKey)`, plus indexes for `(pageId, submittedAt, id)` and `(pageId, readState, submittedAt, id)`. A deleted row keeps only the page scope, duplicate values, read state, timestamps, and deletion marker. Owner reads exclude it.
3. `VisitorAnswer` keeps `id`, `submissionId`, `questionId`, required `answerOrder`, optional `choiceId`, optional `textAnswer`, `promptSnapshot`, and optional `choiceLabelSnapshot`. It has unique `(submissionId, questionId)` and an index on `(submissionId, answerOrder)`.
4. `VisitorMessage` keeps `id`, unique `submissionId`, `promptSnapshot`, `message`, and `createdAt`.
5. `Page` has many submissions. A submission has many answers and zero or one message. Page deletion cascades to all three response records. Response deletion cascades to its answers and message. Question and choice references keep their existing delete behavior.
6. No visitor account, name, email, raw IP, user agent, response configuration table, response JSON document, notification record, or audit record is added in this slice. The tombstone is not visible to owners or visitors and retains no response text.

The safe public response description is a contract projection, not a database entity. Its exact shape is a discriminated union:

```text
response: { enabled: false }
```

or:

```text
response: {
  enabled: true,
  requiredAnswers: boolean,
  visitorMessageEnabled: boolean,
  visitorMessagePrompt: string,
  visitorMessagePrivacyText: string,
  visitorMessageMaxLength: 2000,
  textAnswerMaxLength: 2000,
  rootQuestionIds: string[],
  questions: [{
    id: string,
    type: CHOICE | PLAIN_MESSAGE,
    prompt: string,
    displayOrder: number,
    nextQuestionId: string | null,
    choices: [{ id: string, label: string, displayOrder: number, nextQuestionId: string | null }]
  }]
}
```

The disabled branch contains no question or message data. A locked projection contains no response field at all.

1. `enabled` comes from `Page.settings.responsesEnabled`.
2. `requiredAnswers` comes from the trusted template registry question rules.
3. `visitorMessageEnabled`, `visitorMessagePrompt`, `visitorMessagePrivacyText`, and `visitorMessageMaxLength` come from immutable trusted template response copy and capability metadata. Secret Letter uses `Private message`, `Only the page creator can read this message`, and 2,000 characters.
4. `textAnswerMaxLength` comes from the shared visitor answer Zod contract and is 2,000 characters.
5. `questions` contains only question and choice ids, types, prompts, display order, and branch ids needed to render and submit the path. Creator messages, private settings, passwords, and executable content are excluded.
6. `rootQuestionIds` contains questions that are not targeted by another question or choice, sorted by `(displayOrder, id)`. Choices are sorted by `(displayOrder, id)`.
7. The visitor starts at each root in order. A selected choice follows its `nextQuestionId`. A plain message answer follows its question `nextQuestionId`. An optional unanswered question ends that branch, and the next root may still be shown. Changing a choice clears answers that are no longer reachable. The server rejects any answer set that does not match this traversal.
8. The description is included only in an unlocked public projection. A locked projection contains no question graph.

**State transitions**:

Response state:

```text
accepted → UNREAD → READ
accepted → tombstoned
UNREAD → tombstoned
READ → tombstoned
```

Page response availability is a setting transition:

```text
responsesEnabled false ↔ true
```

Only the page owner can change the setting through a version checked page save. The canonical stored setting is boolean, but the request field is optional during rollout so an older web client preserves the current value instead of resetting it. A submission is accepted only when the page is published and the setting is true. Unpublishing or disabling the setting stops new submissions and preserves stored responses.

The creator dashboard keeps `filter=all|unread` and the selected submission id in URL search parameters. It uses a Load more action for the cursor, keeps the explicit mark read control rather than marking on open, and invalidates the list and detail queries after read or delete. After delete, selection clears and focus moves to the response list heading. Mobile back navigation preserves the filter and returns to the list.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/pages/:pageId` | PATCH | `recipientName`, `mainMessage`, optional `responsesEnabled`, `expectedContentVersion`, existing image fields | owner page projection including the setting | Better Auth session and page ownership | `401`, `404`, `409` stale version, `422` validation |
| `/api/v1/public/pages/:slug` | GET | slug, browser and unlock cookies | safe public page, with response description only when unlocked | Anonymous, page and rate limit checks | `404` unavailable, `429` rate limited, safe locked projection |
| `/p/:slug/responses` | POST | same body as the public submission endpoint | proxied submission response | Same origin browser route | Copies upstream status and safe headers, always no store |
| `/api/v1/public/pages/:slug/submissions` | POST | validated answers, optional message, idempotency key, browser cookie whose server hash is page scoped, observed unlock password version when protected | `{ accepted: true }` | Anonymous browser cookie, unlock proof when protected | `404` unavailable or disabled, `401` locked, `409` duplicate or idempotency conflict, `422` validation or unsupported capability, `429` rate limited |
| `/api/v1/pages/:pageId/submissions` | GET | `filter`, size 1 to 50, opaque cursor | summaries, `unreadCount`, next cursor | Better Auth session and page ownership | `401`, safe `404`, `422` invalid cursor |
| `/api/v1/pages/:pageId/submissions/:submissionId` | GET | page id and submission id | owner detail with snapshots and read state | Better Auth session and page ownership | `401`, safe `404` |
| `/api/v1/pages/:pageId/submissions/:submissionId/read` | POST | page id and submission id | submission id and `READ` state | Better Auth session and page ownership | `401`, safe `404` |
| `/api/v1/pages/:pageId/submissions/:submissionId` | DELETE | page id, submission id, explicit `confirm` | `{ deleted: true }` | Better Auth session and page ownership | `401`, safe `404`, `409` confirmation required |

The public page route returns a discriminated locked or unlocked projection. The public submission route resolves the published response scope before checking the page password, so a disabled or unpublished form uses the same safe unavailable outcome. It then verifies the unlock proof when required, passes the observed password version into the transaction, hashes the browser cookie with page scope, applies the submission rate limit, validates the request, and writes through the transaction. The transaction locks the page and rechecks published state, response availability, and the current password version before writing.

The Next.js `/p/:slug/responses` route forwards the browser and unlock cookies and the signed visitor identity header to NestJS. It copies `content-type`, `x-request-id`, `retry-after`, and `set-cookie`, sets `Cache-Control: no-store` on success and error, and never exposes the API origin to browser code.

**Value sourcing**:

| Action | Value produced or displayed | Source |
| --- | --- | --- |
| Owner editor | response toggle | `Page.settings.responsesEnabled`, defaulted by the trusted template registry; an omitted legacy request field preserves the current value |
| Owner editor | current page version | `Page.contentVersion` in the owner projection |
| Public page | form visibility | `responsesEnabled` in the unlocked public response projection |
| Public page | question prompt and path | current published `PageQuestion` and `PageChoice` rows, mapped to safe fields |
| Public page | required answer rule and message support | trusted immutable template registry entry |
| Visitor submission | page scope | published `Page.id` resolved from normalized slug |
| Visitor submission | duplicate identity | browser scoped `letterly_browser` cookie, hashed with page scope and the configured visitor identity secret |
| Visitor submission | retry identity | `crypto.randomUUID()` generated once per submit intent, retained through ambiguous failures, replaced only after the visitor edits the payload for a new intent |
| Visitor submission | payload equality | server canonical form with trimmed values, explicit nulls, and answers sorted by question id before hashing |
| Visitor submission | accepted state | one transaction that validates the page, template, question path, and database constraints |
| Owner response heading | page label | existing owner page projection, derived from `Page.content.recipientName` |
| Owner response list | summaries and unread count | non tombstoned `VisitorSubmission` rows under `pageId` and the owner predicate; list and count run in one repeatable read transaction, and unread count always covers all unread rows regardless of the active filter |
| Owner response list | displayed fields and time | id, read state, submitted time, answer count, and message presence; ISO timestamps are localized by the browser using its locale and time zone, with no text preview |
| Owner response detail | prompt and choice wording | `VisitorAnswer` snapshots and `VisitorMessage.promptSnapshot`, ordered by stored `answerOrder` |
| Owner response detail | answer and message text | `VisitorAnswer.textAnswer` and `VisitorMessage.message` |
| Read and delete feedback | result state | the owner mutation response, not client guessed state |
| Error feedback | safe message and code | the API error envelope and route specific error mapper |
| Question edit confirmation | affected count and retry version | existing `RESPONSE_IMPACT` error details with `affectedResponseCount` and `confirmResponseDeletion: true`, followed by the current content version |

**Key invariants**:

1. The API is the authorization boundary. Every owner query includes both page id and authenticated creator id.
2. A public submission can target only a published page with responses enabled and a trusted supported template.
3. Browser identity and idempotency uniqueness are enforced by PostgreSQL as well as application checks. Tombstones keep those uniqueness values after content deletion.
4. The page row is locked during submission validation and creation so simultaneous requests cannot create two responses.
5. The same idempotency key and payload is safe to retry. A different payload with that key is a conflict.
6. A response contains at least one valid answer or one nonempty message. Each answer uses exactly one choice or text form and follows the current branch. The browser key is unguessable and the server hashes a canonical payload.
7. Public projections never contain private settings, passwords, creator identity, browser hashes, idempotency data, or response content.
8. Response content never enters logs, analytics, local storage, or shared caches.
9. Question edits that affect stored answers use the existing explicit impact confirmation and transactional cleanup.
10. Creator deletion permanently removes response content and leaves only a non display tombstone. Page deletion cascades tombstones. Unpublishing does not delete responses.

**Security model**:

1. Anonymous visitors may read the safe published projection and submit only through the public route. They cannot read any response.
2. The page creator may list, open, mark, and delete responses for their own page. Other creators receive the same safe not found result as missing resources.
3. Administrator response access is not part of this feature and remains a launch administration decision.
4. Protected pages require a current page scoped unlock proof before submission. Passwords and unlock proofs are never included in response data.
5. The public submission route uses the existing route specific shared rate limit in staging and production. Local in memory limits are for development only.
6. Public page reads, public submissions, owner response list and detail reads, owner read and delete mutations, and their Next.js proxies use `Cache-Control: no-store` on both success and error. Request ids and safe error codes remain available without logging private content.
7. The feature supports users of any age and stores only the minimum anonymous visitor data needed for duplicate protection and abuse limits. No regulated compliance scope is introduced by this slice.

**Configuration required**:

No new environment variables or credentials are needed. The feature uses the existing Better Auth session, visitor identity secret, browser cookie, unlock proof store, Redis or Valkey rate limit service, and Prisma database connection.

**Critical test scenarios**:

1. Happy path, create a question in the editor, enable a page, publish it, load the public question graph, submit an answer and private message, list it as the owner, open it, mark it read, and delete it. Verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, and **AC-17**.
2. Idempotent retry, submit once, repeat the same request after a simulated timeout, then retry with a different payload. Verifies **AC-6** and **AC-15**.
3. Duplicate protection, submit from the same page and browser with a new key. Verifies **AC-6**.
4. Validation, send an unsupported question, a wrong branch, an empty response, both answer forms, and a message over the limit. Verifies **AC-4** and **AC-5**.
5. Public lifecycle, disable responses, unpublish, and protect the page, then confirm the form and endpoint states are safe and no question graph is returned while locked. Verifies **AC-2**, **AC-4**, **AC-7**, and **AC-12**.
6. Ownership isolation, use another authenticated creator and an anonymous visitor against list, detail, read, and delete routes. Verifies **AC-9**, **AC-10**, **AC-11**, and **AC-12**.
7. Question edit impact, change a question with existing answers with and without confirmation and verify transactional cleanup and tombstone retention. Verifies **AC-13** and **AC-18**.
8. Dashboard states, exercise loading, empty all, empty unread, rate limited, unavailable, read, delete, mobile navigation, keyboard focus, and reduced motion. Verifies **AC-14** and **AC-16**.
9. Privacy, inspect response headers and structured logs for owner routes, public routes, and the same origin proxy and confirm no response content or identity secrets are present. Verifies **AC-7**, **AC-12**, and **AC-16**.
10. Concurrency, rotate a page password during a submission and send two requests with the same browser. Verify the password version recheck, one accepted response, stable answer order, and a durable duplicate tombstone after deletion. Verifies **AC-6**, **AC-11**, **AC-12**, and **AC-18**.

## Build plan

The build follows the project's tracer bullet approach. Each step extends the real path before adding polish.

1. Add a forward Prisma migration for nullable `VisitorSubmission.deletedAt`, required `VisitorAnswer.answerOrder`, the response cursor indexes, and the answer ordering index. Backfill answer order from existing answer rows by submission and id, then deploy code that excludes tombstones. Satisfies **AC-6**, **AC-9**, **AC-11**, and **AC-18**.
2. Extend the trusted Secret Letter settings and shared page contracts with `responsesEnabled`, default false behavior, optional legacy save input, the exact safe public response union, template response copy, public question graph schemas, and the owner list `unreadCount`. Satisfies **AC-1**, **AC-2**, **AC-8**, **AC-16**, and **AC-18**.
3. Extend the page save use case and repository to merge an optional response setting inside the existing content version and ownership transaction. Add compatibility for older settings without the field and reject enabling response controls on a template without a supported response capability. Satisfies **AC-1**, **AC-4**, and **AC-12**.
4. Extend the public page repository and mapper to read published questions and choices, resolve trusted template rules and copy, derive sorted roots, include the safe response description only in unlocked projections, and keep locked and disabled forms safe. Satisfies **AC-2**, **AC-4**, **AC-5**, **AC-12**, and **AC-18**.
5. Complete the submission repository and service path for the response setting, same page proxy transport, page lock order, password version recheck, branch validation, canonical payload hashing, transactional write, tombstones, page scoped uniqueness, idempotency, and route specific rate limit behavior. Satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-12**, **AC-15**, and **AC-18**.
6. Extend owner submission listing with a repeatable read list and count transaction, indexed `unreadCount`, tombstone filtering, cursor contract, stable answer ordering, safe projections, and owner only read and delete mutations. Satisfies **AC-8**, **AC-9**, **AC-10**, **AC-11**, and **AC-18**.
7. Add the minimal question authoring controls to the existing editor, using the current question routes, version checks, supported choice and plain message fields, branch validation, and the existing `RESPONSE_IMPACT` confirmation flow. Satisfies **AC-13**, **AC-17**, and **AC-18**.
8. Build the same origin public response proxy and the Secret Letter visitor response section with the exact safe question graph, React Hook Form and Zod validation, explicit submit, one UUID per submit intent, preserved in memory input, safe errors, and accessible success and failure states. Satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-12**, and **AC-15**.
9. Add the owner response toggle to the existing editor and add the responsive per page response route with TanStack Query list, URL filter and selection state, unread count, detail, explicit mark read, delete confirmation, focus management, and empty and retry states. Satisfies **AC-1**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-14**, and **AC-15**.
10. Add unit coverage for settings compatibility, exact public projection mapping, root and branch traversal, canonical idempotency hashing, tombstones, answer ordering, ownership errors, unread counts, and deletion behavior. Add API integration coverage for lifecycle, rate limits, protected unlock races, privacy headers, proxy forwarding, question impact, and cross creator isolation. Satisfies **AC-4** through **AC-13**, **AC-17**, and **AC-18**.
11. Add Playwright coverage for question authoring, the anonymous visitor journey, idempotent retry, and the desktop and mobile creator dashboard, including keyboard focus and reduced motion states. Satisfies **AC-3**, **AC-6**, **AC-12**, **AC-14**, **AC-15**, **AC-16**, and **AC-17**.

## Consequences

**Positive**:

1. The first response journey uses the current database and security boundaries without a new service.
2. The public form and owner view use safe projections and explicit ownership predicates.
3. Idempotency and database uniqueness make retries predictable.
4. The dashboard can grow later without changing the visitor submission contract.

**Negative / tradeoffs**:

1. The public page projection becomes richer and must continue to exclude creator only fields.
2. The owner list and count share a repeatable read transaction and still add a count query for the exact unread count.
3. The first release has no email notification, search, account wide inbox, response edit, or administrator view.
4. A visitor who deletes a response cannot submit another response from the same browser for that page, and a minimal tombstone remains until the page is deleted.
5. Question authoring is included at a minimal level so the first response journey can be created through the product, which adds editor work to this slice.

**Neutral**:

1. Existing response code in the dirty worktree is treated as an implementation starting point, not as a reason to skip contract and browser verification.
2. The second template must provide its own safe question graph, settings schema, visitor renderer, and response rules when it is designed.

## Follow-up

1. Decide email or push notifications separately after the private dashboard is stable.
2. Design administrator moderation and response access in the launch hardening slice.
3. Define public privacy, retention, and deletion policy text before a public launch.
4. Revisit whether a cross page inbox or search is needed after real response volume is measured.

## Migration plan

**Strategy**: forward compatible database migration.

**Phases**:

1. Add nullable `deletedAt`, required `answerOrder` with a temporary migration default, and the response cursor indexes. Backfill answer order by submission and existing answer id, then remove the temporary default if the database migration supports it safely.
2. Deploy API code that reads missing `responsesEnabled` as false, preserves an enabled value when older clients omit the field, writes tombstones on deletion, and excludes tombstones from owner reads.
3. Deploy the public projection, same origin submission proxy, visitor form, question authoring controls, and owner dashboard. Existing pages remain response disabled until their owners enable the setting.

**Rollback**: roll back application code only after the new columns and indexes exist. The old code can continue to read non tombstoned responses. Do not roll back by dropping columns or indexes. If the feature is disabled, leave the tombstone and ordering columns in place for the next deployment.

**Risks**: the answer order backfill must be checked before the constraint becomes required. A stale web bundle could omit `responsesEnabled`, so the API must preserve the current setting. A stale public form must receive the safe unavailable response when the setting is disabled. A password change during a submission must fail the version recheck rather than accept an old unlock proof.
