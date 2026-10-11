# Shared UI accessibility scan, 2026-10-05

The shared UI fixture now runs Axe against each of the 19 exercised route and state surfaces from `e2e/support/ui-performance-surfaces.ts`. It checks WCAG 2.0 and 2.1 A/AA plus WCAG 2.2 AA rules, attaches a structured per-surface report with both violations and Axe's incomplete checks, and fails on any reported violation. The Secret Letter preview scrolls a response choice into its clipped preview viewport before scanning so offscreen content does not create misleading contrast results.

## Findings and change

The scan identified insufficient contrast on the compact music action. Its background and border now use the existing deep-red token, retaining the current control size, placement, animation, and hidden preloaded YouTube player behavior. No Axe rule is disabled. An earlier preview-choice contrast result was caused by running the scan while the choice was outside the clipped preview viewport; scrolling the real choice into view made the browser compute its opaque berry background correctly.

## Browser evidence and limits

The full 114-case browser matrix covered 19 surfaces in Chromium, Firefox, and WebKit at 390 px and 1440 px. All 76 Chromium and WebKit cases passed with zero Axe violations. The 38 Firefox cases could not create a page: Playwright failed at `browserContext.newPage` with `Cannot read properties of undefined (reading '_page')`, before application navigation or Axe analysis. A standalone Firefox context/page smoke test reproduced that failure. Those cases are an environment/tooling limitation, not accessibility passes or application failures.

The finite-motion settling helper now has a 2.5-second ceiling so a browser animation cannot hold an accessibility scan indefinitely. The repository's lint, formatting, and type gates passed after the TypeScript correction from `document.getAnimations({ subtree: true })` to the supported `document.getAnimations()` signature. A final fixture-runner smoke attempt rebuilt with its isolated API origin and started the selected Chromium test, but did not produce a completion result; direct HTTP checks confirmed the isolated API health route and app both returned 200. The reason for the stalled browser case was not established, and its fixture servers were stopped. Therefore the 76-case result documents the earlier successful scan; the exact final helper line has type-check evidence but no completed post-edit browser rerun.

The existing keyboard, forced-colors, reduced-motion, and actual 200% zoom browser reports remain linked in [spec 0009 verification](../specs/0009-design-system-ui-foundation/verify.md). The Axe run supplements those journeys; it does not constitute a manual visual review or close spec 0009's combined automated-and-manual accessibility criterion. The browser-runtime limitation and outstanding acceptance are also retained in the [repository completion audit](2026-10-05-repository-completion-audit.md).

## Focused public player follow-up, 2026-10-05

The new YouTube-specific public-letter browser case passed in Chromium at 390 and 1440 pixels. It confirmed the before-Play disclosure is visible before the intercepted SDK request, the hidden iframe is inert and cannot receive focus, and the current public player state has no violations under the repository's WCAG 2.0/2.1 A/AA and 2.2 AA Axe rules. Axe's incomplete checks are attached with the test results. The fixture runner did not exit after reporting the passes and was interrupted during shutdown; the test has not yet run across the full browser matrix. This focused scan does not replace the incomplete full 19-surface Axe rerun or the manual accessibility checks above.
