# Actual browser zoom regression checks

Date: 2026-10-04

**Status**: Accepted

## Contract

Verify the existing 200 percent zoom requirement from spec 0009 through actual browser zoom. Reuse the fixture runner and server configuration. A separate Chromium configuration owns the persistent context required for a temporary extension, with localhost permissions and a fresh profile for each test. This adds no application dependency or public capability.

Check six surfaces at compact and wider window sizes: shared fields and actions, legal dialog, catalog preview, owner editor, long public letter, and public journey response. Confirm the browser reports factor 2, CSS zoom remains 1, CSS viewport width halves, and device pixel ratio doubles. Verify control bounds, keyboard interactions, focus restoration where relevant, and document horizontal overflow. Save geometry under the ignored Playwright results directory.

Keep reduced motion enabled for these cases. Normal motion and the existing Firefox and WebKit dialog checks remain separate evidence. These fixture cases do not certify live API behavior, every feature override, or complete WCAG compliance.

## Confirmed defects

An unsized SVG child overflowed the shared IconButton's fixed icon wrapper. Size direct SVG children to the existing wrapper while preserving non SVG content and the button contract. The public footer's forced single row overflowed at 320 CSS pixels. Allow its links to wrap without changing link destinations, labels, or focus behavior.

## Verification

The initial run passed 10 cases and reproduced the two compact width failures. After the minimal fixes, all 12 passed. Run existing shared UI and public journey cases, affected unit suites, lint, format, type checks, and production build. Record detailed results and limits in [the milestone report](../../reviews/2026-10-04-actual-browser-zoom.md). CI runs the new configuration, but remote execution remains unobserved until publication.
