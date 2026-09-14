# 0019. Dashboard overview redesign

**Date**: 2026-09-15
**Status**: In Progress

## Summary

This decision redesigns the authenticated dashboard overview around the next useful action: continue an existing page or start a new one. It keeps the current page, response, catalog, authentication, and recovery behavior, while replacing the crowded overview composition with a compact romantic workspace built from the existing Tailwind and shadcn foundation. The result uses real data only, with small GSAP entrance motion as progressive enhancement.

## Context

The current `/dashboard` route already has a sound data path. `DashboardHome` reads the Better Auth session, loads owner page summaries through TanStack Query, loads recent submissions for the latest pages, and receives the public catalog from the server route. It also has separate loading, empty, error, retry, sign in, and catalog recovery states. Those contracts must remain stable because the dashboard is part of the authenticated creator journey.

The current overview asks one page to carry a greeting, a large prompt panel, four summary tiles, a page list, a privacy explanation, a response list, and a template gallery. The content is truthful, but the first decision is not clear. A visual refresh that adds more cards, charts, or decorative controls would increase scanning cost and could imply activity that the API does not measure.

The visual source is the existing landing page implementation and `apps/web/design.md`. The dashboard needs the same deep plum ink, cranberry action color, blush surfaces, Fraunces headings, Manrope interface text, visible focus treatment, and restrained paper motif. It should remain calmer than the public templates and must not become a warm peach theme, a glass surface, or a generic analytics screen.

> ⚠️ Premise note: "Modern and interactive" can lead to decorative motion and controls that do not help a creator work. The right framing is a focused overview with real routes and recovery actions, plus short entrance motion that clarifies hierarchy without becoming a second editor or inbox.

## Requirements

**User stories**:

1. As an authenticated creator, I want to see what I can continue or create next so that the overview helps me take one useful action immediately.
2. As an authenticated creator, I want to reach my latest pages and private replies from the overview so that I do not have to search through decorative sections.
3. As an authenticated creator, I want to preview and use a real Letterly template so that I can start a page from the same workspace.
4. As a creator on a phone or keyboard, I want the dashboard to remain readable and operable so that the redesign does not reduce access to my private work.

**Acceptance criteria** (the contract):

1. **AC-1**: `/dashboard` keeps its existing authentication boundary, metadata, server catalog loading, TanStack Query page loading, submission loading, route destinations, and safe error behavior. No API, database, session, or persistence contract changes are introduced.
2. **AC-2**: The first viewport presents a concise greeting, a real `Create a page` action, and a primary continuation surface. When at least one page exists, that surface uses the most recently updated `PageSummary` and offers `Open editor`. When no page exists, it offers a clear template start action. The page does not use a chart, fake activity, fake statistics, or a default four tile summary grid.
3. **AC-3**: The overview lists real page summaries with recipient label, trusted template name, status, and updated date. Every page action points to an existing editor, response, preview, or pages route. Main letter content, passwords, storage keys, and private settings are never rendered.
4. **AC-4**: The recent replies section uses real `OwnerSubmissionSummary` values from the existing owner submission routes. It identifies unread state with text and a non-color cue, shows the page label and date, and links to the existing selected response route. It never exposes visitor identity or response content beyond the existing safe summary.
5. **AC-5**: Template cards use the server supplied catalog name, description, category, capabilities, and latest template version. Existing Preview and Use template actions remain available through the existing dialog and creator start path. No unsupported capability, rating, usage number, testimonial, or image is added.
6. **AC-6**: Page loading, page failure, page empty, recent reply loading, recent reply failure, recent reply empty, catalog failure, catalog empty, unauthenticated, and session pending states remain distinct, concise, perceivable, and recoverable. Each failure state names the affected content and provides its existing retry or next route when one exists.
7. **AC-7**: The visual system uses the existing Letterly tokens through Tailwind utilities and source owned shadcn style components. It uses plum, cranberry, blush, rose, surface, border, and ink tokens. It does not use gradients, glassmorphism, glow, neon, peach or sand as a primary theme, random decorative assets, or a second dashboard color system.
8. **AC-8**: Dashboard entrance motion uses the installed GSAP React integration in a scoped client enhancement. It uses a short timeline with opacity and small transform changes, respects `prefers-reduced-motion`, reverts on unmount, and has no infinite loop, pointer parallax, scroll driven animation, or motion over readable text. All content remains available when the enhancement fails.
9. **AC-9**: The layout works at 390, 768, 1024, and 1440 CSS pixels without horizontal overflow. Desktop keeps restrained side navigation, tablet keeps usable workspace navigation, and mobile uses the compact navigation with stacked content. Interactive targets are at least 44 pixels, focus is visible, headings are semantic, and status is not communicated by color alone.
10. **AC-10**: The redesign does not add client persistence, new browser storage, a new image or font request, a new API request for aggregate analytics, or a heavy animation dependency beyond the already installed GSAP packages. Remote data remains owned by TanStack Query and route state remains owned by Next.js.
11. **AC-11**: Browser coverage verifies the real authenticated overview, primary continuation action, empty and populated page states, response links, template preview and start actions, recovery states, mobile reflow, no horizontal overflow, keyboard focus, and reduced motion behavior. The changed surface passes the web design guideline review and the project contrast checker.
12. **AC-12**: The overview is compact without becoming cramped. Repeated explanatory copy is removed, section descriptions are limited to one short line or omitted, nested cards are avoided, and list rows use spacing instead of tiny decorative borders. Borders remain for major surface boundaries, control boundaries, focus, and error states. Shared shadcn primitives and Tailwind utilities are reused before adding new local primitives.

## Options considered

### Option 1: Refine the existing overview in place

Keep the current `/dashboard` route, query orchestration, shell, and feature boundaries. Replace the overview composition with focused presentational sections and add a small scoped motion component.

**Pros**:

1. Preserves the authenticated data and recovery behavior that already works.
2. Keeps the change small enough for the project tracer bullet approach.
3. Makes rollback a single code change with no route or data migration.

**Cons**:

1. The existing large component needs a careful split so visual code does not keep growing in one file.
2. Old overview selectors and browser assertions must be updated without weakening behavior coverage.

### Option 2: Add a parallel overview and switch it with a feature flag

Build a second overview composition beside the current one, render one version by configuration, and remove the old path after comparison.

**Pros**:

1. Allows a temporary visual comparison and fast runtime rollback.
2. Keeps the current markup available during review.

**Cons**:

1. Duplicates a private data surface and its loading and error state matrix.
2. Adds a feature flag and a second responsive implementation without a measured rollout need.

### Option 3: Replace the dashboard shell and route tree

Rebuild the sidebar, route entries, overview, and related creator screens as a new application shell.

**Pros**:

1. Gives the visual redesign full control over application chrome.
2. Could establish a new shell for future settings and account routes.

**Cons**:

1. Expands a visual enhancement into an authentication, navigation, and route migration.
2. Risks regressions in editor, response, mobile, and sign out behavior that are outside this decision.

## Decision

**Chosen option**: Option 1: Refine the existing overview in place.

The build keeps the existing dashboard route and data contracts, extracts the overview into focused feature components, and uses Tailwind and the current shadcn style primitives for a compact romantic workspace that makes continuation or creation the first decision. Borders communicate real hierarchy rather than adding texture, and spacing plus typography carry most of the structure. (basis: `apps/web/AGENTS.md`, `apps/web/design.md`, specs 0003, 0008, and 0009)

**Implementation skills**: `antislop` (`miqdadbadjuber/anti-slop`, `.agents/skills/antislop/`) · `antislop-code` (`miqdadbadjuber/anti-slop`, `.agents/skills/antislop-code/`) · `antislop-copywriting` (`miqdadbadjuber/anti-slop`, `.agents/skills/antislop-copywriting/`) · `antislop-human` (`miqdadbadjuber/anti-slop`, `.agents/skills/antislop-human/`) · `antislop-layoutmobile` (`miqdadbadjuber/anti-slop`, `.agents/skills/antislop-layoutmobile/`) · `antislop-ui` (`miqdadbadjuber/anti-slop`, `.agents/skills/antislop-ui/`) · `gsap-core` (`greensock/gsap-skills`, `.agents/skills/gsap-core/`) · `gsap-react` (`greensock/gsap-skills`, `.agents/skills/gsap-react/`) · `gsap-performance` (`greensock/gsap-skills`, `.agents/skills/gsap-performance/`) · `gsap-timeline` (`greensock/gsap-skills`, `.agents/skills/gsap-timeline/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `web-design-guidelines` (`vercel-labs/agent-skills`, `.agents/skills/web-design-guidelines/`)

## Rationale

The current route already has the right private data boundary, query ownership, server catalog path, and recovery states. Refactoring its presentation keeps those working contracts intact and lets the redesign solve the real issue, which is decision hierarchy. A parallel route would duplicate the same sensitive states, while a shell rewrite would expose unrelated journeys to visual regression risk. (basis: strangler pattern for live systems, progressive enhancement, and the existing dashboard contracts)

The first viewport will prioritize the latest real page or the first template action. Page rows, response rows, and template actions remain direct routes or existing dialogs, so interaction is useful rather than decorative. The landing visual language supplies the palette and editorial paper motif, while the dashboard remains calmer through restrained motion, compact spacing, selective borders, and short copy. (basis: `apps/web/design.md`, antislop UI and human guidance)

## Feature design

**Data model sketch**:

No data model change. The overview reads the existing authenticated `PageSummary`, `OwnerSubmissionSummary`, `CategoryCatalogItem`, `TemplateCatalogItem`, and Better Auth session projections. It does not add fields, tables, mutations, browser persistence, or aggregate analytics.

**State transitions**:

No new business state machine. Existing session states remain pending, authenticated, or unauthenticated. Existing page, submission, and catalog queries remain pending, successful, empty, or failed. A background refetch keeps the last confirmed view until the query resolves.

**UI composition and component inventory**:

1. `DashboardShell` and `DashboardSidebar` keep their authentication, navigation, sign out, skip link, and responsive behavior. Their visual spacing and active states may be refined, but no link is added without a real destination.
2. `DashboardOverviewHeader` provides the greeting and one `Create a page` action with no explanatory paragraph that repeats the landing page.
3. `ContinuePageCard` is the first focal surface. It renders the latest real page when available, with template, status, updated date, `Open editor`, and an existing response route when applicable. With no pages, it renders a concise `Browse templates` action.
4. `PageListSection` renders the latest page summaries and a route to `/dashboard/pages`. It uses status text plus a shape or icon and does not show a fake response count.
5. `ResponseListSection` renders the existing recent response summaries and route to the selected response view. It retains loading, failure, empty, and partial failure behavior.
6. `TemplateRail` or an equivalent compact catalog section reuses `TemplatePreviewDialog`, `Button`, `Card`, `Badge`, and `Separator`. It keeps Preview and Use template actions connected to the current catalog values.
7. `PrivacyNote` remains a small readable reminder linked to `/privacy`, not a large promotional panel.
8. `DashboardMotion` is a client only enhancement around the overview root. It owns one short GSAP timeline and no data or business state.

The page has one visual identity motif, a quiet CSS paper and letter fold preview derived from existing markup. It uses no new image, video, illustration, or generated asset. The visual dials are low energy, editorial rhythm, and restrained motion. The reason for the paper motif is to connect the work surface to the landing page without covering creator content.

**Density and surface rules**:

1. Use `Card` for the main continuation surface and major content groups, with spacing and surface contrast doing most of the separation.
2. Use `Separator` only between major groups. Do not place a one pixel divider on every page row, reply row, stat line, or nested block.
3. Keep outer borders for meaningful surfaces, dialogs, inputs, focus, and errors. Remove decorative inner borders and stacked card outlines.
4. Prefer compact padding and vertical gaps from the existing spacing tokens. Do not repeat an eyebrow, heading, description, and action when one heading and one action communicate the same job.
5. Use the local shadcn source files in `apps/web/src/components/ui` and Tailwind utilities through `cn`. Add a primitive only when an existing primitive cannot express the needed accessible state.

**API surface**:

No new endpoint is introduced. Existing reads remain the source of truth.

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/auth/get-session` | GET | Better Auth browser session | user id, name, email, session state | Better Auth session | pending, unauthenticated, safe auth failure |
| `/api/v1/pages` | GET | `size=50`, existing optional status and cursor inputs | `PageListResponse` with safe page summaries and cursor | authenticated owner session | 401, validation error, safe transport failure |
| `/api/v1/pages/:pageId/submissions` | GET | latest page id, `filter=all`, `size=3` | safe submission summaries and unread count | authenticated page owner | 401, safe 404, validation error, safe transport failure |
| `/api/v1/categories` | GET | none | validated category catalog | public server catalog read | unavailable catalog state |
| `/api/v1/templates?categoryKey=confession` | GET | `categoryKey=confession` | validated template catalog and capabilities | public server catalog read | unavailable catalog state |

The web layer continues to use the existing centralized API client and catalog loader. It does not call the API from visual presentational components.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Render greeting | First name | `authClient.useSession().data.user.name`, reduced by the existing `getFirstName` helper |
| Render continuation | Latest page recipient label, template name, status, and updated date | First item from the existing page list response, whose owner list contract orders pages by updated time, plus `PageSummary` fields |
| Render page rows | Recipient label, template name, status, and updated date | `PageSummary` values from `listPages` |
| Render page actions | Editor, response, and full pages destinations | Existing page id and current route contracts |
| Render recent replies | Page label, submission date, read state, answer count, and private message indicator | `OwnerSubmissionSummary` from `listSubmissions` plus its owning page id and recipient label |
| Render catalog cards | Category, name, description, capability labels, and latest version id | `getCatalog`, `CategoryCatalogItem`, `TemplateCatalogItem`, and `capabilityLabels` |
| Render dates | User locale date text and machine readable `dateTime` | Existing ISO timestamps formatted by `Intl.DateTimeFormat` |
| Render loading and errors | Query specific state, safe error text, and recovery action | TanStack Query state and existing `WebApiError` handling |
| Render motion | Final or enhanced visual state | DOM refs, `useGSAP`, `gsap.matchMedia`, and `prefers-reduced-motion` |
| Render copy | Short workspace labels and actions | This spec, `apps/web/design.md`, and confirmed product behavior in the blueprint reference |

**Key invariants**:

1. `/dashboard` remains a private owner surface. No page list, response summary, session value, or catalog action bypasses the existing API and authentication boundary.
2. The overview displays only real values from the named sources. It does not infer engagement, growth, response totals across unqueried pages, or historical activity.
3. Every interactive control has a real destination or real state change. Decorative paper elements are not interactive.
4. Existing query data remains in TanStack Query memory only. The redesign adds no `localStorage`, `sessionStorage`, cookies, analytics payloads, or client side copies of private content.
5. The layout uses the shared token system and does not add a dashboard specific palette, gradient, glass surface, glow, or warm peach treatment.
6. Motion is optional. Server rendered text and the final layout remain usable without JavaScript enhancement and under reduced motion.
7. The layout reflows at the required widths and never depends on a fixed desktop canvas or clipped horizontal content.
8. The new overview keeps existing editor, response, template, sign out, and privacy destinations stable.
9. Borders are reserved for real hierarchy or state. Removing a decorative border must not remove a visible focus ring, an error boundary, or the boundary of a control that needs it.

**Security model**:

Only the authenticated page owner may read the page summaries and owner submission summaries returned by the existing API. The browser does not become an authorization boundary. The overview renders safe summary fields only and never requests or displays main letter text, passwords, storage keys, private response content, visitor identity, or internal authorization values. Catalog reads remain public and contain trusted template metadata only. No compliance scope beyond the project's existing privacy and security rules is introduced.

**Configuration required**:

None. The build uses existing Tailwind tokens, shadcn style primitives, GSAP packages, Better Auth client behavior, and API configuration.

**Critical test scenarios**:

1. Happy path: an authenticated fixture with pages and recent replies sees the new continuation surface, opens the editor, opens a selected reply, previews a template, and starts a template. Verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**.
2. First use: an authenticated fixture with no pages sees the concise empty continuation action, page empty state, response empty state, and catalog actions without fake metrics. Verifies **AC-2**, **AC-5**, **AC-6**, **AC-7**.
3. Failure recovery: page, submission, and catalog failures identify the affected content and expose the existing retry or next route. Verifies **AC-1**, **AC-6**.
4. Responsive: the page has no horizontal overflow and maintains the intended stacked or side by side layout at 390, 768, 1024, and 1440 pixels. Verifies **AC-9**, **AC-10**.
5. Keyboard, contrast, and density: all actions are reachable with visible focus, statuses are understandable without color, text and controls pass the project contrast checker, and the final page has no decorative row border noise or repeated explanatory blocks. Verifies **AC-7**, **AC-9**, **AC-11**, **AC-12**.
6. Reduced motion: the final overview is visible without spatial movement and all controls work when `prefers-reduced-motion` is enabled. Verifies **AC-8**, **AC-9**, **AC-11**.
7. Boundary check: the changed web files do not import database clients, write browser storage, render raw HTML, or expose private content. Verifies **AC-1**, **AC-3**, **AC-4**, **AC-10**.

## Build plan

1. [x] Extract the current dashboard query orchestration and state matrix from the large overview component into focused feature presentational components without changing query keys, API inputs, auth behavior, or route destinations. Satisfies **AC-1**, **AC-3**, **AC-4**, **AC-6**.
2. [x] Replace the overview composition with the header, continuation surface, page list, response list, privacy note, and compact catalog sections. Use the existing Tailwind tokens and shadcn style primitives, remove the generic four tile summary treatment, remove repeated explanatory copy, reduce inner borders, and preserve real catalog actions. Satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-7**, **AC-12**.
3. [x] Refine the authenticated shell and compact navigation only where needed to support the new composition, preserving skip links, active navigation, sign out, footer links, responsive behavior, and valid destinations. Satisfies **AC-1**, **AC-7**, **AC-9**.
4. [x] Add the scoped `DashboardMotion` enhancement with `useGSAP`, a short timeline, transform and opacity only, `gsap.matchMedia` for reduced motion, and cleanup on unmount. Do not add `ScrollTrigger` because the dashboard has no scroll driven interaction that needs it. Satisfies **AC-8**, **AC-10**.
5. [x] Update the dashboard browser fixtures and assertions for populated, empty, error, retry, mobile, keyboard, and reduced motion states. Verify real clicks for editor, responses, template preview, template start, and retry. Satisfies **AC-5**, **AC-6**, **AC-9**, **AC-11**.
6. [x] Run the web design guideline review against the changed files, run `antislop-human` contrast checks, inspect 200 percent zoom and forced colors, review border and content density at each target width, then run the web lint, type check, build, and relevant Playwright suite. Satisfies **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**.

## Consequences

**Positive**:

1. The first viewport gives the creator one clear next action using real page data.
2. The landing page and dashboard share the romantic design language without making the private workspace theatrical.
3. Existing API, auth, privacy, and route contracts remain unchanged.
4. Motion and visual polish stay progressive and maintainable within the installed stack.

**Negative / tradeoffs**:

1. The redesign does not provide analytics or an account wide response total because those values are not available from the current contracts.
2. The overview remains limited to the current page list and recent page response queries until a measured need justifies an aggregate endpoint.
3. Splitting the current component and changing browser selectors adds short term implementation and test maintenance.
4. Removing explanatory copy and inner borders makes the page less forgiving if later content is added without respecting the density rules.

**Neutral**:

1. No database migration, API deployment, feature flag, new asset pipeline, or new font request is needed.
2. Existing public template motion and editor presentation remain outside this dashboard decision.
3. Settings and Account links remain absent until real routes and behavior exist.

## Follow-up

1. [x] Enroll this dashboard overview redesign as a tracked scope slice before `/develop` marked the work in progress.
2. [ ] Keep the current dashboard response aggregation behavior under review. Add an account wide summary endpoint only after a concrete product need and measured query cost exist.

## References

**Project sources**:

1. Root `AGENTS.md` and `apps/web/AGENTS.md` for architecture, accessibility, query ownership, and route boundaries.
2. `apps/web/design.md` for Letterly palette, typography, dashboard behavior, responsive rules, and required states.
3. Specs 0003, 0008, 0009, and 0012 for authenticated dashboard contracts, response privacy, shared UI foundation, and landing visual direction.
4. Installed `antislop`, GSAP, React performance, and web design guideline skills listed in the Decision section.

**Practices and standards**:

1. Strangler pattern for live visual enhancements.
2. Progressive enhancement for motion and client only behavior.
3. WCAG AA contrast, keyboard access, visible focus, and reduced motion support.
4. Real data only, with no fabricated analytics or interaction states.
