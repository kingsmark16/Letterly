# 0009. Design system and UI foundation verification

## Token and package checks

- [x] Token values have one canonical definition in `packages/ui`.
- [x] `@repo/ui/tokens.css` is an explicit package export, the web app imports it, and Tailwind aliases variables without duplicate literal values.
- [x] The token schema includes color, type, spacing, shape, depth, motion, focus, target, backdrop, and breakpoint values.
- [x] Fonts load from checked in licensed WOFF2 assets with system fallbacks, `display: "swap"`, and recorded license sources.
- [x] The primitive package passes lint and type checks.

## Tailwind and shadcn revision checks

- [ ] `packages/ui/components.json` records the source owned component configuration and does not create an app local duplicate primitive boundary.
- [ ] `packages/ui/src/lib/utils.ts` exposes the tested `cn` helper, and class conflict tests prove that caller utilities win when conflicts are intentional.
- [ ] Shared primitives use Tailwind utility classes and typed variants, while the existing `@repo/ui` and public subpath import paths, exported prop types, accessible DOM contracts, `data-loading`, `data-variant`, and external loading status placement remain stable.
- [ ] Shadcn semantic aliases, Letterly utility aliases, radius aliases, motion aliases, and target aliases all resolve to the canonical variables in `packages/ui/src/tokens.css`.
- [ ] The web global stylesheet explicitly includes `packages/ui/src` through `@source "../../../packages/ui/src"`, defines the explicit duration and target utilities, and a production build contains every utility used by the shared primitives.
- [ ] The static `tablet`, `desktop`, and `wide` adapters match the three canonical breakpoint variables through an automated token sync check.
- [ ] Retained CSS Modules do not override migrated primitive base, variant, focus, hover, disabled, loading, or error styles; browser checks verify computed styles while old and new styling paths coexist.
- [ ] Shared primitive files no longer require `packages/ui/src/ui.module.css` after their last CSS Module consumer has migrated.

## Behavior checks

- [x] Landing page proof works at 1440 px and 390 px, with checks at 768 px and 1024 px, using the responsive behavior table.
- [x] Keyboard navigation, visible focus, forced colors, 200 percent zoom, labels, dialog initial focus, focus containment, inert background, Escape, scroll restoration, focus return, and linked errors work.
- [x] Buttons, fields, cards, dialogs, statuses, and icon controls follow the state matrix and use caller supplied recovery actions.
- [x] Long text, long capability labels, long errors, unbroken tokens, and optional content wrap safely without horizontal overflow or broken spacing.
- [x] Reduced motion removes spatial movement while preserving content and feedback.
- [x] Core landing content remains usable when JavaScript motion or enhancement code fails, including a real preview link fallback.
- [x] Dashboard, editor, and public template chrome each pass a shared primitive import compatibility check without route, API, database, auth, or rendering boundary changes.
- [ ] Admin chrome and every newly migrated surface render a shared primitive in a browser compatibility check without route, API, database, auth, or rendering boundary changes.
- [x] Landing catalog behavior preserves `getLandingCatalog`, both paths, both schemas, server rendering, `force-dynamic`, `no-store`, metadata, and safe unavailable and empty states.
- [ ] The landing migration and each later surface migration preserve route, API, database, authentication, privacy, and rendering behavior.
- [ ] Secret Letter template art, envelope motion, flowers, paper layout, waveform animation, and reduced motion behavior remain unchanged unless a separate template decision explicitly changes them.

## Required test layers

- [x] Vitest primitive unit and type tests, including state matrix, accessible names, and dialog behavior.
- [x] Web and package lint and type checks, plus an import boundary check for network, storage, analytics, raw HTML, and sensitive logging.
- [x] Playwright desktop and mobile journeys for the landing proof and key states at 390, 768, 1024, and 1440 px.
- [ ] Automated accessibility checks plus manual keyboard, forced colors, actual 200 percent zoom, and reduced motion checks.
- [ ] Chromium, Firefox, and WebKit cover native dialog behavior, with the normal document or route fallback checked when JavaScript enhancement is unavailable.
- [ ] Production style output, class conflict behavior, public subpath compatibility, preserved loading semantics, computed style precedence, and CSS Module compatibility are covered by package tests and browser journeys.
- [ ] A performance baseline records generated CSS, client JavaScript, font requests, and landing CLS at 390 px and 1440 px. Each migrated surface adds no font request, stays within 10 percent of the baseline CSS and client JavaScript size, and does not regress landing CLS by more than 0.02.
