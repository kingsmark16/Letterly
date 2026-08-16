# 0005. Public Secret Letter publishing

**Date**: 2026-08-10
**Status**: Accepted

## Summary

An authenticated creator can privately preview a saved Secret Letter, publish it with a generated or custom slug, and share its public URL. The API remains the authority for ownership, lifecycle, slug uniqueness, and safe public data. The public page renders through the existing Secret Letter design, with GSAP animation as progressive enhancement.

## Context

Letterly has a working authenticated draft loop, but a saved page cannot yet become a safe public page. The next vertical slice must connect the existing page model, owner editor, API, public route, and visitor experience without adding passwords, media, visitor responses, or search indexing.

Letter content is sensitive personal data. A public route must expose only the fields needed to render the Secret Letter, must stop immediately when a page is unpublished or deleted, and must not reveal page existence through different denial responses. The API must remain the authorization boundary because browser controls and Next.js routes cannot enforce ownership.

The project uses a Tracer Bullet approach. The existing `Page` and `PageSlugReservation` records already support the required lifecycle and permanent slug history, so this feature should prove one complete publishing path without a schema migration. The public page also needs an accessible experience when JavaScript, GSAP, or motion effects are unavailable.

> ⚠️ Premise note: Adding scroll and section animation can make a sensitive reading experience slower, less accessible, and harder to operate if it controls content visibility. GSAP must remain progressive enhancement. Server rendered letter text must stay readable, reduced motion must remove the effects, and animation must not become an availability dependency.

> Superseding decision: spec 0007 makes the published slug immutable so printed and QR shared links remain stable. The slug route remains available for draft pages and returns `409 INVALID_STATE` for published pages.

## Requirements

**User stories**:

1. As a creator, I want to privately preview my saved Secret Letter so that I can check the public presentation before sharing it.
2. As a creator, I want to publish with a generated or custom slug so that I can share a stable URL.
3. As a creator, I want to unpublish or delete a page so that I can immediately control public visibility.
4. As a creator, I want to choose a stable slug before publishing so that a shared public URL remains valid after publication.
5. As a visitor, I want to open a published Secret Letter from its URL so that I can read the recipient name and message without creating an account.
6. As a visitor, I want unavailable letters to fail safely so that private draft and ownership information is not revealed.

**Acceptance criteria**:

1. **AC-1**: A creator can publish only a saved Secret Letter whose recipient name and main message are nonblank after server validation. The publish review shows a private preview using the shared `SecretLetterRenderer`, an optional custom slug field, and an explicit readiness confirmation. Publish is disabled while the editor has unsaved changes. A successful request returns `200 OK`, changes the page to `PUBLISHED`, and returns a safe owner result with the canonical public URL. Existing pages may publish after their catalog version becomes inactive, but the trusted registry definition must still exist. A missing trusted definition returns `503 TEMPLATE_DEFINITION_UNAVAILABLE` without mutation.
2. **AC-2**: A custom slug is optional during first Publish. The server trims it, accepts `customSlug?: string | null`, normalizes it to lowercase, and applies the existing rules: 3 to 48 characters, lowercase letters, numbers, single hyphens, no leading or trailing hyphen, and no reserved route value. An invalid slug returns `422 INVALID_SLUG` without mutation. An unavailable slug returns `409 SLUG_ALREADY_TAKEN` without mutation. When no custom slug is supplied, the existing current generated slug remains in use. Republish keeps the current slug and rejects an attempt to choose a different one.
3. **AC-3**: Publish supports `DRAFT → PUBLISHED` and `UNPUBLISHED → PUBLISHED`. Republish reuses the current slug and does not change the published URL. `publishedAt` records the latest successful publish time, and `unpublishedAt` is cleared on republish.
4. **AC-4**: An authenticated owner can unpublish a published page with explicit confirmation. A successful request returns `200 OK`, changes the page to `UNPUBLISHED`, records `unpublishedAt`, and makes the public URL return the same generic `404` as a missing page. Unpublish does not change `contentVersion`.
5. **AC-5**: An authenticated owner can change the slug of a `DRAFT` page through the existing slug change action. The new reservation and page slug are committed atomically. A published page rejects the same action with `409 INVALID_STATE`; its current slug and reservation remain unchanged. Draft pages choose a slug during Publish, while republish reuses the existing slug. The first successful publication makes that slug immutable.
6. **AC-6**: An anonymous request for a current slug returns `200 OK` only when the page is `PUBLISHED`. The response is exactly a `PublicSecretLetterProjection` with `displaySlug`, `canonicalUrl`, `template: { key, version }`, `recipientName`, `mainMessage`, and `sections`. In this slice `sections` is an empty array because media, questions, visitor messages, and postscripts are outside the feature. It never contains creator identity, page ID, private settings, content version, passwords, private media keys, or visitor data.
7. **AC-7**: Missing, draft, unpublished, archived, deleted, old, noncurrent, and invalid public slugs return the existing standard `PAGE_NOT_FOUND` error envelope with the fixed public message `This letter is not available`. Public success and failure responses use `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`. Public page data is excluded from the sitemap and no content bearing analytics event is emitted.
8. **AC-8**: The Next.js `/p/[slug]` server component loads the safe public projection through the API with `cache: no-store`, maps the safe `404` to the unavailable page, and renders the Secret Letter from the validated projection. The page uses generic metadata, a canonical URL from the API, and no recipient or message content in title, description, Open Graph data, or structured data.
9. **AC-9**: The public Secret Letter uses `SecretLetterRenderer` at `apps/web/src/features/pages/components/secret-letter-renderer.tsx`, which consumes the shared `SecretLetterRenderModel` used by both private preview and public rendering. Its content order is a sealed envelope, recipient introduction, main message, and the fixed footer copy `Create your own letter on Letterly`. The visitor activates “Open your letter”. The opening has Skip animation and Replay opening controls. Media, questions, responses, sharing controls, and creator identity are outside this slice.
10. **AC-10**: Tailwind styles the public page and GSAP animates the envelope, scroll effects, and section reveals. GSAP runs only on the client through `@gsap/react` and scoped refs. ScrollTrigger instances are created in page order, reveal each section once, and are cleaned up on unmount. The main message is revealed as one readable section, not paragraph by paragraph. Animation uses transforms and opacity rather than layout properties.
11. **AC-11**: The page honors both `prefers-reduced-motion` and its page level Reduce motion control. The page level choice is held in current page memory and is not persisted to local storage. When reduced motion is enabled, it skips envelope, scroll, and section animation and creates no ScrollTriggers. Letter text remains in the server rendered document and is not marked `aria-hidden`; when the visitor opens or skips the envelope, focus moves to the letter heading. Without JavaScript, GSAP, or ScrollTrigger, server rendered letter content remains readable without animation. The layout is mobile first, single column, touch friendly, and uses controls with at least 44 pixels of target size.
12. **AC-12**: Only the authenticated Better Auth owner can publish, unpublish, republish, change a draft slug, or delete a page. The API scopes every owner mutation by page ID and session user ID. Missing and non owned pages return the same safe `404`. Anyone may read a current published page anonymously.
13. **AC-13**: Lifecycle and slug changes use one database transaction. If two tabs attempt a conflicting lifecycle transition, one succeeds and the other returns `409 INVALID_STATE` without mutation. If two owners claim the same custom slug, the database uniqueness constraint chooses one winner and the loser receives `409 SLUG_ALREADY_TAKEN` without mutation. A save that commits after Publish may update the already published page, consistent with the existing explicit save model.
14. **AC-14**: Public read infrastructure failure returns safe `503` with no partial content, no cache, and a request ID. Creator publish, unpublish, slug change, and public read routes use the named `creatorWrites` policy at 60 requests per minute per creator and the `publicPageReads` policy at 120 requests per minute per IP. Protected mutations fail safely when the shared rate limit store is unavailable. Public read rate limit keys use a short lived server derived IP value. Logs and metrics contain only request IDs, routes, methods, statuses, durations, lifecycle outcomes, error codes, and the allowlisted technical metadata in this spec.
15. **AC-15**: An owner can permanently delete a published or unpublished page with the existing explicit deletion flow. Deletion makes the public URL unavailable immediately, removes the page and its content, and permanently retains old slug reservations with `pageId` set to null. No age gate or moderation check is added in this slice. Moderation and legal review remain part of launch hardening.

## Options considered

### Option 1: Server owned publication with progressive public rendering

Use the existing REST API, Prisma page model, slug reservations, Next.js server route, and safe public projection. Keep publication state and slug changes transactional, then add GSAP only as client side enhancement.

**Pros**:

1. Proves the whole publishing path through the existing architecture.
2. Keeps authorization, slug uniqueness, privacy, and lifecycle rules in one boundary.
3. Preserves readable content when animation or JavaScript fails.

**Cons**:

1. Requires coordinated API, database, creator UI, public UI, and test work.
2. The first public route is deliberately no index and cannot use public caching.

### Option 2: Client first public preview and publication

Render the preview and public page from browser state, then add server persistence and protection later.

**Pros**:

1. Allows quick visual work on the envelope and scroll effects.
2. Needs less initial API code.

**Cons**:

1. Cannot safely enforce ownership or public availability in the browser.
2. Makes the public page diverge from persisted content and creates privacy risk.

### Option 3: Direct database reads from Next.js

Let the Next.js public route read Prisma directly instead of calling the API.

**Pros**:

1. Removes one internal HTTP hop for server rendered public reads.
2. Can be simple for a single deployment.

**Cons**:

1. Duplicates API projection and error rules across application boundaries.
2. Weakens the API as the single authorization and privacy boundary.
3. Couples the web workspace to database infrastructure.

## Decision

**Chosen option**: Option 1: Server owned publication with progressive public rendering

Use transactional NestJS lifecycle commands and safe public projections over the existing `Page` and `PageSlugReservation` model. Use the Next.js server component for the public route, Tailwind for styling, and GSAP with `@gsap/react` and ScrollTrigger for optional envelope, scroll, and section effects.

**Implementation skills**: `better-auth-security-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-security-best-practices/`) · `prisma-client-api` (`prisma/skills`, `.agents/skills/prisma-client-api/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `gsap-core` (`greensock/gsap-skills`, `.agents/skills/gsap-core/`) · `gsap-react` (`greensock/gsap-skills`, `.agents/skills/gsap-react/`) · `gsap-performance` (`greensock/gsap-skills`, `.agents/skills/gsap-performance/`) · `gsap-scrolltrigger` (`greensock/gsap-skills`, `.agents/skills/gsap-scrolltrigger/`) · `gsap-timeline` (`greensock/gsap-skills`, `.agents/skills/gsap-timeline/`)

## Rationale

The existing data model already has page lifecycle states, current and historical slug reservations, timestamps, optimistic content versions, and the ownership relation. Adding publication history or revisions would increase write paths without solving a requirement in this private beta. A transaction plus database uniqueness constraint is enough to make current public state correct.

The public route must not become a second authorization boundary or a cache invalidation problem. A server component calling the API keeps projection rules centralized and gives the API one place to apply no store headers, safe errors, rate limits, and public state filters. GSAP is accepted for the requested emotional presentation, but only behind server rendered content and reduced motion checks.

## Feature design

**Data model sketch**:

1. `Page` remains the primary entity. Its required fields are `id: UUID`, `creatorId: string`, `templateVersionId: UUID`, `slug: string`, `displaySlug: string`, `status: PageStatus`, `contentVersion: number`, `content: JSON`, `settings: JSON`, `createdAt`, and `updatedAt`. `publishedAt`, `unpublishedAt`, and `archivedAt` remain nullable. `creatorId` references Better Auth `User`. `templateVersionId` references one immutable `TemplateVersion` with delete restrict behavior. `Page.slug` and `Page.displaySlug` both contain the canonical lowercase current slug in this slice. `Page.slug` is the lookup value and `Page.displaySlug` is the URL value.
2. `PageSlugReservation` retains `id: UUID`, unique `normalizedSlug`, nullable `pageId: UUID`, `reservedAt`, and `isCurrent`. `normalizedSlug` is the same lowercase value as the current page slug. `pageId` references `Page` with delete set null behavior. Old reservations remain permanently. A page has exactly one current reservation with `isCurrent: true` and may have many historical reservations with `isCurrent: false`.
3. `User` and `TemplateVersion` are existing related entities. One user owns many pages. One immutable template version may be used by many pages.
4. No new entity, field, relation, or database migration is required for this feature. Existing indexes on creator, status, updated time, template version, and reservation ownership remain in use. A missing current reservation is a repairable invariant failure and returns `503 SLUG_ALLOCATION_FAILED`; Publish never creates a replacement reservation silently.

**State transitions**:

```text
DRAFT → PUBLISHED
PUBLISHED → UNPUBLISHED
UNPUBLISHED → PUBLISHED
DRAFT → DRAFT (draft slug change)
Any state → permanently deleted after owner confirmation
```

Archiving remains in the existing model but is outside this feature. A content save does not change lifecycle status. A draft slug change does not change content version. A published slug cannot change.

**API surface**:

| Endpoint                          | Method | Key inputs                                                   | Key outputs                                                                                                                   | Auth                                    | Key errors                                                                                                                     |
| --------------------------------- | ------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/api/v1/pages/:pageId/publish`   | POST   | `customSlug?: string or null`, `confirmReady: true` required | `pageId`, `status`, current slug, `publicUrl`, `publishedAt`, `updatedAt`, `contentVersion`                                   | Better Auth owner                       | `401`, safe `404`, `409 INVALID_STATE`, `409 SLUG_ALREADY_TAKEN`, `422 TEMPLATE_REQUIREMENT_FAILED`, `422 INVALID_SLUG`, `503` |
| `/api/v1/pages/:pageId/unpublish` | POST   | `confirm: true` required                                     | `pageId`, `status`, `unpublishedAt`, `updatedAt`, `contentVersion`                                                            | Better Auth owner                       | `401`, safe `404`, `409 INVALID_STATE`, `422 CONFIRMATION_REQUIRED`, `503`                                                     |
| `/api/v1/pages/:pageId/slug`      | PATCH  | `customSlug: string` required                                | `pageId`, `status`, new draft slug, `publicUrl`, `publishedAt`, `updatedAt`, `contentVersion`                                  | Better Auth owner of a `DRAFT` page | `401`, safe `404`, `409 INVALID_STATE`, `409 SLUG_ALREADY_TAKEN`, `422 INVALID_SLUG`, `503`                                    |
| `/api/v1/public/pages/:slug`      | GET    | path slug, normalize lowercase before lookup                 | `PublicSecretLetterProjection` with `displaySlug`, `canonicalUrl`, `template`, `recipientName`, `mainMessage`, `sections: []` | Anonymous                               | existing standard `PAGE_NOT_FOUND`, `429` rate limited, `503` unavailable                                                      |
| Existing owner page read          | GET    | existing page ID                                             | saved owner projection used by editor and private preview                                                                     | Better Auth owner                       | existing `401` and safe `404`                                                                                                  |
| Existing owner page save          | PATCH  | existing content and expected version                        | saved owner projection                                                                                                        | Better Auth owner                       | existing `401`, safe `404`, `409 STALE_VERSION`, validation errors                                                             |
| Existing owner page deletion      | DELETE | existing page ID, confirmation in the client flow            | `204 No Content`                                                                                                              | Better Auth owner                       | existing `401`, safe `404`, `503`                                                                                              |

The Publish and Unpublish requests require explicit confirmation in the request body even though the creator interface also confirms. Missing or false confirmation returns `422 CONFIRMATION_REQUIRED`. The API never trusts the client to decide readiness or ownership. Draft slug changes are transactional, while published slug changes return `409 INVALID_STATE` without mutation. Draft and unpublished pages choose a slug through Publish or republish. Publish deliberately does not accept `expectedContentVersion`: the browser prevents publication while dirty, and the transaction reads the latest saved page content at its start. A later save may update the published page. Add `INVALID_SLUG`, `SLUG_ALREADY_TAKEN`, `INVALID_STATE`, `TEMPLATE_REQUIREMENT_FAILED`, and `CONFIRMATION_REQUIRED` to the shared error code schema while continuing to use `PAGE_NOT_FOUND` for every unavailable public slug.

The Next.js `/p/[slug]` server component calls the public API with `cache: no-store`. It uses the `PublicSecretLetterProjection` as the source for the public renderer. The existing authenticated owner read supplies the saved private preview projection, which is mapped into the same `SecretLetterRenderModel` without a new preview endpoint. The public unavailable UI uses fixed copy `This letter is not available` and a `Return to Letterly` link. The public API uses the existing `PAGE_NOT_FOUND` envelope for every unavailable slug.

The shared public contract is:

```typescript
type PublicSecretLetterProjection = {
  displaySlug: string;
  canonicalUrl: string;
  template: { key: "secret-letter"; version: number };
  recipientName: string;
  mainMessage: string;
  sections: readonly [];
};
```

`SecretLetterRenderModel` has the same fields and is consumed by `SecretLetterRenderer` at `apps/web/src/features/pages/components/secret-letter-renderer.tsx`. The template registry is the source of the field schema and the section allowlist. This slice allows no optional section content.

**Value sourcing**:

| Action                       | Value produced or displayed                                                                                                          | Source                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Publish readiness            | recipient and message requirement result                                                                                             | trusted Secret Letter registry schema applied to `Page.content`                                                      |
| Publish confirmation         | explicit readiness decision                                                                                                          | `confirmReady: true` request field and creator checkbox                                                              |
| Custom slug                  | normalized current slug                                                                                                              | trimmed `customSlug` request field, server slug normalizer, and `PageSlugReservation` uniqueness constraint          |
| Generated slug               | existing current generated slug                                                                                                      | existing `Page.slug` and reservation created during draft creation                                                   |
| Publish state                | `PUBLISHED`                                                                                                                          | validated current `Page.status` and lifecycle transaction                                                            |
| Publish time                 | latest `publishedAt`                                                                                                                 | database transaction clock                                                                                           |
| Unpublish state              | `UNPUBLISHED`                                                                                                                        | validated current `Page.status` and lifecycle transaction                                                            |
| Unpublish time               | latest `unpublishedAt`                                                                                                               | database transaction clock                                                                                           |
| Canonical public URL         | public URL shown after Publish and public read                                                                                       | `new URL(\`/p/${encodeURIComponent(Page.displaySlug)}\`, APP_ORIGIN).toString()`                                     |
| Private preview content      | saved recipient, message, and sections                                                                                               | existing authenticated owner page read, after explicit save                                                          |
| Public template identity     | `{ key: "secret-letter", version }`                                                                                                  | immutable `TemplateVersion` matched to the trusted registry                                                          |
| Public recipient and message | rendered letter content                                                                                                              | validated `Page.content` safe projection                                                                             |
| Public availability          | success or generic unavailable state                                                                                                 | `Page.status`, current slug reservation, and public slug lookup                                                      |
| Public metadata              | title `A Secret Letter on Letterly`, description `A personal letter shared through Letterly`, canonical URL, and no index directives | fixed metadata constants, validated `APP_ORIGIN`, and stored display slug                                            |
| Owner authorization          | creator identity                                                                                                                     | verified Better Auth session user ID compared with `Page.creatorId`                                                  |
| Rate limit identity          | creator or anonymous request identity                                                                                                | `creatorWrites` at 60 per minute by creator, or `publicPageReads` at 120 per minute by short lived server derived IP |
| Error support ID             | request ID shown in safe errors                                                                                                      | existing request context middleware and error envelope, with its configured generation fallback                      |
| Animation preference         | reduced or full motion behavior                                                                                                      | operating system `prefers-reduced-motion` and page level Reduce motion state                                         |
| Animation targets            | envelope and public sections                                                                                                         | scoped component refs rendered by the client component                                                               |

**Key invariants**:

1. Only a saved page can be published. The Publish request never accepts unsaved content.
2. Secret Letter publish requirements are evaluated by the trusted server registry, never by browser supplied defaults or a stored readiness flag.
3. The API filters every owner operation by both page ID and verified session user ID.
4. Publish, unpublish, republish, and draft slug changes update lifecycle fields and reservations in one database transaction. Publication never changes the slug after the first successful publish.
5. A lifecycle transaction checks the expected current state. A concurrent invalid transition changes nothing and returns `409 INVALID_STATE`.
6. Normalized slugs are unique in the database. A losing concurrent custom slug request returns `409 SLUG_ALREADY_TAKEN` and does not fall back silently.
7. `Page.slug`, `Page.displaySlug`, and the current `PageSlugReservation.normalizedSlug` contain the same canonical lowercase value. A draft slug change marks the old reservation `isCurrent=false`, creates the new reservation `isCurrent=true`, and updates both page slug fields in one transaction. Exactly one reservation per page is current. A published page keeps its current reservation and slug.
8. Old slug reservations are permanent. An old public slug never redirects to a new slug.
9. Public lookup trims and normalizes case before lookup, then returns only a current slug belonging to a `PUBLISHED` page.
10. Public projections never include creator identity, internal page ID, private settings, passwords, content version, private media keys, or visitor data.
11. Public responses are never stored in shared caches. Success and failure responses carry no store and no index headers.
12. Public text is rendered as text, not raw HTML. The trusted template renderer controls allowed sections.
13. The public page remains readable without JavaScript, GSAP, or ScrollTrigger. Letter content remains in the document and is not marked `aria-hidden`.
14. GSAP and ScrollTrigger run only in client lifecycle code, use scoped refs and `useGSAP()`, and revert on unmount. Reduced motion creates no ScrollTriggers.
15. Animation uses transforms and opacity where possible, reveals sections once, and never controls whether the message is present in the document.
16. Permanent deletion runs in the existing owner deletion transaction. It nulls all reservations first, deletes the page and its dependent content according to the existing deletion contract, and leaves reservations retained with `pageId=null`.
17. Logs allow only request ID, route, method, status, duration, error code, lifecycle outcome, rate limit outcome, and safe technical metadata. No content bearing analytics event is emitted.

**Security model**:

1. Better Auth is the only creator identity source. Publish, unpublish, republish, draft slug changes, preview reads, saves, and deletion require a session and owner scope.
2. Missing and non owned creator pages return the same safe `404`. The browser never grants permission.
3. Public reads require no session, but return content only for a current `PUBLISHED` page. Every unavailable condition uses the same generic `404`.
4. Existing origin protection, CSRF protection, secure cookie settings, request validation, and route rate limits remain active. Protected mutations fail safely if the shared rate limit store is unavailable.
5. Public data is sensitive personal data even though it is intentionally shared. No GDPR, HIPAA, PCI, or other regulated data workflow is introduced by this slice. Moderation and legal review remain required before public beta. The no age gate decision is valid only for this private beta scope.
6. Public routes send `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`. Public pages are excluded from the sitemap and sensitive content never enters analytics.
7. Structured logs contain request ID, route, method, status, duration, error code, lifecycle outcome, and safe technical metadata only.

**Configuration required**:

No new environment variables or third party credentials are required. The feature reuses `APP_ORIGIN`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, existing trusted origins, existing OAuth credentials, and the existing shared rate limit configuration.

**Critical test scenarios**:

1. Happy path: save a complete Secret Letter, privately preview it, publish with the generated slug, open the anonymous public URL, unpublish it, confirm the URL returns generic `404`, and republish it. Verifies **AC-1**, **AC-3**, **AC-4**, **AC-6**, and **AC-7**.
2. Custom slug: change a draft slug with a valid custom value, trim and normalize mixed case, publish it, reject a later published slug change with `409 INVALID_STATE`, and verify a collision returns `409 SLUG_ALREADY_TAKEN`. Verifies **AC-2**, **AC-5**, **AC-6**, and **AC-13**.
3. Readiness: attempt to publish with a blank recipient or message, missing confirmation, invalid slug, inactive template, and missing trusted definition. Verify no page mutation and safe error codes. Verifies **AC-1**, **AC-2**, and **AC-14**.
4. Ownership: a missing session and a different creator attempt publish, unpublish, slug change, preview, and delete. Verify `401` or the same safe `404` and no content disclosure. Verify deleted page reservations are retained with `pageId=null`. Verifies **AC-12** and **AC-15**.
5. Concurrency: two valid lifecycle requests race, and two custom slug claims race. Verify one winner, one safe conflict, no partial reservation, and consistent public state. Verifies **AC-5** and **AC-13**.
6. Public privacy: verify the exact `PublicSecretLetterProjection`, fixed unavailable copy, no private fields, no index headers, no store headers, no sitemap entry, no content bearing analytics event, and only the log allowlist. Verifies **AC-6**, **AC-7**, and **AC-14**.
7. Public failure: simulate database or trusted registry failure and verify safe `503`, no partial content, no cache, and a request ID. Verifies **AC-14**.
8. Rendering resilience: render without JavaScript, with GSAP unavailable, and with reduced motion enabled. Verify the letter is in the document, the message is not `aria-hidden`, focus moves to the heading after Open or Skip, no ScrollTriggers are created when reduced motion is active, and controls remain keyboard and touch accessible. Verifies **AC-9**, **AC-10**, and **AC-11**.
9. Animation: activate the envelope, skip it, replay it, scroll through sections, return to earlier sections, resize between mobile and desktop, and unmount the component. Verify one time reveals, cleanup, no layout property animation, and no animation blocking content. Verifies **AC-10** and **AC-11**.
10. Deletion: delete a published and an unpublished page with confirmation, verify the transaction nulls reservations before deleting the page, public `PAGE_NOT_FOUND` is immediate, reservations remain permanently, and safe owner feedback is returned. Verifies **AC-12** and **AC-15**.

## Build plan

The project uses a Tracer Bullet approach. The first milestone proves one saved Secret Letter through private preview, Publish, API transaction, public API read, and public server rendered route. Later milestones thicken that path with unpublishing, immutable published slugs, animation, privacy failures, and full verification. No migration is included because the confirmed data model already exists.

- [x] Add shared publish, unpublish, slug change, and public projection contracts. Add the `gsap` and `@gsap/react` web dependencies while retaining the installed Tailwind setup. Define slug normalization, safe public projection schemas, generic public metadata constants, and stable error codes. Satisfies **AC-1**, **AC-2**, **AC-6**, **AC-7**, **AC-8**, and **AC-14**.
- [x] Implement transactional owner lifecycle commands in the NestJS pages module. Add Publish, Unpublish, and draft slug change routes, owner checks, trusted template publish validation, current state predicates, reservation updates with exact current reservation rules, canonical URL creation from `APP_ORIGIN`, named `creatorWrites` and `publicPageReads` policies, shared error codes, safe logs, and structured outcomes. Extend the existing deletion transaction to null reservations before deleting published and unpublished pages. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-12**, **AC-13**, **AC-14**, and **AC-15**.
- [x] Implement anonymous public read and the server rendered Next.js route. Add current published slug lookup, trim and case normalization, the exact `PublicSecretLetterProjection`, `SecretLetterRenderModel`, `SecretLetterRenderer`, no store and no index headers, the existing `PAGE_NOT_FOUND` envelope, fixed unavailable copy, fixed safe metadata, API driven server fetching, private preview mapping from the existing owner read, and the Secret Letter public content structure. Satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-11**, and **AC-14**.
- [x] Build the creator publish review and lifecycle controls. Add private preview, saved state gating, custom slug input, readiness confirmation, Copy link, View public page, Publish, Unpublish confirmation, republish with a stable slug, draft slug change, deletion coverage, loading states, safe errors, and accessible focus behavior. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-12**, and **AC-15**.
- [x] Build the client only Secret Letter motion layer with Tailwind and GSAP. Use `useGSAP()` with scoped refs, a labeled envelope timeline, ScrollTrigger section reveals created in page order, mobile responsive matching, transform and opacity animation, reduced motion conditions, Skip and Replay actions, cleanup, and readable server rendered fallback. Satisfies **AC-9**, **AC-10**, and **AC-11**.
- [ ] Add unit, API integration, and browser journey coverage for readiness, lifecycle transitions, slug races, public privacy, owner isolation, safe failures, metadata, no store headers, deletion, reduced motion, animation cleanup, and the complete publish and share path. Run build, lint, type checks, API tests, end to end tests, and public browser verification. Satisfies **AC-1** through **AC-15**.

## Consequences

**Positive**:

1. A creator can complete the first real publish and share journey through the existing architecture.
2. Public content is immediately controlled by database state and does not rely on cache invalidation.
3. Slug history prevents old links from being reassigned to another page.
4. The public page remains useful for keyboard users, reduced motion users, and browsers without JavaScript animation.
5. The API exposes a small, safe public contract instead of leaking the Prisma model.

**Negative / tradeoffs**:

1. No public caching means every public read uses the API and database path. This is appropriate for the private beta, but measured traffic may require a privacy safe cache design later.
2. Published slugs cannot be renamed, so a printed or QR shared URL remains stable. Creators can change a draft slug before publication.
3. GSAP and `@gsap/react` increase the web bundle and add client lifecycle complexity. The animation must remain isolated from the server data path.
4. There is no publication history or revision recovery. The current page and content version remain the source of truth until a later requirement needs historical versions.

**Neutral**:

1. The existing database schema needs no migration.
2. Tailwind is already installed. `gsap` and `@gsap/react` are the only new web dependencies.
3. Figma and Vercel MCPs were considered and skipped for this feature. No external design or deployment connection is required.

## Follow-up

1. [ ] Capture the installed `gsap-core`, `gsap-react`, `gsap-performance`, `gsap-scrolltrigger`, and `gsap-timeline` conventions in `apps/web/AGENTS.md` before implementation. These skills are installed but are not yet listed in the project context.
2. [ ] Design protected links and QR sharing separately before adding page passwords or unlock proofs.
3. [ ] Design visitor responses and moderation separately before adding response controls or public reporting to Secret Letter pages.

## References

**Project sources**:

1. `docs/scope/scope.md`, Slice 2 public Secret Letter publishing and the Tracer Bullet approach.
2. `docs/specs/0001-stack-and-architecture.md`, the web, API, database, and authentication boundaries.
3. `docs/specs/0002-data-model/index.md`, page lifecycle, slug reservations, public projections, and privacy boundaries.
4. `docs/specs/0003-authenticated-secret-letter-draft-loop.md`, owner saves, content versions, safe errors, and deletion behavior.
5. `docs/specs/0004-api-errors-request-context.md`, request IDs, safe error envelopes, and request observability.
6. `apps/web/design.md`, Secret Letter presentation, responsive behavior, accessibility, and motion direction.
7. `apps/web/AGENTS.md` and `apps/api/AGENTS.md`, workspace boundaries and API authorization rules.
8. Installed GSAP skills from `greensock/gsap-skills`, React lifecycle, timelines, ScrollTrigger, motion preference, and performance guidance.

**Practices and standards**:

1. API authorization boundary with server side ownership checks.
2. Optimistic concurrency and database uniqueness constraints for conflicting writes.
3. Safe error envelopes and account existence protection.
4. Progressive enhancement and WCAG AA accessibility.
5. No index and no store handling for sensitive public content.
6. OWASP guidance for session security, CSRF protection, origin validation, and rate limiting.
