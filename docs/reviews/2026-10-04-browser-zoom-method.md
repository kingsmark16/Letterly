# Actual browser zoom method verification

Date: 2026-10-04

## Outcome

Actual 200 percent tab zoom is available in the installed bundled Chromium through a temporary test extension. This verifies the method, not acceptance of the Letterly interface at that zoom.

The diagnostic used an isolated persistent browser profile, a temporary Manifest V3 extension with only localhost host permission, and an ephemeral localhost HTTP probe. It used full headless Chromium with `viewport: null` and a requested 1,440 by 1,000 browser window. No existing browser profile, application account, remote provider, or product source was accessed. The owned browser, HTTP server, extension, and profile were removed afterward.

## Measured behavior

| Metric | Before | After |
| --- | --- | --- |
| Browser `chrome.tabs.getZoom` | Default | 2 |
| `window.innerWidth` in CSS pixels | 1,424 | 712 |
| `window.innerHeight` in CSS pixels | 905 | 452 |
| `window.devicePixelRatio` | 1 | 2 |
| Computed document CSS zoom | 1 | 1 |

The extension invoked `chrome.tabs.setZoom` on the exact owned localhost tab, then read the resulting factor with `getZoom`. The viewport changed through browser zoom. No document style or viewport emulation was changed to stand in for it. Requested window dimensions and actual content dimensions differ because of the browser window frame.

## Next verification

Add a reusable test fixture with a fresh owned profile and localhost extension. Verify the browser factor and geometry before asserting shared primitive sizing, keyboard access, dialog scrolling, editor controls, and template usability. Record production build screenshots and direct assertions for the selected surfaces. Keep this Chromium zoom evidence distinct from Firefox/WebKit normal viewport and accessibility checks; no actual zoom evidence for those engines is claimed here.

## Official references

[Playwright extension testing](https://playwright.dev/docs/chrome-extensions) documents bundled Chromium, persistent contexts, and full headless extension support. [Chrome tab zoom APIs](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom) documents changing and reading the tab zoom factor. These sources support the mechanism; the measured geometry above comes from the local probe.
