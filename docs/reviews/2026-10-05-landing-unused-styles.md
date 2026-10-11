# Landing unused stylesheet verification

Date: 2026-10-05

## Result

Removed 23 obsolete whole rules from the shared landing stylesheet, reducing it from 1823 to 1682 lines. The removed selectors belong to presentation that already moved to component styles or no longer exists. All 232 retained rules keep their declaration text, enclosing conditions, and relative order. This cleanup changes no markup, layout values, template registration, client boundaries, animations, keyframes, or product behavior.

## Ownership and cascade

The [audit artifact](2026-10-05-landing-unused-styles.json) records all three actual stylesheet importers, owner hashes, 26 used classes, source hashes, and removed selectors. TypeScript syntax tree inspection found no stylesheet object escaping and no computed lookup. LandingEffects selects data attributes and changes pointer custom properties, rather than generating local class names.

Every removed selector branch requires an unused positive local class. Global selectors, functional selectors, escaped selectors, and mixed active groups were excluded. This deliberately retains some obsolete branches where safe whole rule removal cannot be established. The global html scroll rules and animated title span rules remain intentional. After formatting and CRLF normalization, the retained rule comparison against committed HEAD matched all 232 rules exactly.

## Verification

The production build passed. The landing and legal browser matrix at widths 390 and 1440 across Chromium, Firefox, and WebKit completed with 89 passes and one failure. The WebKit compact template preview case clicked Preview but did not observe its dialog within five seconds. Its trace recorded a completed click without a scheduled navigation, while the error snapshot remained on the landing page. The cause was not established from that evidence.

Without changing application or test code, a focused rerun of that case passed all six browser projects in 20.5 seconds. This supports the cleanup's bounded verification but does not prove that the intermittent interaction is resolved. It is not a claim that a single 90 case run passed. All other matrix cases passed, covering reduced motion, pointer decoration, keyboard catalog navigation, responsive reflow, forced colors, no script preview routes, legal scrolling, and focus restoration.

Both existing desktop and mobile Chromium performance budget cases passed in 4.4 seconds against the immutable baseline. These measure transferred CSS, client JavaScript, font identity and requests, and layout shift. Source line reduction alone is not a performance measurement.

Root lint, formatting, and type checks passed. [GPT-6 Luna approved the scoped cleanup](2026-10-05-landing-unused-styles-luna.md) with no findings; its review preceded completed browser results. Provider and catalog data used local fixtures. Overall repository restructuring remains in progress, including wider accessibility, package and transitive graph review, and the pending YouTube behavior decision.
