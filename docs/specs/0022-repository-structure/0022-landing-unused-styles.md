# Landing unused style cleanup

Date: 2026-10-05

**Status**: Accepted

## Contract

Keep landing component ownership and the existing cascade. Remove only whole rules whose every selector branch requires an unused positive local class, after reviewing all three importing owners and the motion consumer. Retain global selectors, functional selectors, escaped selectors, mixed active selectors, keyframes, and conditions unchanged. Do not relocate rules or rewrite selector branches.

The current TypeScript ownership scan finds 26 used classes across landing-page, template-showcase, and frequently-asked-questions, with no escaped stylesheet objects or dynamic lookups. LandingEffects selects data attributes, rather than constructing stylesheet class names. The candidate scan identifies 23 whole rules. Global html and BlurText span selectors require preservation and are excluded from pruning.

## Verification

Record owner hashes and removed selectors. Compare every retained rule, its declarations, enclosing conditions, and relative order against committed HEAD after normalizing line endings. Run the existing landing, performance baseline, and legal dialog browser cases through a production fixture build across three engines and two widths. Keep performance budgets immutable and preserve no script navigation, reduced motion, keyboard behavior, catalog states, and focus restoration. Run the root gates and a requested GPT-6 Luna review before committing. Record all limits, including fixture providers and any unrelated failure.

This implements the accepted repository cleanup without a new design or product decision. The same model spec cross check preference governs the contract, while the requested independent Luna implementation review remains separate.
