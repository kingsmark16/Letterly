# 0009. Design system and UI foundation verification

## Token and package checks

- [x] Token values have one canonical definition in `packages/ui`.
- [x] `@repo/ui/tokens.css` is an explicit package export, the web app imports it, and Tailwind aliases variables without duplicate literal values.
- [x] The token schema includes color, type, spacing, shape, depth, motion, focus, target, backdrop, and breakpoint values.
- [x] Fonts load from checked in licensed WOFF2 assets with system fallbacks, `display: "swap"`, and recorded license sources.
- [x] The primitive package passes lint and type checks.

## Tailwind and shadcn revision checks

- [x] `packages/ui/components.json` records the source owned component configuration and does not create an app local duplicate primitive boundary.
- [x] `packages/ui/src/lib/utils.ts` exposes the tested `cn` helper, and class conflict tests prove that caller utilities win when conflicts are intentional.
- [ ] Shared primitives use Tailwind utility classes and typed variants, while the existing `@repo/ui` and public subpath import paths, exported prop types, accessible DOM contracts, `data-loading`, `data-variant`, and external loading status placement remain stable.
- [x] Shadcn semantic aliases, Letterly utility aliases, radius aliases, motion aliases, and target aliases all resolve to the canonical variables in `packages/ui/src/tokens.css`.
- [x] The web global stylesheet explicitly includes `packages/ui/src` through an explicit production code glob under `packages/ui/src`, defines the explicit duration and target utilities, and a production build contains every utility used by the shared primitives. Evidence: [production utility emission](../../reviews/2026-10-05-shared-ui-contract-coverage.md), 141 static candidates from the eleven primitive owners and control styles, all emitted in the normal production build.
- [x] The static `tablet`, `desktop`, and `wide` adapters match the three canonical breakpoint variables through an automated token sync check.
- [ ] Retained CSS Modules do not override migrated primitive base, variant, focus, hover, disabled, loading, or error styles; browser checks verify computed styles while old and new styling paths coexist.
- [x] Shared primitive files no longer require `packages/ui/src/ui.module.css` after their last CSS Module consumer has migrated. The file is removed, shared source has no remaining import, and production primitive fixtures pass. Evidence: [shared Dialog migration](../../reviews/2026-10-03-shared-dialog-migration.md).

## Behavior checks

- [x] Landing page proof works at 1440 px and 390 px, with checks at 768 px and 1024 px, using the responsive behavior table.
- [x] Keyboard navigation, visible focus, forced colors, 200 percent zoom, labels, dialog initial focus, focus containment, inert background, Escape, scroll restoration, focus return, and linked errors work.
- [x] Buttons, fields, cards, dialogs, statuses, and icon controls follow the state matrix and use caller supplied recovery actions.
- [x] Long text, long capability labels, long errors, unbroken tokens, and optional content wrap safely without horizontal overflow or broken spacing.
- [x] Reduced motion removes spatial movement while preserving content and feedback.
- [x] Core landing content remains usable when JavaScript motion or enhancement code fails, including a real preview link fallback.
- [x] Dashboard, editor, and public template chrome each pass a shared primitive import compatibility check without route, API, database, auth, or rendering boundary changes.
- [ ] Admin chrome and every newly migrated surface render a shared primitive in a browser compatibility check without route, API, database, auth, or rendering boundary changes.
- [x] Current landing catalog behavior preserves `getLandingCatalog`, the bounded `/api/v1/catalog/overview` path and `templateCatalogOverviewResponseSchema`, server rendering, `force-dynamic`, `no-store`, metadata, and safe unavailable and empty states. The previously checked two-read baseline is historical; the later catalog growth contract governs this final acceptance check. Evidence: [catalog contract reconciliation](../../reviews/2026-10-05-catalog-contract-reconciliation.md). This check does not close the wider shared UI state and consumer acceptance checks.
- [ ] The landing migration and each later surface migration preserve route, API, database, authentication, privacy, and rendering behavior.
- [ ] Secret Letter template art, envelope motion, flowers, paper layout, waveform animation, and reduced motion behavior remain unchanged unless a separate template decision explicitly changes them.

## Required test layers

- [x] Vitest primitive unit and type tests, including state matrix, accessible names, and dialog behavior.
- [x] Web and package lint and type checks, plus an import boundary check for network, storage, analytics, raw HTML, and sensitive logging.
- [x] Playwright desktop and mobile journeys for the landing proof and key states at 390, 768, 1024, and 1440 px.
- [ ] Automated accessibility checks plus manual keyboard, forced colors, actual 200 percent zoom, and reduced motion checks.
- [x] Chromium, Firefox, and WebKit cover native dialog behavior, with the normal document or route fallback checked when JavaScript enhancement is unavailable. The 42 case focused suite verifies actual legal and preview consumers at 390 and 1440 px, including disabled JavaScript and unavailable showModal. Evidence: [native browser policy](../../reviews/2026-10-04-native-dialog-browser-policy.md).
- [ ] Production style output, class conflict behavior, public subpath compatibility, preserved loading semantics, computed style precedence, and CSS Module compatibility are covered by package tests and browser journeys.
- [x] A performance baseline records generated CSS responses, client JavaScript responses, font requests, and initial landing CLS at 390 px and 1440 px. The [baseline verification](../../reviews/2026-10-03-shared-ui-performance-baseline.md) records the fixture scope, decoded byte definition, repeated measurements, and evidence. The fixture suite and CI configuration include the budget check.
- [ ] Every migrated surface adds no font request, stays within 10 percent of the baseline CSS and client JavaScript size, and does not regress initial landing CLS by more than 0.02. The gate is implemented; shared primitive migration remains pending.

## Configuration reconciliation, 2026-10-05

The four configuration checks closed above are covered by `apps/web/ui-configuration.test.ts` and `packages/ui/src/lib/utils.test.ts`. They verify generator ownership and stylesheet paths, canonical semantic aliases and breakpoints, and intentional caller class conflicts. Broader style output, consumer behavior, and accessibility checks remain open until their complete acceptance mapping is reviewed. See [shared UI contrast correction](../../reviews/2026-10-05-shared-ui-contrast.md).
