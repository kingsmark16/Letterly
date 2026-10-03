# Catalog preview dialog composition

Date: 2026-10-04

## Implementation

Template preview dialog, content, and stylesheet now live together in apps/web/src/features/catalog/preview. Landing, standalone preview, catalog cards, and retained version composition tests import that owner directly. Existing identity selection, registered lazy rendering, capability copy, draft creation, and route fallback behavior remain with their original implementations. No compatibility barrel or duplicate generic component was retained.

Shared Dialog exposes optional typed content, header, title, and description classNames. Each slot merges caller utilities through the canonical cn helper. Existing root className, default classes, DOM structure, accessible associations, close controls, and native lifecycle remain compatible. The slot configuration is consumed before HTML props are spread. The package README documents this public presentation API.

The preview supplies static root and slot utilities. Its CSS shrinks from 357 to 285 lines and no longer targets the shared dialog root, wrapper, header, headings, description, or close button. Feature content and template art styles remain local. The existing 70 rem desktop width cap and 52 rem height cap become canonical tokens. Compact header typography retains its previous values, applied only to the header slots so it no longer reaches into template headings.

The prior compact inset frame contradicted spec 0009's full screen requirement. The accepted decision resolves that conflict by using the canonical viewport layout through the inclusive 768 px boundary, without a border or round corners. The content is a bounded grid and its named preview region scrolls internally. This is an intentional compact layout correction; desktop centering and caps remain. See [the decision](../specs/0022-repository-structure/0022-preview-dialog-composition.md).

## Verification

- The workspace unit gate passes 834 cases, including 38 shared UI and 103 web cases. The new slot test proves intentional utility conflicts resolve to callers, description/title semantics remain, and configuration does not become an HTML attribute. Existing retained v1/v2 composition tests pass at the new owner path.
- All 54 native browser cases pass across Chromium, Firefox, and WebKit at narrow and desktop profiles. Six layout cases each exercise both launch templates at five viewport configurations, including 320 px, exactly 768 px, 769 px, and a short 390 by 400 px screen. They verify actual bounds, full screen compact edges, no compact border/radius, desktop centering/caps, visible close, positive scroll region height, no document horizontal overflow, and restored trigger focus.
- The first layout run failed because an unnamed region query matched eight accessible Secret Letter regions. The test now targets the existing named preview region; the complete suite was rerun successfully. No production accessibility structure was changed to satisfy the locator.
- All 94 desktop/mobile Chromium fixtures pass, covering default primitive production styles, catalog identity and preview links, retained versions, editor behavior, response journeys, and performance budgets.
- Lint, formatting, types, normal root build, and diff whitespace checks pass. Normal build and fresh web type generation run after the fixture builds. API/database tests use valid existing cache entries; no new real database integration, remote CI execution, or independent review is claimed.
- Both measured profiles load 373,048 CSS bytes and 1,182,730 client JavaScript bytes. Ten unchanged font requests total 428,152 bytes. Observed initial CLS is zero. The original canonical performance baseline remains unchanged and all budgets pass.
- Maintained source has no imports from the former generic preview component paths. The preview stylesheet has no shared Dialog descendant selectors. The user's skills-lock.json change remains untouched, and this milestone did not use or stop the existing development server.

## Remaining scope

Legal dialog layout overrides and other feature primitive overrides remain open under spec 0009. Automated accessibility, forced colors, actual 200 percent zoom, admin compatibility, source/style decomposition, contributor onboarding, commit tooling, template contract/growth measurements, and the final repository acceptance audit remain required. Overall restructuring remains in progress.
