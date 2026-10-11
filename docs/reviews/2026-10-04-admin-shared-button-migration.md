# Admin shared Button migration

**Date:** 2026-10-04  
**Scope:** Standard actions in the administrator report and audit consoles.  
**Status:** Implemented; wider UI acceptance remains open.

## Change

The report and audit consoles now use `@repo/ui/button` for moderation actions, filters, retries, and pagination. The report selection card keeps its feature owned layout. The confirmation dialog keeps its existing confirmation, focus trapping, Escape, and pending mutation behavior.

The browser compatibility fixture covers the primary, secondary, and tertiary variants, disabled state, keyboard focus, and the 44 pixel target at 390 and 1440 pixel widths. The admin feature guide now records when to use the shared primitive and when to retain its queue specific card.

## Verification

- `pnpm.cmd --filter web lint` passed.
- `pnpm.cmd --filter web test` passed, 108 tests.
- A direct Chromium check rendered the fixture markup with generated production CSS. It passed focus, disabled state, and target size checks at 390 and 1440 pixels.
- The configured Playwright runner built the web app and reached the new compatibility cases. Its Windows server shutdown did not return a captured final suite summary, so the full fixture suite is not recorded as passed.

## Remaining

The authenticated moderation route was not exercised in a browser. The broader shared UI acceptance still requires checking remaining feature styles, manual keyboard and forced colors behavior, actual 200 percent browser zoom, and performance budgets for each migrated surface.
