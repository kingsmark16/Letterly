# Shared Dialog migration

Date: 2026-10-03

## Implementation

Dialog is the final shared primitive migrated from the shared CSS Module to static Tailwind classes and cn. Its public imports, props, client boundary, native dialog element, semantic child structure, accessible labels, description, and close button remain compatible. Native modal opening, Escape, optional overlay closing, scroll restoration, trigger focus, and rejection of a second modal retain their existing implementation.

The existing 48rem width cap is now a canonical token. The static compact query preserves the previous inclusive max width boundary, including exactly 768 px. A configuration check compares that query with the tablet token. Desktop spacing remains 28 px and compact shell spacing remains 24 px. The title retains its original 32 px token rather than silently adopting the responsive heading alias.

Preview and legal consumers keep their feature CSS Module overrides and route links. The production probe verifies the unmodified shared primitive styles separately. It renders the actual component on the server and opens that output through the native browser method; hydrated lifecycle evidence comes from actual consumer journeys and unit tests, not the static probe.

No remaining primitive imports the old shared stylesheet. It is removed, while canonical tokens and feature styles remain. Code is an unstyled semantic primitive and needs no stylesheet migration. No dependency, API, template identity, persistence, or domain behavior changed.

## Verification

- Repository unit gate: 831 passing cases, including 36 UI cases. Added cases cover stable dialog label IDs, removed descriptions, caller class precedence, and rejection of a second modal. Existing tests cover opening, close, Escape/cancel, overlay opt in, scroll restoration, and trigger focus. The final web configuration check ran freshly; unchanged workspace tasks used valid cache entries, and UI executed freshly before that final run.
- All 92 desktop/mobile Chromium fixture cases pass. The routine suite now includes the six existing legal dialog cases. Actual preview and legal journeys exercise open/close, content, viewport fit, and restored focus with retained feature CSS.
- The actual shared primitive probe checks labels, descriptions, close control, width, maximum height, border, radius, padding, gap, title size, and backdrop at 390, 768, 769, 1024, and 1440 px.
- The first nested modal test queried a closed dialog by accessible name; its lookup was corrected to inspect the known content's dialog ancestor. The first style probe incorrectly expected 32 px spacing; inspection confirmed the existing space 6 token is 28 px, and the assertions were corrected. Both gates then pass without changing modal lifecycle or token values.
- Lint and types pass seven tasks each, and formatting passes. The normal repository build passes three tasks after the browser run. UI and web types ran freshly after that build, restoring ordinary build configuration.

## Performance

Both Chromium profiles load 369,952 CSS bytes and 1,203,656 client JavaScript bytes, within the canonical baseline budgets. Ten font requests, their exact contents, and 428,152 font bytes remain unchanged. Observed initial CLS is zero. The canonical baseline was not regenerated. These measurements cover loaded assets and initial layout shifts, not field performance.

## Remaining scope

All styled shared primitives now use Tailwind, but this does not certify all of spec 0009. Application Tabs/Chart ownership, unused dependency cleanup, wider forced colors/zoom/accessibility checks, Firefox/WebKit native modal evidence, and full consumer fallback coverage remain open. Source/style decomposition, onboarding, template contract/growth measurements, and the final repository audit are still required.

API integration was not rerun for this presentation change. Remote CI and existing database dependent skips remain unobserved. This is self verification, with no independent review claimed. The user's skills-lock.json modification remains untouched.
