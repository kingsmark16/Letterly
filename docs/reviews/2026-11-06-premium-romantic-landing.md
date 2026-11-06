# Premium romantic landing redesign

Historical verification of the first revision. Its palette and static presentation were superseded by the user's subsequent GSAP and WebGL request. Do not use this report as a current design requirement; `apps/web/design.md` and spec 0012 contain the current direction.

Implemented the November 2026 visual revision in spec 0012 using the ui-ux-pro-max skill and the existing Letterly design rules. This is implementation verification, not an independent code review.

## Delivered

- Warm ivory canvas, plum ink, cranberry actions, and rose stationery, scoped to the landing route.
- Split editorial hero with the existing local fonts, a labeled sample letter, CSS envelope folds, wax seal, and SVG botanical.
- Quiet moments strip, static responsive catalog grid, four creation steps, native FAQ, and a plum closing invitation.
- Existing catalog reads, preview dialogs, creation paths, sign in, footer, and legal dialogs remain connected.
- Removed landing imports of title blur, floating quotes, pointer effects, scroll stacking, and scroll progress. No new dependencies, fonts, services, database changes, or image requests were introduced.
- Replaced the accumulated landing and section CSS overrides with single component owned cascades. Updated design documentation and the landing ownership note.

## Evidence

- `pnpm --filter web build`: passed, including production compilation and route generation.
- `pnpm --filter web check-types`: passed after final cleanup.
- `pnpm --filter web lint`: passed.
- `pnpm format:check`: passed.
- `pnpm --filter web test`: 128 passed.
- Landing foundation and link browser suites: 21 passed, one mobile hover case skipped because that profile has no hover pointer.
- Updated hero compatibility case: two passed.
- Existing legal dialog suite: eight passed.
- Updated shared loading case rerun after restoring footer visibility coverage: two passed.
- Browser checks exercised 320, 375, 390, 768, 1024, and 1440 pixel widths, plus landscape. No horizontal page overflow was found.
- Keyboard checks covered skip navigation, primary actions, native FAQ, preview focus containment and restoration, and recovery links. Preview navigation and content also passed with JavaScript disabled.
- Axe scans found no violations in the checked landing and expanded FAQ states at 375 and 1440 pixels. Reduced motion and forced colors were checked separately.
- Contrast measurements: muted text on ivory 5.62:1, muted text on pale rose 4.87:1, white on cranberry 8.27:1, and rose closing text on plum 7.31:1.
- Desktop full page and mobile viewport screenshots were visually inspected.

## Limits

Browser journeys used the existing isolated sample catalog on the running development server. They do not prove live database, API, or OAuth behavior. Automatic approval review blocked starting a separate production preview with the reason `blocked by policy`; production compilation passed, but production browser performance budgets were not rerun. Historical performance and link geometry baseline JSON files were not changed.

The execution environment has Node 26.13.0 while the repository supports Node 24. These checks passed on the installed runtime; the supported Node 24 CI gate still needs to run.
