# Landing link composition, 2026-10-05

The six landing control uses now import explicit presentation from a plain feature owner, `landing-link-styles.ts`. Announcement, sign in, sign up, hero start, category prompt, and catalog recovery retain their existing text, hrefs, shared anchor semantics, feature hooks, and final palette. The hero no longer needs important utility overrides. This implements [the focused contract](../specs/0022-repository-structure/0022-landing-link-composition.md) under the existing 0009 ownership rule.

## Source preservation

The stylesheet edit removes only listed control selector arms from 46 affected rules/groups. Prompt child logo/text layout and all other selector arms remain. A parsed comparison with the committed source verifies all 202 retained rules have identical context, selectors, declarations, importance, and order after normalizing line endings. [The selector audit](2026-10-05-landing-link-selector-audit.json) records the removed declarations and retained signature hash.

The first signature comparison failed on CRLF versus LF in multiline selectors, without a semantic change. The corrected comparison normalizes line endings only. It does not normalize away declaration changes.

Primary control composition shares its static colors, border, spacing, state, and transition utilities. Final font/line height classes occur after the shared classes so class merging preserves their intended line height. Feature spacing aliases differ from default Tailwind spacing; literal values are used where necessary to preserve the rendered size. Surrounding layout, artwork, server data, immutable version behavior, and application routes are unchanged.

## Baseline and verification

Before runtime edits, six engine/profile cases captured 18 computed properties on six controls at five widths (320, 390, 768, 1024, 1440). The [baseline evidence](2026-10-05-landing-link-baseline.json) and permanent fixture retain the Chromium property strings. Firefox/WebKit differ in subpixel line height serialization; the comparator permits less than 0.02 pixels for that property and exact strings for the other 17. These are control property checks, not full pixel comparisons, geometry acceptance, or provider proof.

The first post migration comparison failed all six profiles. It exposed broader `transition-colors` properties, line height removed by class merging, and extra transparent shadow layers. Runtime composition was corrected with explicit color transition property, correctly ordered line height classes, and a raw box shadow property. The baseline remained unchanged. The corrected comparison passed all six profiles in 32.8 seconds.

The existing landing foundation and new comparison/state cases then passed all 84 profiles/cases in 2.0 minutes, covering keyboard reachability, responsive overflow, long content, preview focus return, disabled JavaScript, forced colors, reduced scrolling, and existing feature effects. That run includes normal hover/pressed colors and transforms. Earlier intermittent WebKit preview evidence remains historical; this run passed its preview cases without a runtime change.

The initial test attempted `test.use({ reducedMotion })`, which is not a supported typed Playwright fixture field. The compiler gate rejected it. It had not activated reduced motion during the capture/run, so the baseline is described as normal control properties. A corrected reduced context then made the normal baseline comparator fail on the existing global reduced duration (`1e-05s` versus `0s`), while all six state cases passed. The final tests explicitly emulate the original normal preference for comparison and both preferences for hover/motion suppression. The baseline and runtime were unchanged by these fixture corrections. The final corrected focused run passed all 12 cases in 59.4 seconds, covering all three engines at both profile sizes.

The existing announcement/header small target dimensions are deliberately preserved. They are not claimed to satisfy the separate 44 pixel target acceptance. This milestone closes those controls' presentation ownership, while retaining wider 0009 accessibility, performance scope, and other outstanding repository requirements.

## Final gates and review

The existing landing performance budget passed both Chromium profiles in 6.3 seconds. Both measured 203,644 decoded stylesheet bytes, 1,184,750 decoded client JavaScript bytes, ten font requests totaling 428,152 bytes, and zero observed layout shift. [The measurements](2026-10-05-landing-link-performance.json) retain assets and observation windows. These are fixture landing measurements, not compressed transfer sizes or all route performance proof.

The normal production build passed all three build tasks, with fresh web output and cached API/database tasks. A fresh direct web route generation and type check passed afterward. Repository lint, formatting, and type gates passed, with fresh web lint/types and six cached workspace tasks in each Turbo gate. Formatting checked all configured maintained paths. [GPT-6 Luna approved](2026-10-05-landing-link-composition-luna.md) the source and evidence without findings; its browser result references are author reported.
