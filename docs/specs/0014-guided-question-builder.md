# 0014. Guided question builder and branching

**Date**: 2026-08-25
**Status**: In Progress

## Summary

The question editor will explain the journey as a simple sequence: question, answer, next step. New questions follow the list order automatically, while an answer can continue in order, go to a named question, or finish the journey. The editor will use guided cards, plain destination labels, a path summary, accessible reordering, and explicit save feedback.

## Context

The current Secret Letter question editor exposes database shaped concepts such as question keys, display order, and destination ids. A creator can build a valid graph, but the interface does not make the visitor path easy to predict. An empty destination also has an overloaded meaning: it currently lets the visitor continue through the next unconnected question, but it does not offer an explicit way to stop the journey.

Question records, branching targets, response snapshots, and owner authorization are already in production code. The change must improve the authoring language without breaking saved journeys, published projections, private responses, stale edit handling, or the existing design system. The product is a small private beta, so a focused relational change and one complete end to end path are preferable to a new graph editor or a new service.

> ⚠️ Premise note: This is more than a visual refresh because an explicit finish state changes the meaning of a visitor transition. The finish state must be represented in the API, public projection, and response validation, or the editor would promise behavior the visitor cannot receive.

## Requirements

**User stories**:

* As a creator, I want to build questions in plain language so I understand what visitors will see.
* As a creator, I want each answer to show its next step so I can create a branch without knowing ids.
* As a creator, I want simple journeys to follow question order automatically so I do not configure every connection.
* As a visitor, I want a clear finish state so I know when the question journey is complete.

**Acceptance criteria**:

* **AC-1**: The owner question editor presents a guided card flow. Each question card exposes its prompt, answer type, answer labels, and plain destination controls. Internal question keys and display order fields are not shown.
* **AC-2**: New questions receive an automatically generated key and append after the current list. The creator does not enter a key or numeric order.
* **AC-3**: A destination control presents three meanings: Continue in order, Go to a named question, and Finish the journey. Named questions show their list number, prompt, and type.
* **AC-4**: A saved answer with Continue in order follows the next eligible root in the published `rootQuestionIds` list, ordered by display order. A saved answer with a target visits that target. A saved answer with Finish stops the question journey and opens the existing private response area.
* **AC-5**: Existing rows with a null destination and no finish flag continue in order. Existing published links, response snapshots, and submissions remain readable.
* **AC-6**: The editor includes a short branching explanation and a live path summary using creator visible question prompts. An empty journey shows examples without inserting sample records.
* **AC-7**: Drag and drop and accessible up and down controls reorder questions. Reordering keeps explicit targets intact and announces that Continue in order paths now use the new order.
* **AC-8**: Validation errors show both a summary and an inline message beside the affected question or answer. A question that is referenced by another answer cannot be deleted until those references are redirected, and the API returns the stable `QUESTION_REFERENCED` error code.
* **AC-9**: Question saves remain explicit. A stale version or network failure preserves the current card edits, shows a safe error, and offers retry. Successful saves announce the new content version.
* **AC-10**: Changes to prompts, types, answer labels, destinations, or finish state retain the existing response impact confirmation and deletion behavior. Pure reordering does not request response deletion.
* **AC-11**: Only the page owner can read or mutate the editor. Public visitors receive only the published projection, and private response data remains behind the existing owner boundary.
* **AC-12**: The redesigned editor and finish state support keyboard access, visible focus, labels, announced errors and transitions, touch targets of at least 44 pixels, narrow layouts, and reduced motion.
* **AC-13**: Unit, API integration, and Playwright coverage proves key generation, automatic order, explicit finish, named branching, backward compatibility, invalid references, deletion protection, reorder behavior, stale saves, response impact confirmation, desktop behavior, mobile behavior, keyboard use, and the visitor finish state.

## Options considered

### Option 1: Guided cards with explicit transitions

Keep the existing question records and endpoints, then present each question as a readable card. Add a finish flag and map destinations to plain language choices.

**Pros**:

* Fits the existing owner editor and API.
* Works on mobile and with keyboard navigation.
* Makes the common linear path require no branch setup.

**Cons**:

* A complex graph is still represented as a list rather than a full canvas.
* Adding an explicit finish state needs a small schema and traversal change.

### Option 2: Visual graph canvas

Replace the list with nodes and connecting lines.

**Pros**:

* Shows graph relationships at a glance.

**Cons**:

* Touch, keyboard, focus, responsive layout, and error handling become substantially harder.
* It adds a second interaction model for a bounded question list.

### Option 3: Step by step wizard

Ask for one question and one destination at a time, with no overview.

**Pros**:

* Low initial cognitive load.

**Cons**:

* Hides the full order and makes revising a branch slow.
* Makes reordering and finding a referenced question difficult.

## Decision

**Chosen option**: Option 1: Guided cards with explicit transitions.

The editor will use the existing page question API and design system, add an `endsJourney` flag to questions and choices, and derive Continue in order from the existing published root order. The visitor renderer and submission validation will stop at an explicit finish transition.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

The existing list editor already has ownership checks, stale content versions, response impact protection, reordering, and tests. A guided card redesign improves the language without discarding those safety boundaries. A canvas would spend most of the feature budget on interaction mechanics, while a wizard would make the whole journey harder to inspect.

The explicit finish flag resolves the current ambiguity between “no explicit target” and “stop now”. A boolean keeps the existing nullable question reference, is easy to default safely for old rows, and lets the API reject the invalid combination of a finish state and a target. The shared root resolver prevents the web preview and public visitor from inventing different meanings for Continue in order.

## Feature design

**Data model sketch**:

| Entity | Fields added or used | Relationship and constraints |
|---|---|---|
| `PageQuestion` | `endsJourney Boolean @default(false)`, existing `nextQuestionId String?`, `displayOrder Int` | A page has many questions. A question may target one question. `endsJourney` and a target cannot both be active. |
| `PageChoice` | `endsJourney Boolean @default(false)`, existing `nextQuestionId String?`, `displayOrder Int` | A question has two to ten choices. A choice may target one question. `endsJourney` and a target cannot both be active. |
| `VisitorAnswer` | Existing question and choice references plus snapshots | Existing response retention and deletion rules remain unchanged. |

The three destination states are derived as follows:

* `endsJourney = false`, target is null: Continue in order.
* `endsJourney = false`, target is set: Go to that question.
* `endsJourney = true`, target is null: Finish the journey.

Existing null destinations are treated as Continue in order by the default value. No new entity, external service, secret, or stored automatic pointer is introduced.

The create and update contract follows these rules:

* Create omits `endsJourney` only to use the false default.
* An update that omits `endsJourney` preserves the existing value.
* Setting `endsJourney` to true requires the matching target to be null.
* Setting `endsJourney` to false with a null target means Continue in order.
* Setting `endsJourney` to false with a target means Go to that question.

Continue in order is resolved by one shared rule. The public projection builds `rootQuestionIds` from questions without an inbound explicit edge, sorts them by display order and id, and the visitor moves to the next root after the current root index. The editor uses the same ordered list for its path preview. A branch target is always followed directly and does not change the explicit target when questions are reordered.

**State transitions**:

* Owner editing: loading, editing, saving, saved, or recoverable error.
* Visitor journey: active question, explicit finish, private response area, delivered response, or recoverable submission error.
* A finish transition stores the selected answer in current state, ends question traversal immediately, shows “You reached the end”, and then opens the existing private response area. Backward navigation and response submission keep their existing page state rules.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/pages/:pageId/questions` | GET | owner page id | Questions with `endsJourney`, prompt, order, choices, and safe targets | Owner session | Existing not found and unauthorized errors |
| `/api/v1/pages/:pageId/questions` | POST | prompt, type, choices, generated key, automatic order, destination flags, expected content version | Saved question and content version | Owner session | Invalid branch, stale version, key conflict |
| `/api/v1/pages/:pageId/questions/:questionId` | PATCH | Changed question fields, choice destinations, `endsJourney`, expected content version, response confirmation | Saved question and content version | Owner session | Invalid branch, stale version, response impact |
| `/api/v1/pages/:pageId/questions/:questionId` | DELETE | expected content version, response confirmation | Deletion result and content version | Owner session | `QUESTION_REFERENCED`, stale version, response impact |
| `/api/v1/public/pages/:slug` | GET | slug and existing protection proof when needed | Published question projection including finish flags | Anonymous or unlocked visitor | Existing unavailable and locked errors |
| `/api/v1/public/pages/:slug/responses` | POST | reachable answers, private message, idempotency key | Existing accepted submission result | Anonymous visitor | Existing validation, rate limit, idempotency, and unavailable errors |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Create question | Generated key | Prompt slug plus browser generated UUID suffix |
| Create question | Initial order | Current question count and API ordered list |
| Destination label | Question number and prompt | Current owner question list, sorted by `displayOrder` |
| Continue in order | Next question | Published question order and existing root traversal |
| Finish state | Stop decision | `endsJourney` on the selected question or choice in the published projection |
| Path summary | Human readable next step | Current form state, question prompts, and destination selections |
| Response snapshot | Prompt and answer text | Existing published projection and submitted answer values |
| Save version | Content version | Page `contentVersion` returned by the API |
| Error message | Safe recovery text and request context | Existing API error envelope and client mutation state |

**Editor preview contract**:

Each answer row shows its current destination in plain language. The compact journey preview shows question number, prompt, answer label, and resolved destination. It is derived from current unsaved form state, uses the shared root ordering rule, never exposes keys or ids, and marks an invalid or unresolved path beside the affected row.

**Key invariants**:

* A finish transition has no target.
* Create defaults `endsJourney` to false. An update omitting the field preserves the current value.
* A target must reference a question on the same page and cannot create an invalid cycle or a second inbound edge under existing graph rules.
* A choice question branches through its choices. A written question uses its single question destination.
* Continue in order never stores a synthetic question id.
* Question keys remain unique per page and are not editable by the creator.
* Display order is a contiguous zero based list maintained by create and reorder operations.
* Content changes keep existing response impact confirmation. Display order changes do not delete responses.
* Only published projections are visible to anonymous visitors.

**Security model**:

The existing Better Auth session and owner page check authorize all question reads and mutations. Public reads use the existing published page, protection, rate limit, and no store boundaries. The browser never becomes an authorization boundary. No new personal data or secret is introduced.

**Configuration required**:

None.

**Critical test scenarios**:

* Create a question with a generated key and Continue in order, verifies **AC-1**, **AC-2**, and **AC-4**.
* Set one answer to a named question and another to Finish, then submit the visitor path, verifies **AC-3**, **AC-4**, and **AC-5**.
* Load old rows with null finish flags, verifies **AC-5**.
* Try to save a finish state with a target, a cycle, or a missing target, verifies **AC-8** and the invariants.
* Try to delete a referenced question, verifies **AC-8**.
* Reorder questions and confirm a Continue in order notice while explicit targets remain stable, verifies **AC-7** and **AC-10**.
* Trigger stale save, network failure, and response impact confirmation, verifies **AC-9** and **AC-10**.
* Run owner isolation, anonymous public projection, mobile, keyboard, and reduced motion checks, verifies **AC-11** and **AC-12**.

## Build plan

The project uses a Tracer Bullet approach. Build one complete finish path through the database, API, public projection, visitor form, and owner editor before polishing the rest of the cards.

1. Add `endsJourney` with a safe false default to `PageQuestion` and `PageChoice`, regenerate Prisma, add the shared contract fields, and map owner and public projections, satisfies **AC-4**, **AC-5**, and **AC-11**.
2. [x] Update question create, update, delete, graph validation, and public response validation so Continue in order, named targets, and Finish are distinct and invalid combinations are rejected, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-8**, and **AC-10**.
3. [x] Update the visitor response form to stop immediately at Finish and show the existing private response area with a clear completion state, satisfies **AC-4**, **AC-5**, and **AC-13**.
4. [x] Replace the question editor copy and controls with guided cards, plain destination selectors, question labels, path summary, empty examples, reorder notice, delete reference protection, and recoverable save feedback, satisfies **AC-1**, **AC-2**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, and **AC-12**.
5. Add API, unit, and desktop and mobile Playwright coverage for the full path, backward compatibility, invalid branches, response protection, ownership, keyboard use, and reduced motion, satisfies **AC-10**, **AC-11**, **AC-12**, and **AC-13**.

## Consequences

**Positive**:

* Creators can build a simple sequence without understanding graph ids.
* Branch targets remain explicit and readable.
* Finish behavior is predictable for visitors and response validation.
* Existing ownership, versioning, response privacy, and reorder safety are reused.

**Negative / tradeoffs**:

* The schema and public response validation need a backward compatible migration.
* A list based editor is less visual than a canvas for a very large graph.
* Changing automatic order can change paths that intentionally rely on Continue in order.

**Neutral**:

* Existing explicit targets remain stable when questions are reordered.
* No new environment variables or services are required.

## Follow-up

* [ ] Consider a separate visual graph view only after real creator feedback shows that the bounded guided cards are insufficient.

## Migration plan

**Strategy**: single backward compatible migration

**Phases**:

1. Add both boolean columns with a false default. Existing application versions continue to read and write valid rows.
2. Deploy API and web code that reads and writes the flags, then run the focused database and browser journeys.

**Rollback**: Revert the API and web code while retaining the false default columns. If the migration itself must be reverted, remove the columns only after the new code is no longer deployed.

**Risks**: A client or fixture that assumes null is the only destination may omit the new flags. Old clients remain safe because the new columns default to false and old writes continue to mean Continue in order. Contract tests must cover false defaults and explicit finish before publishing the new editor.
