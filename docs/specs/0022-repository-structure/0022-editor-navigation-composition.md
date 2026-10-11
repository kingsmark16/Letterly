# Editor navigation composition

Date: 2026-10-04

**Status**: Accepted

## Decision

Keep section navigation with its editor and response consumers. Compose shared Button appearance through static feature utilities and the canonical cn helper. Use the same feature classes for Next.js navigation links. Remove CSS selectors that override shared controls, keeping navigation layout, icons, and Radix menu content in the adjacent CSS Module.

Preserve existing colors, gradients, spacing, 46 px desktop tabs, 44 px menu trigger, inclusive 56 rem menu breakpoint, and inclusive 72 rem compact tab spacing. Keep native link destinations, tab roles, selection, keyboard movement, URL synchronization, Radix menu focus, and published analytics visibility. Use the existing reduced motion contract to suppress control transforms and transitions when requested.

Use Tailwind's standard hover capability guard, matching canonical controls. Touch devices retain normal or selected appearance rather than simulated mouse hover styling. Keyboard focus and Radix open states remain independent of hover capability. Browser assertions exercise both hover capable engine profiles and the existing touch device fixture.

No new shared primitive, dependency, product surface, or authorization behavior is introduced. The repository autopilot instruction authorizes this maintenance slice of spec 0009. Other consumers and the parent repository requirements remain open.

The production browser check exposed unlayered global link and control fallback rules taking precedence over utility classes, including the inward focus offset. Put only those generic link, hover border, hover outline, and focus defaults in Tailwind's base layer. Preserve their declarations and invalid control exclusions. Explicit component utilities and existing CSS Modules then own their presentation without important declarations. This follows the existing source owned Tailwind decision and its documented base layer extension pattern.

## Acceptance

- Shared Button consumers have no feature CSS base or interaction overrides in this navigation module. Static utility classes describe both link and button composition.
- Production browser checks cover keyboard navigation, menu selection and focus restoration, active and hover appearance, target sizes, reduced motion, and exact 56 rem and 72 rem boundaries in Chromium, Firefox, and WebKit.
- Existing browser fixture journeys, unit tests, lint, formatting, type checks, and normal build pass. Review and context record the evidence and remaining limits.

## Evidence

The [milestone report](../../reviews/2026-10-04-editor-navigation-composition.md) records implementation, browser profiles and boundary coverage, regression checks, performance budgets, and outstanding repository acceptance.
