# 0015. Linear question builder

**Date**: 2026-08-27
**Status**: Accepted

## Summary

Secret Letter questions are a simple ordered list. Creators add, edit, delete, and reorder questions. Visitors see the same list in order, one question at a time. Branch destinations, finish flags, graph nodes, and question key or numeric order inputs are not part of the product experience.

## Requirements

**User stories**:

- As a creator, I want to add and edit questions in a list so the setup is easy to understand.
- As a creator, I want to move questions with drag and drop or keyboard controls so I can control the visitor order.
- As a creator, I want to remove a question without managing references to other questions.
- As a visitor, I want to answer questions in the order shown by the creator.

**Acceptance criteria**:

- **AC-1**: The owner editor shows an accessible ordered list of questions, with each card showing its number, prompt, type, choices when applicable, edit, delete, and reorder controls. No graph, branch destination, finish, follow up, question key, or numeric display order control is shown.
- **AC-2**: Creating a question generates its key on the server and appends it after the current last question. The owner supplies only supported question content.
- **AC-3**: A creator can reorder questions with drag and drop and with visible move up and move down keyboard controls. The API stores contiguous zero based order and returns a new page content version.
- **AC-4**: Reordering validates ownership, the complete question id list, stale content versions, and duplicate or missing ids. It does not delete existing responses because answer content did not change.
- **AC-5**: Editing a question updates its prompt, type, choices, and creator messages while clearing all legacy branch destinations and finish flags. Deleting a question removes only that question, normalizes the remaining order, and has no referenced question error.
- **AC-6**: The public Secret Letter projection returns questions sorted by display order without branch fields or root question ids. Existing stored branch columns are ignored and remain available only for compatibility.
- **AC-7**: The visitor response form traverses the public question list sequentially. A choice answer never changes the next question. Optional questions can be skipped, required questions must be answered, and the existing private message and submission states remain intact.
- **AC-8**: Owner and public boundaries, stale save handling, response impact confirmation for content edits, no store headers, keyboard access, visible focus, narrow layouts, and reduced motion remain supported.
- **AC-9**: Unit, API integration, and desktop and mobile Playwright coverage proves create, edit, delete, reorder, persistence after reload, sequential visitor traversal, invalid reorder requests, stale versions, response protection, ownership, and absence of branching controls.

## Decision

The graph builder is replaced by a linear ordered list for Secret Letter questions. Question records keep their existing database destination columns during this migration, but all new writes set them to null or false, public contracts omit them, and visitor validation never follows them. Question order is managed by a locked bulk reorder transaction. The existing Choose Your Heart journey model remains independent and continues to support its own graph.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Feature design

**Data model sketch**:

`PageQuestion` remains the page owned question entity with its existing id, page id, generated key, type, prompt, config, and contiguous `displayOrder`. `PageChoice` remains a child of a choice question with key, label, display order, and optional creator message. The legacy `nextQuestionId` and `endsJourney` columns stay nullable or false for backward compatible reads, but are cleared by question writes. No new entity or migration is required.

**State transitions**:

Owner editing moves between loading, editing, saving, saved, and recoverable error. Visitor questions move from the first sorted question through each later sorted question, then to the existing private response area and delivered or recoverable submission state.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/pages/:pageId/questions` | GET | owned page id | ordered questions without branch fields | owner session | not found, unauthorized |
| `/api/v1/pages/:pageId/questions` | POST | prompt, type, choices, expected content version if supplied by client | generated key, appended question, content version | owner session | invalid content, stale version |
| `/api/v1/pages/:pageId/questions/:questionId` | PATCH | content fields, expected content version, response confirmation | updated question and content version | owner session | invalid content, stale version, response impact |
| `/api/v1/pages/:pageId/questions/:questionId` | DELETE | expected content version, response confirmation | deletion result and content version | owner session | not found, stale version, response impact |
| `/api/v1/pages/:pageId/questions/order` | PATCH | complete ordered `questionIds`, expected content version | `contentVersion` and ordered ids | owner session | invalid order, stale version |
| `/api/v1/public/pages/:slug/responses` | POST | sequential answers, private message, idempotency key | accepted submission result | anonymous visitor | invalid answers, duplicate, unavailable |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Create question | Key and appended order | API generated UUID and highest existing order while the page row is locked |
| Question number | Position shown in the editor | Questions sorted by `displayOrder`, rendered index plus one |
| Reorder result | Contiguous order and new version | Ordered request ids and page `contentVersion` transaction |
| Public question sequence | Next question | Public questions sorted by `displayOrder` |
| Response snapshot | Prompt and selected answer text | Published question projection and submitted values |
| Save and reorder feedback | New content version | Mutation response from the API |

**Key invariants**:

- Question order is contiguous, zero based, and unique within a page.
- Reorder requests contain every existing question exactly once and no question from another page.
- New questions append after the current last question. Question keys are generated and never edited by the creator.
- Question writes clear `nextQuestionId` and `endsJourney` on the question and every choice.
- Reorder alone never removes responses. Prompt, type, choice, or creator message changes keep existing response impact confirmation.
- Public visitors receive only sorted safe projections. Choose Your Heart graph fields are out of scope.

**Security model**:

The existing Better Auth session and page owner predicates authorize all owner question reads and mutations. Public reads and submissions use the existing availability, protection, rate limit, browser identity, and no store boundaries. The browser never provides authorization.

**Configuration required**: None.

**Critical test scenarios**:

- Create two questions and verify generated keys, appended order, and ordered owner projection, verifies **AC-1** and **AC-2**.
- Move the second question before the first with drag and keyboard controls, reload, and verify the saved order, verifies **AC-3** and **AC-4**.
- Submit answers for a multi question public page and verify snapshots follow display order regardless of choice, verifies **AC-6** and **AC-7**.
- Reject duplicate, missing, foreign, and stale reorder requests, verifies **AC-4** and **AC-8**.
- Edit and delete questions with existing responses and verify the established confirmation behavior, verifies **AC-5** and **AC-8**.
- Verify desktop, mobile, keyboard, reduced motion, ownership, and no branch controls, verifies **AC-1**, **AC-8**, and **AC-9**.

## Build plan

The project uses a Tracer Bullet approach. First wire one ordered mutation through contracts, API, persistence, and public traversal, then replace the owner editor and close the regression coverage.

1. Update shared question and public projection contracts, retaining database compatibility columns but removing branch fields from new request and response shapes, satisfies **AC-5**, **AC-6**, and **AC-8**.
2. Add locked bulk reorder persistence, service, controller, and browser client operation with contiguous order and stale validation, satisfies **AC-3**, **AC-4**, and **AC-8**.
3. Simplify create, update, delete, public mapping, and submission validation to clear and ignore legacy destinations, satisfies **AC-2**, **AC-5**, **AC-6**, and **AC-7**.
4. Replace the graph canvas and editor state with an accessible ordered question list, content editor, drag and keyboard reorder controls, and explicit feedback, satisfies **AC-1**, **AC-3**, and **AC-8**.
5. Update unit, API integration, and desktop and mobile browser coverage, then run lint, type checks, build, and focused suites, satisfies **AC-9**.

## Consequences

**Positive**:

- The editor has one clear mental model and visitors always receive a predictable sequence.
- Reordering is explicit and does not require creators to understand ids or graph rules.
- Existing database rows and unrelated Choose Your Heart journeys remain compatible.

**Negative / tradeoffs**:

- Existing Secret Letter branches are intentionally flattened into the saved display order.
- Legacy columns and indexes remain until a later data cleanup decision.

**Neutral**:

- No new service, secret, or migration is needed for the first implementation.

## Follow-up

- [ ] Consider a separate migration to remove legacy Secret Letter destination columns only after all deployed clients and stored data have been audited.
