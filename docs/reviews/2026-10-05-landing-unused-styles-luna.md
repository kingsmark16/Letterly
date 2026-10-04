# Review, landing-unused-styles, 2026-10-05

**Reviewed by**: GPT-6 Luna (author on GPT-6)
**Scope**: 3 files, uncommitted
**Verdict**: Approve

## Summary

The cleanup removes 23 whole rules from the shared landing stylesheet after checking its three direct importers and the `LandingEffects` consumer. The removed rules require unused positive local classes; shared and functional selectors, global rules, keyframes, and mixed active selector groups remain. I found no cascade or behavior risk in the scoped change.

## Strengths

- The audit records all three importing owners, source hashes, 26 used classes, removed selectors, and the normalized retained cascade comparison.
- `LandingEffects` operates on `data-reveal`, `data-spotlight`, and `data-magnetic` attributes and does not create stylesheet class names. The only dynamic inline styles are pointer-effect custom properties, unrelated to the removed rules.
- Removed grouped selectors have no live local-class branch: shared utility selectors such as `.brandIcon` and `.heroActions` occur only alongside an unused local class. Functional skip-link, navigation, FAQ, reveal, focus, and reduced-motion selectors remain.
- Global `html` and `BlurText span` rules were excluded from pruning, consistent with the accepted contract.

## Test coverage

The production landing/legal browser matrix across three engines and two widths was still running during this review. The retained-cascade audit reports 232 rules with declarations, conditions, and order matching after line-ending normalization; I have not treated the in-progress browser run or subsequent performance baseline run as completed verification.
