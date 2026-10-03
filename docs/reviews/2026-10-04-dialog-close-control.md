# Canonical dialog close control

Date: 2026-10-04

## Implementation

Dialog now composes the shared IconButton for icon only close and retains Button for text close. The caller supplied accessible close label, decorative glyph, data-dialog-close, and previous Button data-slot, data-size, and data-variant values remain available. Native close handling, Escape, overlay policy, and trigger focus restoration are unchanged.

The shared composition owns the wine foreground, surface background, round border, inverse hover/focus colors, and pressed wine color. Its glyph uses the existing desktop size through a new canonical token in packages/ui. Legal and template preview CSS lose all close button base and interaction selectors, removing 62 lines of duplicated override styling. The former legal narrow width of 40 px is corrected to the shared 44 px minimum. Both actual consumers now render a 44 by 44 px control at narrow and desktop widths.

No public prop or new dependency was added. The implementation decision is [recorded here](../specs/0022-repository-structure/0022-dialog-close-control.md). Feature root, wrapper, header, title, and content layout styles remain with their current owners for the next migration. This milestone does not declare all feature overrides resolved.

## Verification

- Shared UI tests pass 37 cases, including caller supplied close name, decorative glyph, preserved data attributes, and native close callback. The workspace unit gate passes 833 cases; web tests pass 103.
- The complete native suite passes 48 cases across Chromium, Firefox, and WebKit at 390 and 1440 px. Six new cases each exercise both legal and preview controls, asserting actual dimensions, round border, base colors, hover, focus visibility, pressed colors, visible close, and focus restoration. The six close cases pass again after the final DOM metadata update.
- The first browser run failed because the test expected a 999 px radius while the canonical token is 9999 px. The assertion was corrected to the existing token value and the complete suite rerun. No production radius changed to satisfy the test.
- All 94 existing Chromium desktop/mobile fixture journeys pass, including native legal consumers, editor, retained versions, visitor responses, public projections, and performance budgets.
- Lint, formatting, types, normal root build, and diff whitespace checks pass. Normal build and type generation run after fixture builds. No live API integration, remote CI, or independent review is claimed.
- Both measured profiles load 372,178 CSS bytes and 1,181,460 client JavaScript bytes. Ten unchanged font requests total 428,152 bytes. Observed initial CLS is zero. The original canonical baseline stays unchanged and all budgets pass.
- Maintained web feature CSS has no data-dialog-close selectors. The obsolete shared ui.module.css file remains absent and shared source has no import, so that stale verification checkbox is reconciled with the earlier migration evidence.

The user's skills-lock.json change remains untouched. This milestone's isolated fixture runner did not use or stop the existing development server.

## Remaining scope

Continue root/header dialog composition and the other feature overrides under spec 0009. Automated accessibility, actual zoom, forced colors, admin compatibility, broader source/style decomposition, contributor onboarding, commit tooling, template growth measurements, and the final repository requirement audit remain open. Overall restructuring remains in progress.
