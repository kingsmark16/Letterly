# Editor navigation composition

Date: 2026-10-04

## Implementation

EditorSectionNav stays with the pages feature and its response dashboard consumer. One sectionControlClasses function now supplies static utility composition for shared Button tabs and Next.js section links. The menu trigger supplies its utilities directly. No feature barrel, new package, or duplicated control is introduced. The shared Button API, props, data attributes, native button semantics, and Radix ownership stay intact.

The adjacent stylesheet loses 116 lines of shared control base and interaction overrides. Its remaining rules own navigation layout, icon content, and Radix menu content. Existing feature colors, gradients, spacing, 999 px pill radius, 46 px tabs, 44 px menu trigger, and inclusive 56 rem and 72 rem boundaries are preserved. Canonical focus tokens supply the visible outline, with the original inward 3 px offset. Keyboard section movement, URL synchronization, native links, menu dismissal, and focus restoration remain.

Production checks exposed a real global cascade conflict: unlayered focus defaults overrode utility composition and changed the inward focus offset to 2 px. Generic link, hover border, hover outline, and focus defaults now live in Tailwind's base layer, preserving their declarations and invalid control exclusions. This lets explicit utilities override fallback presentation, while existing CSS Modules retain their explicit styling. The approach follows [Tailwind's base style guidance](https://tailwindcss.com/docs/adding-custom-styles#adding-base-styles). See [the accepted decision](../specs/0022-repository-structure/0022-editor-navigation-composition.md).

Reduced motion suppresses navigation transitions and pressed transforms. The repository's global motion rule still sets a tiny transition duration, so browser assertions verify transition-property none and transform none rather than assuming a zero duration. Hover styling follows the canonical Tailwind hover capability guard; touch profiles retain normal or selected appearance. Open menu and keyboard focus states remain available independently.

The existing owner page fixture is extracted unchanged into e2e/fixtures/owner-page.ts and shared by the original authenticated draft journey and new navigation checks. Test locators explicitly include the background trigger only while inspecting styles behind Radix's open menu. Visibility, focus, routing, and interaction assertions still target the real controls. Browser profiles use actual Chromium, Firefox, and WebKit; existing mobile fixtures also exercise touch capability.

## Verification

- The workspace unit gate passes 834 cases, including 581 API, 98 templates, 14 database seed, 103 web, and 38 shared UI cases. Unchanged tasks use valid local cache entries; the changed web task executes.
- All 78 production UI cases pass across Chromium, Firefox, and WebKit at the configured 390 and 1440 px profiles. The new editor case checks 320, 896, 897, 1152, 1153, and 1440 px viewports in each engine/profile, including exact responsive boundaries, active and hover appearance, target geometry, Home/End section movement, visible keyboard focus, Radix selection/dismissal/focus restoration, and reduced motion. The response case verifies published analytics selection, native link destinations/colors, and mobile menu routing into the editor.
- All 98 desktop/mobile Chromium fixture cases pass. The original 94 cases remain, with four new navigation cases across desktop and touch profiles. Default shared controls, invalid input focus/borders, legal/preview composition, editor/response journeys, retained identity, public privacy boundaries, and performance checks pass.
- Both measured landing profiles load 364,199 decoded CSS bytes and 1,184,340 client JavaScript bytes. Ten unchanged font requests total 428,152 bytes, and observed initial CLS is zero. The original canonical baseline remains unchanged and all budgets pass. These are fixture asset and layout measurements, not a claim about live production speed or every route's performance.
- Root lint and formatting pass. The normal root build passes after fixture builds, followed by a fresh web route type generation and the seven workspace type check tasks. Diff whitespace checks pass. Source and configuration changes were reviewed on the main thread; this report does not substitute for the independent review required before the overall change is accepted.

## Remaining scope

This is a bounded maintenance milestone, not completion of spec 0009 or 0022. Other shared control consumers still have feature CSS overrides, including the editor error/review surfaces and landing. Admin shared primitive compatibility, automated accessibility, forced colors and actual browser zoom evidence, cohesive source/style splits, contributor onboarding, commit tooling, shared template contract and growth measurements, and the final requirement audit remain open. No live provider authentication, database integration, remote CI, or independent review is claimed by these browser fixtures.
