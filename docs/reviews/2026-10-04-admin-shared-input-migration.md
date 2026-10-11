# Admin shared Input migration

**Date:** 2026-10-04  
**Scope:** Text filters and the external appeal reference in the administrator report and audit consoles.  
**Status:** Implemented; broader UI acceptance remains open.

## Change

The report page and creator filters, external appeal reference, audit target ID, and administrator ID now use `@repo/ui/input`. Existing labels, IDs, state, limits, and filter navigation remain in their feature components. Native selects and the report selection card remain feature owned because this package has no shared Select primitive and the card has queue specific content.

## Verification

- `pnpm.cmd --filter web lint` passed.
- `pnpm.cmd --filter web test` passed, 108 tests.
- `pnpm.cmd --filter web build` passed.
- A direct Chromium check loaded the rendered admin fixture with generated production CSS. Button and Input focus styles, disabled state, and 44 pixel targets passed at 390 and 1440 pixel widths.

## Remaining

The authenticated moderation route was not exercised in a browser. Manual keyboard and forced colors checks, actual 200 percent browser zoom, broader feature style review, and per surface performance evidence remain open. The headless Chromium shortcut probe did not change browser zoom and is not counted as zoom verification.
