# 0009. Design system and UI foundation verification

## Token and package checks

- [x] Token values have one canonical definition in `packages/ui`.
- [x] `@repo/ui/tokens.css` is an explicit package export, the web app imports it, and Tailwind aliases variables without duplicate literal values.
- [x] The token schema includes color, type, spacing, shape, depth, motion, focus, target, backdrop, and breakpoint values.
- [x] Fonts load from checked in licensed WOFF2 assets with system fallbacks, `display: "swap"`, and recorded license sources.
- [x] The primitive package passes lint and type checks.

## Behavior checks

- [x] Landing page proof works at 1440 px and 390 px, with checks at 768 px and 1024 px, using the responsive behavior table.
- [x] Keyboard navigation, visible focus, forced colors, 200 percent zoom, labels, dialog initial focus, focus containment, inert background, Escape, scroll restoration, focus return, and linked errors work.
- [x] Buttons, fields, cards, dialogs, statuses, and icon controls follow the state matrix and use caller supplied recovery actions.
- [x] Long text, long capability labels, long errors, unbroken tokens, and optional content wrap safely without horizontal overflow or broken spacing.
- [x] Reduced motion removes spatial movement while preserving content and feedback.
- [x] Core landing content remains usable when JavaScript motion or enhancement code fails, including a real preview link fallback.
- [x] Dashboard, editor, and public template chrome each pass a shared primitive import compatibility check without route, API, database, auth, or rendering boundary changes.
- [x] Landing catalog behavior preserves `getLandingCatalog`, both paths, both schemas, server rendering, `force-dynamic`, `no-store`, metadata, and safe unavailable and empty states.

## Required test layers

- [x] Vitest primitive unit and type tests, including state matrix, accessible names, and dialog behavior.
- [x] Web and package lint and type checks, plus an import boundary check for network, storage, analytics, raw HTML, and sensitive logging.
- [x] Playwright desktop and mobile journeys for the landing proof and key states at 390, 768, 1024, and 1440 px.
- [ ] Automated accessibility checks plus manual keyboard, forced colors, zoom, and reduced motion checks.
