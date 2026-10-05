# Shared UI acceptance follow up

Date: 2026-10-05

## Current runtime evidence

The source at `922f1bb` passes all twelve actual 200 percent browser zoom cases after the shared control target correction. The isolated production fixture build succeeded. The command used API origin `http://127.0.0.1:3003`, application origin `http://127.0.0.1:3103`, and `pnpm --filter web test:e2e:fixtures --config playwright.zoom.config.ts`. Playwright completed with exit code zero and twelve passing cases in 19.2 seconds.

[The current geometry artifact](2026-10-05-shared-target-zoom-geometry.json) retains each case measurement. Each window measures either 640 to 320 or 1440 to 720 CSS pixels. Browser zoom is 2, device pixel ratio changes from 1 to 2, and root CSS zoom stays 1. These assertions distinguish native browser zoom from changing CSS zoom or only resizing a viewport.

| Surface         | Behavior exercised at both window sizes                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Shared controls | Recipient keyboard entry, labeled message field, invalid state, visible error, reachable action, no horizontal overflow |
| Legal dialog    | Keyboard opening, reachable close button, viewport bounds, final section scrolling, Escape, trigger focus restoration   |
| Catalog preview | Keyboard opening, expected preview content, reachable close button, Escape, trigger focus restoration                   |
| Owner editor    | Recipient and message fields, focus, section menu, keyboard Settings navigation, menu trigger focus restoration         |
| Public letter   | Keyboard envelope opening, enabled next and previous pagination controls within the viewport                            |
| Public journey  | Keyboard choices, outcome, private response input, fixture submission, success heading, no horizontal overflow          |

The normal production build was restored after the fixture run with `pnpm build`. All three configured build tasks succeeded in 16.054 seconds. Web built freshly; API and database build results came from Turbo cache. This run does not claim a fresh API build.

A direct `pnpm --filter web check-types` then regenerated route types and passed without relying on Turbo cache. The root `pnpm check:commit` gate passed. Its lint and type tasks used existing Turbo results for unchanged source, while formatting checked the maintained source and configuration paths freshly. The new report and geometry artifact were checked separately with Prettier. The historical completion audit retains its existing formatting.

## Acceptance gaps confirmed from current tests

The governing [0009 checklist](../specs/0009-design-system-ui-foundation/verify.md) remains partially open. No broad acceptance box is closed by this report.

`apps/web/e2e/ui-performance.spec.ts` only navigates to `/` and compares against `apps/web/e2e/fixtures/landing-ui-baseline.json`. It records decoded production stylesheet and script bytes, font requests and font content hashes, and initial landing CLS. It enforces the ten percent byte budget, no additional font requests, and the 0.02 CLS allowance for the landing page. Its current coverage cannot prove the separate requirement that each migrated surface stays within its performance budget. Earlier landing measurements remain valid for their named scope. Further surface measurements and a defensible comparison reference are needed before checking that requirement.

Current automated tests explicitly check labels, linked errors, status announcements, focus styles, control bounds, and dialog keyboard behavior. The landing foundation suite also contains forced color checks. Those targeted assertions are useful evidence, but neither this zoom run nor a source search establishes complete WCAG AA coverage. Automated accessibility coverage, including contrast and the relevant rendered states, still needs to be mapped to the shared primitive requirement.

The next acceptance work is to establish surface performance comparisons and finish that accessibility coverage map. This is verification of the existing design contract, not new product scope.

## Limits

All twelve cases use bundled Chromium and reduced motion. Owner requests and public response submission use fixtures, so this run does not prove live authentication, database writes, or provider behavior. Native Firefox and WebKit zoom, text only zoom, every administrator flow, and visual screenshot review are not part of these cases. No remote CI run is claimed. The source contains no change from this verification.
