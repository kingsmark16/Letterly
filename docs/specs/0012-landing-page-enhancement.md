**Status**: Proposed

## Summary

This decision updates the Letterly landing page to match the supplied Story Studio reference. It adds clearer product education while keeping templates and capabilities sourced from the existing catalog API. The change stays inside the current Next.js route, adds no database migration, and preserves the existing preview, create, loading, empty, and error behavior.

## Context

The current landing page has a useful first proof with a hero, catalog, three steps, privacy copy, and a final action. It does not yet explain the full creator and visitor journeys, the optional capabilities, or the distinction between a page creator and a recipient as clearly as the supplied design.

The reference uses a strong editorial composition with a split product preview, a trust strip, a dynamic template gallery, a capability timeline, two connected journeys, privacy explanation, frequently asked questions, and a wide final action. The current product has only a small catalog contract, so the page must not invent categories, template capabilities, usage numbers, testimonials, prices, or other unsupported data.

## Requirements

**User stories**:

- As a new visitor, I want to understand Letterly before signing in so that I can decide whether it fits the message I want to create.
- As a creator, I want to compare real templates and capabilities so that I can start the right page flow.
- As a recipient, I want to understand privacy and response behavior so that I know what happens when I open a shared page.

**Acceptance criteria**:

- **AC-1**: The home route presents the approved composition in order: navigation, hero with creator and recipient preview, trust strip, dynamic template discovery, capability explanation, creator and visitor paths, privacy and safety, FAQ, final action, and footer.
- **AC-2**: Categories, template names, descriptions, and capabilities are rendered from the existing catalog response. No future category, fake statistic, testimonial, logo, price, rating, or unsupported capability is shown.
- **AC-3**: Every available template keeps working Preview and Use this template actions with the existing preview route and safe creator start path.
- **AC-4**: The page explains only confirmed product behavior: drafts are private, creators choose when to publish, password protection is optional, visitors do not need accounts, visitor replies are private to the creator, and public pages can be reported.
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

Keep `apps/web/app/page.tsx` as the route entry, preserve `apps/web/lib/catalog.ts` and the existing template preview component, and add server rendered presentation components and CSS that follow the supplied Story Studio reference.

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

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/categories` | GET | none | category catalog items | public | unavailable catalog state |
| `/api/v1/templates?categoryKey=confession` | GET | category key | template catalog items and latest capabilities | public | unavailable catalog state |

No new endpoint is introduced.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Render category heading | category name and description | `CategoryCatalogItem` from `/api/v1/categories` |
| Render template cards | name, description, category, and display order | `TemplateCatalogItem` from `/api/v1/templates` |
| Render capability labels | latest version capability keys | `TemplateCatalogItem.versions.at(-1)` and the existing capability label map |
| Open preview | encoded template key and preview start path | existing `TemplatePreviewDialog` and `createTemplateStartPath` |
| Start creation | template version identifier | latest catalog version identifier |
| Explain privacy | confirmed product rules | blueprint reference and existing public and creator flows |
| Render loading and recovery | request state | existing `getLandingCatalog` result and `Status` component |

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
2. Add CSS and small presentational components for the creator and recipient preview, template artwork, trust strip, capability timeline, journey paths, privacy card, FAQ, and final action, satisfying **AC-1** and **AC-6**.
3. Keep catalog rendering, preview links, creator start paths, and status recovery states connected to the existing data and components, satisfying **AC-2**, **AC-3**, and **AC-5**.
4. Remove the duplicate catalog request and verify server rendered performance boundaries, satisfying **AC-7**.
5. Update and extend Playwright coverage for content, responsive behavior, reduced motion, FAQ interaction, and recovery states, satisfying **AC-8**.

## Consequences

**Positive**:

- New visitors can understand both creator and visitor experiences before signing in.
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
