# 0022. Landing link presentation ownership

## Summary

Landing announcement, header, hero, category prompt, and catalog recovery links will express control presentation through explicit utilities on the canonical Link. The feature stylesheet retains surrounding layout, artwork, and prompt child composition. This implements the existing 0009 rule while preserving the current final cascade.

## Requirements

- AC-1: Preserve the current six landing link uses, their text, hrefs, focus, attributes, normal and hover colors, typography, spacing, borders, responsive behavior, and reduced motion behavior.
- AC-2: Transfer primitive base and state declarations to one plain feature utility owner. Remove obsolete selector arms for migrated links and the hero's important utility overrides. Retain other selector arms and prompt child rules unchanged.
- AC-3: Capture the actual pre migration computed styles at 320, 390, 768, 1024, and 1440 pixels across Chromium, Firefox, and WebKit. Compare the same measured properties after migration; record any intentional difference separately before accepting it.
- AC-4: Preserve server rendering, exact catalog/version behavior, routes, template artwork, legal content, and feature motion hooks. Pass existing keyboard, unavailable recovery, disabled JavaScript, responsive, and performance checks plus root gates and independent review.

## Decision

Use direct named imports from a plain `landing-link-styles.ts` owner for six explicit compositions. Utility values come from the current final feature cascade, not a redesign. Preserve the existing announcement and header compact minimum sizes as compatibility evidence rather than claiming complete 44 pixel target acceptance. Remove migrated selector arms through a parsed stylesheet edit, keeping grouped native/other selector arms and all unrelated declarations in order. Keep prompt child text/logo layout in the feature module. No new primitive variant or runtime dependency is required.

Implementation skills: architect, develop, Vercel React best practices (direct imports and server composition), antislop UI/human (preserved design and keyboard behavior), and check review.

## Value sourcing

| Value | Source |
| --- | --- |
| Link visual and responsive declarations | Final applicable rules in landing `page.module.css`, hero caller utilities, and pre migration browser measurements |
| Focus and safe anchor semantics | Existing shared Link |
| Text, href, and motion attributes | Existing landing composition and catalog recovery owner |
| Palette and tokens | Existing inherited landing custom properties and canonical token aliases |

## Consequences

There is one explicit presentation owner for landing controls, without old and new cascade paths competing. Retained prompt children and native controls remain feature owned. This milestone does not redesign typography or resolve separate legacy target sizes, template motion decisions, or full 0009 acceptance.

## Build plan

1. Capture current rendered control properties and caller/selector ownership.
2. Move final control declarations to explicit utility compositions, remove superseded selector arms, and preserve unrelated CSS.
3. Compare rendered properties and run focused behavior, performance, build, lint, format, types, and independent review before committing.

## References

[0009](../0009-design-system-ui-foundation/index.md) governs utility composition and CSS coexistence. [The preceding link milestone](0022-shared-link-composition.md) establishes canonical refs and footer ownership. The available blueprint working reference governs rendering and accessibility; the original DOCX comparison is skipped at your direction.
