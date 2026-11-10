# Review, feat/birthday-wish-template, 2026-11-10

**Reviewed by**: Senior Staff Reviewer (Antigravity) (author on feat/birthday-wish-template)
**Scope**: 77 files, feat/birthday-wish-template vs 8d4b15af
**Verdict**: Approved (all findings resolved in commit `6d6f0fdc`)

## Summary
The Birthday Wish template implementation activates the Birthday category with an extraordinary level of visual craft and interaction design, featuring an interactive Midnight Patisserie multi-tier cake canvas, animated smoke wisps, realistic candle blowout mechanics, and celebration particle fountains. The change strictly adheres to project conventions (including the zero-leading-zeros rule for 1–9) and meets WCAG AA accessibility with 44px+ hit targets, keyboard operability, and reduced-motion fallbacks. However, changes are requested due to two major findings: `BirthdayLetterFolio` omits the paginated reading experience required by AC-7 for long letters, and the application public projection adapter deletes `response` on falsy inputs rather than guaranteeing `response: { enabled: false }` per AC-3.

## Major

### 🟠 Missing paginated letter reading for long messages in `BirthdayLetterFolio`, `apps/web/src/templates/birthday-wish/renderer.tsx:244`
**Problem**: Acceptance criterion AC-7 explicitly requires: *"The unfolded card reuses paginated letter reading, the accessible photo memory gallery when images are attached, and the manual vinyl audio player when audio or a YouTube link is attached."* During the standalone patisserie redesign in commit `a72a8e32`, `SecretLetterMessageReader` was replaced with `BirthdayLetterFolio`. While `.folioPagination` and `.folioPageBtn` CSS classes were added to `renderer.module.css`, `BirthdayLetterFolio` does not implement pagination state or controls, rendering the entire `mainMessage` in a single continuous container (`data-message-full`).
**Why it matters**: Birthday messages can be up to 20,000 graphemes long. In the absence of pagination, long letters display as an unbroken wall of text on mobile and desktop viewports, breaking the keepsake stationery experience and diverging from the specification.
**Suggested fix**: Implement page slicing and pagination controls in `BirthdayLetterFolio` using the existing `.folioPagination` styles and the shared `paginateMessage` utilities, or adapt `SecretLetterMessageReader` with the patisserie theme.

### 🟠 Public projection adapter deletes `response` on falsy input instead of always resolving `{ enabled: false }`, `apps/api/src/modules/pages/application/projections/birthday-wish-public-projection.ts:29`
**Problem**: In `birthdayWishPublicProjection.project()`, lines 29–35 check `if (!page.response)` and delete `legacyProjection.response`. AC-3 specifies: *"Public projections always resolve response to { enabled: false } and return template.key: 'birthday-wish' and template.registryKey: 'birthday.birthday-wish'."*
**Why it matters**: Unlike `confession.secret-letter`, which had a pre-response legacy era, `birthday.birthday-wish` v1 has no historical records. If `page.response` is undefined (such as when settings are omitted or in fixture contexts), the public projection strips `response` entirely rather than resolving `{ enabled: false }`, violating AC-3 and creating inconsistent public API contract shapes between templates.
**Suggested fix**: Remove the `if (!page.response)` deletion branch in `birthdayWishPublicProjection.ts` and return `projection` directly, allowing `publicSecretLetterProjectionSchema` to supply `response: { enabled: false }` by default.

## Minor

### 🟡 Public Presentation passes `showAudioPlayerWhenEmpty` unconditionally, `apps/web/src/features/pages/public/birthday-wish-presentation.tsx:23`
**Problem**: `BirthdayWishPresentation` passes `showAudioPlayerWhenEmpty` unconditionally to `BirthdayWishRenderer`. AC-7 specifies displaying the audio player *"when audio or a YouTube link is attached"*.
**Why it matters**: Visitors opening published Birthday Wish pages with no attached music or YouTube track still see an empty, disabled vinyl player widget in the hero section.
**Suggested fix**: Omit `showAudioPlayerWhenEmpty` from `BirthdayWishPresentation` (or pass `false`), letting `BirthdayWishRenderer` show the player only when `audioUrl` or `audioLink` is present. Retain `showAudioPlayerWhenEmpty` only in editor preview frames where showing the audio slot is intended.

### 🟡 Side effect inside pure React state updater in `toggleCandle`, `apps/web/src/templates/birthday-wish/use-birthday-wish-opening.ts:307`
**Problem**: In `toggleCandle`, `window.setTimeout` is scheduled directly inside the `setExtinguishedCandles((prev) => { ... })` updater callback.
**Why it matters**: React state updaters must remain pure functions without external side effects. In React 19 concurrent rendering and StrictMode, updater functions can be called multiple times, risking duplicate timer scheduling.
**Suggested fix**: Move the blowout timer trigger into a `useEffect` that monitors `extinguishedCandles.every(Boolean)` or trigger the timer outside the `setState` updater callback.

### 🟡 Hardcoded negative template check instead of capability check in draft editor, `apps/web/src/features/pages/editor/secret-letter-draft-editor.tsx:224`
**Problem**: `supportsQuestions` is hardcoded as `pageQuery.data.template.registryKey !== "birthday.birthday-wish"`.
**Why it matters**: Couples the editor to a specific template registry key rather than checking whether the template definition includes the `questions` capability, undermining template extensibility.
**Suggested fix**: Check `capabilities.includes("questions")` via `getWebTemplate` or template summary metadata.

### 🟡 Unscoped SVG gradient IDs in `BirthdayWishThumbnail` collide across multiple instances, `apps/web/src/templates/birthday-wish/thumbnail.tsx:128`
**Problem**: The SVG `<defs>` use static IDs (`pedestalGrad`, `chocoGrad`, `vanillaGrad`, `flameHalo`, `flameCore`, `candleGrad`) instead of namespacing with the component's `id` prop.
**Why it matters**: When multiple Birthday Wish thumbnail cards render on the same page (e.g. in `/dashboard/pages` or `/dashboard/responses`), duplicate IDs exist in the DOM, causing potential SVG fill rendering bugs.
**Suggested fix**: Prefix gradient IDs and their `url(#...)` consumers with the incoming `id` prop (e.g. `${id}-pedestalGrad`).

## Nits

- ⚪ `apps/web/src/templates/birthday-wish/renderer.tsx:538`: `aria-label={locked ? undefined : undefined}` is redundant dead code.
- ⚪ `apps/web/src/templates/birthday-wish/renderer.module.css:1408`: `.folioParagraph` lacks `white-space: pre-wrap` (or `pre-line`), causing single newlines entered by users in `mainMessage` to collapse into spaces.
- ⚪ `apps/web/src/templates/birthday-wish/realistic-cake-canvas.tsx:755`: Reads `window.matchMedia("(prefers-reduced-motion: reduce)").matches` once on mount without an event listener for preference changes.

## Strengths

- Outstanding visual craft and interactive realism: the Midnight Patisserie multi-tier cake canvas, animated smoke wisps, ember particles, and dual blowout mechanics (individual tap or blow-all-out button) deliver a delightful celebration experience.
- Strict adherence to the "Avoid leading zeros for 1 to 9" rule across counter dials, candle labels, pillar tags, frames, and choice pills.
- Rigorous WCAG AA accessibility: 44px+ touch targets on interactive candles, full keyboard navigation (`Enter` / `Space`), visible high-contrast focus rings, screen reader announcements via `aria-live`, and immediate content reveal under `prefers-reduced-motion: reduce` and SSR/no-JS.
- Comprehensive test coverage across shared template contracts, catalog provisioning, API transport and infrastructure projection specs, and Playwright browser journeys.

## Test coverage
`TEST_SIGNAL = configured`. All test suites pass (unit, typecheck, lint, formatting, and web integration tests). Contract tests verify schema defaults, optional fields, capabilities, identity, and grapheme limits for `birthday.birthday-wish` version 1. API unit and integration tests cover repository and transport public projections. Playwright browser tests verify Birthday category filtering, Birthday Wish preview dialog, candle wish opening by pointer and keyboard, reduced motion rendering, and creator editor tabs without Questions or Responses.

---

## Resolution (commit `6d6f0fdc`)

1. **Paginated Letter Reading in BirthdayLetterFolio (AC-7)**: Integrated `paginateMessage` from `../secret-letter/message-pagination` with `.folioPagination`, `.folioPageBtn`, and `.folioPageIndicator`. Page indicator displays `Page ${activePageIndex + 1} of ${totalPages}` adhering strictly to the zero-leading-zeros rule for 1–9.
2. **Public Projection Response Contract (AC-3)**: Removed the conditional deletion in `birthdayWishPublicProjection.ts` and set `response: { enabled: false as const }` unconditionally in `birthdayWishPublicProjectionAdapter.ts`, ensuring consistent contract shapes.
3. **Audio Player on Empty State**: Omitted `showAudioPlayerWhenEmpty` from `BirthdayWishPresentation` so published letters without audio do not show an empty vinyl player.
4. **Pure State Updater in Candle Hook**: Extracted the auto-blowout timeout trigger out of the `setExtinguishedCandles` state updater callback.
5. **Capability-driven Editor Navigation**: Refactored `supportsQuestions` in `secret-letter-draft-editor.tsx` to check `templateRegistration?.capabilities.includes("questions")` via `getWebTemplate`.
6. **Scoped SVG Gradient IDs in Thumbnail**: Namespaced all gradient IDs and references in `BirthdayWishThumbnail` with the component's `id` prop to eliminate multi-card DOM ID collisions.
7. **Markup Cleanups**: Removed dead `aria-label` code in `renderer.tsx` and added `white-space: pre-wrap` to `.folioParagraph`.

