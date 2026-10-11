# Canonical dialog close control

Date: 2026-10-04

**Status**: Accepted

## Decision

Dialog owns its visible close control. For closeIconOnly it composes the existing IconButton, retaining the caller's accessible close label, data-dialog-close, and prior Button data-slot, data-size, and data-variant attributes. Text close controls continue to use Button. The shared icon control preserves the legal and preview wine foreground, surface background, round border, and inverse hover/focus states through static shared utilities. The glyph size becomes a canonical token with the existing desktop value.

Remove the duplicated close button base and interaction selectors from legal and preview feature CSS, including the legal narrow width reduction. The canonical 44 px minimum applies at every viewport. This deliberately corrects the former 40 px legal close width at narrow sizes. Native close, focus restoration, Escape, and overlay behavior remain unchanged. Feature root, header, title, and content layout migration remains a separate open requirement.

## Acceptance

- Icon only close has its caller supplied accessible name, decorative glyph, canonical target dimensions, and working native close action. Text close remains compatible.
- Legal and preview close controls use the shared implementation without feature CSS selectors targeting their button base or states.
- Browser checks verify actual computed dimensions, token colors, hover/focus/active states, and visible closing at narrow and desktop sizes in the supported engines.
- Package/unit, lint, formatting, type, build, fixture, and unchanged performance gates pass. Overall shared UI acceptance remains open.

## Evidence

The implementation and verification are recorded in [the close control report](../../reviews/2026-10-04-dialog-close-control.md). The 48 case native suite and 94 case fixture suite pass. Actual close controls meet 44 by 44 px dimensions with the shared colors in all three engines. Remaining root/header and wider feature overrides stay open.
