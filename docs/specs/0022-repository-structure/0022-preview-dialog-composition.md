# Catalog preview dialog composition

Date: 2026-10-04

**Status**: Accepted

## Decision

Colocate template preview dialog, content, and styles with the catalog preview feature. Public preview and landing routes import that owner directly. Registered template rendering, exact version identity, draft creation, and route fallback keep their existing contracts.

Dialog accepts optional typed classNames for content, header, title, and description. Each slot merges caller utilities with its canonical base through cn. Keep its existing className root API, DOM structure, labels, native lifecycle, and default styles. Slots expose presentation composition without feature states or template copy in the shared package.

The catalog preview supplies static Tailwind layout utilities to those slots and its root. Remove descendant selectors targeting shared Dialog internals. Retain template preview art and capability/content CSS locally. The existing 70 rem desktop cap and 52 rem height cap become canonical large dialog tokens. Preserve desktop centering and compact header typography.

The old compact preview inset frame contradicts spec 0009's full screen native dialog contract. Resolve it in favor of that accepted requirement: at widths through 48 rem, the preview occupies the viewport with no border or round corners. Its content remains a bounded grid with the preview region scrolling internally. Check short screens and the exact 768 px boundary. No second modal, custom focus trap, or additional dependency is introduced.

## Acceptance

- Default Dialog consumers remain compatible; slot conflict tests prove caller utilities win and do not leak onto the dialog HTML element.
- Preview files have one catalog owner and no imports from the former generic component paths. Exact registered preview versions and safe fallback routes remain valid.
- Preview feature CSS has no selectors targeting the shared root, wrapper, header, title, description, or close control. Content and template art remain local.
- Actual production browser checks cover desktop centering, the full screen compact boundary, short screens, internal scrolling, close visibility, keyboard behavior, and both launch templates in the supported engines.
- Unit, lint, formatting, type, build, fixture, and unchanged performance gates pass. Legal layout overrides and other spec 0009 acceptance remain open.

## Evidence

Implementation and acceptance evidence are recorded in [the preview composition report](../../reviews/2026-10-04-preview-dialog-composition.md). All 54 native browser cases and 94 fixture cases pass. Preview composition has one catalog owner and no remaining shared Dialog descendant selectors. Legal and wider acceptance remain open.
