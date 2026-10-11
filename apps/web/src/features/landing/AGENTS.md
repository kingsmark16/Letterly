# Landing feature

The root app/page.tsx owns dynamic routing, viewport metadata, search parameters, fixture gating, catalog loading, and error selection. It renders the server LandingPage composition. Presentation does not import route entry files or server catalog readers.

## Ownership

- landing-page.tsx owns the shell, hero, header, and footer composition.
- components/floating-letter-field.tsx owns decorative randomized quotes; hero-context-section.tsx owns the context cards, icons, and connector SVG.
- components/template-showcase.tsx owns category navigation, template artwork, cards, and catalog empty/error presentation. Preview orchestration remains in the catalog feature.
- components/how-letterly-works.tsx and frequently-asked-questions.tsx own their content sections. The FAQ introduction and accordion rules live in components/frequently-asked-questions.module.css; shared section framing and eyebrow typography remain in page.module.css.
- landing-catalog.ts contains plain DTO types. landing-catalog-fixture.ts contains the existing long content fixture, imported only by the server route and selected only with LETTERLY_UI_TEST_FIXTURES=1.
- page.module.css owns the remaining shared landing cascade and shared eyebrow/link styles. Component styles and keyframes live beside their owners in components/how-letterly-works.module.css, components/floating-letter-field.module.css, components/hero-context-section.module.css, components/frequently-asked-questions.module.css, and components/template-showcase.module.css. Keep component styles colocated and preserve the remaining cascade order until a measured cleanup deliberately changes it.
- The landing catalog reader uses one grouped overview response with at most four current version summaries per active category. Keep the gallery data driven instead of filtering to the launch category.

Existing client boundaries are landing-effects, how-it-works-progress, and template-scroll-stack, plus imported interactive controls. Keep the extracted presentation on the server and use direct imports.

## Verification

landing-foundation.spec.ts is selected by both routine fixture and cross engine UI configurations. Preserve catalog states, no script links, keyboard and preview focus, reduced motion, responsive reflow, and the immutable performance baseline. A 320 px viewport check does not prove actual browser zoom.
