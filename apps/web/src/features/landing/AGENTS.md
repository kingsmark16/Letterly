# Landing feature

The root app/page.tsx owns dynamic routing, viewport metadata, search parameters, fixture gating, catalog loading, and error selection. It renders the server LandingPage composition. Presentation does not import route entry files or server catalog readers.

## Ownership

- November 2026 landing revision: `components/letter-still-life.tsx` owns the visible sample letter, finite entrance, and pointer depth. It has no opening button or open and close state. `components/envelope-artwork.tsx` owns the textured envelope SVG and embossed wax seal with unique definition IDs. `landing-motion.tsx` owns scoped GSAP choreography and the motion control; `romantic-webgl.ts` owns the decorative silk shader and GPU cleanup. Server content and catalog preview ownership remain unchanged. This supersedes the earlier motion ownership notes below.
- Landing colors are scoped tokens, not a permanent product palette restriction. The previous pale background requirement was explicitly removed by the user. Do not infer ivory, cream, beige, or warm white backgrounds from the romantic identity. Preserve shared eyebrow and catalog action exports used by the FAQ and gallery.

- landing-page.tsx owns the shell, hero, header, and footer composition.
- components/floating-letter-field.tsx owns decorative randomized quotes; hero-context-section.tsx owns the context cards, icons, and connector SVG.
- components/template-showcase.tsx owns category navigation, template artwork, cards, and catalog empty/error presentation. Preview orchestration remains in the catalog feature.
- components/how-letterly-works.tsx and frequently-asked-questions.tsx own their content sections. The FAQ introduction and accordion rules live in components/frequently-asked-questions.module.css; shared section framing and eyebrow typography remain in page.module.css.
- landing-catalog.ts contains plain DTO types. landing-catalog-fixture.ts contains the existing long content fixture, imported only by the server route and selected only with LETTERLY_UI_TEST_FIXTURES=1.
- page.module.css owns landing tokens, the shell, shared section framing, and eyebrow/link styles. Section CSS remains beside its component. Follow the current user direction when changing presentation instead of preserving superseded visual overrides.
- The landing catalog reader uses one grouped overview response with at most four current version summaries per active category. Keep the gallery data driven instead of filtering to the launch category.

Active client boundaries are components/landing-motion.tsx, components/letter-still-life.tsx, components/silk-canvas.tsx, and imported interactive controls. Keep catalog reads and static section composition on the server and use direct imports.

## Verification

The shared stylesheet cleanup removed only rules requiring unused positive local classes across all three importers. Global html and animated title span selectors remain intentional. Check all importers and preserve mixed active branches and cascade order in future cleanup.

landing-foundation.spec.ts is selected by both routine fixture and cross engine UI configurations. Preserve catalog states, no script links, keyboard and preview focus, reduced motion, responsive reflow, and the immutable performance baseline. A 320 px viewport check does not prove actual browser zoom.
