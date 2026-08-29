# 0013. Secret Letter cinematic presentation redesign

**Date**: 2026-08-25
**Status**: Superseded by [0016](0016-romantic-glass-secret-letter.md)

## Summary

The Secret Letter public and preview renderer will adopt a centered, paper based
envelope reveal inspired by the Stitch screen “Heartfelt Confession”. The
message remains the primary content and stays server rendered, while the
envelope, wax seal, letter lift, and gentle bloom are client side progressive
enhancements. All Secret Letter specific React, styles, and motion code will
live under `apps/web/src/templates/secret-letter` instead of the generic pages
component directory.

## Requirements

**User stories**:

- As a visitor, I want a quiet envelope opening so that reading a personal
  letter feels intentional.
- As a visitor, I want the letter to remain available without JavaScript or
  animation so that the experience is reliable and accessible.
- As a creator, I want private preview and public presentation to use the same
  template so that I can trust what I preview.
- As a maintainer, I want template specific code in one folder so that future
  templates do not share accidental styling or motion dependencies.

**Acceptance criteria**:

- **AC-1**: The public and private preview paths import the same named
  `SecretLetterRenderer` from `apps/web/src/templates/secret-letter`.
- **AC-2**: The default desktop and mobile opening scene has a warm ivory
  background, a centered paper envelope with side and bottom folds, a raised
  top flap, a pink “For My Dearest” label, a heart shaped seal, and a visible
  “Tap to open” invitation. Decorative shapes are CSS or inline markup only;
  no remote scripts, Three.js, gradients, or user content HTML are added.
- **AC-3**: Activating Open your letter runs a bounded cinematic sequence with
  seal release, flap opening, letter lift, envelope fade, and letter bloom. The
  sequence completes within four seconds and never removes the letter text
  from the document or makes it `aria-hidden`.
- **AC-4**: Skip animation opens the letter immediately. Replay opening resets
  the envelope and runs the sequence again. Existing accessible labels remain
  available: Open your letter, Replay opening, Skip animation, Letter opened,
  and Reduce motion.
- **AC-5**: The operating system reduced motion preference and the visible
  Reduce motion control bypass spatial motion and ScrollTrigger effects. The
  letter content is immediately readable, and focus moves to the letter
  heading after Open, Skip, or a completed replay.
- **AC-6**: Public content remains readable with JavaScript disabled, GSAP
  unavailable, an animation failure, or a slow image. Existing image loading,
  safe media paths, captions, and “This image is unavailable right now.”
  failure state remain intact.
- **AC-7**: The layout is mobile first, works at 390 px, 768 px, 1024 px, and
  1440 px widths, keeps touch targets at least 44 px, and keeps the letter
  readable in a centered column no wider than 720 px.
- **AC-8**: The renderer has no new API, database, environment variable, or
  persistence requirement. It consumes the existing
  `SecretLetterRenderModel` and preview flag without changing public metadata
  or privacy headers.
- **AC-9**: Secret Letter code is organized as
  `apps/web/src/templates/secret-letter/renderer.tsx`,
  `renderer.module.css`, and `index.ts`. The old generic renderer file is
  removed, imports are updated, and the pages context documentation points to
  the new owner.

## Decision

**Chosen option**: Replace the existing renderer in place behind the same
  `SecretLetterRenderer` contract and move it into a dedicated template folder.

The implementation will use the installed React GSAP integration and a scoped
GSAP timeline for the opening sequence. The Stitch screen is a visual
reference, not executable source: its remote Tailwind, font, Three.js, canvas,
particle, and gradient effects are not copied. Existing Letterly tokens,
typography, content contracts, security rules, and accessibility requirements
remain authoritative.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`,
`.agents/skills/vercel-react-best-practices/`) · `gsap-react`
(`greensock/gsap-skills`, `.agents/skills/gsap-react/`) · `gsap-core`
(`greensock/gsap-skills`, `.agents/skills/gsap-core/`) · `gsap-timeline`
(`greensock/gsap-skills`, `.agents/skills/gsap-timeline/`)

## Feature design

**Data model sketch**:

No data model changes. The renderer consumes the existing
`SecretLetterRenderModel` with recipient name, main message, ordered images,
and optional captions. No user supplied HTML, animation state, or motion
preference is persisted.

**API surface**:

No API changes. Existing owner preview and public projection routes continue to
provide the model.

**Value sourcing**:

| Action | Value produced or displayed | Source |
| --- | --- | --- |
| Render recipient | `For {recipientName}` | Existing `SecretLetterRenderModel.recipientName` |
| Render message | Main letter text | Existing `SecretLetterRenderModel.mainMessage` |
| Render gallery | Ordered media URL and caption | Existing `SecretLetterRenderModel.images` safe projection |
| Opening state | Sealed, opening, or opened | Ephemeral React state in the renderer |
| Motion behavior | Reduced or full motion | OS `prefers-reduced-motion` and the visible Reduce motion control |
| Canonical navigation | Letterly home link | Existing `/` route |

**Key invariants**:

1. The server rendered message remains in the document in every state.
2. Animation never becomes a prerequisite for reading, image loading, or
   navigation.
3. GSAP selectors are scoped to the renderer root and all contexts are
   reverted on unmount or dependency changes.
4. Decorative elements are hidden from assistive technology and cannot cover
   text or controls.
5. The renderer does not introduce shared mutable state, local storage, or
   content bearing analytics.

**Security model**:

No security boundary changes. Public data is still the safe server projection,
owner preview still requires the existing authenticated route, and text stays
React text nodes rather than raw HTML.

**Configuration required**:

None.

**Critical test scenarios**:

- Happy path: open a public letter, verify the invitation, seal, flap, letter,
  recipient, message, footer, and image are usable, verifying **AC-2**,
  **AC-3**, **AC-6**, and **AC-7**.
- Controls: open, skip, and replay the sequence, then verify heading focus and
  stable accessible labels, verifying **AC-4** and **AC-5**.
- Reduced motion: enable the checkbox and emulate reduced motion, verifying
  immediate readable content and no motion blockers, verifying **AC-5**.
- No JavaScript and image failure: verify text is present without hydration and
  the existing image error copy appears when media fails, verifying **AC-6**.
- Preview boundary: render the same component through creator preview and the
  public route, verifying **AC-1** and **AC-8**.
- Organization: verify the old renderer path is gone and imports point to the
  dedicated template module, verifying **AC-9**.

## Build plan

The project uses a Tracer Bullet approach. This slice keeps the existing
server route and model, then proves the new template presentation through
private preview and public browser journeys before cleanup documentation is
finalized.

1. Create the dedicated Secret Letter template module and update the public
   route and preview imports, satisfying **AC-1** and **AC-9**.
2. Replace the two column presentation with the centered paper scene, letter
   surface, responsive CSS, and preserved media states, satisfying **AC-2**,
   **AC-6**, and **AC-7**.
3. Add a scoped GSAP opening timeline with explicit labels, reset and skip
   controls, reduced motion handling, focus management, and cleanup,
   satisfying **AC-3**, **AC-4**, and **AC-5**.
4. Update the pages context documentation and run lint, type checks, build, and
   focused Secret Letter Playwright journeys, satisfying **AC-8** and **AC-9**.

## Consequences

**Positive**:

- The public experience better matches the requested cinematic envelope design.
- Template code has a clear boundary for future independent templates.
- The no JavaScript and reduced motion paths remain reliable.
- The existing API and persistence contracts stay unchanged.

**Negative or tradeoffs**:

- The renderer remains a client component because the opening sequence needs
  browser animation, so its JavaScript still adds a small client cost.
- A CSS envelope is an intentional approximation of the Stitch artwork rather
  than a remote image or 3D scene.

**Neutral**:

- No database migration, endpoint, environment value, or content schema is
  required.

## Migration plan

**Strategy**: strangler replacement behind the existing component contract.

**Phases**:

1. Add the dedicated module and render it from the existing public and preview
   call sites.
2. Verify the focused journeys, then remove the old generic component and
   update documentation.

**Rollback**: revert the renderer and import move in one commit. The API and
database remain unchanged, so no data rollback is needed.

**Risks**: motion regressions, hydration behavior that hides content, or
responsive envelope overflow. The no JavaScript, reduced motion, mobile, and
image failure tests are required safeguards.

## Follow-up

- [ ] Add a separate template owned music, question, and gallery viewer slice
  when those capabilities are implemented for Secret Letter.
