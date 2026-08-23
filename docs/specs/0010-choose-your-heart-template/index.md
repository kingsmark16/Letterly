# 0010. Choose Your Heart template

**Date**: 2026-08-22
**Status**: Accepted

## Summary

Choose Your Heart is the second launch template. It lets a creator build a bounded branching question journey with a separate result for each terminal path. A visitor answers one question at a time, sees the selected result, and may send the existing private response. The template uses its own records and editor while reusing page ownership, publishing, protection, response, and design system rules.

## Requirements

**User stories**:

1. As a creator, I want to create and save a Choose Your Heart page so that I can author a guided emotional journey.
2. As a creator, I want to connect choices to questions or outcomes so that each path has a deliberate result.
3. As a creator, I want clear validation before publishing so that visitors never enter a broken journey.
4. As a visitor, I want to answer one question at a time and see a personal result without creating an account.
5. As a visitor, I want to send an optional private response after the result.
6. As a creator, I want the two launch templates to remain independently validated and rendered.

**Acceptance criteria**:

1. **AC-1**: An authenticated creator can create a Choose Your Heart draft through the existing page lifecycle. The trusted `confession.choose-your-heart` version 1 registry entry supplies a valid starter graph with one root question, two choices, and two outcomes. The page remains in the existing draft state until explicitly published.
2. **AC-2**: The owner editor can read and save the complete journey through template specific page endpoints. A save creates an immutable graph revision in one transaction, uses an expected page content version, returns the saved revision and version, rejects a stale version with `409`, and never mutates a revision used by a published page or submission.
3. **AC-3**: The editor supports a journey overview, question prompts, choice labels and destinations, outcome titles and result messages, validation messages, explicit saved or unsaved state, and existing publish controls. It uses the existing design system and keeps template components outside shared UI primitives.
4. **AC-4**: A journey has at most 12 questions, 2 to 4 choices per question, and at most 12 outcomes. Prompts are limited to 200 graphemes, choice labels to 80 graphemes, outcome titles to 120 graphemes, and outcome result messages to 2,000 graphemes. Text is trimmed, empty required text is rejected, and duplicate choice labels after case folding are rejected.
5. **AC-5**: Publishing succeeds only when the journey has one reachable root question, every question has at least 2 and at most 4 valid choices, every choice points to exactly one question or outcome in the same revision, every outcome has a nonempty title and result message, and the graph has no cycles or unreachable content. Invalid saves and publishes fail atomically with field and graph errors, preserving the prior valid draft or published version.
6. **AC-6**: Choose Your Heart reuses the existing page lifecycle, including draft, publish, unpublish, protected link, password protection, archive, restore, and delete behavior. Only a published page passes the public projection boundary.
7. **AC-7**: The existing public page projection includes a safe published Choose Your Heart graph with `publishedGraphVersion`, the ids, prompts, choices, destinations, outcome titles, outcome messages, root question, and maximum depth needed by the visitor. It excludes draft metadata, owner data, validation diagnostics, private settings, and submissions.
8. **AC-8**: A visitor sees one question at a time, can move back, sees an answered question counter, and sees progress equal to answered question count divided by the longest root to outcome question count, capped at 100 percent. The result state shows 100 percent. The visitor never sees the number of outcomes. The visitor state remains in current page state only. A refresh restarts the journey.
9. **AC-9**: A completed path shows its terminal outcome title and result message. When page responses are enabled, the visitor can send the optional private message or choose Continue without a message. Both actions create one private submission containing the path and outcome. When responses are disabled, the visitor sees the result without a submission form or submission write.
10. **AC-10**: The existing public submission endpoint accepts `publishedGraphVersion`, the ordered selected choice path, the terminal outcome id, and the optional private message. The API validates traversal against that published revision, stores a stable private JSON snapshot with prompt, choice, and outcome text, and applies the existing browser identity, rate limit, payload, and idempotency rules. The canonical idempotency hash includes the page, published graph version, ordered path, outcome, and message. Repeating an idempotency key with the same payload returns the original submission; a changed payload conflicts.
11. **AC-11**: Only the page owner can read or save a draft journey. Public reads require the existing published page and protected link or password checks. Anonymous visitors and other creators cannot read creator projections or private submissions.
12. **AC-12**: A stale visitor submission after unpublish, protection failure, or deletion returns the existing safe `PAGE_NOT_FOUND` or locked outcome. A published graph version mismatch returns `JOURNEY_VERSION_STALE` with `409` and no private data. An ambiguous submission timeout keeps the idempotency key with the submission until existing response deletion or page deletion, shows a recoverable error, and returns the original result when the retry reaches the server.
13. **AC-13**: Public loading, unavailable, invalid graph, empty, submission error, retry, and delivered states are explicit and accessible. Missing or invalid public graphs use the same safe unavailable outcome as other public page failures.
14. **AC-14**: The creator editor and visitor renderer support keyboard access, visible focus, labels, announced question changes and errors, touch targets of at least 44 pixels, narrow mobile layouts, and reduced motion. The server renders the initial root question and a clear no JavaScript notice; branching, back navigation, and submission require JavaScript but do not hide the initial content or metadata.
15. **AC-15**: The bounded published graph is returned in the existing public page request without pagination. Public reads keep the existing `Cache-Control: no-store` and `X-Robots-Tag: noindex` behavior. Draft and submission data are never shared cached.
16. **AC-16**: Existing metadata, canonical URL, robots behavior, and social preview behavior are reused. Choose Your Heart uses `title: "Choose Your Heart"`, `description: "A guided heart journey shared through Letterly."`, the existing canonical URL, and `other["letterly-template"]: "choose-your-heart"`. Protected and private pages remain non indexable under the existing rules.
17. **AC-17**: Request ids and structured errors are reused. A journey start metric is emitted after a valid public graph is loaded and the visitor begins the first question. A completed outcome metric is emitted when the result state is rendered. Metrics use only the template key and bounded outcome category, never message content, answers, tokens, or raw ids.
18. **AC-18**: Unit, API integration, and Playwright coverage proves starter graph creation, catalog seed and registry mismatch, immutable revision saves, valid and invalid graph publishing, stale saves, public branching, back navigation, progress, result rendering, skip and send response paths, private response delivery, idempotent retry, stale graph version, protection and unpublish failures, ownership isolation, loading and error states, mobile layout, keyboard access, reduced motion, snapshot retention, and response deletion.

## Decision

**Chosen option**: Build Choose Your Heart as an independent relational template module with immutable graph revisions, an atomic graph editor, and a shared public response boundary.

The page keeps the existing lifecycle and trusted template registry. A one to one journey points to a current draft revision and an optional published revision. Each revision owns immutable questions, choices, and outcomes. The registry supplies a valid starter graph. Saving creates a new revision, publishing promotes that revision, and submissions store a private snapshot that does not point at live graph rows. The web editor uses typed React state with existing contracts and controls. The public route receives one bounded safe projection and renders the journey on the server and client boundaries already used by Secret Letter.

Persistent records use generic `PageJourney` names because the same branching journey capability may serve future categories and templates. The product name remains in the trusted template key, route, editor, and renderer only.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `prisma-client-api` (`prisma/skills`, `.agents/skills/prisma-client-api/`) · `turborepo` (`vercel/turborepo`, `.agents/skills/turborepo/`) · `web-design-guidelines` (`vercel-labs/agent-skills`, `.agents/skills/web-design-guidelines/`)

## Feature design

**Data model sketch**:

`PageJourney`

* Required UUID `id` primary key.
* Required unique `pageId` foreign key to `Page`.
* Required positive `schemaVersion`.
* Required `draftRevisionId` foreign key to the current draft revision.
* Nullable `publishedRevisionId` foreign key to the revision used by the current public page.
* Required `nextRevisionNumber`, incremented inside the page lock.
* Required `createdAt` and `updatedAt`.

`PageJourneyGraphRevision`

* Required UUID `id` primary key and `journeyId` foreign key.
* Required unique `(journeyId, revisionNumber)` and positive `revisionNumber`.
* Required `rootQuestionId` foreign key to a question in the same revision.
* Required `maxDepth`, defined as the longest root to outcome question count and limited to 12.
* Required `createdAt`.
* A revision is immutable after creation. The current draft and published revision pointers are the only mutable journey fields.

`PageJourneyQuestion`

* Required UUID `id` primary key and `revisionId` foreign key.
* Required stable opaque `key`, unique within a revision and retained across editor saves when the logical node is retained. Keys are trimmed strings up to 100 characters.
* Required nonempty `prompt`, limited to 200 trimmed graphemes.
* Required nonnegative `displayOrder`, unique within the revision.
* Required timestamps.

`PageJourneyChoice`

* Required UUID `id` primary key and `questionId` foreign key.
* Required stable opaque `key`, unique within its question and retained across editor saves when the logical choice is retained. Keys are trimmed strings up to 100 characters.
* Required nonempty `label`, limited to 80 trimmed graphemes.
* Required nonnegative `displayOrder`, unique within its question.
* Nullable `nextQuestionId` foreign key and nullable `outcomeId` foreign key.
* Required timestamps.
* Application validation under the page row lock requires exactly one destination, same revision ownership, at least 2 choices per question, and no duplicate labels after trim and case folding. Database foreign keys protect direct ownership; cross destination revision checks are application invariants because ordinary single column foreign keys cannot express the full graph constraint.

`PageJourneyOutcome`

* Required UUID `id` primary key and `revisionId` foreign key.
* Required stable opaque `key`, unique within a revision and retained across editor saves when the logical outcome is retained. Keys are trimmed strings up to 100 characters.
* Required nonempty `title`, limited to 120 trimmed graphemes.
* Required nonempty `resultMessage`, limited to 2,000 trimmed graphemes.
* Required nonnegative `displayOrder`, unique within the revision.
* Required timestamps.

`VisitorSubmission.journeySnapshot`

* Nullable JSONB field on the existing private submission record, present only for Choose Your Heart submissions.
* Contains the immutable `revisionNumber`, ordered question and choice keys, prompt and label snapshots, terminal outcome key, title and result message snapshots, and the canonical path shape used for idempotency hashing.
* Contains no foreign key to live question, choice, outcome, or revision rows. It is validated by a shared Zod schema and written in the same transaction as the submission.
* It is removed by the existing creator response deletion and page deletion behavior. It never enters public projections, shared caches, logs, analytics, or browser storage.

The trusted registry entry `confession.choose-your-heart` version 1 supplies the valid starter graph copy and default response capability. The database seed creates the matching category, template, and template version rows. The starter graph uses stable keys from the registry and new page scoped UUIDs. A missing or mismatched registry entry is a startup configuration error and a public projection fails closed with the existing safe unavailable response.

The database adds unique `pageId` on the journey, unique revision numbers, child ownership and ordering indexes, and the nullable submission snapshot field. On every owner save, publish, unpublish, and public submission transaction, the API locks the `Page` row first and then the journey row. Save creates a new revision, points `draftRevisionId` to it, and increments `Page.contentVersion` exactly once. A page publish promotes `draftRevisionId` to `publishedRevisionId`, increments `Page.contentVersion` exactly once for the public graph change, and records the existing published timestamp. Unpublish changes only the page lifecycle state and unlock records, not the graph version. Superseded revisions not referenced by either pointer may be deleted after the transaction. Page deletion cascades all journey revisions and submission snapshots.

**State transitions**:

The journey has no independent publication state. Its revision pointers and page lifecycle produce these states:

```text
starter graph revision → current draft revision
current draft revision → newer immutable draft revision after a valid save
draft revision → published revision after page publish
published page → unpublished page with the published pointer retained
unpublished page → published page after validation of the current draft revision
any page state → archived or permanently deleted through existing lifecycle rules
```

Invalid local edits remain in the editor only. An invalid save or publish does not replace either revision pointer. A visitor submission uses `publishedRevisionId` and its `revisionNumber`; a mismatch is a safe conflict.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/pages/:pageId/choose-your-heart` | GET | `pageId` path required | Complete draft revision, optional published revision number, page content version, deterministic validation report, `Cache-Control: private, no-store` | Authenticated page owner | `401`, safe `404`, `429` |
| `/api/v1/pages/:pageId/choose-your-heart` | PUT | Complete graph with stable node keys, `expectedContentVersion` required, body at most 256 KiB | New draft revision, revision number, new page content version, validation result | Authenticated page owner | `401`, safe `404`, `409` stale version, `422` invalid graph, `413` body too large, `429` |
| `/api/v1/public/pages/:slug` | GET | `slug` path, existing unlock or protection context | Safe published page projection with `publishedGraphVersion`, bounded graph, fixed metadata, `Cache-Control: no-store`, `X-Robots-Tag: noindex` | Public after existing page checks | Safe `404`, locked response, `429`, unavailable response |
| `/api/v1/public/pages/:slug/submissions` | POST | `Idempotency-Key` header required, `publishedGraphVersion`, ordered question and choice keys, outcome key, optional private message | Existing `{ accepted: true }` delivery state and no private content | Anonymous visitor with existing signed browser context | Safe unavailable, `409` idempotency or graph version conflict, `422` invalid path, `429` |

The creator save creates a complete immutable child set in one transaction after validation and version checks. Existing logical node keys are preserved, new keys must be opaque stable strings, and removed keys disappear from the new revision only. The public submission validates that the ordered choices start at `rootQuestionId`, each next question is the selected choice destination, the final destination is the supplied outcome, and the supplied graph version is still published. Every mutating transaction locks the `Page` row first and the journey row second. Public reads do not take a write lock.

The wire contracts use these exact shapes:

* Owner PUT body: `expectedContentVersion`, `schemaVersion`, `rootQuestionKey`, `questions[]`, `outcomes[]`. Each question has `key`, `prompt`, `displayOrder`, and `choices[]`. Each choice has `key`, `label`, `displayOrder`, and exactly one of `nextQuestionKey` or `outcomeKey`. Each outcome has `key`, `title`, `resultMessage`, and `displayOrder`. New keys are opaque stable strings up to 100 characters. Validation errors identify paths such as `questions[0].prompt`, `questions[0].choices[1].nextQuestionKey`, or `outcomes[0].resultMessage`.
* Public Choose Your Heart projection: `template.key`, `template.version`, `canonicalUrl`, `publishedGraphVersion`, `rootQuestionKey`, `maxDepth`, `questions[]`, and `outcomes[]`. Public questions contain only `key`, `prompt`, `displayOrder`, and safe choice fields. Public outcomes contain only `key`, `title`, `resultMessage`, and `displayOrder`.
* Public submission body: `publishedGraphVersion`, `answers[]` in traversal order where each item has `questionKey` and `choiceKey`, `outcomeKey`, and optional `visitorMessage`. `Idempotency-Key` is required in the header. A successful response remains the existing `{ accepted: true }` contract.

The registry starter graph has stable keys `root`, `happy`, `quiet`, `happy-result`, and `quiet-result`. Its default prompt is `What do you remember?`, its choices are `The happy moments` and `The quiet moments`, and its two outcomes contain nonempty registry supplied titles and result messages. The registry is the only source of this starter copy.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Create draft | Template identity and valid starter graph | Seeded `confession.choose-your-heart` template version and trusted registry `defaultContent` |
| Read owner editor | Prompts, choices, outcomes, ordering, validation errors | Current draft revision child records plus domain graph validator |
| Save draft | New revision number and page content version | `nextRevisionNumber`, `expectedContentVersion`, and atomic transaction result |
| Publish | Readiness, public URL, and published graph version | Existing page lifecycle command, validated draft revision, and `publishedRevisionId` |
| Public page load | Root question, maximum depth, and graph version | Published revision `rootQuestionId`, `maxDepth`, and `revisionNumber` |
| Public question view | Prompt, choice labels, and destinations | Published revision child records, sorted by display order and stable key |
| Progress display | Answered count and progress bar | Current in memory path length and longest path `maxDepth` |
| Result view | Outcome title and result message | Published outcome record reached by the submitted path |
| Submission | Selected path and terminal outcome snapshot | Ordered submitted keys, supplied `publishedGraphVersion`, and current published revision |
| Private response form | Enabled state, prompt, privacy text, and maximum length | Existing page response settings and trusted Choose Your Heart response capability |
| Retry | Existing submission result | Existing persisted idempotency key and canonical payload hash, retained until response or page deletion |
| Metadata | Fixed template title, description, canonical URL, robots, social preview, and template key | Choose Your Heart metadata constants, `page.canonicalUrl`, existing robots rules, and `other["letterly-template"]` |
| Metrics | Journey start, completed outcome, and failure counters | Request or renderer state and template key, with outcome category only |

**Key invariants**:

* Every journey belongs to exactly one page and every revision belongs to exactly one journey.
* Every revision has exactly one root question when valid for publication.
* A valid choice has exactly one destination, never both or neither.
* A destination cannot cross revision boundaries.
* Published graphs have no cycles, no unreachable questions or outcomes, and no missing result message.
* Limits are enforced at contract, application, request body, and publication boundaries. Grapheme limits use the existing template grapheme counter.
* A question has at least 2 and at most 4 choices. Choice labels are unique after trim and case folding within a question.
* Owner reads and writes use repository ownership predicates, not browser supplied creator ids.
* Public projections include only published safe fields and use the existing no store and no index behavior.
* Submission paths are validated server side against the exact published revision named by `publishedGraphVersion`.
* A repeated idempotency key and identical payload returns the original submission. A changed payload with that key is a conflict.
* Idempotency records are retained with the submission until the creator deletes the response or the page is deleted.
* Private path snapshots and visitor messages never enter public projections, shared caches, logs, analytics, or local storage.
* Save, publish, and submission transactions lock `Page` before `PageJourney` and never acquire those locks in the opposite order.

**Security model**:

Better Auth sessions authorize creator reads and writes. Repository queries scope every owner operation to the authenticated page owner and use the existing safe `404` for foreign pages. Public reads use the existing page status, protected link, password unlock, signed visitor identity, and safe not found rules. Submissions are anonymous, rate limited, payload limited, idempotent, and private to the page owner. Existing idempotency rows remain until response or page deletion. No regulated compliance scope is introduced. The feature continues the product rule for users of any age and minimizes visitor data.

**Configuration required**:

No new environment variables, secrets, credentials, providers, or services. Existing database, auth, Redis rate limit, idempotency, API origin, and public media configuration are reused.

**Critical test scenarios**:

* Happy path: owner creates a draft, saves a valid branching graph, publishes, visitor answers the branch, sees the result, and sends a private response, verifying **AC-1**, **AC-2**, **AC-5**, **AC-7**, **AC-8**, **AC-9**, and **AC-10**.
* Failure case: stale owner save, invalid graph, unpublish during a visitor journey, and submission timeout with explicit retry preserve data and return safe recoverable errors, verifying **AC-2**, **AC-5**, and **AC-12**.
* Auth and permission: another creator cannot read or save the journey and a public visitor cannot access a draft or private submission, verifying **AC-6** and **AC-11**.
* Accessibility and responsive behavior: keyboard navigation, focus, announcements, reduced motion, narrow mobile layout, loading, unavailable, and delivered states remain usable, verifying **AC-13** and **AC-14**.

## Build plan

The scope uses Tracer Bullet delivery. Each slice proves a real path through the database, API, web editor or renderer, and user experience before adding breadth.

1. Add the Prisma models and one migration for the journey, immutable revisions, question, choice, outcome, and private submission snapshot field. Add repository interfaces and transaction helpers for journey ownership, revision retention, ordering, and deletion. Satisfies **AC-1**, **AC-4**, **AC-5**, **AC-6**, and **AC-10**.
2. Add the Choose Your Heart template registry definition, valid starter graph defaults, catalog seed, and startup registry mismatch failure. Satisfies **AC-1**, **AC-6**, and **AC-18**.
3. Add shared Zod contracts and the domain graph validator. Cover limits, grapheme counting, stable node keys, root selection, same revision destinations, reachability, cycle detection, revision and page version checks, and deterministic field paths. Satisfies **AC-2**, **AC-4**, and **AC-5**.
4. Implement the owner GET and immutable revision PUT endpoints, page first lock order, ownership predicates, content version conflicts, body limits, private no store headers, and safe error mapping. Satisfies **AC-2**, **AC-3**, **AC-5**, and **AC-11**.
5. Connect draft creation, page readiness, publish promotion, unpublish, archive, restore, delete, and registry availability to the revision pointers. Satisfies **AC-1**, **AC-5**, and **AC-6**.
6. Implement the smallest creator editor path with question, choice, and outcome authoring, explicit save, validation report, stale save recovery, and publish controls using existing UI primitives. Satisfies **AC-3**, **AC-4**, and **AC-14**.
7. Extend the public page projection and server rendered route with the safe bounded graph, published graph version, existing protection checks, fixed template metadata, no store behavior, and unavailable state. Satisfies **AC-6**, **AC-7**, **AC-13**, **AC-15**, and **AC-16**.
8. Implement the visitor renderer with one question at a time, back navigation, in memory path state, answered count, maximum depth progress, result rendering, mobile layout, focus announcements, and reduced motion behavior. Satisfies **AC-8**, **AC-9**, **AC-13**, and **AC-14**.
9. Extend public submission validation and response mapping for the ordered path, graph version, terminal outcome, skip or send response actions, and private snapshot. Reuse browser identity, private message settings, idempotency, rate limits, page first lock order, and creator response projections. Satisfies **AC-9**, **AC-10**, **AC-11**, and **AC-12**.
10. Add structured metrics and redacted logs for graph validation, publish, journey start, completed outcome, and submission events. Satisfies **AC-17**.
11. Add unit tests, API integration tests, and Playwright desktop and mobile journeys for starter creation, catalog and registry mismatch, immutable revisions, invalid branches, version conflicts, stale public submissions, protection changes, skip and send response, retries, privacy, accessibility, and reduced motion. Satisfies **AC-18** and verifies all preceding criteria.

## Consequences

**Positive**:

* The second template is independently validated and rendered, so Secret Letter changes do not silently change its graph rules.
* Atomic graph writes prevent partially broken journeys from reaching publication.
* The existing page and response boundaries avoid a new auth, storage, or submission system.
* Bounded graph size makes one public projection request fast and easy to reason about.

**Negative and tradeoffs**:

* The relational model adds revision and child records plus a migration rather than reusing the generic question tables.
* The editor must keep incomplete edits locally until a complete valid graph can be saved. A refresh loses those unsaved edits by project rule.
* The public submission path must carry and validate an ordered path and graph version, which is more work than accepting only a final outcome.
* A version conflict requires an explicit reload or merge experience for the creator.

**Neutral**:

* No new provider, environment variable, background worker, or deployment component is introduced.
* Future templates can use the trusted registry and their own child records without changing the Choose Your Heart graph.

## Follow-up

* [ ] After the tracer path is verified, decide whether the creator editor needs a graph visualization. It is not part of this first slice.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
