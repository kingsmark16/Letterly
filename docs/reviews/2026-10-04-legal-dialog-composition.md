# Legal dialog composition

Date: 2026-10-04

## Implementation

The policy dialog and stylesheet now live in apps/web/src/features/legal beside the reusable server documents. Landing and authentication import that owner directly. The client still receives rendered document nodes, without importing policy text or introducing a feature barrel. Policy text, update dates, section IDs, native lifecycle, close controls, and route fallback implementations are unchanged.

Legal supplies static root and content/header/heading/title/description utilities to shared Dialog. The optional heading slot addresses the title/description container without a descendant selector; its default remains unstyled and the configuration is not forwarded to HTML. The existing 62 rem width and 56 rem height caps become canonical tokens. Header padding retains safe area calculations. Desktop geometry, inclusive full screen compact layout, narrow typography, and separate document scrolling remain.

The first computed style run proved that overlapping 30 and 48 rem arbitrary media utilities changed the cascade: the wider rule won and narrow header padding became 16 px instead of 12 px. Header, title, and description now use disjoint ranges, through 30 rem and above 30 rem through 48 rem. No arbitrary source ordering or important override is required. Exact 480 and 481 px checks confirm that both ranges preserve the original presentation.

The stylesheet shrinks from 294 to 198 lines. Remaining rules own trigger and policy document content only; no selector targets shared Dialog root, wrapper, header, heading, description, or close control. The public slot API and durable context are updated. See [the accepted decision](../specs/0022-repository-structure/0022-legal-dialog-composition.md).

## Verification

- The workspace unit gate passes 834 cases, including 38 shared UI and 103 web cases. The existing composition test now verifies the heading slot as well as utility precedence and configuration isolation.
- All 66 native browser cases pass across Chromium, Firefox, and WebKit. Legal layout cases exercise both policies across desktop, 320 px, exactly 768 px, 769 px, and a short 390 by 400 px screen. The six legal cases pass again with exact 480 and 481 px checks added. They verify geometry, computed header padding and typography, regular description styling, all twenty sections, internal scroll movement, visible close, and focus restoration.
- Authentication consumer cases open both policies on sign in and sign up in each engine/profile, asserting document sections and restored trigger focus. Session reads are explicitly mocked as signed out; this verifies composition, not a live authentication provider.
- All 94 existing desktop/mobile Chromium fixtures pass, including default primitives, preview composition and identity, editor/public journeys, response workflows, and performance budgets.
- Lint, formatting, types, normal root build, and diff whitespace checks pass. The normal build and fresh web type generation run after fixture builds. API, database, and template unit tasks use valid existing cache entries. No new real database integration, remote CI run, or independent review is claimed.
- Both measured profiles load 373,997 CSS bytes and 1,184,340 client JavaScript bytes. Ten unchanged font requests total 428,152 bytes. Observed initial CLS is zero. The original canonical baseline is unchanged and all budgets pass.
- Maintained source has no former generic policy dialog imports, and legal/preview feature CSS has no shared Dialog descendant selectors. The user's skills-lock.json edit remains untouched; this milestone did not use or stop the existing development server.

The viewport checks prove the managed engines' layout behavior. They do not claim physical device notch testing, actual browser zoom, or complete accessibility acceptance.

## Remaining scope

Other feature primitive overrides, automated accessibility, forced colors, actual 200 percent zoom, admin compatibility, broader source/style decomposition, contributor onboarding, commit tooling, template contract/growth measurements, and the final repository acceptance audit remain required. Overall restructuring stays in progress.
