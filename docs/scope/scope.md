# Scope: Letterly Confession Platform

Letterly lets an authenticated creator build and share a private or public confession page. The first release supports users of any age and contains only the Confession category.

The first release has exactly two templates, Secret Letter and Choose Your Heart. The first launch is a private beta. The main success measure is that a creator publishes and shares a first page.

**Build approach:** Tracer Bullet (prove one narrow real path through the database, API, interface, and user experience before adding breadth).
**Workflow:** GA (run `/architect`, `/develop`, `/check verify`, `/test`, `/check review`, `/document`, and `/sync` in that order for each meaningful feature).

_Every box is a suggested next action. You can skip a check when you understand the tradeoff. A load bearing design decision should still be written in a spec before coding it._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack and architecture | Foundation | done |
| 2 | Coding standards and tooling | Foundation | done |
| 3 | Data model | Foundation | in-progress |
| 4 | Design system and UI foundation | Foundation | planned |
| 5 | Authenticated Secret Letter draft loop | Slice 1 | in-progress |
| 6 | Public Secret Letter publishing | Slice 2 | planned |
| 7 | Secret Letter media | Slice 3 | planned |
| 8 | Protected links and QR sharing | Slice 4 | planned |
| 9 | Visitor responses and creator dashboard | Slice 5 | planned |
| 10 | Choose Your Heart template | Slice 6 | planned |
| 11 | Launch hardening and administration | Slice 7 | planned |

## Foundations

### 1. Stack and architecture, done

Choose the technical structure and create a runnable project skeleton for the web application, API, shared contracts, database access, and local development.

**Done when:** the architecture is recorded in a spec, the project scaffold boots locally, and the empty web and API applications pass their first build.

- [x] Decide the stack and architecture: `/architect stack and architecture`
- [x] Scaffold from the decision: `/develop stack and architecture`
- [x] Verify it: `/check verify stack and architecture`
- [x] Test it: `/test stack and architecture`
- [x] Review it: `/check review stack and architecture`
- [x] Document it: `/document stack and architecture`
- [x] Sync it: `/sync`

Spec [0001](../specs/0001-stack-and-architecture.md) · code in `apps/`, `packages/`, `.github/workflows/ci.yml`

### 2. Coding standards and tooling, done

Capture conventions from the real scaffold and install the tools that keep later code consistent and easy to review.

**Done when:** the project guidance describes the actual codebase, and formatting, linting, type checking, tests, and the selected Git checks have clear commands.

- [x] Capture conventions and tooling: `/audit`
- [x] Establish lint, type check, test, build, and CI commands

### 3. Data model, in-progress

Define the core relational entities and template content boundaries that support creators, categories, templates, pages, media, and responses.

**Done when:** the data model records ownership, lifecycle, template versioning, privacy boundaries, and safe deletion behavior without requiring a redesign for the two launch templates.

- [x] Design the data model (spec): `/architect data model`
- [ ] Build it: `/develop data model`
  - [ ] Add the shared template registry, catalog seed, creator owned pages, slug reservations, lifecycle, and safe public projection. Covers AC-1 through AC-7 and AC-13.
  - [ ] Add creator owned media records, attachment rules, processing states, variants, and safe cleanup boundaries. Covers AC-2, AC-8, and AC-15.
  - [ ] Add ordered branching questions, visitor submissions, answers, separate messages, response ownership, and destructive edit rules. Covers AC-9 through AC-11 and AC-14.
  - [ ] Add encrypted page passwords, Redis proof contracts, rate limits, report records, and privacy boundaries for users of any age. Covers AC-12, AC-13, AC-15, and AC-16.
  - [ ] Validate migrations, constraints, registry compatibility, transaction boundaries, and failure behavior against the complete model. Covers AC-1 through AC-16.
- [ ] Verify it: `/check verify data model`
- [ ] Test it: `/test data model`
- [ ] Review it (fresh model): `/check review data model`
- [ ] Document it: `/document data model`
- [ ] Sync durable context: `/sync`

Spec [0002](../specs/0002-data-model/index.md) · code in `packages/database/`, `packages/templates/`, and `apps/api/src/modules/catalog/`

### 4. Design system and UI foundation, planned, needs a decision

Define the visual language, accessible layout rules, responsive behavior, and reusable interface pieces used by the dashboard, editor, and public pages.

**Done when:** the design rules cover typography, color, spacing, focus states, keyboard use, reduced motion, empty states, errors, and the first reusable components.

- [ ] Design the UI foundation: `/architect design system and UI foundation`

## Slice 1: Authenticated Secret Letter draft loop

### 5. Authenticated Secret Letter draft loop, in-progress

Create the first thin real path through the system. A creator signs in, chooses Confession and Secret Letter, enters a small message, saves a draft, and sees that draft in the creator dashboard.

**Done when:** a real authenticated user can create, save, reopen, and delete a Secret Letter draft through the web interface, with data persisted by the API and database.

- [x] Design the first vertical slice (spec): `/architect authenticated Secret Letter draft loop`
- [ ] Build it: `/develop authenticated Secret Letter draft loop`
  - [ ] Add shared contracts, private client data infrastructure, and authenticated create and save API behavior. Covers AC-1 through AC-4 and AC-8 through AC-10.
  - [ ] Build safe OAuth continuation and the accessible Secret Letter editor. Covers AC-1 through AC-4, AC-6, and AC-8 through AC-10.
  - [ ] Build private dashboard listing, reopening, and permanent deletion. Covers AC-5 through AC-10.
  - [ ] Complete failure, privacy, accessibility, and integration coverage. Covers AC-1 through AC-10.
- [ ] Verify it: `/check verify authenticated Secret Letter draft loop`
- [ ] Test it: `/test authenticated Secret Letter draft loop`
- [ ] Review it (fresh model): `/check review authenticated Secret Letter draft loop`
- [ ] Document it: `/document authenticated Secret Letter draft loop`
- [ ] Sync durable context: `/sync`

Spec [0003](../specs/0003-authenticated-secret-letter-draft-loop.md) · partial code in `apps/api/src/modules/auth/`, `apps/web/src/features/auth/`, and `apps/api/src/modules/catalog/`

## Slice 2: Public Secret Letter publishing

### 6. Public Secret Letter publishing, planned, needs a decision

Allow a creator to preview a draft, choose a random or custom slug, publish it, and open the same Secret Letter through a public URL.

**Done when:** only a page owner can publish or unpublish a page, an active published page renders for an anonymous visitor, unavailable pages return a safe state, and public pages have correct metadata.

- [ ] Design public publishing: `/architect public Secret Letter publishing`

## Slice 3: Secret Letter media

### 7. Secret Letter media, planned, needs a decision

Add optional creator owned images and audio to Secret Letter pages. Browser previews and safe upload authorization should work before adding advanced media processing.

**Done when:** an owner can upload allowed images, see them in the editor and public page, receive clear validation errors for invalid files, and pass ownership checks through the complete upload path.

- [ ] Design Secret Letter media: `/architect Secret Letter media`

## Slice 4: Protected links and QR sharing

### 8. Protected links and QR sharing, planned, needs a decision

Let creators protect a published page with a password and share its canonical public URL through a QR code.

**Done when:** a locked page does not reveal confession content, an incorrect password is handled safely, a correct password unlocks only that page for a short time, and the QR code encodes the canonical URL without including the password.

- [ ] Design protected links and QR sharing: `/architect protected links and QR sharing`

## Slice 5: Visitor responses and creator dashboard

### 9. Visitor responses and creator dashboard, planned, needs a decision

Add an optional private response form for supported pages and show submitted responses only to the page creator.

**Done when:** a visitor can submit a validated response, rate limits and duplicate protection work, the creator can read response status in the dashboard, and no visitor response is exposed to another creator or anonymous visitor.

- [ ] Design visitor responses and the creator dashboard: `/architect visitor responses and creator dashboard`

## Slice 6: Choose Your Heart template

### 10. Choose Your Heart template, planned, needs a decision

Build the second launch template as an independent template with its own question schema, editor, renderer, progress experience, and private response flow.

**Done when:** a creator can create and publish a Choose Your Heart page, a visitor can complete its supported question flow, and the two templates remain independently validated and rendered.

- [ ] Design Choose Your Heart: `/architect Choose Your Heart template`

## Slice 7: Launch hardening and administration

### 11. Launch hardening and administration, planned, needs a decision

Prepare the private beta with moderation controls, user and page disabling, reports, audit records, security review, accessibility review, backups, policies, and production monitoring.

**Done when:** abusive or invalid content can be disabled, sensitive data is protected by documented authorization rules, critical flows have automated coverage, recovery and privacy policies are documented, and staging sign off is complete.

- [ ] Design launch hardening and administration: `/architect launch hardening and administration`

## Deferred

The following remain outside the first release:

1. Birthday and Anniversary categories.
2. Additional confession templates.
3. Payments, subscriptions, page credits, and paid feature gates.
4. Custom domains.
5. Custom HTML, JavaScript, or unrestricted CSS.
6. AI generated page layouts.
7. Native mobile applications.
8. Scheduled reveal dates until the core page lifecycle is stable.
9. Public search and indexing of confession pages. Public pages should be marked `noindex` by default because their content is sensitive.
10. Commercial music uploads. Audio should be limited to creator owned or properly licensed files.
11. Database backed draft creation idempotency until real usage shows duplicate drafts or creation gains external side effects.

## Launch assumptions

The first release is English only. It is free to use and supports users of any age. Safety, reporting, privacy, moderation, and legal review are required before public launch. The initial beta uses privacy focused product analytics and error monitoring, avoids storing sensitive confession content in analytics events, and keeps creator dashboards, sessions, drafts, locked content, and visitor responses private.

## Legend

**Needs a decision** means `/architect` should create a spec before implementation. A feature without that tag can use existing project decisions and proceed through `/develop`.

**Build approach** means each slice should be real through every layer. Do not complete all interface work before connecting the database and API.

**Workflow** is the recommended quality path after development. The first working lesson may be lighter while you learn, but authentication, privacy, media ownership, and public access should receive the full quality path.
