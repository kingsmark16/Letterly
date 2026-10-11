# 0022. Shared link consumer composition

## Summary

Preview and footer consumers will express link presentation through explicit utility classes. The shared Link will retain anchor refs so legal dialog triggers can use the canonical primitive without losing focus restoration. This implements the existing ownership rule in 0009 and preserves current navigation and appearance.

## Requirements

- AC-1: Preview back links preserve their route, text, target size, margin, wine color, small typography, bold weight, and underline. The CSS Module retains surrounding layout only.
- AC-2: Footer navigation links preserve their current color, typography, hover color, focus outline, minimum target, and route. One footer utility composition is reused by landing, dashboard, and legal triggers; ancestor CSS no longer selects their primitive declarations.
- AC-3: Legal triggers remain real `/privacy` and `/terms` anchors, keep click and Space enhancement, and preserve native dialog support detection, anchor refs, Escape closure, and focus restoration. Auth uses the same primitive with explicit utilities preserving its distinct compact/full footer styling and responsive ranges; its ancestor selectors no longer override legal Links.
- AC-4: Shared Link accepts and passes an anchor ref using the repository's React 19 props model. Existing import paths, href/target/rel behavior, accessible DOM, and caller class merging remain unchanged.
- AC-5: Production browser checks cover preview, landing and dashboard footer computed styles, keyboard focus, legal focus return, compact layout, and normal document fallbacks. Unit checks cover the ref behavior; lint, formatting, type checks, production build, and the existing performance budget pass.

## Decision

Use the current `@repo/ui/link` owner and React 19 anchor ref props. Keep footer utility composition in a small plain module next to the shared footer, imported directly by its consumers. Add an optional legal trigger class prop and merge it through the canonical Link. Remove the obsolete trigger CSS and generic footer anchor selectors only after every caller is updated. Preview margin remains local layout while its primitive presentation uses explicit utilities. This is a focused rollout; the landing header and hero cascade are a subsequent consumer migration.

Implementation skills: develop, Vercel React best practices (direct imports and server composition), antislop UI/human (preserved design, keyboard and focus), and check review. No runtime library or provider is introduced.

## Value sourcing

| Value | Source |
| --- | --- |
| Preview appearance | Existing preview `backLink` declarations and canonical token aliases |
| Footer appearance | Existing `site-footer.module.css` anchor declarations and inherited landing variables with current fallbacks |
| Legal href, labels, interaction, refs | Existing legal dialog trigger implementation |
| Auth footer appearance and responsive ranges | Existing compact/full footer anchor declarations in `sign-in-form.module.css`, composed locally in the existing auth owner |
| Anchor ref and safe external rel | Shared Link props and current safe rel implementation |

## Consequences

Shared primitive state styles can no longer be silently replaced by footer descendant selectors. Consumers must explicitly apply the footer composition. Native dashboard Next links keep their routing behavior and use that same composition. Legal content, server/client boundaries, template versions, API calls, and authentication behavior do not change.

## Build plan

1. Record computed styles and existing behavior, then add the shared ref contract and footer utility composition.
2. Update every preview/footer/legal caller and remove only the superseded declarations.
3. Verify production browser behavior and style equivalence, package ref behavior, performance, root gates, and independent review.

## References

The approved source is [0009](../0009-design-system-ui-foundation/index.md), especially AC-3, AC-10, AC-11, AC-12, and its CSS coexistence rule. Current remaining consumers are recorded in the [catalog reconciliation inventory](../../reviews/2026-10-05-catalog-contract-reconciliation.md). The blueprint working reference governs rendering and accessibility; its original document comparison is skipped at your direction.
