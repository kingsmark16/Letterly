**Status**: In Progress

## Summary

This decision updates the Letterly landing page with premium romantic stationery art direction, requested on November 6, 2026. It uses a split editorial hero, a readable sample letter in a rose envelope, a quiet moments strip, catalog discovery, four concise creation steps, FAQ, a final invitation, and the existing footer. The change stays inside the current Next.js route, adds no database migration, and preserves the existing preview, create, loading, empty, and error behavior.

### November 2026 visual revision

This revision supersedes the earlier Story Studio composition and scroll stack requirements below. The user's subsequent November 6 request replaces the earlier pale palette and static treatment with deep berry surfaces, rose accents, GSAP animation, interactive graphics, and a WebGL silk field. Retain local Fraunces and Manrope fonts. No ivory, cream, beige, or warm white background is a project requirement. Do not infer that direction from the romantic identity or reinstate it without a new user request. The existing blueprint frontend and accessibility rules remain authoritative.

The hero sample is explicitly labeled as a sample, never a testimonial or a claim about submitted user content. Its paper, envelope folds, wax seal, and botanical are HTML, CSS, and SVG. No new raster assets, dependencies, services, or font requests are required. Typography and spacing supply the premium character. Shadows communicate physical paper depth. Rose is reserved for stationery and actions.

The gallery uses a responsive grid. The latest user revision keeps category selection and cursor paging on the root landing route with `#templates`. Read active categories and a bounded 20-item template page in parallel; preserve the current-version catalog contract and all template actions. Category links show their selected state, reset cursor state when changed, and work without JavaScript. This supersedes the earlier four-per-category landing preview and links to separate browse pages. Every card has a static engraved border with finite GSAP tracing on entry and interaction. A single shared WebGL overlay follows the hovered or keyboard-focused card, caps output at 350,000 pixels, and releases GPU resources when inactive. Keep overlays transparent in the center and unable to intercept input. The latest How Letterly works revision preserves the four instructions as an ordered list and adds an interactive stationery illustration. Hover, focus, or tap selects one of four scenes: choosing a design, writing, previewing on a phone, and sharing a sealed letter. GSAP owns finite scene and ink transitions. A shared native WebGL field interpolates the selected phase, caps output at 350,000 pixels, and settles when idle. Reduced motion and absent WebGL retain usable instructions and artwork; native step anchors remain functional without JavaScript. This supersedes the earlier static four-column step presentation. A client motion shell receives server rendered content and uses GSAP for section entrance choreography. The latest artwork revision removes the sample opening button and its open and close state. The message is visible by default in a textured SVG envelope with layered pink paper, shaded folds, fine edge highlights, and an embossed wax seal. A finite entrance and fine pointer depth retain GSAP motion; reduced motion shows the finished composition immediately. The caption has no background panel. A native WebGL shader renders a restrained rose silk field with pointer response; it is decorative and never contains essential content. Cap its pixel density and frame rate, pause it offscreen or when the tab is hidden, dispose GPU resources, and handle unavailable or lost contexts. The latest border revision adds a static engraved hero frame with heart knots and botanical corners, enhanced by a native WebGL edge shimmer. Share the canvas lifecycle with silk, cap the border at 800,000 pixels, and retain the vector frame without WebGL or motion. The latest user revision removes the pause control. Silk settles after four seconds of visible entrance motion and responds on pointer input; system reduced motion still disables it. The hero centers within the viewport space below the header, scales artwork for desktop height, and stacks centered content with natural scrolling on mobile. Preserve existing lazy preview mounting, focus handling, and real navigation fallback. All content remains readable without JavaScript or animation.

Verification covers 320 through 1440 pixel reflow, landscape, reduced motion, forced colors, meaningful keyboard focus, native FAQ interaction, empty and error recovery, preview focus containment, and no JavaScript preview routes. Automated accessibility checks supplement visual inspection. Historical performance and link style baseline JSON files remain unchanged; the link checks now verify interaction, targets, and destinations instead of the superseded visual geometry.

## Context

The current landing page has a useful first proof with a hero, catalog, and final action. The landing surface should stay focused rather than growing into a long education page; detailed product questions remain available through the FAQ and existing flows.

The reference uses a strong editorial composition with a split product preview, a trust strip, a dynamic template gallery, a capability timeline, two connected journeys, privacy explanation, frequently asked questions, and a wide final action. The current product has only a small catalog contract, so the page must not invent categories, template capabilities, usage numbers, testimonials, prices, or other unsupported data.

## Requirements

**User stories**:

- As a new visitor, I want to understand Letterly before signing in so that I can decide whether it fits the message I want to create.
- As a creator, I want to compare real templates and capabilities so that I can start the right page flow.
- As a recipient, I want to understand privacy and response behavior so that I know what happens when I open a shared page.

**Acceptance criteria**:

- **AC-1**: The home route presents navigation, a split hero with a labeled sample letter, a moments strip, dynamic template discovery, four creation steps, FAQ, final action, and footer, in that order.
- **AC-2**: Categories, template names, descriptions, and capabilities are rendered from the existing catalog response. No future category, fake statistic, testimonial, logo, price, rating, or unsupported capability is shown.
- **AC-3**: Every available template keeps working Preview and Use this template actions with the existing preview route and safe creator start path.
- **AC-4**: Any product behavior explained on the landing page or FAQ is limited to confirmed behavior: drafts are private, creators choose when to publish, password protection is optional, visitors do not need accounts, visitor replies are private to the creator, and public pages can be reported.
- **AC-5**: Catalog loading, empty, and error states remain visible, understandable, and recoverable without changing the API contract.
- **AC-6**: The page remains usable at 390, 768, 1024, and 1440 pixel widths, with semantic headings, keyboard access, visible focus, at least 44 pixel touch targets, and reduced motion support.
- **AC-7**: The page is server rendered from the existing route, does not add client state for static content, does not duplicate catalog requests, and does not add a new API or database model.
- **AC-8**: Browser coverage verifies the reference headings, catalog actions, education sections, FAQ interaction, responsive reflow, reduced motion, and existing recovery states.

## Options considered

### Option 1: Extend the existing page in place

Keep the current route, catalog fetch, preview dialog, and status components, then replace the composition and copy.

**Pros**:

- Smallest change surface
- Preserves working routes and failure behavior
- Fits the tracer bullet delivery approach

**Cons**:

- The page module and stylesheet become larger
- The reference visual needs new presentational components

### Option 2: Build a parallel landing route and switch later

Create a second route and migrate traffic after comparison.

**Pros**:

- Allows side by side comparison
- Easy to roll back by changing the entry link

**Cons**:

- Duplicates catalog and accessibility behavior
- Adds maintenance and test cost with no measured need

### Option 3: Replace the home route with a client side landing application

Move the landing experience to a client component with local state for sections and catalog data.

**Pros**:

- More freedom for animated interactions

**Cons**:

- Delays meaningful content
- Adds hydration and bundle cost
- Weakens the existing server rendered catalog and no JavaScript fallback

## Decision

**Chosen option**: Option 1: Extend the existing page in place.

Keep `apps/web/src/app/page.tsx` as the route entry, preserve the catalog reader at `apps/web/src/features/catalog/server/catalog.ts` and the existing template preview component, and add server rendered presentation components and CSS that follow the supplied Story Studio reference.

**Implementation skills**: `web-design-guidelines` (`vercel-labs/agent-skills`, `.agents/skills/web-design-guidelines/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

The landing page is already a working proof of the catalog and creator entry path. Replacing its route or data flow would increase risk without improving the product decision. Extending it in place lets the new composition explain the product while retaining the API driven catalog, safe start paths, preview dialog, and recovery states already covered by browser tests.

The reference is treated as an art direction and information architecture source, not as permission to invent product facts. Real catalog values remain authoritative, and static education is limited to behavior documented in the blueprint and existing application code.

## Feature design

**Data model sketch**:

No data model change. The page consumes the existing `CategoryCatalogItem` and `TemplateCatalogItem` values. The latest template version supplies capabilities. No user, page, response, or template records are written by the landing route.

**State transitions**:

No new state machine. The existing catalog states remain loading, available, empty, and error with retry.

**API surface**:

| Endpoint                                   | Method | Key inputs   | Key outputs                                    | Auth   | Key errors                |
| ------------------------------------------ | ------ | ------------ | ---------------------------------------------- | ------ | ------------------------- |
| `/api/v1/categories`                       | GET    | none         | category catalog items                         | public | unavailable catalog state |
| `/api/v1/templates?categoryKey=confession` | GET    | category key | template catalog items and latest capabilities | public | unavailable catalog state |

No new endpoint is introduced.

**Value sourcing**:

| Action                      | Value produced or displayed                    | Source                                                                      |
| --------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| Render category heading     | category name and description                  | `CategoryCatalogItem` from `/api/v1/categories`                             |
| Render template cards       | name, description, category, and display order | `TemplateCatalogItem` from `/api/v1/templates`                              |
| Render capability labels    | latest version capability keys                 | `TemplateCatalogItem.versions.at(-1)` and the existing capability label map |
| Open preview                | encoded template key and preview start path    | existing `TemplatePreviewDialog` and `createTemplateStartPath`              |
| Start creation              | template version identifier                    | latest catalog version identifier                                           |
| Explain privacy             | confirmed product rules                        | blueprint reference and existing public and creator flows                   |
| Render loading and recovery | request state                                  | existing `getLandingCatalog` result and `Status` component                  |

**Key invariants**:

- The landing page never displays internal identifiers or technical version numbers.
- Unsupported or missing catalog capabilities are omitted rather than guessed.
- The landing route never exposes private creator, page, response, storage, or moderation data.
- The template preview and creator start paths remain safe same origin paths.
- Static educational copy cannot claim pricing, usage, reviews, or guarantees that have no source.

**Security model**:

The home page is public. Catalog reads are public. Creation and preview links hand off to existing authentication and route boundaries. No session, token, private page content, or visitor response is read or persisted by the landing page.

**Configuration required**:

None.

**Critical test scenarios**:

- Happy path: render the new landing composition with the fixture catalog, verify real template names and actions, verifies **AC-1**, **AC-2**, **AC-3**, and **AC-8**.
- Empty catalog: render the empty state and its useful next step, verifies **AC-5**.
- Catalog failure: render the error state and retry link, verifies **AC-5**.
- Responsive: verify no horizontal overflow and readable sections at mobile, tablet, and desktop widths, verifies **AC-6**.
- Reduced motion: verify the page remains readable with reduced motion enabled, verifies **AC-6**.
- FAQ: open and close questions with keyboard input, verifies **AC-8**.

## Build plan

1. Replace the home route composition with the supplied Story Studio information architecture and product truthful copy, satisfying **AC-1** and **AC-4**.
2. Add CSS and small presentational components for the creator and recipient preview, template artwork, FAQ, and final action, satisfying **AC-1** and **AC-6**.
3. Keep catalog rendering, preview links, creator start paths, and status recovery states connected to the existing data and components, satisfying **AC-2**, **AC-3**, and **AC-5**.
4. Remove the duplicate catalog request and verify server rendered performance boundaries, satisfying **AC-7**.
5. Update and extend Playwright coverage for content, responsive behavior, reduced motion, FAQ interaction, and recovery states, satisfying **AC-8**.

## Consequences

**Positive**:

- New visitors can reach template discovery, product answers, and the creator entry path without a long detour.
- The visual hierarchy follows the supplied reference while keeping product data truthful.
- The existing API and route boundaries remain unchanged.

**Negative / tradeoffs**:

- The home page stylesheet and presentational markup become larger.
- CSS based product previews are illustrative and cannot replace a full interactive editor preview.

**Neutral**:

- Future categories and templates will appear through the existing catalog when published, without hardcoded landing changes.

## Follow-up

- [ ] Add dedicated policy routes and links when the production privacy, terms, safety, and contact pages are finalized.
- [ ] Add real approved product imagery only after an asset source and licensing decision exists.

## Migration plan

**Strategy**: no migration needed

**Phases**:

1. Ship the route and stylesheet update with the existing catalog contract.
2. Verify the browser journeys at desktop and mobile widths.

**Rollback**: revert the landing route and stylesheet commit. No database or API rollback is required.

**Risks**: the larger visual surface may expose responsive or content overflow issues, so the browser checks must include narrow widths and long catalog text.
