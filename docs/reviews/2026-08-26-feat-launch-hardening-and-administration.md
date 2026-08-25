# Review, feat/launch-hardening-and-administration, 2026-08-26

**Reviewed by**: GPT-5.6 Codex (author model not supplied)
**Scope**: 178 files, branch vs main plus working tree
**Verdict**: Blocked

## Summary

The branch spans administration and launch hardening, authenticated page and catalog work, Choose Your Heart, the landing and Secret Letter redesigns, and the new guided question builder with explicit finish transitions. The API ownership and finish-state plumbing are generally thoughtful, but the current working tree does not pass the Web type gate, and several production-significant editor, visitor, template-content, reduced-motion, and test-coverage problems remain.

## Blockers

### 🔴 The Web type gate fails on the new browser test, `apps/web/e2e/public-secret-letter.spec.ts:517`

**Problem**: `pnpm --filter web check-types` fails with TS2322 because the mapped `currentQuestion.choices` value spreads a `Record<string, unknown>` payload over the existing choice, leaving required fields such as `key`, `label`, `displayOrder`, and `endsJourney` typed as optional. The changed Playwright file is included by the Web TypeScript configuration, so this is a branch gate failure, not an editor-only warning.
**Why it matters**: The configured commit and CI gate cannot pass, so the branch is not mergeable in its present state and the new guided-builder coverage cannot be trusted to compile in CI.
**Suggested fix**: Parse or narrow the intercepted request to the real update-choice contract and construct a complete typed choice object with all required fields. Re-run the full Web type check after the working-tree test changes are included.

## Major

### 🟠 Empty letters publish fabricated memories and images, `apps/web/src/templates/secret-letter/renderer.tsx:544`

**Problem**: When `model.images` is empty, the public renderer substitutes four stock photos and long first-person captions such as favorite coffee mornings and holding hands. It also always renders the "Cherished Moments" section, plus an invented signature using the recipient name and fixed `#Love` / `#Forever` themes at lines 492-498. The blueprint says optional images disappear completely when not configured, and the renderer contract contains no creator name or theme values from which these claims can be sourced.
**Why it matters**: A creator who publishes only their own message gets a materially different public confession containing memories and assertions they never authored. The signature is especially misleading because `Forever Yours, {recipientName}` presents the recipient as the signer.
**Suggested fix**: Render only saved model content on public and owner-preview paths. Omit the gallery when no images are configured, and remove the unsourced signature and tags; if visual sample content is desired, confine it to an explicitly labeled catalog preview model rather than the real page renderer.

### 🟠 Question reordering can commit only half of a move, `apps/web/src/features/pages/components/question-editor.tsx:270`

**Problem**: One drag or arrow move is persisted as a loop of independent PATCH requests, with each request committing a display-order change and incrementing the page version. If any later request fails, the earlier writes remain committed, duplicate or non-contiguous display orders can remain in the database, and local `version` stays at the pre-move value because it is updated only after the entire loop succeeds. The repository accepts arbitrary individual `displayOrder` values and does not normalize the list transactionally.
**Why it matters**: A routine network interruption can silently change the published Continue-in-order path, leave the editor unable to retry because its version is stale, and violate the recorded contiguous zero-based order invariant. The success-only mocked browser test cannot detect this partial-commit state.
**Suggested fix**: Persist a complete ordered id list through one owner-authorized, expected-version-checked repository transaction that validates membership and writes a contiguous order atomically. On failure, retain the proposed local order with a retry/reload choice and reconcile against the returned current version.

### 🟠 Removing and re-adding an answer can create an unfixable hidden key collision, `apps/web/src/features/pages/components/question-editor.tsx:769`

**Problem**: New answer keys are derived from the current array length. For choices `choice-1`, `choice-2`, `choice-3`, removing the middle row leaves two entries, and Add another answer creates another `choice-3`. The repository correctly rejects duplicate keys, but keys are intentionally hidden and not editable, so the creator has no way to repair this draft through the interface.
**Why it matters**: A normal supported editing sequence makes the question permanently unsaveable and surfaces only a generic invalid-branch error. This breaks answer editing in the primary guided-builder flow.
**Suggested fix**: Give every newly added choice a collision-resistant stable key, or allocate the next unused suffix from the complete current key set. Add a browser or component case that removes a non-final answer, adds a replacement, and successfully saves it.

### 🟠 Stale question saves offer a retry that can never succeed, `apps/web/src/features/pages/components/question-editor.tsx:254`

**Problem**: A `STALE_VERSION` response preserves the form, but the error handler leaves `version` unchanged and the Retry save button simply calls the same mutation again. It does not refetch the owner page/current version or offer a reload/rebase decision, so every retry sends the same stale `expectedContentVersion` indefinitely.
**Why it matters**: AC-9 explicitly requires stale saves to preserve edits and offer recovery. In multi-tab use, or after another page mutation advances the version, the advertised recovery action is a dead end and the creator cannot save without manually leaving the editor.
**Suggested fix**: Treat stale version separately from transient network errors. Fetch the current owner version, preserve the local card draft, and offer an explicit reload or rebase-and-retry action; keep blind Retry only for failures that can succeed with the same request.

### 🟠 One-at-a-time visitor questions have no backward path or focus handoff, `apps/web/src/features/pages/components/visitor-response-form.tsx:182`

**Problem**: Selecting a radio answer immediately replaces the current question with the next step, and the rendered question stage has no Back control or history stack. The newly mounted question is only in an `aria-live` container; focus is not moved to its legend or first input after the selected radio is removed.
**Why it matters**: Visitors cannot correct an accidental branch choice, despite the spec preserving backward navigation, and keyboard or assistive-technology users lose a predictable focus location on every step. This is a regression from the previous all-questions form, where earlier answers remained editable.
**Suggested fix**: Track the visited path, expose an accessible Back action that restores the previous question and answer state, prune only the abandoned branch when an answer changes, and deliberately focus the new question heading or first control after each transition.

### 🟠 The visible Reduce motion control does not bypass the opening, `apps/web/src/templates/secret-letter/renderer.tsx:469`

**Problem**: Toggling Reduce motion only changes `reduceMotion`. It does not set `opened`, hide the overlay, or focus the letter, so the fixed envelope remains over the content until the visitor performs another Open or Skip action. The global pointer listener created at lines 101-121 also continues allocating animated sparkle elements when the visible control is enabled because the effect does not observe `reduceMotion`.
**Why it matters**: The control does not deliver the immediate readable state promised by AC-5 and continues decorative motion/work for someone who explicitly opted out. Turning it on during an opening also tears down the timeline while `opening` can remain true, leaving the primary Open control disabled.
**Suggested fix**: Make enabling reduced motion immediately complete the opening, hide the overlay, stop and clear every decorative animation/timer, and focus the letter heading. Gate pointer effects on the effective OS-or-user preference and handle preference changes during an active timeline as a completed opening.

### 🟠 Critical guided-builder behavior is not covered by the configured suites, `apps/web/e2e/public-secret-letter.spec.ts:461`

**Problem**: The added Playwright cases mock only a successful owner finish save and successful multi-request reorder. There is no deterministic browser journey for the public Secret Letter finish transition, named branching and Back, focus/keyboard behavior, stale-save recovery, a failed mid-reorder request, non-final answer removal and replacement, inline validation, or a network retry. The API repository tests are Prisma mocks; no database integration test proves finish persistence, atomic order, ownership isolation, or response cleanup for the new schema.
**Why it matters**: These are branching, error-handling, accessibility, versioning, and data-integrity paths, so the configured-test rubric makes the gap a Major. AC-13 explicitly requires unit, API integration, and Playwright proof, and the untested cases include several failures present in the current implementation.
**Suggested fix**: Add deterministic browser coverage for the complete owner-to-public finish and named-branch journey on desktop and mobile, including Back/focus, stale/network recovery, removal/re-add, and reorder interruption. Add real PostgreSQL integration coverage for finish flags, order normalization, ownership, response-impact deletion, and backward-compatible false defaults.

## Minor

### 🟡 The journey preview is neither live nor answer-specific, `apps/web/src/features/pages/components/question-editor.tsx:592`

**Problem**: The preview is derived only from the last fetched `questions` array and reduces every choice question to "answers choose the next step." It does not include the current unsaved prompt, answer labels, or resolved destinations required by the editor-preview contract.
**Why it matters**: Creators cannot use the summary to verify the path they are about to save, which weakens the core plain-language goal of AC-6.
**Suggested fix**: Build the summary from the saved list plus the active form draft and show each answer label with Continue, named question, Finish, or an inline unresolved-target marker.

### 🟡 Several guided-editor controls miss the recorded 44-pixel target size, `apps/web/src/features/pages/components/question-editor.tsx:525`

**Problem**: Reorder, add/remove-answer, retry, edit, and delete controls repeatedly use `min-h-10`, which is 40 pixels in the current utility scale. AC-12 and the project WCAG baseline require at least 44-pixel touch targets.
**Why it matters**: The most frequent card controls are unnecessarily difficult to operate on narrow touch layouts, one of the feature's required surfaces.
**Suggested fix**: Use the 44-pixel token/utility consistently for all guided-builder controls and verify computed target sizes in the mobile browser journey.

### 🟡 The cinematic sequence exceeds its bound and uses forbidden gradients, `apps/web/src/templates/secret-letter/renderer.tsx:236`

**Problem**: The last main-content tween starts at 2.6 seconds and lasts 2 seconds, so completion and focus occur at about 4.6 seconds, beyond AC-3's four-second bound. The same implementation adds linear gradients in `renderer.module.css:764` and `renderer.module.css:771`, although AC-2 explicitly excludes gradients for this redesign.
**Why it matters**: The shipped behavior does not match two measurable decisions in the governing cinematic spec, and the delayed focus makes the overrun user-visible.
**Suggested fix**: Re-time the sequence so its completion callback and focus occur within four seconds, and replace the gradient accents/shimmer with approved solid or opacity-based styling.

## Strengths

- Owner question reads and mutations consistently carry the authenticated creator id into repository predicates, and graph writes serialize on the page row before checking ownership and state.
- The finish flag is propagated through Prisma, owner/public contracts, projection mapping, visitor traversal, and server-side answer validation, with explicit rejection of a finish-plus-target combination.
- The graph validator rejects missing targets, cycles, and second inbound edges, while response-impact deletion is kept inside the question transaction.
- All 45 API unit suites passed (258 tests), Web lint passed, API and contracts type checks passed, and Prisma validation passed; the failing Web type check is isolated and reproducible.

## Test coverage

The branch has substantial API unit and mocked browser coverage for existing administration, page lifecycle, Choose Your Heart, catalog, landing, and Secret Letter behavior. Focused API tests exercise finish validation and response traversal, but the guided builder's failure paths and complete owner-to-public journey are not proved, no new database integration test covers the schema/traversal slice, and the current Playwright edit does not compile under the configured Web type gate.
