# 0015. Linear question builder

**Date**: 2026-08-27
**Updated**: 2026-09-01
**Status**: In Progress

## Summary

Secret Letter questions are a simple ordered list. Creators add, edit, delete, and reorder questions. Visitors see the same list in order, one question at a time.

Private responses are available automatically when the published Secret Letter has at least one question. Secret Letter has no separate response control. Deleting the final question stops new responses, while stored private messages remain in the creator inbox.

## Context

The first linear builder implementation derives public response availability from either the stored `responsesEnabled` setting or the existence of a question. The owner interface reads only the stored setting. A creator can therefore see responses marked off while the public page accepts them. A legacy true value also keeps a questionless private message form open after the final question is deleted.

Response availability is a security boundary because anonymous submissions contain private writing. The public projection, submission scope check, locked write transaction, and owner interface need one rule. The rule must preserve page ownership, unlock proof, duplicate protection, rate limits, no store behavior, and stored response privacy.

## Requirements

**User stories**:

- As a creator, I want to add and edit questions in a list so the setup is easy to understand.
- As a creator, I want to move questions with drag and drop or keyboard controls so I can control the visitor order.
- As a creator, I want to remove a question without managing references to other questions.
- As a creator, I want responses to become available with my first question without managing a separate setting.
- As a visitor, I want to answer questions in the order shown by the creator.

**Acceptance criteria**:

- **AC-1**: The owner editor shows an accessible ordered list of questions, with each card showing its number, prompt, type, choices when applicable, edit, delete, and reorder controls. No graph, branch destination, finish, follow up, question key, or numeric display order control is shown.
- **AC-2**: Creating a question requires the current page content version, generates question and choice ids and keys on the server, appends after the current last question, and rejects a stale version. The owner supplies only the type, prompt, and ordered choice content supported by the Secret Letter contract. A page has at most 100 questions.
- **AC-3**: A creator can reorder questions with drag and drop and with visible move up and move down keyboard controls. The API stores contiguous zero based order and returns the freshly stored id order. A changed order advances the page content version. A no change order returns the current version without a write.
- **AC-4**: Reordering validates ownership, the complete question id list, a required current content version, the 100 question maximum, and duplicate, missing, or foreign ids. An empty list is invalid. A one item list is valid only when it is the complete current list. Reordering does not delete existing responses because answer content did not change.
- **AC-5**: Editing a question updates its prompt, type, choices, and optional private per choice creator notes while clearing all legacy branch destinations and finish flags. Existing choices are addressed by server issued id, new choices omit id, and all keys remain server owned. The notes appear only in the owner editor and never enter public projections or response snapshots. A note only edit does not affect responses. Prompt, type, choice membership, or choice label changes keep the established impact count, explicit confirmation, answer cleanup, message preservation, and empty submission tombstone behavior. Deleting a question removes only that question, normalizes the remaining order, and has no referenced question error.
- **AC-6**: Canonical create, update, owner, and public Secret Letter contracts contain no branch destination, finish, root question, client key, client display order, opaque config, or independent response setting field. During one compatibility window, removed request properties are accepted only as unknown properties and stripped before application code. Canonical responses omit them immediately after the compatible web client deploys. Existing stored branch columns and old `responsesEnabled` JSON values are ignored. Secret Letter page saves use a Secret Letter settings adapter that preserves password and media settings while removing only the legacy response key. Choose Your Heart contracts and settings remain independent.
- **AC-7**: A published Secret Letter accepts new private responses if and only if it has at least one current question. Adding the first question enables responses automatically. Deleting the final question disables the public form and makes stale submissions safely unavailable. A page with no questions cannot accept a new private message. Existing submissions and private messages remain in the creator inbox, subject to the established response impact cleanup for the deleted question.
- **AC-8**: The visitor form traverses the public question list sequentially. Current Secret Letter questions are optional and skipped questions have no answer entry. Choosing an answer never changes the next question. Choice selection does not advance by itself. An explicit Continue action advances, so Back can retain the same choice or accept a replacement without trapping the visitor. Changing an earlier answer clears later navigation history and submit errors but preserves later answers because linear questions are independent. A visitor may submit only an answer, only a private message, or both while at least one question exists. Any future required question rule must reject message only submission until every required answer exists.
- **AC-9**: The owner overview and settings views show response readiness from the page lifecycle and loaded question count. They provide no response toggle. While the question query is pending they show a neutral loading state. A failed query shows an unavailable state and Retry action, never a guessed value. Zero questions says that adding a question enables responses. A draft or unpublished page with questions says Ready when published. A published page with questions says Enabled automatically. An archived page says Unavailable while archived. A background refetch keeps the last confirmed value and marks it Updating.
- **AC-10**: Owner and public boundaries, stale save handling, response impact confirmation, creator mutation rate limits, public submission rate limits, current unlock proof, page locking, duplicate protection, no store headers, keyboard access, visible focus, narrow layouts, and reduced motion remain supported.
- **AC-11**: Unit, API integration, and desktop and mobile Playwright coverage proves version checked create, limits, private creator note edit and clearing, delete including the final question, answer only cleanup, private message preservation, reorder including no change, persistence after reload, sequential traversal, Back with the same and a changed selection, zero question answer and message rejection, stale form rejection, automatic readiness and availability, owner query failure, legacy request stripping, canonical response omission, transaction rollback, rate limits, ownership, and absence of branching and response controls.

## Options considered

### Option 1: Derive availability from questions

Secret Letter accepts new responses only when at least one current question exists. The API checks that fact at public read time and again inside the submission transaction.

**Pros**:

1. One visible creator action has one predictable result.
2. The owner interface and public API can use the same source.
3. No new table, column, or migration is needed.

**Cons**:

1. Questionless private message forms are removed.
2. Old true `responsesEnabled` values no longer affect Secret Letter behavior.

### Option 2: Persist automatic setting changes

Adding the first question writes `responsesEnabled: true` and deleting the final question writes false.

**Pros**:

1. Existing code can continue reading one stored boolean.

**Cons**:

1. The boolean duplicates question existence and can drift through imports, repair work, or older clients.
2. Question mutations gain an unrelated settings side effect.

### Option 3: Preserve questionless private messages

Remove the response toggle but let every published Secret Letter accept a private message, even without questions.

**Pros**:

1. Existing questionless message pages remain open.

**Cons**:

1. A creator has no action that disables new private writing.
2. Optional sections would appear without creator configuration.

## Decision

**Chosen option**: Option 1, derive availability from questions.

The graph builder is replaced by a linear ordered list for Secret Letter questions. Secret Letter response availability is a server derived policy, not a saved preference. It is true exactly when the current published page has at least one question. The public read and locked submission transaction both enforce it. The owner interface derives the same state from its question query.

One plain application policy, `resolveSecretLetterResponseAvailability`, takes trusted template identity and the count of valid current questions. Both public repositories call that policy. Each question mutation and public submission locks the same `Page` row before checking or changing question existence, so concurrent requests use one lock order.

Question records keep their existing database destination columns during this migration, but all new writes set them to null or false, canonical contracts omit them, and visitor validation never follows them. Question and choice keys and order are server owned. Update inputs may carry a server issued choice id only to preserve that choice. Foreign or duplicate choice ids are invalid. Question order is managed by a locked bulk reorder transaction. The existing Choose Your Heart journey model and its settings remain independent.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Question existence is already required to show the linear question journey and is available in every public read and submission transaction. Treating it as the source removes the stored boolean drift that caused the review failure. Persisting a second value would create two facts for one state.

Questionless private messages are not preserved for new submissions because removing the only creator control would otherwise make them always available. Stored inbox content is different. It remains private creator data and is preserved unless the existing confirmed question cleanup leaves a submission with neither answers nor a message.

## Feature design

**Data model sketch**:

`PageQuestion` remains the page owned question entity with its existing id, page id, generated key, type, prompt, nullable stored config, and contiguous `displayOrder`. Canonical Secret Letter writes do not accept config and store null. A page has at most 100 questions.

`PageChoice` remains a child of a choice question with a server generated id and key, label, contiguous display order derived from request array position, and optional creator note. A choice question has two to ten choices. On update, an id that belongs to the question preserves that choice and key. A choice without id is created with new server identity. An omitted existing id is deleted. Omitting the entire choices field preserves the set when the type stays `CHOICE`. Changing to `PLAIN_MESSAGE` removes all choices after response impact confirmation. The legacy `nextQuestionId` and `endsJourney` columns stay nullable or false for stored compatibility, but are cleared by every question write.

Secret Letter has no persisted response availability field in its canonical settings model. Existing `responsesEnabled` keys may remain in old `Page.settings` JSON, but Secret Letter reads ignore them and later settings writes may strip them. Choose Your Heart keeps its own settings contract. No database migration or backfill is required.

Owner page projection and save handling resolve the trusted template first. Secret Letter uses its settings schema without `responsesEnabled` and preserves its encrypted password settings during a merge. Choose Your Heart continues through its separate journey settings contract and endpoints. No generic settings parser may strip fields from another template.

**State transitions**:

Owner editing moves between loading, editing, saving, saved, and recoverable error. A successful add focuses the new question heading. A successful edit returns focus to that question heading. A successful delete focuses the next question heading, the prior question heading when no next item exists, or the Add question action when the list becomes empty. Reorder keeps focus on the moved card control and announces its new number. Mutation results announce success or safe failure through the existing live status region.

Response readiness moves from not configured to ready when the first question is added, remains ready while any question exists, and returns to not configured when the final question is deleted. Actual public availability also requires the existing published page availability rules. These states are derived and are not stored.

Visitor questions move from the first sorted question through each later sorted question with explicit Continue, then to the existing private response area and delivered or recoverable submission state. Back retains the stored answer. Selecting the same or a replacement answer and choosing Continue advances exactly once. A skipped question has no entry in the answer map.

The browser creates one idempotency key at the first submit attempt. An unchanged explicit retry reuses it. Editing any answer or the private message clears it so the next submit intent creates a new key. A changed payload with an old key remains an `IDEMPOTENCY_CONFLICT`.

A stale visitor form becomes unavailable if the page is unpublished or no valid current question exists when the locked transaction rechecks the page. Unpublished, expired, administratively disabled, deleted final question, and missing pages return HTTP 404 with `PAGE_NOT_FOUND` and `This letter is not available`. A protected page without current unlock proof keeps the established HTTP 401 `PAGE_LOCKED` result.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/pages/:pageId/questions` | GET | owned page id | ordered questions with question and choice ids, content, and private notes, without keys, branch, or config fields | owner session | `PAGE_NOT_FOUND`, unauthorized |
| `/api/v1/pages/:pageId/questions` | POST | type, prompt, ordered choice labels and optional creator notes, required expected content version | appended canonical owner question with question and choice ids but no keys, plus content version | owner session | `QUESTION_LIMIT_REACHED`, invalid content, `STALE_VERSION` |
| `/api/v1/pages/:pageId/questions/:questionId` | PATCH | content fields, optional existing choice ids, expected content version, response confirmation | updated canonical owner question and content version | owner session | invalid or foreign choice id, invalid content, `STALE_VERSION`, `RESPONSE_IMPACT` |
| `/api/v1/pages/:pageId/questions/:questionId` | DELETE | expected content version, response confirmation | deletion result and content version | owner session | not found, stale version, response impact |
| `/api/v1/pages/:pageId/questions/order` | PATCH | complete ordered `questionIds`, expected content version | current `contentVersion` and freshly stored ordered ids | owner session | `INVALID_ORDER`, `STALE_VERSION`, `INVALID_STATE`, `PAGE_NOT_FOUND` |
| `/api/v1/pages/:pageId` | PATCH | Secret Letter content, images, expected content version | owner page projection without an independent response setting | owner session | not found, invalid state, stale version |
| `/api/v1/public/pages/:slug` | GET | slug and current unlock proof when protected | safe page projection, with response enabled only when a current question exists | anonymous visitor | locked, unavailable, rate limited |
| `/api/v1/public/pages/:slug/submissions` | POST | sequential answers, private message, idempotency key | accepted submission result | anonymous visitor | invalid answers, duplicate, unavailable |
| `/p/:slug/responses` | POST | same body as the public submission endpoint | safe proxy response with no store headers | same origin anonymous visitor | copied safe upstream status |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Owner question card | Prompt, type, choice labels, choice order, and private creator notes | Owner question read from persisted `PageQuestion` and `PageChoice` rows, sorted by `displayOrder` and id |
| Create question | Question id, stable key, appended order, and version | Server UUID, `question-<id>`, highest existing order plus one, and locked page `contentVersion` transaction |
| Create or update choices | Choice identities and contiguous order | Existing server issued id preserves its stored key, omitted id creates a server UUID and `choice-<id>`, omitted existing id deletes it, and request array index assigns order inside the locked question transaction |
| Question content validation | Prompt, label, note, choice count, duplicate labels, and page question count | Canonical Secret Letter Zod contract: prompt 1 to 2,000, label 1 to 500, note 0 to 2,000, two to ten choices, labels unique after trim and case folding, and at most 100 questions |
| Question number and move controls | Position, Move up state, and Move down state | Owner questions sorted by `displayOrder`; rendered index plus one; first and last index disable the matching move action |
| Question mutation state | Pending controls, focus target, reorder announcement, success text, and safe error text | TanStack Query mutation state, resulting ordered owner query, mutation response, moved item index, and existing API error envelope |
| Reorder result | Stored order and version | Fresh ordered read inside the locked transaction and page `contentVersion`; a no change request returns both without a write |
| Public question sequence | Next question | Public questions sorted by `displayOrder` |
| Public response availability | Enabled or unavailable | `resolveSecretLetterResponseAvailability`, using trusted Secret Letter identity and at least one valid question in the safe public projection after existing page availability and unlock checks |
| Submission authorization | Current response availability | The same policy using valid current questions, checked again after the page row is locked in the submission transaction |
| Malformed stored question | Fail closed response state | Safe public projection validation; the letter may render with `{ enabled: false }`, the submission route returns `PAGE_NOT_FOUND`, and structured monitoring records no private content |
| Owner response status | Loading, Retry, Updating, Add a question, Ready when published, Enabled automatically, or Unavailable while archived | Owner question query state and confirmed count plus owner `Page.status`, never `Page.settings.responsesEnabled` |
| Final question deletion | New response state | Zero remaining questions after the version checked delete transaction, which makes later reads and submissions unavailable |
| Response impact confirmation | Affected response count and required confirmation | Distinct non tombstoned `VisitorSubmission` ids reached through answers to questions whose prompt, type, choice membership, or choice label changed, or which were deleted; `RESPONSE_IMPACT` returns the count and `confirmResponseDeletion: true` |
| Response cleanup | Removed answers, retained messages, and tombstoned empty submissions | Locked mutation deletes affected `VisitorAnswer` rows, preserves a submission with `VisitorMessage`, and tombstones a submission left with neither answers nor a message |
| Creator note clearing | Stored null | Explicit null or a value that trims to empty in the canonical choice input |
| Visitor prompt, limits, privacy copy, and required rule | Public form labels and validation | Trusted Secret Letter template definition in the safe public projection, never page JSON or browser input |
| Visitor Back and Continue | Current answer, later answers, history, and errors | In memory answer map and navigation history; Back retains answers, changed earlier answers clear later history and errors, skipped questions have no map entry |
| Visitor retry identity | Idempotency key | Browser generated UUID retained for an unchanged retry and cleared by any answer or private message edit |
| Response snapshot | Prompt and selected answer text | Published question projection and submitted values |
| Save and reorder feedback | New content version | Mutation response from the API |
| Rate limit and unlock errors | Bucket scope, retry timing, current proof, code, and safe message | Existing creator and public submission policies from spec 0008, validated rate limit configuration, and page scoped unlock proof service |

**Key invariants**:

- Question order is contiguous, zero based, and unique within a page.
- A page has at most 100 questions. A choice question has two to ten choices with labels unique after trim and case folding.
- Reorder requests contain every existing question exactly once and no question from another page.
- Create, update, delete, and reorder require `expectedContentVersion`. New questions append after the current last question. Question and choice keys and display orders are generated or assigned by the server and never edited by the creator. Update may send an existing server issued choice id only to preserve identity.
- An identical complete reorder is a successful no change operation and does not advance `contentVersion`.
- Question writes clear `nextQuestionId` and `endsJourney` on the question and every choice.
- Canonical Secret Letter writes omit opaque question config and store it as null. Legacy request properties are stripped at the transport boundary and never reach the application service.
- Private creator notes belong to choices, are visible only to the owner, and never enter public projections or response snapshots. A note only edit does not trigger response impact cleanup.
- Secret Letter response availability is derived only from current question existence. It is never accepted from the browser and never read from legacy Secret Letter settings.
- A Secret Letter with zero questions exposes no public response form and accepts no new answer or private message submission.
- Current Secret Letter questions are optional. A Secret Letter with one or more valid questions may accept answers, a private message, or both. A future required rule must be satisfied before message only submission is accepted.
- Deleting the final question does not delete stored private messages or hide the owner inbox.
- Reorder and creator note only edits never remove responses. Prompt, type, choice membership, and choice label changes keep existing response impact confirmation.
- Public visitors receive only sorted safe projections. Choose Your Heart graph fields are out of scope.

**Security model**:

The existing Better Auth session and page owner predicates authorize all owner question reads and mutations. Every question mutation uses the existing creator mutation policy for its creator scoped bucket, configured limit, retry timing, `RATE_LIMITED`, and fail closed `RATE_LIMIT_UNAVAILABLE` behavior. Owner question reads remain private and use `Cache-Control: private, no-store`.

Public reads expose questions and response metadata only in the safe unlocked projection. Public submission scope requires a published and otherwise available page, a trusted Secret Letter template, and at least one valid current question. Malformed question content fails closed. The letter may remain readable without a response form, but no malformed question is exposed or accepted.

Question mutations and public submissions acquire the same `Page` row lock before reading or changing question existence. The locked submission transaction repeats question validity, current unlock proof, and page availability immediately before any write. Unpublished, expired, disabled, deleted final question, missing, and otherwise unavailable stale forms use HTTP 404 with the same public `PAGE_NOT_FOUND` envelope so private state is not revealed. Missing or stale unlock proof keeps the established HTTP 401 `PAGE_LOCKED` result so the visitor can recover through the unlock flow.

Existing browser identity, page scoped duplicate protection, idempotency, public submission rate limits, and `Cache-Control: no-store` behavior remain unchanged. Response content, browser tokens, unlock proofs, and idempotency values never enter public projections, logs, analytics, local storage, or shared caches. The browser never provides authorization or response availability.

Secret Letter settings are parsed and merged only by the Secret Letter adapter. Removing legacy `responsesEnabled` must preserve encrypted password material and every unrelated supported setting. Choose Your Heart uses its own adapter and response rules.

**Configuration required**: None.

**Critical test scenarios**:

- Create two questions with the current version and verify server generated question and choice identities, appended order, limits, private creator note edit and clearing, ordered owner projection, focus, announcements, and stale create rejection, verifies **AC-1**, **AC-2**, and **AC-5**.
- Move the second question before the first with drag and keyboard controls, reload, and verify the saved order. Send identical, empty, one item incomplete, duplicate, missing, foreign, over limit, and stale reorder requests and verify stable results and rollback, verifies **AC-3**, **AC-4**, and **AC-10**.
- Add the first question and verify owner and public availability become enabled without a setting write, verifies **AC-7** and **AC-9**.
- Delete the final question after confirmation and verify an answer only submission becomes a tombstone, a message bearing submission remains readable, inbox counts contain no empty record, new reads disable the form, and stale submissions return the shared safe unavailable envelope, verifies **AC-5**, **AC-7**, and **AC-10**.
- Submit answers for a multi question public page. Go Back and Continue with the same choice, then repeat with a changed choice. Verify no trap, one answer per question, retained independent later answers, cleared later history and errors, sequential snapshots, skipped answer omission, and idempotency key replacement only after an edit, verifies **AC-8**.
- Send an empty payload and a private message with zero questions and verify both are unavailable. With one question, verify answer only, message only, and combined submissions. Inject malformed stored question data and verify the form fails closed without leaking content, verifies **AC-7**, **AC-8**, and **AC-10**.
- Verify the owner readiness matrix for pending, failed with Retry, background Updating, zero questions, draft, unpublished, published, archived, and mutation invalidation states, verifies **AC-9**.
- Verify canonical contracts strip legacy Secret Letter request properties during the compatibility window, omit them from owner and public responses, preserve password settings, and leave Choose Your Heart contracts unchanged, verifies **AC-6**.
- Verify desktop, mobile, keyboard, reduced motion, ownership, creator and public rate limits, and no branch or response controls, verifies **AC-1**, **AC-9**, **AC-10**, and **AC-11**.

## Build plan

The project uses a Tracer Bullet approach. First wire one ordered mutation through contracts, API, persistence, and public traversal, then replace the owner editor and close the regression coverage.

1. Prepare the compatible web client and canonical Secret Letter contract. Make create version checked. Move ids, keys, order, and config out of browser inputs. Add limits and private per choice creator notes. Let the web read both old and canonical owner responses for one deployment, satisfies **AC-1**, **AC-2**, **AC-5**, and **AC-6**.
2. Deploy the canonical API contracts and template specific settings adapters. Strip legacy Secret Letter request properties before application code, omit them from owner and public responses, preserve password settings, and leave Choose Your Heart unchanged, satisfies **AC-6** and **AC-10**.
3. Centralize effective Secret Letter response availability in `resolveSecretLetterResponseAvailability` and use it in the public projection, submission scope, and locked submission transaction. Apply one page row lock order and fail closed for malformed questions, satisfies **AC-7** and **AC-10**.
4. Pass owner question query state, confirmed count, and page status into overview and settings. Remove all response controls and stored setting reads. Implement the full loading, error, updating, readiness, availability, and archived copy matrix, satisfies **AC-9**.
5. Complete the remaining review fixes in the same vertical slice. Expose and clear private creator notes, apply the existing creator mutation rate limit to question writes, make reorder no change idempotent, and use explicit Continue so Back supports the same or a replacement choice, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-8**, and **AC-10**.
6. Add unit, API integration, and desktop and mobile browser coverage for every critical scenario above. Then run lint, formatting checks, type checks, build, and focused suites, satisfies **AC-1** through **AC-11**.

## Consequences

**Positive**:

- The editor has one clear mental model and visitors always receive a predictable sequence.
- Owner copy, public rendering, and submission authorization share one source of truth.
- Reordering is explicit and does not require creators to understand ids or graph rules.
- Existing database rows and unrelated Choose Your Heart journeys remain compatible.

**Negative / tradeoffs**:

- Existing Secret Letter branches are intentionally flattened into the saved display order.
- Published Secret Letters that previously used a true legacy setting for message only responses stop accepting new messages until the creator adds a question.
- Legacy columns and indexes remain until a later data cleanup decision.

**Neutral**:

- No new service, secret, database migration, backfill, or feature flag is needed.
- Existing response inbox records remain available under their current ownership and privacy rules.

## Follow-up

- [ ] Consider a separate migration to remove legacy Secret Letter destination columns only after all deployed clients and stored data have been audited.
- [ ] Consider removing old Secret Letter `responsesEnabled` keys from stored settings only after deployed clients no longer send or read them. Product behavior must not depend on that cleanup.

## Migration plan

**Strategy**: two application deployments with no database migration.

**Phases**:

1. Deploy a web client that sends canonical question and Secret Letter settings inputs and can read both legacy and canonical owner question responses. The API still accepts and emits its old shape during this phase.
2. Deploy the API that strips removed request properties, emits only canonical responses, uses template specific settings adapters, and enforces question derived response availability. Deploy the final web readiness and visitor navigation behavior with it.
3. After the supported old bundle lifetime has passed, change removed request properties from stripped unknown values to rejected unknown values in a separate compatibility cleanup if strict rejection is still valuable.

**Rollback**: Before phase 2, revert the compatible web client. After phase 2, revert the API and final web deployment together to the phase 1 contract. Existing settings JSON and response records remain readable because no schema or data rewrite occurs.

**Risks**: An older web bundle may still send legacy fields after phase 2, so the API strips them instead of rejecting the whole request during the compatibility window. This can surprise a stale editor because its response setting no longer has an effect, but it cannot reopen questionless submissions. A stale public form may outlive final question deletion, so the locked submission transaction returns the shared safe unavailable result. Template specific settings merges need regression coverage so encrypted password material is never stripped.
