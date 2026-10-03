# Landing feature composition

Date: 2026-10-04

## Decision

Keep app/page.tsx as the dynamic Next route that receives search parameters, gates UI fixtures, loads the catalog, and handles unavailable or loading states. Move its server presentation to src/features/landing/landing-page.tsx and cohesive components for floating decoration, context artwork, catalog showcase, creation steps, and FAQs. Keep catalog DTO types independent of server readers, and isolate existing long content fixture data in its own server imported module.

The source bodies, catalog selection, preview identity, start paths, semantic hierarchy, random decoration, and footer date behavior remain unchanged. Import components directly. Retain current client effect boundaries, lazy previews, no script links, and legal document ownership. No new client directive or broad barrel is added.

Move the complete page stylesheet into the landing feature without changing rule contents or order. Its historical layers, overrides, unused selectors, and shared control composition still need a separate measured cleanup. Do not claim those requirements completed by relocating the file. Correct current design/context pointers while preserving historical review evidence.

This cohesive source split addresses findings 4 and 13 within the repository autopilot authorization. It does not migrate root app to src/app or change the accepted design. Vercel React guidance governs direct imports, static dependencies, and preserved server/client composition.

## Acceptance

- The route contains request and framework responsibilities; presentation has named feature owners with no imports from route entry files.
- Extracted implementation bodies and stylesheet rule contents match their previous source. Catalog fixture gating remains server only. Lint, formatting, types, units, and normal builds pass.
- Production browser checks prove landing catalog states, links, long content, responsive layout, keyboard/legal/preview behavior, and unchanged performance budgets. Record the actual suite scope; a viewport reflow check does not establish actual browser zoom.
- Reconcile current context and record remaining style, accessibility, and full repository acceptance work. Preserve user changes and commit through the selected local gate.
