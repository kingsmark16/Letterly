# Review, feat/choose-your-heart-template, 2026-08-23

**Reviewed by**: GPT-5 Codex (author on a separate model, name not supplied)
**Scope**: 51 files, branch versus `91b244f042c5b362f21380d9840ee4303ccac020`
**Verdict**: Blocked

## Summary

This branch adds independent journey revisions, graph validation, public rendering, private submission snapshots, owner views, and bounded metrics for Choose Your Heart. The database and submission design has several good privacy and immutability choices, and all configured static checks and API tests pass. The branch is blocked because protected journeys fail at the web projection boundary and the creator editor cannot author the branching structure that defines the feature.

## Blockers

### 🔴 Locked Choose Your Heart pages are parsed as unlocked journeys, `apps/web/src/lib/public-page.ts:78`

**Problem**: `isChooseYourHeartProjection` checks only `template.key`. The API intentionally returns the shared locked projection for a protected journey, and that projection still has `template.key: "choose-your-heart"`. `getPublicPage` therefore sends the locked payload to `pageJourneyPublicPageProjectionSchema`, which requires `publishedGraphVersion`, questions, and outcomes, so parsing throws before the route can render `LockedLetter`.

**Why it matters**: Every password protected Choose Your Heart page fails during server rendering instead of showing its unlock screen. This breaks the required protected link lifecycle and prevents all protected visitors from reaching the journey.

**Suggested fix**: Discriminate the locked state before template specific parsing, or define one shared public union that explicitly contains locked and unlocked journey variants. Add route coverage for metadata, initial rendering, wrong password, and successful unlock on a protected Choose Your Heart page.

### 🔴 The creator editor cannot author a branching graph, `apps/web/src/features/pages/components/choose-your-heart-editor.tsx:171`

**Problem**: The editor maps the questions, choices, and outcomes already returned by the API, but it exposes only prompt, label, title, and result message fields. It has no controls to add or remove questions, choices, or outcomes, and no way to choose `nextQuestionKey` or `outcomeKey`. Since every new page starts with one root question whose two choices go directly to outcomes, the interface cannot create a branch at all.

**Why it matters**: The primary creator story and AC-3 are unavailable. A creator can rename the starter copy, but cannot build the bounded branching journey that this template promises.

**Suggested fix**: Add the complete topology editing path with stable keys, destination selection, bounded add and remove actions, an overview, deterministic validation feedback, and accessible controls. Prove that a creator can build and publish a journey with at least two question levels through the real interface.

## Major

### 🟠 Publish acquires journey state before the page lock, `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts:1034`

**Problem**: The publish transaction reads `Page` without a lock, then locks `PageJourney` at line 1110, and only later updates `Page`. Save takes the page lock first and then updates the journey. A concurrent save can hold `Page` while it waits for the journey row, while publish holds the journey row while it waits for `Page`, which creates the exact lock inversion the spec forbids.

**Why it matters**: A creator who saves while publishing can trigger a PostgreSQL deadlock and receive an internal failure. The transaction rolls back, but the publish path is unreliable under an ordinary two tab or slow request race.

**Suggested fix**: Lock the owned page row first inside publish, then lock the journey row, and perform all readiness and version checks against those locked rows. Add an integration test that overlaps journey save and publish and proves one stable success or conflict outcome without a deadlock.

### 🟠 Reconverging graphs can store the wrong maximum depth, `packages/templates/src/journey.ts:277`

**Problem**: `visitQuestion` returns immediately for every previously reachable question. In a valid acyclic graph where a question is reached first by a short path and later by a longer path, the longer traversal never reaches the terminal outcome and cannot update `maxDepth`. Choice order therefore changes the stored longest depth.

**Why it matters**: Public progress is calculated from this value, so valid journeys can show incorrect progress and violate AC-8. The incorrect value is persisted into every new immutable revision and public projection.

**Suggested fix**: Separate reachability and cycle detection from longest path calculation. Compute longest depth over the acyclic graph with a topological or memoized calculation that accounts for every incoming path. Add cases where two branches reconverge in both choice orders.

### 🟠 Background query refreshes can erase unsaved creator edits, `apps/web/src/features/pages/components/choose-your-heart-editor.tsx:47`

**Problem**: Every new `journeyQuery.data` value unconditionally replaces both `graph` and `savedGraph`. TanStack Query may refetch when the window regains focus, after reconnect, or after invalidation. If the creator has local edits when that happens, the effect silently replaces them with the saved server graph.

**Why it matters**: The editor can lose work without a page refresh or an explicit reload action. This contradicts the recorded rule that incomplete edits remain in current page state and makes long graph editing unsafe.

**Suggested fix**: Initialize from query data only when no local graph exists, and preserve dirty local state during automatic refreshes. For version changes, present an explicit reload or conflict action instead of overwriting the editor. Add a component test that edits a field, refetches, and confirms the edit remains.

### 🟠 Creators cannot enable the private response flow, `apps/web/src/features/pages/components/draft-editor.tsx:295`

**Problem**: The Choose Your Heart branch returns before the existing page form that owns `responsesEnabled`, and `ChooseYourHeartEditor` has no replacement setting or page save mutation. New journeys default to `responsesEnabled: false`, so the public response form and journey submission path cannot be reached through the creator interface.

**Why it matters**: AC-9 and the private response user story are unavailable through the product even though the API and renderer contain submission code. Creators cannot receive the path and outcome snapshots added by this branch.

**Suggested fix**: Expose the response setting in the Choose Your Heart editor and save it through the existing version checked page boundary. Coordinate page and journey content versions so a setting save cannot make the graph save or publish controls stale.

### 🟠 Journey start and completion metrics stop at the browser console, `apps/web/src/lib/page-journey-metrics.ts:6`

**Problem**: The public renderer sends `journey_start` and `journey_completed` only to `console.info`. There is no route, provider, or structured server sink for these visitor events, while the server metrics adapter receives only validation, publish, and submission events.

**Why it matters**: The required start and completed outcome counters in AC-17 are not collected in any usable monitoring system. Production measurements disappear with the visitor session and cannot support launch monitoring.

**Suggested fix**: Send the already bounded event contract through an approved metrics boundary with request limits and no raw identifiers. Keep the outcome category bounded and add proof that the sink receives one start and one completion without answers or message content.

### 🟠 Core security and browser paths have no configured coverage, `apps/api/src/modules/pages/infrastructure/prisma-page-journey-submissions.repository.spec.ts:77`

**Problem**: The repository spec exercises only the pure snapshot builder. There is no test for the actual submission transaction, password version recheck, stale published revision, idempotent replay, browser duplicate, or private projection. `PrismaPageJourneysRepository` has no repository test, and there is no Choose Your Heart component or Playwright coverage under `apps/web`.

**Why it matters**: The test runner is configured, so untested branching and security logic is a Major finding under the review rubric. The locked page failure, editor data loss, missing response setting, maximum depth error, and lock inversion all passed the current suite.

**Suggested fix**: Add graph unit tests, real repository transaction tests, API boundary tests, React behavior tests, and desktop plus mobile Playwright journeys for the critical scenarios in AC-18. Include protected pages, back navigation, retry with one idempotency key, unpublish during a journey, ownership isolation, response deletion, keyboard use, and reduced motion.

## Minor

### 🟡 Choose Your Heart metadata does not match the fixed contract, `apps/web/app/p/[slug]/page.tsx:27`

**Problem**: The title is `Choose Your Heart | Letterly` instead of the specified `Choose Your Heart`, and the metadata omits `other["letterly-template"]: "choose-your-heart"`.

**Why it matters**: Public metadata does not meet AC-16, and template specific inspection cannot rely on the recorded tag.

**Suggested fix**: Use the exact fixed metadata values from the spec and cover the generated metadata for unlocked and locked pages.

### 🟡 Browser limits count code units instead of graphemes, `apps/web/src/features/pages/components/choose-your-heart-editor.tsx:182`

**Problem**: Native `maxLength` is used for prompt, choice, title, and result inputs. It counts UTF-16 code units, while the contract and server validator count graphemes. Emoji and some combined characters can therefore hit the browser limit well before the allowed grapheme limit.

**Why it matters**: Creators cannot enter some content that the product contract explicitly permits, and the browser limit disagrees with the server limit.

**Suggested fix**: Apply the shared grapheme counter in editor feedback and validation, and avoid a code unit cap that is stricter than the contract.

### 🟡 Invalid stored public graphs do not use the safe unavailable state, `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts:463`

**Problem**: A missing published revision throws a generic error, and malformed graph rows fail later schema parsing. The API maps repository failures to service unavailable, while the web loader rethrows non 404 failures instead of rendering the safe unavailable page.

**Why it matters**: AC-13 requires missing or invalid public graphs to use the same safe unavailable outcome as other public page failures. A migration issue or inconsistent row currently produces a generic application error experience.

**Suggested fix**: Validate the complete public graph at the projection boundary and map any missing or invalid graph to the stable public unavailable result without exposing diagnostics.

## Strengths

- Immutable revision rows and stable private journey snapshots keep later edits from rewriting published or submitted history.
- Owner queries include creator predicates, and the submission transaction rechecks publication, response availability, password version, graph version, idempotency, and browser uniqueness while holding page then journey locks.
- Public projections omit creator identity, private settings, password data, submission content, and raw database identifiers.

## Test coverage

The API suite passes all 40 suites and 219 tests. Web lint, web type checking, template and contract type checking, and Prisma validation also pass. Current tests cover starter creation, some service error mapping, snapshot traversal, controller routing, and bounded log shapes, but they do not cover the complete graph validator, immutable save repository, real journey submission transaction, protected public page rendering, creator editor state, visitor branching, response enablement, or any Choose Your Heart Playwright journey.
