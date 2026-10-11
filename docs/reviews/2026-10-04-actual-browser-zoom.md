# Actual browser zoom verification

Date: 2026-10-04

## Result

Twelve Chromium fixture checks passed at actual 200 percent browser zoom. Six surfaces run at each of two window sizes. Local measurements were 640 to 320 and 1440 to 720 CSS pixels, device pixel ratio 1 to 2, reported browser zoom 2, and computed root CSS zoom 1 throughout. The twelve measurements are retained in [the geometry artifact](2026-10-04-actual-browser-zoom-geometry.json).

The temporary extension uses localhost host permissions, with a fresh profile for each case and bounded cleanup of its owned temporary directory. Chromium persistent contexts and extension support follow [Playwright documentation](https://playwright.dev/docs/chrome-extensions). Zoom is set and read through [Chrome's tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom). No dependency was added.

## Behavior checked

| Surface         | Evidence                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Shared controls | Recipient keyboard entry, field labels, invalid message association, visible error, action bounds, no horizontal document overflow        |
| Legal dialog    | Keyboard opening, close control bounds, dialog viewport bounds, final section scroll access, Escape, restored trigger focus               |
| Catalog preview | Keyboard opening, expected preview content, close control bounds, Escape, restored focus                                                  |
| Owner editor    | Existing recipient and message fields, keyboard focus, compact section menu, keyboard Settings navigation and restored menu trigger focus |
| Public letter   | Keyboard envelope opening, long message pagination, enabled previous and next controls within viewport                                    |
| Public journey  | Keyboard choices, outcome, private message input, submission fixture acceptance and success heading                                       |

## Failure and fix evidence

The initial run passed 10 and failed 2. At 320 CSS pixels, the shared fixture's document width was 378 pixels. Geometry located an unsized SVG with width 300 inside IconButton. The wrapper already owns a 20 pixel size; direct SVG children now fill that size. Existing non SVG close glyph content stays unchanged.

The public journey success screen had document width 332 pixels. Geometry located the report link ending at x=332.2 in the footer's forced single row. Changing the footer navigation from `flex-nowrap` to `flex-wrap` made the links fit. Labels, URLs, report dialog behavior, and minimum target size remain unchanged. No global overflow clipping was introduced.

Shared static markup was moved into one support helper used by both compatibility and zoom checks. Its source paths are adjusted relative to the helper; rendering and mounting behavior remain the same.

## Validation

- Production fixture build passed.
- Actual zoom suite: 12 passed after the fixes.
- Existing shared UI compatibility and public journey browser suites: 35 passed, 1 existing case skipped.
- Shared UI unit suites: 38 passed.
- Web unit suites: 115 passed.
- Root lint, format, and type checks passed.

The first unit attempt encountered the known Windows esbuild parent directory restriction and passed when rerun outside that restriction. The first browser attempt found port 3002 occupied; the isolated run used API port 3017 and web port 3117. Existing processes were left alone.

## Limits and next work

These are local production build fixtures. Owner reads and public response acceptance use fixture data, not live authentication or a real database. All zoom cases use reduced motion. Native zoom in Firefox and WebKit, text only zoom, high contrast, every owner and administrator flow, and complete feature override review remain outside this milestone.

Playwright screenshot capture produced clipped or blank images at native zoom in this environment. Those captures were removed from the suite and are not visual acceptance evidence. Geometry and interaction assertions are retained in `actual-browser-zoom.json` per case. Ordinary viewport and cross engine checks remain separate.

CI now invokes `pnpm --filter web test:e2e:fixtures --config playwright.zoom.config.ts`. Remote CI has not run. The overall repository migration remains in progress.
