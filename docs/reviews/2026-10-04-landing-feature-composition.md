# Landing feature composition verification

Date: 2026-10-04

The home route now owns request handling and catalog selection in 46 lines, reduced from 963. Server presentation lives in the landing feature: a 171 line shell, 207 line context artwork component, 246 line catalog showcase, 126 line creation story, and separate floating decoration and FAQ components. Plain catalog DTO types and the existing long content fixture have named owners. No new client boundary, dynamic import scheme, fetch, activation, or product behavior is introduced.

The 7,430 line stylesheet moved into the feature byte for byte. All rule order and overrides remain intact. This establishes its owner but does not complete historical CSS cleanup or shared control composition. The current design pointer and durable context follow the new location; historical inventory evidence remains unchanged.

A read only PostCSS inventory counts 88 local class references, 176 class names in selectors, and 1,101 rules. Of those, 501 rules contain only class names absent from current landing component references. They are cleanup candidates, not automatic deletion proof; global selectors, relationships, and side effects must be checked in the next style milestone.

A TypeScript syntax tree comparison verified 15 extracted function bodies, the route's request preparation, and the complete landing return markup, normalizing line endings for comparison. A buffer comparison verified exact stylesheet bytes. Initial extraction stopped on a CRLF/LF delimiter mismatch before modifying the route or stylesheet; the completed extraction uses normalized source delimiters and the final comparisons passed.

See [the recorded decision](../specs/0022-repository-structure/0022-landing-feature-composition.md).

## Browser coverage corrections

The existing landing suite was omitted from both routine isolated configurations. It is now selected for desktop/touch Chromium fixtures and the three engine UI gate. Restored tests initially exposed stale CTA and story copy, an assumption that project names encode layout, ambiguous preview heading selection, and an obsolete preview capability heading.

The final responsive assertion checks the actual 64.01rem media condition. Preview checks preserve initial focus on the native dialog, then keyboard traversal through the close control, scrollable region, and interactive sample controls before reaching the draft action. Focus stays inside the modal and Escape restores the preview trigger. A temporary incorrect initial close focus expectation was corrected after inspecting the canonical Dialog implementation. The keyboard test no longer assumes the draft action is immediately adjacent to Close.

Independent tests no longer share serial failure skips. The forced colors case is named for its actual 320 px reflow viewport; it does not claim actual 200 percent browser zoom.

The complete three engine UI suite passed 168 cases at 390 px and 1440 px. The desktop and touch Chromium fixture suite passed 128 cases. Its checks cover the existing landing catalog states, navigation and links, long content, reduced motion, responsive behavior, legal dialog, and preview keyboard focus. The production performance fixture passed both its 390 px and 1440 px profiles with CLS 0 and all 10 font requests (428,152 bytes).

The measured landing load used 400,495 CSS bytes and 1,184,306 client JavaScript bytes. Against the immediately preceding verified state, CSS increased by 36,056 bytes and JavaScript decreased by 34 bytes. CSS remains 50,884 bytes below the immutable 451,379 byte baseline, so it passes the existing 10 percent budget. The moved stylesheet is byte identical and compiles to the same 138,932 byte landing module chunk. A route level stylesheet import and a shared TypeScript style re export were each measured; neither changed the total, so neither remains. The measurement shows that moving ownership changed how Next groups surrounding CSS chunks. The increase is recorded for the next measured selector and shared style cleanup; it is not described as a size neutral refactor.

## Verification and remaining work

The source comparisons, web lint/type checks, root lint/formatting, and 835 workspace unit cases pass. The web unit task executes; unchanged workspace tasks use valid cache entries. The normal root production build completed successfully after the browser fixtures. The enabled local commit gate passed lint, formatting, and type checks immediately before staging; the web type task executed and generated current route types while unchanged workspace tasks used valid cache entries.

No live database/provider test or remote CI run is claimed. The user skills-lock.json change remains untouched. Landing style cleanup, wider shared UI ownership, cohesive template/persistence splits, actual browser zoom and accessibility acceptance, catalog growth/contract coverage, readiness/API contract gaps, bounded cleanup, and final requirement/finding reconciliation remain open. Overall repository restructuring remains In Progress.
