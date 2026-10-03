# Editor control composition

Date: 2026-10-04

**Status**: Accepted

## Decision

Complete the existing editor shared Button/Card consumer cleanup from spec 0009. Let the owner error recovery Button use its canonical primary appearance without a legacy native form class. Compose the review Card's stretch, flex, maximum height, and compact block padding through static feature utilities. Keep the existing Card section element, attributes, scrolling children, and content styles.

Preserve 8 px compact padding, 12 px padding from 40 rem, and 16 px padding from 64 rem. At widths of at least 72 rem and heights of at least 40 rem, preserve 6 px block padding and the existing inline padding. Both boundaries are inclusive. Remove the redundant checklist button descendant minimum height rule because the button already supplies its canonical 44 px target.

Keep the remaining legacy primaryButton/secondaryButton classes where native forms and links still consume them. Do not delete style rules based on the cleanup of a single consumer. Preserve query ownership, error recovery, lazy exact version editor dispatch, saved values, publishing, private responses, and QR behavior.

This maintenance decision is covered by the repository autopilot authorization and the accepted shared UI composition approach. It introduces no new shared API, dependency, or product behavior. Editor shared controls finish this local cleanup; other feature and repository acceptance remains open.

## Acceptance

- No editor shared Button or Card consumer receives a CSS Module base or interaction override. Native form consumers retain their styles.
- Production browser checks verify safe owner error feedback and explicit retry recovery, canonical button styles and focus, draft and published review Card padding at exact width/height boundaries, and checklist navigation into the existing content editor.
- Existing browser regression cases, unit tests, lint, formatting, types, and normal build pass. Evidence records the scope and remaining requirements.

## Evidence

The [milestone report](../../reviews/2026-10-04-editor-control-composition.md) records source ownership, retry behavior, exact geometry boundary coverage, cross engine and touch profiles, regression gates, performance budgets, and outstanding repository acceptance.
