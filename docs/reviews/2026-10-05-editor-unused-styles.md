# Editor stylesheet cleanup verification

Date: 2026-10-05

## Change

Removed 59 whole unused rules from `features/pages/editor/draft-editor.module.css`. The file decreased from 3,062 to 2,666 lines and from 64,883 to 57,491 source bytes. Retained rules keep their values and ordering. No React component, query, form state, event handler, API contract, or visual value changed.

The removed rules describe obsolete editor headers, footers, loading lines, paper headings, message toolbars, readiness badges, and control layouts. This removes historical styles that no importing component uses. It does not certify that every remaining selector is active or that every historical override has been consolidated.

## Caller and cascade evidence

The [audit artifact](2026-10-05-editor-unused-styles.json) lists all eight source owners, their hashes, 86 used classes, removed selectors, before and after stylesheet hashes, and the retained cascade hash. TypeScript syntax trees inspected actual imports and their property or literal element accesses. No stylesheet object escapes or dynamic lookups were found. The stylesheet has no global selector, composition, import, or value export.

Only a rule whose every class is unused was removed. Mixed rules were retained intact, even when a descendant branch looks obsolete. No selector branch was rewritten. A PostCSS comparison verified all 383 retained rules, including their conditional ancestors, declarations, and relative order. A separate comparison against committed HEAD repeated that check after formatting. Formatting made no further change.

This is direct evidence for the internal module cleanup. Static usage inspection is not a semantic review of every importing component. Source bytes are not transferred or compressed bundle size, and no runtime speed claim is made.

## Verification

All 121 web unit tests passed. The production fixture build passed. The first browser invocation stopped because its default API port was already occupied. Verification was rerun on API port 3003 and web port 3103 without stopping the existing process.

The broad browser run completed with 178 passes and two failures among 180 cases across Chromium, Firefox, and WebKit at 390 and 1,440 pixel widths. Both failures were in the audio helper's immediate resume angle assertion, Firefox desktop at 3.55499 degrees and WebKit desktop at 3.91501 degrees, above its fixed three degree bound. All other cases passed, including draft lifecycle, conflict recovery, dirty exit, published read only state, responsive controls, keyboard navigation, and response navigation. These are intercepted fixture journeys, not live API or database verification.

The WebKit trace placed the playing event call at 253388.17 to 253421.13 ms and the subsequent angle call at 253422.067 to 253482.191 ms. The player rotates 360 degrees over eight seconds. The separate protocol calls therefore allowed normal motion to exceed the fixed threshold. The helper now measures the event and two animation frames in one browser evaluation, bounding forward angular movement by browser elapsed time at the existing rotation speed plus the original three degree allowance. A backward reset yields a large forward modular advance instead of being mistaken for ordinary motion. Stopped state assertions and subsequent movement polls remain intact. No playback source or stylesheet changed for this repair.

Luna's helper review found that a resume very close to zero could make a reset indistinguishable from normal movement. The test now waits beyond 30 degrees before pausing, requires each resume checkpoint to be more than 30 degrees from zero, and requires the allowed movement to be less than that distance. A reset to zero therefore exceeds the allowed forward change. An insufficient observation window fails instead of masking the reset.

All six focused audio cases passed after the initial timing repair, then all six passed again after these safeguards (23.4 seconds). These are focused reruns of the affected cases, not a claim that the entire 180 case set was rerun. Root lint passed; the final commit gate also checks formatting and types.

[GPT-6 Luna approved the scoped cleanup](2026-10-05-editor-unused-styles-luna.md) with no stylesheet findings. Its initial review preceded completion of the browser run and explicitly records that limit. The linked addendum records its separate helper finding and subsequent resolution review.

## Follow up characterization

The same scan characterized other large stylesheets without editing them:

| Stylesheet | Importing owners | Candidate whole unused rules | Required treatment |
| --- | ---: | ---: | --- |
| Secret Letter renderer | 5 | 14 | Review obsolete locked artwork and verify public, locked, preview, and thumbnail consumers before cleanup |
| Landing page | 3 | 13 | Global selectors require manual ownership review, so the editor pruning procedure does not apply unchanged |
| Audio player | 2 | 4 | Keep the visible YouTube styles while the accepted spec versus later behavior decision remains unresolved |
| Authentication forms | 3 | 3 | Review unused divider and session panel styles against recovery and credential consumers |

These are candidates, not verified removals. The broader source/style cohesion review and final repository acceptance audit remain open. The existing same model cross check preference governs the implementation contract; this milestone also has the requested independent Luna implementation review.
