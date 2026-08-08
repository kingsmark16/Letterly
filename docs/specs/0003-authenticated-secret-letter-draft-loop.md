# 0003. Authenticated Secret Letter draft loop

**Date**: 2026-08-09
**Status**: Proposed

## Summary

An authenticated creator can start a Secret Letter, save incomplete writing, return to it from a private dashboard, and permanently delete it. The first implementation is a Tracer Bullet, which means one narrow journey will pass through the real web interface, API, Better Auth session, Prisma client, and Neon database. Publishing, custom slug editing, media, questions, and visitor responses remain later slices.

## Context

> ⚠️ Premise note: This feature depends on the stack, authentication, catalog, and core page model that are still marked In Progress in the scope. It also uses `apps/web/design.md` while the design system foundation is still marked as needing a decision. Confirm those foundations against their existing specs before implementation, then build this slice without moving the current Next.js route tree.

Letterly needs its first complete creator journey. Authentication, catalog reading, the Secret Letter template registry, and the core Prisma records exist, but creators cannot yet persist private writing or return to it later.

Draft content is sensitive. The browser must not become an authorization boundary, and drafts must not enter local storage, shared caches, logs, analytics, or public responses. A beginner developer must also be able to follow the request path and recover from network failure or stale edits without hidden behavior.

The early private beta has low volume. The important consistency requirement is correctness, especially ownership, explicit saves, permanent deletion, and prevention of silent overwrites. The existing REST API, Better Auth session, Prisma model, template registry, and shared Zod contracts remain the foundation.

## Requirements

**User stories**:

1. As a creator, I want my Secret Letter choice preserved through sign in so I can begin writing without finding the template again.
2. As a creator, I want to save incomplete writing explicitly so I control when private content is persisted.
3. As a creator, I want to see and reopen my drafts from a private dashboard so I can continue later.
4. As a creator, I want to permanently delete a draft after confirmation so I control its retention.

**Acceptance criteria**:

1. **AC-1**: Selecting Secret Letter preserves its active `templateVersionId` through sign in. After authentication, the creator returns to the selected template start flow. One successful explicit create request creates one `DRAFT` page with the Better Auth user as owner, a database UUID, a server generated and permanently reserved slug, template defaults, and content version zero, then opens its editor.
2. **AC-2**: The editor exposes recipient name and main message only. Recipient name allows at most 120 Unicode grapheme clusters and main message allows at most 20,000 Unicode grapheme clusters. Either may be empty in a draft. The browser and API use the same grapheme counter and field message map. Visible labels, linked validation messages, character counts, keyboard operation, focus states, and a polite save status announcement meet the WCAG AA baseline.
3. **AC-3**: Save is explicit. A successful save sends recipient name, main message, and expected content version. The API preserves stored sections and settings, increments `contentVersion` once, and returns saved metadata. Only one save may run at a time. Typing during a pending save keeps the newer form unsaved after the submitted snapshot succeeds. Saving, saved, unsaved, offline, and recoverable error states are distinguishable without color alone.
4. **AC-4**: A stale save returns `409 Conflict` with code `STALE_VERSION`, current content version, current updated time, and the standard safe error envelope. It does not overwrite newer content. The editor keeps the current form in memory, blocks another save, and asks for confirmation before a fresh owner read replaces the form. A failed reload preserves the current form and conflict lock.
5. **AC-5**: The private dashboard lists only the authenticated creator's drafts, newest updated first, with stable cursor pagination and an accessible Load more action. Each summary contains page ID, server computed recipient label, status, content version, template summary, created time, and updated time, but no main message. Loading, empty, failure, and retry states are distinct and accessible.
6. **AC-6**: The creator can reopen a draft into the same owner edit projection returned by create and save. The editor shows saved version and last updated time. Unsaved navigation asks for confirmation where the browser supports it.
7. **AC-7**: Permanent deletion requires a dialog that uses the selected draft's server computed recipient label. Successful deletion returns `204 No Content`, removes the draft from the dashboard cache, and shows confirmation. Failed deletion keeps the draft visible and allows retry or cancel. An uncertain delete result reloads the owner list and treats an absent page as successfully deleted.
8. **AC-8**: Every creator page endpoint requires a valid Better Auth session. Item endpoints scope database access by both page ID and creator ID. Missing and non owned pages return the same safe `404`. An expired session returns `401` and offers sign in in a separate tab so the mounted editor can retain form content. Saving resumes only if the same creator returns. An account change cancels requests and clears the previous creator's form and query data.
9. **AC-9**: Draft and dashboard data remain only in React Hook Form state and a TanStack Query memory cache partitioned by creator ID. They are never persisted to local storage or a shared server cache. Logout and account changes cancel and remove creator queries. Logs and analytics contain no letter content, request bodies, cookies, credentials, or tokens. A draft is never readable through a public slug route.
10. **AC-10**: Template unavailability, invalid input, rate limiting, database failure, malformed API data, offline state, and uncertain mutation timeouts produce stable safe errors and recoverable states. Create and save mutations never retry automatically. The create action is disabled while pending, and an uncertain create failure refreshes the dashboard before another create attempt is offered. The browser uses a 15 second request timeout.

## Options considered

### Option 1: Thin complete creator journey

Build one real path through shared contracts, NestJS, Prisma, Neon, Next.js, and the creator interface. Use the existing page model and add only the code required for create, save, list, reopen, and delete.

**Pros**:

1. Proves the architecture, session, ownership, and database path with user visible value.
2. Finds integration failures before publishing and media make the system broader.

**Cons**:

1. Requires frontend, API, security, and testing work in the same milestone.
2. Provides limited visual customization until later slices.

### Option 2: API first implementation

Build every creator page endpoint and test it before adding the dashboard and editor.

**Pros**:

1. Gives backend behavior a focused implementation phase.
2. Makes API integration tests available early.

**Cons**:

1. Delays proof that authentication cookies and contracts work in the browser.
2. Encourages the interface to adapt to an API that was not tested through the real journey.

### Option 3: Browser only draft prototype

Build the editor and dashboard with temporary browser state, then connect the API later.

**Pros**:

1. Produces a visual demonstration quickly.
2. Allows fast layout iteration.

**Cons**:

1. Does not prove ownership, persistence, concurrency, or session behavior.
2. Temporary draft storage would conflict with the privacy rules and create replacement work.

## Decision

**Chosen option**: Option 1: Thin complete creator journey

Build the smallest complete authenticated draft journey using the existing page model and the confirmed REST surface. Use TanStack Query for remote creator data, React Hook Form with shared Zod schemas for editor state and validation, and a centralized Axios client for API transport and safe error normalization.

**Implementation skills**: `better-auth-security-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-security-best-practices/`) · `prisma-client-api` (`prisma/skills`, `.agents/skills/prisma-client-api/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

The feature exists to prove that a real creator can safely persist private writing, not merely to display an editor or expose CRUD endpoints. A complete thin journey tests the risky boundaries now: OAuth continuation, HTTP only session cookies, ownership filters, template validation, optimistic concurrency, private query caching, and error recovery.

The existing schema already represents the coherent target, so this feature needs no new table or migration. Explicit mutations keep the behavior understandable and avoid request side effects in React effects. The runner up was an API first implementation, but it would postpone the highest risk integration, the browser session passing through the Next.js rewrite to the NestJS authorization boundary.

## Feature design

### User journey and web ownership

1. The landing page uses the catalog supplied Secret Letter `templateVersionId`.
2. An authenticated creator activates Use this template and creates the draft through a TanStack Query mutation.
3. An unauthenticated creator goes to `/sign-in` with a validated internal return path for the fixed selected template start route and one UUID `templateVersionId`. Absolute URLs, protocol relative paths, unknown routes, and invalid UUIDs are rejected. Better Auth accepts only configured trusted origins. After sign in, the creator returns to the selected template start screen and activates one Create letter action. Database creation never runs from a render effect or an unguarded GET request.
4. Successful creation routes to `/dashboard/letters/:pageId/edit` with Next.js routing primitives.
5. `/dashboard` lists drafts. The editor loads one owner projection and keeps editable fields in React Hook Form.
6. TanStack Query owns remote page data. React Hook Form owns current input. Derived labels, counts, and dirty state are computed during render. No draft is copied into Zustand or browser storage.
7. Internal mutation handlers call a centralized Axios client. The client uses the same origin `/api/v1` base, includes credentials, uses a 15 second timeout, forwards cancellation, and normalizes the standard API error envelope.
8. Query keys come from one stable page key factory rooted by Better Auth creator ID. Successful create, save, and delete mutations update or invalidate only the affected owner page and draft list keys. Logout and identity change cancel and remove the old root. Mutations have no automatic retry.

### Data model sketch

| Entity | Key fields | Relationships and constraints |
|---|---|---|
| `User` | `id` required string | Better Auth identity. One user owns many pages. |
| `TemplateVersion` | `id` UUID, `registryKey` unique, `status` required | One immutable version is used by many pages. Draft creation requires the selected active version and matching trusted registry entry. |
| `Page` | `id` database UUID, `creatorId` required, `templateVersionId` required UUID, `slug` unique, `displaySlug` required, `status` required, `contentVersion` required integer, `content` required JSON, `settings` required JSON, timestamps | Each page has one creator and one immutable template version. Draft list index is `(creatorId, status, updatedAt)`. |
| `PageSlugReservation` | `id` UUID, `normalizedSlug` unique, `pageId` nullable UUID, `reservedAt`, `isCurrent` | One page may have many historical reservations. Page deletion sets `pageId` to null and retains the reservation. |

`Page.content` uses the trusted Secret Letter schema:

```ts
{
  recipientName: string,
  mainMessage: string,
  sections: Section[]
}
```

`packages/templates` remains the canonical owner of the Secret Letter content schema, limits, and defaults. It exports a browser safe Secret Letter schema subpath. `packages/contracts` composes transport schemas from that subpath, and the web editor uses the same field schemas through the contract package. The shared schema counts Unicode grapheme clusters with one deterministic utility and maps schema paths and issue codes through a fixed field message dictionary.

The first editor never accepts `sections` or settings as editable request values. The API merges validated recipient name and main message into the stored content while preserving sections and settings. `Page.settings` keeps the template defaults for romantic theme, handwritten font, disabled audible autoplay, and no music.

No schema migration is required. Custom slug editing is deferred to publishing. Draft creation still generates and reserves the initial slug.

### State transitions

```text
No page
  to DRAFT on authenticated create

DRAFT version N
  to DRAFT version N plus 1 on a valid save
  to permanently deleted after owner confirmation

Any stale save
  to no state change with 409 STALE_VERSION
```

Publishing, unpublishing, archiving, restoring, and custom slug changes are outside this feature.

### API surface

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/pages` | POST | `templateVersionId: uuid` required | `201`, owner edit projection | Creator session | `401 UNAUTHENTICATED`, `404 TEMPLATE_UNAVAILABLE`, `422 VALIDATION_FAILED`, `429 RATE_LIMITED`, `503 RATE_LIMIT_UNAVAILABLE`, `503 SLUG_ALLOCATION_FAILED` |
| `/api/v1/pages` | GET | `status=DRAFT`, opaque `cursor` optional, `size` optional | `200`, draft list projection | Creator session | `401 UNAUTHENTICATED`, `422 INVALID_CURSOR`, `503 SERVICE_UNAVAILABLE` |
| `/api/v1/pages/:pageId` | GET | `pageId: uuid` | `200`, owner edit projection | Owner session | `401 UNAUTHENTICATED`, safe `404 PAGE_NOT_FOUND`, `503 TEMPLATE_DEFINITION_UNAVAILABLE`, `503 SERVICE_UNAVAILABLE` |
| `/api/v1/pages/:pageId` | PATCH | `recipientName`, `mainMessage`, `expectedContentVersion` | `200`, owner edit projection with acknowledged version | Owner session | `401 UNAUTHENTICATED`, safe `404 PAGE_NOT_FOUND`, `409 STALE_VERSION`, `422 VALIDATION_FAILED`, `429 RATE_LIMITED`, `503 RATE_LIMIT_UNAVAILABLE`, `503 TEMPLATE_DEFINITION_UNAVAILABLE` |
| `/api/v1/pages/:pageId` | DELETE | `pageId: uuid` | `204 No Content` | Owner session | `401 UNAUTHENTICATED`, safe `404 PAGE_NOT_FOUND`, `429 RATE_LIMITED`, `503 RATE_LIMIT_UNAVAILABLE`, `503 SERVICE_UNAVAILABLE` |

The owner edit projection contains page ID, slug, server computed recipient label, status, content version, validated content, validated settings, template summary, created time, and updated time. The template summary contains template ID, key, name, template version ID, version number, and registry key. A draft summary contains page ID, recipient label, status, content version, template summary, created time, and updated time. It never contains the main message. The list projection is `{ items, nextCursor }`, and `nextCursor` is a string or null.

All timestamps are UTC RFC 3339 strings on the wire and are localized only for display with the browser locale and time zone. Every error uses `statusCode`, stable `code`, safe `message`, `requestId`, and optional safe `details`. `STALE_VERSION` details contain only `currentContentVersion` and `currentUpdatedAt`. Validation details contain field paths and stable issue codes, not submitted values. Rate limit responses include `Retry-After` and a safe retry value. Request IDs are created at API ingress, returned as `X-Request-ID`, and copied into error envelopes.

Client only failures use `OFFLINE`, `TIMEOUT`, and `MALFORMED_RESPONSE`. They map to fixed safe interface messages and never log rejected payloads. The browser shows a request ID only when the API supplied one.

### Pagination contract

1. The dashboard sends `status=DRAFT`. This slice accepts only that status value.
2. The default page size is 20 and the maximum is 50.
3. Records order by `updatedAt DESC`, then `id DESC`.
4. The opaque base64 URL cursor contains a version, UTC updated time, and page ID. Invalid structure, timestamp, UUID, or version returns `422 INVALID_CURSOR`.
5. The owner query applies the matching strict less than boundary, fetches `size + 1`, and returns `nextCursor: null` when no further row exists.
6. The dashboard appends through an accessible Load more action and deduplicates by page ID.

### Value sourcing

| Action | Value produced or displayed | Source |
|---|---|---|
| Preserve Secret Letter intent | internal return path and `templateVersionId` | active catalog response and validated Next.js search parameter |
| Resolve creator | `creatorId` | server verified Better Auth session, never browser input |
| Create draft | page ID | PostgreSQL UUID default |
| Create draft | active template and template name | `TemplateVersion.id`, related `Template`, and trusted registry key |
| Create draft | content and settings defaults | matching entry in `packages/templates` |
| Create draft | `slug`, `displaySlug`, and `normalizedSlug` | one server generated eight character lowercase ASCII value using letters and numbers |
| Create draft | reservation ID, page link, time, and current state | PostgreSQL UUID default, created page ID, database clock, and `isCurrent=true` |
| Create draft | initial state and version | `Page.status` default `DRAFT` and `Page.contentVersion` default zero |
| Open editor | editable recipient and message | validated `Page.content` from the owner edit projection |
| Open editor | saved version and updated time | `Page.contentVersion` and `Page.updatedAt` |
| Edit draft | character counts and field messages | shared Unicode grapheme counter, schema path, issue code, and fixed field message dictionary |
| Save draft | replacement recipient and message | React Hook Form values parsed by the shared Secret Letter save schema |
| Save draft | preserved sections and settings | current owner scoped database page loaded inside the save path |
| Save draft | submitted snapshot | recipient and message captured when the explicit save event begins |
| Save draft | concurrency expectation | version from the last owner edit projection |
| Save draft | next version | atomic database increment after matching owner ID, page ID, and expected version |
| Save draft | saved or unsaved interface state | comparison of current form values with the acknowledged submitted snapshot |
| List drafts | ownership and status scope | session user ID and `status=DRAFT` query input |
| List drafts | recipient label | server trimmed `content.recipientName`, otherwise `Untitled letter` |
| List drafts | template name and timestamps | related `Template.name`, `Page.createdAt`, and `Page.updatedAt` |
| List drafts | next cursor | last returned `updatedAt` and page ID encoded as an opaque cursor |
| Delete confirmation | dialog label | selected draft summary or owner projection `recipientLabel` |
| Conflict reload | replacement form and version | fresh no store owner detail response after explicit confirmation |
| Session recovery | creator identity after separate tab sign in | fresh Better Auth session read compared with the original creator ID |
| API error display | safe message and support identifier | normalized error envelope `message` and `requestId` |

### Key invariants

1. A page has exactly one creator and one immutable template version.
2. Creator page reads and mutations always include `creatorId` from the verified session in the database filter.
3. Draft creation accepts only an active database template version with a matching trusted registry entry.
4. Template defaults come from trusted server code, never from browser supplied defaults.
5. Draft saves may contain empty recipient and message values, but all values must satisfy the Secret Letter schema and size limits.
6. Save validates before opening a short database transaction. The transaction changes recipient name and main message only when page ID, creator ID, and expected content version all match. It preserves sections and settings.
7. A successful save increments content version exactly once. A stale save changes nothing.
8. Slug and reservation creation are atomic. A uniqueness collision retries the complete transaction with a new candidate up to five times, then returns `503 SLUG_ALLOCATION_FAILED` without a partial page.
9. Page deletion is permanent. One transaction sets every reservation `pageId` to null and `isCurrent` to false, then deletes the page. The normalized slug remains reserved.
10. List reads select only summary fields and never serialize the main message.
11. The default list size is 20 and the maximum is 50. Sorting uses updated time and page ID for stable cursor pagination.
12. One save runs at a time. A success acknowledges only its captured snapshot and never resets newer dirty input from a background response or refetch.
13. A conditional save that changes zero rows performs an owner scoped metadata read. An absent row returns safe `404`. A present row returns `409 STALE_VERSION` with current version and updated time.
14. Active template status is required only for creation. Existing drafts use their immutable template version even if the catalog entry later becomes inactive. A missing trusted registry definition returns `503 TEMPLATE_DEFINITION_UNAVAILABLE` and changes nothing.
15. Create and save mutations have no automatic retry. Interaction mutations run from user events, never from React render effects.
16. Every public slug read filters for a publishable page state. A `DRAFT` always returns safe `404`.

### Security model

1. Better Auth sessions are the only creator identity. Google and Facebook remain the only enabled providers.
2. The NestJS API is the authorization boundary. Web route guards and hidden controls improve the experience but grant no permission.
3. Missing sessions return `401`. Missing and non owned page IDs return the same safe `404`.
4. Browser API calls use the same origin Next.js rewrite with credentials. CORS and trusted origins are explicit. Unsafe methods require JSON, `Origin` equal to `APP_ORIGIN`, and non cross site Fetch Metadata when the header is present. Better Auth CSRF protection remains enabled. Mutation JSON bodies are limited to 128 KiB.
5. Session cookies remain HTTP only, `SameSite=Lax`, and Secure outside local development. Sessions and drafts never enter local storage.
6. Creator writes use the existing limit of 60 requests per minute per creator. Development may use local memory. A shared Redis or Valkey `RateLimitStore` is a staging and production prerequisite. Writes fail closed with `503 RATE_LIMIT_UNAVAILABLE` when it is unavailable. Private reads remain available.
7. Draft queries use `Cache-Control: private, no-store`. TanStack Query memory caching is private to the current browser page and is not persisted.
8. Structured logs include request ID, route, method, status, duration, and safe technical metadata only. Letter content, request bodies, cookies, OAuth tokens, database credentials, and session values are redacted.
9. Neon provides encryption at rest and database connections require TLS outside local development. Application level encryption of `Page.content` is not part of this slice.
10. Creator supplied text is rendered as text only, never raw HTML. No payment, health, or other regulated data scope is introduced. Letter content is still sensitive personal data and follows the project privacy and deletion rules.

11. Creator query keys include the current creator ID. Logout and account changes cancel in flight requests, remove the old creator's query root, and clear the editor before another creator can render it.

No new environment values or third party credentials are introduced. This feature uses the existing `APP_ORIGIN`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, OAuth provider credentials, trusted origin configuration, and planned `REDIS_URL` from the foundation specs.

### Failure behavior

1. Offline state uses browser connectivity as a hint, keeps current form input in memory, and disables Save while clearly offline. A failed request remains authoritative because browser connectivity signals can be wrong.
2. A save timeout keeps the form and reports an uncertain result. Manual retry either saves once or receives `STALE_VERSION` if the first request succeeded.
3. A stale conflict preserves current input until the creator confirms reload. Confirmation performs a fresh no store owner read. A valid response resets the form and cache. A failed response preserves local input and the conflict lock. It never attempts an automatic merge.
4. An expired session keeps the editor mounted and opens sign in in a separate tab. The original tab performs a fresh session read before manual retry. A different creator identity cancels requests and clears the previous creator's form and cache.
5. A dashboard query error remains distinct from an empty result. Both states retain a usable dashboard shell.
6. Failed deletion keeps the query cache unchanged and keeps or reopens the confirmation dialog with Retry and Cancel. A timeout reloads the owner list. An absent page is treated as deleted, while a present page may be retried.
7. If the selected template becomes inactive before creation, the API creates nothing and the interface offers a return to Templates.
8. Shared Zod response parsing rejects malformed API data and shows `MALFORMED_RESPONSE` with a recoverable fixed message and request ID when available. Rejected values are never logged.
9. Unsaved navigation uses controlled application links and a browser exit warning where supported. The interface never claims that all browser navigation can be blocked.
10. The current Nest bootstrap keeps Better Auth request bodies unparsed for `/api/auth/*`. It installs a 128 KiB JSON parser for `/api/v1/*`, then applies the Nest validation pipe and shared contract adapters to page routes. Page controllers never receive unbounded or unvalidated JSON.

### Critical test scenarios

1. Happy path: a Google or Facebook creator selects Secret Letter, signs in when needed, creates a draft, saves recipient and message, sees it in the dashboard, reopens it, and deletes it, verifies **AC-1**, **AC-3**, **AC-5**, **AC-6**, and **AC-7**.
2. Validation: empty drafts save, Unicode grapheme limits and visible counts agree, hidden sections remain unchanged, and accessible field errors come from stable schema codes, verifies **AC-2** and **AC-3**.
3. Save interaction: typing during an active save preserves newer dirty input, another save cannot start concurrently, and a lost success response becomes a safe stale conflict on manual retry, verifies **AC-3** and **AC-4**.
4. Concurrency: two tabs load version zero, one saves version one, and the other receives `409 STALE_VERSION` without overwriting content. Missing or non owned pages still receive safe `404`, verifies **AC-4** and **AC-8**.
5. Pagination: equal timestamps, malformed cursors, final pages, repeated Load more actions, and new drafts preserve stable ordering without duplicate rows, verifies **AC-5**.
6. Authorization: no session receives `401`, another creator receives the same safe `404` as a missing page, a draft public slug returns safe `404`, and no private content appears in any denial, verifies **AC-8** and **AC-9**.
7. Session recovery: expired authentication opens in a separate tab, the same creator can retry without losing the mounted form, and a different creator causes all previous form and query state to be cleared, verifies **AC-8** and **AC-9**.
8. Privacy: draft content is absent from dashboard summaries, local storage, shared caches, logs, analytics, and malformed response diagnostics, verifies **AC-5** and **AC-9**.
9. Recovery: offline mode, 15 second timeout, malformed response, inactive template, missing registry definition, database failure, rate limit store failure, slug collision exhaustion, and uncertain deletion preserve a recoverable interface state, verifies **AC-10**.
10. Accessibility: keyboard creation, editor validation, save announcements, Load more, dashboard states, deletion dialog focus, and reduced motion preferences meet the project baseline, verifies **AC-2**, **AC-5**, and **AC-7**.

## Build plan

The Tracer Bullet begins with one authenticated create and save path through every layer, then thickens that same path into dashboard, deletion, and recovery behavior. The existing Prisma schema already matches the target, so this plan adds no migration.

1. Add `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, and `axios` to `apps/web`. Expose the browser safe Secret Letter schema, grapheme counter, and field error map from `packages/templates`. Compose exact page requests, projections, cursors, timestamps, and error schemas in `packages/contracts`. Add the smallest TanStack Query provider, creator rooted key factory, centralized 15 second Axios client, and safe response parsing. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-9**, and **AC-10**.
2. Configure bounded JSON parsing for `/api/v1/*` while preserving raw Better Auth handling for `/api/auth/*`. Create the NestJS pages feature module with thin controllers, application services, a repository interface, a Prisma repository, session guard, ownership policy, origin protection, request validation, request IDs, safe mappers, and standard errors. Implement authenticated create and save first, including active template resolution, registry defaults, five attempt atomic slug allocation, editable field merging, serialized saves, owner scoped optimistic concurrency, and creator write limits. Satisfies **AC-1**, **AC-3**, **AC-4**, **AC-8**, **AC-9**, and **AC-10**.
3. Add the selected template start route and Secret Letter editor inside the existing Next.js route tree and feature folders. Preserve only the fixed validated internal return path through Google or Facebook sign in. Trigger create and save only from explicit user events. Implement React Hook Form fields, grapheme counts, submitted snapshots, query mutations, saved metadata, offline handling, fresh conflict reload, unsaved navigation warning, separate tab session recovery, account change cleanup, and accessible status messages. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-6**, **AC-8**, **AC-9**, and **AC-10**.
4. Implement owner scoped cursor listing and detail loading in the API with exact summary fields, stable descending boundaries, one extra row, nullable next cursor, and safe recipient labels. Add the private dashboard shell, accessible skeleton, empty state, distinct error state, retry, Load more, deduplication, safe draft summaries, and editor reopening. Keep all creator responses private and non persistent. Satisfies **AC-5**, **AC-6**, **AC-8**, **AC-9**, and **AC-10**.
5. Implement owner scoped permanent deletion and retained inactive slug reservations in one transaction. Add the server supplied recipient label confirmation dialog, focus handling, success message, targeted query cache update, and uncertain deletion recovery through an owner list refresh. Satisfies **AC-7**, **AC-8**, **AC-9**, and **AC-10**.
6. Add unit tests for transport schemas, grapheme limits, field messages, template validation, editable field merging, owner safe mappers, cursor boundaries, slug retry exhaustion, submitted snapshots, and optimistic concurrency. Add API integration tests for JSON parsing beside Better Auth, real sessions, ownership isolation, create, list, detail, save conflict, deletion, inactive templates, missing registry definitions, rate limits, and safe errors. Add Playwright coverage for the complete Google or Facebook draft journey where provider automation is practical, with a controlled authenticated session fallback for deterministic CI. Satisfies **AC-1** through **AC-10**.
7. Run lint, formatting checks, type checks, Prisma validation, unit tests, API integration tests against an isolated database, the draft Playwright smoke journey, and both application builds. Review response payloads and logs for private content before verification. Satisfies **AC-1** through **AC-10**.

## Consequences

**Positive**:

1. The first creator journey proves every important architecture boundary with real private data.
2. Shared Zod contracts keep browser and API behavior aligned without exposing Prisma records.
3. Explicit saves and optimistic concurrency make data loss visible and recoverable.
4. The editor remains ready for later Secret Letter sections without adding those features now.

**Negative and tradeoffs**:

1. Four frontend dependencies and a query provider are added for a two field editor because later authenticated features will share them.
2. Preserving template intent through OAuth needs strict internal return path validation and an extra selected template start state.
3. Without database backed create idempotency, the feature guarantees one page per successful request, not one page per user intent. A rare uncertain create result needs a dashboard refresh before retry.
4. Private no store responses reduce caching opportunities, which is accepted for creator data.

**Neutral**:

1. No database migration is expected.
2. The initial generated slug is stored now, but creator custom slug editing remains part of publishing.
3. Theme, font, media, questions, password protection, preview, and publishing remain outside this editor.

## Follow-up

1. Ratify the design system and UI foundation or reconcile its scope status before this feature begins. This spec uses `apps/web/design.md` as the current visual source.
2. The engineer declined discovery of Agent Skills and MCP servers for TanStack Query, React Hook Form, and Axios. Use the blueprint and installed project guidance during implementation.
3. Add the selected external error monitoring provider during launch hardening. This slice emits privacy safe structured logs and request metrics only.
4. Consider database backed create idempotency if duplicate drafts appear in real usage or if creation gains external side effects.
