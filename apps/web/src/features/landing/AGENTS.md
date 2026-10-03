# Landing feature

The root app/page.tsx owns dynamic routing, viewport metadata, search parameters, fixture gating, catalog loading, and error selection. It renders the server LandingPage composition. Presentation does not import route entry files or server catalog readers.

## Ownership

- landing-page.tsx owns the shell, hero, header, and footer composition.
- components/floating-letter-field.tsx owns decorative randomized quotes; hero-context-section.tsx owns context icons and connectors.
- components/template-showcase.tsx owns category navigation, template artwork, cards, and catalog empty/error presentation. Preview orchestration remains in the catalog feature.
- components/how-letterly-works.tsx and frequently-asked-questions.tsx own their content sections.
- landing-catalog.ts contains plain DTO types. landing-catalog-fixture.ts contains the existing long content fixture, imported only by the server route and selected only with LETTERLY_UI_TEST_FIXTURES=1.
- page.module.css owns the landing cascade. Preserve rule order until a measured style cleanup deliberately changes it.

Existing client boundaries are landing-effects, how-it-works-progress, and template-scroll-stack, plus imported interactive controls. Keep the extracted presentation on the server and use direct imports.

## Verification

landing-foundation.spec.ts is selected by both routine fixture and cross engine UI configurations. Preserve catalog states, no script links, keyboard and preview focus, reduced motion, responsive reflow, and the immutable performance baseline. A 320 px viewport check does not prove actual browser zoom.
