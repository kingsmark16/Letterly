# Editor control composition

Date: 2026-10-04

## Implementation

The owner page error recovery Button now uses its canonical primary appearance, with no legacy form class. Its explicit refetch action, safe error message and request ID, lazy exact template version dispatch, and saved editor data flow are unchanged. The form style remains available for native buttons and links that still use it.

The review Card composes stretch, flex, maximum height, and conditional block padding through static utilities. Its section element and data-slot contract remain. Padding stays 8 px below 640 px, 12 px from 640 px, and 16 px from 1024 px. At widths of at least 1152 px and heights of at least 640 px, block padding becomes 6 px while inline padding stays 16 px. The compact boundaries remain inclusive. Fourteen CSS lines are removed, including a redundant checklist button height selector. Shared controls own their own target sizes; remaining descendant rules style review content and native form controls.

All editor shared Button/Card consumers now use canonical styles or explicit utilities, with no CSS Module base or interaction overrides. This covers owner retry, overview/review actions, checklist actions, and section navigation. Other page forms remain native controls and retain their existing classes. This does not claim a complete migration of every form or every feature stylesheet.

New browser cases exercise actual owner error recovery and draft/published review surfaces, rather than an artificial component fixture. The owner editor route setup is shared with navigation tests in e2e/support/owner-editor.ts. It reuses the existing owner page/session fixture, supplies only GET responses, and lets other methods continue; it introduces no production authentication bypass or write mock.

The first Firefox geometry check reported 43.99997 px for the 44 px checklist action. Final assertions verify computed min-height exactly 44 px and bounding height within 0.005 px of 44. This handles browser floating point measurement without relaxing the target contract or changing application geometry.

See [the accepted decision](../specs/0022-repository-structure/0022-editor-control-composition.md).

## Verification

- The workspace unit gate passes 834 cases, including 581 API, 98 templates, 14 database seed, 103 web, and 38 shared UI cases. The web task executes; unchanged tasks use valid local cache entries.
- The focused editor and navigation selection passes 30 cases across Chromium, Firefox, and WebKit at the configured 390 and 1440 px profiles. New retry cases verify safe error/request ID feedback, primary appearance, spacing, radius, target size, keyboard focus and activation, and successful recovery into saved content. Draft and published review cases check 320, 639, 640, 1023, 1024, 1151, 1152, and 1440 px widths, including the 639/640 px height boundary at 1152 px. They verify both padding axes, border/radius, flex/stretch layout, checklist target geometry, horizontal overflow, and navigation into existing content.
- The full configured UI gate passes all 96 cases across the same three engines. The prior 78 cases remain, with 18 new editor control cases. Native dialog, document fallback, policy/authentication composition, preview geometry, background inertness, and focus restoration regressions remain green.
- All 104 desktop/mobile Chromium fixture cases pass. They include six new control cases plus the existing default primitive, editor/media/response, retained identity, public privacy, legal/preview, and navigation regressions. The shared route helper is exercised by both control and navigation cases, including touch profiles.
- Both measured landing profiles load 364,439 decoded CSS bytes and 1,184,340 client JavaScript bytes. Ten unchanged font requests total 428,152 bytes; observed initial CLS is zero. The original baseline remains unchanged and all budgets pass. These measurements do not establish every route's performance or live production timing.
- Lint and formatting pass. Verification is performed on the main thread; independent review remains part of the final repository workflow.
- The normal root build passes after fixture builds, followed by fresh web route type generation and all seven workspace type check tasks. Diff whitespace checks pass. No live database integration or remote CI run is claimed.

## Remaining scope

The parent repository goal and wider shared UI acceptance remain in progress. Landing control composition, admin shared primitive compatibility, automated accessibility, forced colors and actual browser zoom, cohesive file/style splits, onboarding, commit tooling, template contract and growth checks, and final requirement reconciliation remain open. Browser fixtures use controlled API data; they do not verify live authentication providers or database transactions, remote CI, or independent review.
