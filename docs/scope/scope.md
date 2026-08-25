# Scope: Letterly Confession Platform

Letterly lets an authenticated creator build and share a private or public confession page. The first release supports users of any age and contains only the Confession category.

The first release has exactly two templates, Secret Letter and Choose Your Heart. The first launch is a private beta. The main success measure is that a creator publishes and shares a first page.

**Build approach:** Tracer Bullet (prove one narrow real path through the database, API, interface, and user experience before adding breadth).
**Workflow:** GA (run `/architect`, `/develop`, `/check verify`, `/test`, `/check review`, `/document`, and `/sync` in that order for each meaningful feature).

_Every box is a suggested next action. You can skip a check when you understand the tradeoff. A load bearing design decision should still be written in a spec before coding it._

## At a glance

| #   | Feature                                 | Phase      | Status      |
| --- | --------------------------------------- | ---------- | ----------- |
| 1   | Stack and architecture                  | Foundation | done        |
| 2   | Coding standards and tooling            | Foundation | done        |
| 3   | Data model                              | Foundation | done        |
| 4   | Design system and UI foundation         | Foundation | done        |
| 5   | Authenticated Secret Letter draft loop  | Slice 1    | done        |
| 6   | Public Secret Letter publishing         | Slice 2    | done        |
| 7   | Secret Letter media                     | Slice 3    | done        |
| 8   | Protected links and QR sharing          | Slice 4    | done        |
| 9   | Visitor responses and creator dashboard | Slice 5    | done        |
| 10  | Choose Your Heart template              | Slice 6    | done        |
| 11  | Launch hardening and administration     | Slice 7    | in-progress |
| 12  | Guided question builder and branching   | Slice 8    | in-progress |

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

### 3. Data model, done

Define the core relational entities and template content boundaries that support creators, categories, templates, pages, media, and responses.

**Done when:** the data model records ownership, lifecycle, template versioning, privacy boundaries, and safe deletion behavior without requiring a redesign for the two launch templates.

- [x] Design the data model (spec): `/architect data model`
- [x] Build it: `/develop data model`
  - [x] Add the shared template registry, catalog seed, creator owned pages, slug reservations, lifecycle, and safe public projection. Covers AC-1 through AC-7 and AC-13.
  - [x] Add creator owned media records, attachment rules, processing states, variants, and safe cleanup boundaries. Covers AC-2, AC-8, and AC-15.
  - [x] Add ordered branching questions, visitor submissions, answers, separate messages, response ownership, and destructive edit rules. Covers AC-9 through AC-11 and AC-14.
  - [x] Add encrypted page passwords, Redis proof contracts, rate limits, report records, and privacy boundaries for users of any age. Covers AC-12, AC-13, AC-15, and AC-16.
  - [x] Validate migrations, constraints, registry compatibility, transaction boundaries, and failure behavior against the complete model. Covers AC-1 through AC-16.
- [x] Verify it: `/check verify data model`
- [x] Test it: `/test data model`
- [x] Review it (fresh model): `/check review data model`
- [x] Document it: `/document data model`
- [x] Sync durable context: `/sync`

Spec [0002](../specs/0002-data-model/index.md) · code in `packages/database/`, `packages/templates/`, and `apps/api/src/modules/catalog/`

### 4. Design system and UI foundation, done

Define the visual language, accessible layout rules, responsive behavior, and reusable interface pieces used by the dashboard, editor, and public pages.

**Done when:** the design rules cover typography, color, spacing, focus states, keyboard use, reduced motion, empty states, errors, and the first reusable components.

- [x] Design the UI foundation (spec): `/architect design system and UI foundation`
- [x] Build it: `/develop design system and UI foundation`
  - [x] Establish the shared token stylesheet, package export, Tailwind mapping, and licensed local fonts. Covers AC-1 and AC-6.
  - [x] Build the accessible primitives, state matrix, native dialog contract, CSS Module boundary, and package tests. Covers AC-2 through AC-4.
  - [x] Migrate the landing proof while preserving catalog routes, schemas, server rendering, cache behavior, metadata, and recovery states. Covers AC-5 and AC-9.
  - [x] Add dashboard, editor, and public template compatibility checks, then complete responsive, accessibility, reduced motion, and boundary enforcement coverage. Covers AC-7, AC-8, and AC-10.
- [x] Verify it: `/check verify design system and UI foundation`
- [x] Test it: `/test design system and UI foundation`
- [x] Review it (fresh model): `/check review design system and UI foundation`
- [x] Document it: `/document design system and UI foundation`
- [x] Sync durable context: `/sync`

Spec [0009](../specs/0009-design-system-ui-foundation/index.md) · code in `packages/ui/`, `apps/web/app/`, and `apps/web/src/`

## Slice 1: Authenticated Secret Letter draft loop

### 5. Authenticated Secret Letter draft loop, done

Create the first thin real path through the system. A creator signs in, chooses Confession and Secret Letter, enters a small message, saves a draft, and sees that draft in the creator dashboard.

**Done when:** a real authenticated user can create, save, reopen, and delete a Secret Letter draft through the web interface, with data persisted by the API and database.

- [x] Design the first vertical slice (spec): `/architect authenticated Secret Letter draft loop`
- [x] Build it: `/develop authenticated Secret Letter draft loop`
  - [x] Add shared contracts, private client data infrastructure, and authenticated create and save API behavior. Covers AC-1 through AC-4 and AC-8 through AC-10.
  - [x] Build safe OAuth continuation and the accessible Secret Letter editor. Covers AC-1 through AC-4, AC-6, and AC-8 through AC-10.
  - [x] Build private dashboard listing, reopening, and permanent deletion. Covers AC-5 through AC-10.
  - [x] Complete real failure, privacy, accessibility, and integration coverage. Focused HTTP, mocked browser, and the gated real-session, real-database path now cover the draft loop against an isolated Neon test branch. Covers AC-1 through AC-10.
- [x] Verify it: `/check verify authenticated Secret Letter draft loop`
- [x] Test it: `/test authenticated Secret Letter draft loop`
- [x] Review it (fresh model): `/check review authenticated Secret Letter draft loop`
- [x] Document it: `/document authenticated Secret Letter draft loop`
- [x] Sync durable context: `/sync`

Spec [0003](../specs/0003-authenticated-secret-letter-draft-loop.md) · code in `apps/api/src/modules/auth/`, `apps/api/src/modules/pages/`, and `apps/web/src/features/pages/`

## Slice 2: Public Secret Letter publishing

### 6. Public Secret Letter publishing, done

Allow a creator to preview a draft, choose a random or custom slug, publish it, and open the same Secret Letter through a public URL.

**Done when:** only a page owner can publish or unpublish a page, an active published page renders for an anonymous visitor, unavailable pages return a safe state, and public pages have correct metadata.

- [x] Design public publishing: `/architect public Secret Letter publishing`
- [x] Build it: `/develop public Secret Letter publishing`
  - [x] Add shared publish, unpublish, slug change, and public projection contracts, plus slug normalization and stable public error codes. Covers AC-1, AC-2, AC-6, AC-7, AC-8, and AC-14.
  - [x] Implement transactional owner lifecycle commands, public reads, rate limits, safe projections, and deletion reservation handling. Covers AC-1 through AC-7 and AC-12 through AC-15.
  - [x] Build the private preview, creator publish review, lifecycle controls, public server-rendered route, and safe metadata. Covers AC-1 through AC-9, AC-11, AC-12, and AC-15.
  - [x] Add the progressive GSAP Secret Letter motion layer with reduced-motion and no-JavaScript fallbacks. Covers AC-9 through AC-11.
  - [x] Complete unit, API integration, and browser journey coverage for publishing, privacy, failures, concurrency, deletion, metadata, and animation resilience. Covers AC-1 through AC-15.
- [x] Verify it: `/check verify public Secret Letter publishing`
- [x] Test it: `/test public Secret Letter publishing`
- [x] Review it (fresh model): `/check review public Secret Letter publishing`
- [x] Document it: `/document public Secret Letter publishing`
- [x] Sync durable context: `/sync`

Spec [0005](../specs/0005-public-secret-letter-publishing.md) · code in `apps/api/src/modules/pages/`, `apps/api/src/infrastructure/http/rate-limit.service.ts`, `apps/web/app/p/`, `apps/web/src/features/pages/`, and `packages/contracts/`

## Slice 3: Secret Letter media

### 7. Secret Letter media, done

Add optional creator owned images to Secret Letter pages. The browser uploads directly to private storage, while the API verifies, sanitizes, and controls each image before it can be saved or published.

**Done when:** an owner can upload, verify, sanitize, reorder, caption, replace, remove, save, and preview up to ten images, and an anonymous visitor can read all saved images inline on the public page without exposing private storage details.

- [x] Design Secret Letter media: `/architect Secret Letter media`
- [x] Build it: `/develop Secret Letter media`
  - [x] Add PageImage and MediaCleanup persistence, shared contracts, exact media limits, replacement rules, and safe ownership boundaries.
  - [x] Build direct private storage upload, retry and remove lifecycle, checksum verification, image sanitization, output limits, and recoverable processing failures.
  - [x] Extend page Save, owner recovery, ordering, captions, replacement, removal, and private media delivery.
  - [x] Add public inline image delivery, publication checks, rate limits, safe unavailable responses, and the creator upload editor.
  - [x] Add scheduled cleanup, concurrency protection, failure recovery, and complete API and browser coverage.
- [x] Verify it: `/check verify Secret Letter media`
- [x] Test it: `/test Secret Letter media`
- [x] Review it (fresh model): `/check review Secret Letter media`
- [x] Document it: `/document Secret Letter media`
- [x] Sync durable context: `/sync`

Spec [0006](../specs/0006-secret-letter-media.md)

## Slice 4: Protected links and QR sharing

### 8. Protected links and QR sharing, done

Let creators protect a published page with a password and share its canonical public URL through a QR code.

**Done when:** a locked page does not reveal confession content, an incorrect password is handled safely, a correct password unlocks only that page for a short time, and the QR code encodes the canonical URL without including the password.

- [x] Design protected links and QR sharing: `/architect protected links and QR sharing`
- [x] Build it: `/develop protected links and QR sharing`
  - [x] Add the owner canonical URL contract, draft only slug edits, published slug locking, production HTTPS validation, and exact public privacy headers. Covers AC-2, AC-4, AC-8, and AC-9.
  - [x] Build the responsive owner sharing panel with browser generated SVG QR, download, copy fallback, accessibility, and failure states. Covers AC-1, AC-3, AC-5, AC-10, and AC-11.
  - [ ] Verify the existing password, unlock proof, revocation, visitor identity, ownership, and rate limit boundaries through the QR path. Covers AC-6, AC-7, and AC-12.
  - [ ] Add unit, API integration, and Playwright coverage for QR content, lifecycle, privacy, authorization, and fallback behavior. Covers AC-1 through AC-12.
- [x] Verify it: `/check verify protected links and QR sharing`
- [x] Test it: `/test protected links and QR sharing`
- [x] Review it (fresh model): `/check review protected links and QR sharing`
- [x] Document it: `/document protected links and QR sharing`
- [x] Sync durable context: `/sync`

Spec [0007](../specs/0007-protected-links-and-qr-sharing.md) · code in `apps/api/src/modules/pages/`, `apps/web/src/features/pages/`, and `packages/contracts/`

## Slice 5: Visitor responses and creator dashboard

### 9. Visitor responses and creator dashboard, done

Add an optional private response form for supported pages and show submitted responses only to the page creator.

**Done when:** a visitor can submit a validated response, rate limits and duplicate protection work, the creator can read response status in the dashboard, and no visitor response is exposed to another creator or anonymous visitor.

- [x] Design visitor responses and the creator dashboard: `/architect visitor responses and creator dashboard`
- [x] Build it: `/develop visitor responses and creator dashboard`
  - [x] Add the response settings, public response contract, tombstone migration, and stable answer ordering. Covers AC-1, AC-2, AC-6, AC-8, AC-9, AC-11, and AC-18.
  - [x] Complete the API submission transaction, same origin proxy, unlock version check, rate limits, idempotency, ownership, and creator response operations. Covers AC-4 through AC-13 and AC-18.
  - [x] Build minimal question authoring, the visitor response form, and the responsive per page creator dashboard. Covers AC-3, AC-14, AC-15, and AC-17.
  - [x] Add unit, API integration, and Playwright coverage for lifecycle, privacy, concurrency, accessibility, and cross creator isolation. Covers AC-4 through AC-18.
- [x] Verify it: `/check verify visitor responses and creator dashboard`
- [x] Test it: `/test visitor responses and creator dashboard`
- [x] Review it (fresh model): `/check review visitor responses and creator dashboard`
- [x] Document it: `/document visitor responses and creator dashboard`
- [x] Sync durable context: `/sync`

Spec [0008](../specs/0008-visitor-responses-and-creator-dashboard.md) · code in `apps/api/src/modules/pages/`, `apps/web/app/p/`, `apps/web/src/features/pages/`, `packages/contracts/`, and `packages/database/`

## Slice 6: Choose Your Heart template

### 10. Choose Your Heart template, done

Build the second launch template as an independent template with its own question schema, editor, renderer, progress experience, and private response flow.

**Done when:** a creator can create and publish a Choose Your Heart page, a visitor can complete its supported question flow, and the two templates remain independently validated and rendered.

- [x] Design Choose Your Heart: `/architect Choose Your Heart template`
- [x] Build it: `/develop Choose Your Heart template`
  - [x] Data and registry foundation, immutable revisions, starter graph, and lifecycle integration, AC-1, AC-4, AC-5, AC-6, AC-10
  - [x] Graph contracts, validation, owner API, version conflicts, and authorization, AC-2, AC-4, AC-5, AC-11
  - [x] Creator editor with explicit saves, validation feedback, and accessible controls, AC-3, AC-4, AC-14
  - [x] Public projection, visitor journey, result flow, private submissions, protection, and metadata, AC-7 through AC-16
  - [x] Metrics, privacy checks, unit tests, integration tests, and browser journeys, AC-17, AC-18
- [x] Verify it: `/check verify Choose Your Heart template`
- [x] Test it: `/test Choose Your Heart template`
- [x] Review it (fresh model): `/check review Choose Your Heart template`
- [x] Document it: `/document Choose Your Heart template`
- [x] Sync durable context: `/sync`

Spec [0010](../specs/0010-choose-your-heart-template/index.md) · code in `apps/api/src/modules/pages/`, `apps/web/app/p/`, `apps/web/src/features/pages/`, `packages/contracts/`, `packages/templates/`, and `packages/database/`

## Slice 7: Launch hardening and administration

### 11. Launch hardening and administration, in progress

Prepare the private beta with moderation controls, user and page disabling, reports, audit records, security review, accessibility review, backups, policies, and production monitoring.

**Done when:** abusive or invalid content can be disabled, sensitive data is protected by documented authorization rules, critical flows have automated coverage, recovery and privacy policies are documented, and staging sign off is complete.

- [x] Design launch hardening and administration (spec): `/architect launch hardening and administration`
- [ ] Build it: `/develop launch hardening and administration`
  - [x] Add moderation state, appeals, idempotency records, retention claims, audit records, migrations, and safe contracts. Covers AC-1, AC-2, AC-6, AC-9, AC-10, AC-13, and AC-16.
  - [x] Add bootstrap, Better Auth disabled session handling, administrator guard, CSRF and trusted origin checks, public availability predicate, rate limits, and protected API routes. Covers AC-1, AC-3, and AC-8 through AC-13 and AC-15.
  - [ ] Build the public report form and responsive administrator queue, detail, actions, appeals, audit view, privacy states, and accessible recovery behavior. Covers AC-4, AC-5, AC-7, AC-9, AC-12, AC-14, and AC-15.
  - [ ] Add Sentry redaction, safe metrics and logs, retention worker recovery, Neon restore drill, policy evidence, and complete unit, API, concurrency, and Playwright coverage. Covers AC-16 through AC-20.
- [ ] Verify it: `/check verify launch hardening and administration`
- [ ] Test it: `/test launch hardening and administration`
- [x] Review it (fresh model): `/check review launch hardening and administration`
- [ ] Document it: `/document launch hardening and administration`
- [ ] Sync durable context: `/sync`

Spec [0011](../specs/0011-launch-hardening-and-administration/index.md)

## Slice 8: Guided question builder and branching

### 12. Guided question builder and branching, in progress

Make question authoring understandable without exposing internal keys, numeric order, or graph ids. Simple journeys follow the question list, while creators can send an answer to a named question or finish the journey.

**Done when:** an owner can create and reorder questions with guided cards, save readable destinations, publish an explicit finish path, and a visitor reaches the private response area with existing privacy and response protections intact.

- [x] Design guided question builder and branching (spec): `/architect guided question builder and branching`
- [ ] Build it: `/develop guided question builder and branching`
  - [ ] Add finish flags, safe defaults, shared contracts, and public projection fields. Covers AC-4, AC-5, and AC-11.
  - [ ] Update graph validation, owner question mutations, deletion protection, and visitor submission traversal. Covers AC-3, AC-4, AC-5, AC-8, and AC-10.
  - [ ] Build guided question cards, readable destinations, path preview, reorder notice, empty examples, and recoverable saves. Covers AC-1, AC-2, AC-6, AC-7, AC-9, and AC-12.
  - [ ] Add visitor finish state and complete API and browser coverage. Covers AC-4, AC-10, AC-11, AC-12, and AC-13.
- [ ] Verify it: `/check verify guided question builder and branching`
- [ ] Test it: `/test guided question builder and branching`
- [ ] Review it (fresh model): `/check review guided question builder and branching`
- [ ] Document it: `/document guided question builder and branching`
- [ ] Sync durable context: `/sync`

Spec [0014](../specs/0014-guided-question-builder.md) · code in `apps/api/src/modules/pages/`, `apps/web/src/features/pages/`, `packages/contracts/`, and `packages/database/`

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

## Later backlog

1. Response notifications: decide whether creators should receive an email or push notification for a new private response, without placing response content in the notification. If enrolled, delivery must be safe, retryable, and preference-aware.

## Launch assumptions

The first release is English only. It is free to use and supports users of any age. Safety, reporting, privacy, moderation, and legal review are required before public launch. The initial beta uses privacy focused product analytics and error monitoring, avoids storing sensitive confession content in analytics events, and keeps creator dashboards, sessions, drafts, locked content, and visitor responses private.

## Legend

**Needs a decision** means `/architect` should create a spec before implementation. A feature without that tag can use existing project decisions and proceed through `/develop`.

**Build approach** means each slice should be real through every layer. Do not complete all interface work before connecting the database and API.

**Workflow** is the recommended quality path after development. The first working lesson may be lighter while you learn, but authentication, privacy, media ownership, and public access should receive the full quality path.
