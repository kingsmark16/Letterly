# Admin interface and operations

## Summary

Build a dedicated light operations console with searchable creator and page lists, report and appeal inboxes, deletion progress, and audit access. Your administrators can follow one target across screens without seeing private writing.

## Requirements

Implements parent AC-1 through AC-4, AC-9, AC-10, and AC-11. Overview composition also supports AC-7.

## Decision

Use Tailwind and shadcn/ui with scoped admin tokens and feature owned compositions. Reuse accessible primitives where their semantics fit, while replacing the current admin visual composition. Keep native table semantics rather than introducing spreadsheet keyboard behavior. (basis: existing components.json configuration, shadcn theming, W3C table and dialog guidance.)

## Feature design

### Visual contract

The source is the direction selected in this design conversation, not `apps/web/design.md` or the current creator workspace. The admin wrapper owns its visual variables, typography, controls, and layouts. Use ordinary CSS custom properties scoped to `[data-admin-root]`, mapped to shared semantic variables only inside that wrapper. Tailwind v4 `@theme` declarations remain at the top level. Audit global descendant rules and Radix portals; mount portal content inside an admin theme container or apply the same scoped theme marker to it. Do not change shared primitive defaults or either components.json alias map to theme this feature.

Recommended starting tokens, subject to measured contrast verification: canvas `#F4F6F8`, surface `#FFFFFF`, navigation `#18212D`, primary text `#17212F`, muted text `#526071`, blue action `#1D4ED8`, destructive `#B42318`. Use status text plus a symbol or label, never color alone. Input boundaries and focus need measured nontext contrast; do not claim compliance from these suggested values alone.

Use the system sans font stack explicitly inside the wrapper, 16 pixel base text, readable table text at least 14 pixels, tabular numbers, 24 to 32 pixel page headings, and visible 44 pixel action targets. Use restrained 6 pixel control and 10 pixel panel radii. Reserve shadows for overlays. No external imagery or new fonts are needed. Use existing icons sparingly beside labels. Motion only communicates pending or opening state and respects reduced motion. Apply antislop during design and implementation.

Desktop navigation is a graphite sidebar. At narrow widths use a labeled menu button and accessible sheet. Begin with a 1024 pixel shell transition and verify intermediate widths rather than treating it as a device requirement. Main content padding is 16 pixels on phones, 24 on tablets, and 32 on desktop. Lists become stacked semantic summaries below the width where columns remain readable, initially 768 pixels. Do not duplicate active controls in the accessibility tree.

### Screens

| Route | Composition |
| --- | --- |
| `/admin` | Redirect to `/admin/overview` after server access verification |
| `/admin/overview` | Work needing attention, current platform totals, period control, trends, coverage and refresh timestamps |
| `/admin/creators` | Search, state/date filters, safe creator list, next cursor |
| `/admin/creators/[creatorId]` | Identity, status, dates, owned page summaries, moderation history, confirmed actions |
| `/admin/pages` | Search, publication/moderation/template/date filters, page metadata list |
| `/admin/pages/[pageId]` | IDs, slug, template/version, lifecycle, dates, counts, creator and report links, actions |
| `/admin/moderation/reports` and existing detail | Preserve links and behavior inside new shell |
| `/admin/moderation/appeals` and `[appealId]` | Requested/resolved inbox, support reference, original action, decision and target links |
| `/admin/deletions` and `[jobId]` | Queue, progress, attempts, safe failures, retry, completion |
| `/admin/moderation/audit` | Preserve audit filters, signed pagination, and safe event projection |

Keep creator account actions unavailable for role ADMIN, including direct API requests. Existing protected target checks remain authoritative. Page management supports creator owned pages only. The creator page summary excludes content, custom message fields, media keys, passwords, and response bodies. Names and email are approved only on creator management surfaces. No email enters audit metadata, errors, metrics, or logs.

### Query and action API

Paths below are relative to `/api/v1/admin`. Every route requires an active administrator session. All reads return 200 with validated projections and private headers. Use existing action endpoints unchanged for disable/restore, report transitions, and appeal intake/decisions.

| Method and path | Inputs | Result |
| --- | --- | --- |
| GET `/creators` | moderationStatus, createdFrom, createdTo, cursor, size | Creator summaries and nextCursor |
| POST `/creators/search` | field: id/name/email, value, same filters/cursor/size in exact body | Same bounded list |
| GET `/creators/:creatorId` | bounded existing user ID | Creator detail, page count, moderationVersion |
| GET `/pages` | creatorId, status, moderationStatus, templateKey, date bounds, cursor, size | Safe page summaries and nextCursor |
| POST `/pages/search` | field: id/slug, value, same filters/cursor/size | Same bounded list |
| GET `/pages/:pageId` | UUID | Safe page detail and moderationVersion |
| GET `/appeals` | status, targetType, targetId, cursor, size | Appeal summaries and nextCursor |
| GET `/appeals/:appealId` | UUID | Safe appeal detail and original action |

Creator summary fields: id, name, email, role, moderationStatus, createdAt, updatedAt, disabledAt, moderationVersion, pageCount, deletionRequestedAt, deletionJobId. Detail additionally includes safe disabledReason and bounded history through existing history reads. Page fields: id, creatorId, slug, templateKey, templateVersion, publication status, moderationStatus, moderationVersion, createdAt, updatedAt, publishedAt, disabledAt, deletionRequestedAt, deletionJobId, reportCount. The deletion fields are nullable; job IDs come from the unique DeletionJob target relation, not from client state. Do not add a user supplied page title as a metadata shortcut. Show missing/deleted target relationships as unavailable, not broken links.

After a target returns 404, its unavailable screen may query `/deletions?targetType=CREATOR|PAGE&targetId=<exact-id>` under the same administrator authorization. If a retained job exists, show its status and link to `/admin/deletions/[jobId]`. Otherwise show the ordinary unavailable state. Target screens with a deletion barrier show the job link and no disable, restore, or new deletion action. Never infer completed deletion from 404 alone.

### Appeal response allowlists and pagination

| Response | Exact additional or included fields | Source |
| --- | --- | --- |
| Appeal summary | id, status, moderationVersion, originalActionId, targetType, targetId, reasonCode, createdAt, resolvedAt | Appeal, original ModerationAction, and its logical target projection |
| Appeal detail | All summary fields plus externalReference, updatedAt, resolvedById, resolutionReasonCode, and resolutionNote | Existing validated appeal/action projection; nullable resolution fields derive from the decision ModerationAction, ordered by createdAt and id |

Do not select arbitrary related records into an appeal DTO. Resolution notes remain the existing bounded moderation notes and render as text. Creator identity, confession content, visitor responses, storage keys, and lease fields are absent. The original action and target links use originalActionId and targetType/targetId. A deleted relation is nullable/unavailable under the existing cascade behavior, not reconstructed from private content. Detail history uses the existing audit endpoint filtered by logical target.

Appeals sort by `(createdAt DESC,id DESC)`, default size 25, maximum 100. Accepted filters are status, targetType, and targetId. Normalize enum values through their exact schemas, trim and validate bounded IDs, and reject a targetId without targetType. Signed cursors bind endpoint purpose, all normalized filters, and size. Each response is `{items,nextCursor}`, with nextCursor null at the end. The children and deletion list contracts are defined in the deletion child. Existing report/audit pagination contracts remain unchanged.

Page and creator lists sort by `(createdAt DESC, id DESC)`. Default size 25, maximum 100. Signed cursors bind normalized filters, size, and search hash. IDs and slugs use exact match; email uses the exact canonical lookup defined below. Name uses case insensitive prefix matching of 2 to 100 characters. Generic user IDs are bounded to 200 characters. Slug input uses the existing slug schema. Dates are inclusive lower and exclusive upper UTC instants. Require at most a 366 day interval when both are supplied. Index ordered listing, creator ownership, moderation status, and normalized name/email lookup through additive migrations; verify query plans on representative fixtures.

### Creator email search contract

**Review**: Content ratified, 2026-11-17. Requested during milestone 2 development after the missing contract was identified. A fresh review using the same model identified a database collation gap and a padded input test clarification. You approved both fixes and accepted the revised contract. Existing creator management remains in scope. This content confirmation does not change the parent lifecycle status or claim implementation is complete.

Create and export `adminCreatorEmailSearchSchema` from `packages/contracts/src/moderation.ts`. This is a search input contract, not a User persistence or account registration schema. The browser form and `POST /creators/search` both use it when `field` is `email`. The API remains authoritative. (basis: contracts package conventions, existing protected search API, installed Zod validation.)

| Value or behavior | Contract and source |
| --- | --- |
| Raw value | A string from the exact search request body. Reject other types and unknown body keys through the search request schema. The existing 128 KiB HTTP body limit also applies before validation. |
| Surrounding whitespace | Apply JavaScript `String.trim()` before validation. Internal whitespace remains invalid. |
| Supported syntax | Require ASCII characters in the printable range U+0021 through U+007E and the installed Zod 4 default `z.email()` validator. Empty strings, display name wrappers, quoted local parts, comments, and international email text are rejected. An ASCII domain in its encoded form is allowed only if it passes the same validator. |
| Maximum length | At most 254 characters after trimming, before lowercasing. Accepted characters are ASCII, so the character and byte counts agree. This is the product search limit, not a claim of support for every address allowed by email standards. |
| Canonical value | Lowercase the validated ASCII address. This follows the installed Better Auth email storage and lookup behavior. Preserve dots, plus tags, underscores, and every other accepted character. Do not remove tags or apply provider specific aliases. |
| Database match | Use `lower("email" COLLATE "C") = $1 COLLATE "C"` against the existing `user` table, with the canonical email supplied as a bound parameter. PostgreSQL's built in `C` collation supplies the fixed text comparison rule for both lowercasing and literal equality. Do not use substring, prefix, or wildcard matching. The normalized email lookup index is a nonunique expression index on the identical `lower("email" COLLATE "C")` expression. Do not depend on the database's default collation. Keep the current unique email constraint unchanged. |
| Cursor binding | Hash the canonical email with search field `email` through the existing cursor hash port. Bind that search hash, endpoint purpose, normalized filters, and page size into the signed cursor. Equivalent case or surrounding whitespace uses the same search identity. A different address invalidates the previous cursor. |
| Invalid input | Return the existing generic 422 validation envelope without echoing the address or field value. The browser may show a static email validation hint. Authentication and administrator policy checks still run, but no creator search query runs for invalid input. |
| No match | Return `{items: [], nextCursor: null}` under the same administrator authorization. Multiple stored rows that differ only by case are returned as separate account records in the existing bounded order. Canonical search does not establish account uniqueness. |
| Client ownership | Keep the submitted value and search continuation in component memory. Use `crypto.randomUUID()` to create an opaque attempt token on each explicit search submission and use that token instead of the email in TanStack Query keys. Clear the prior result and continuation when a new search is submitted. Do not put the value in URLs, telemetry, logs, persistent caches, or browser storage. |

Do not narrow the existing creator detail response email schema, rewrite stored identities, change OAuth behavior, send verification email, or add an account creation limit as part of this clarification. A stored address outside this search contract remains discoverable through exact user ID lookup. The browser uses a visible Email address label, a static syntax and length hint, and a linked validation error. Case or whitespace normalization must not erase a user's form input during editing. Browser input attributes must preserve the shared trim then validate behavior. In particular, do not set a raw `maxlength=254` that truncates a valid 254 character address pasted with surrounding whitespace.

The 254 character cap is a deliberate product rule informed by the ordinary mailbox interpretation of the SMTP path limit. Zod supplies practical syntax checking rather than complete email standards validation. Lowercasing follows Letterly's installed provider behavior rather than a universal claim about email case rules. (basis: RFC 5321 section 4.5.3.1.3, Zod email documentation, `better-auth/dist/db/internal-adapter.mjs`, and `better-auth/dist/oauth2/link-account.mjs`.)

Keep searches containing identity in POST bodies and component memory, not URLs, telemetry, persisted query caches, or browser storage. URL state retains only nonpersonal enum/date filters and period. Cursor values remain opaque. Search cursor state stays in memory and is cleared on search changes; normal list cursor may stay in the URL. A direct profile URL can contain the existing bounded opaque ID. Read only search POST routes validate trusted origin and consume the read limit.

### Behavior and failures

Use server access probing before interactive consoles hydrate. Expired sessions clear sensitive client data and offer sign in with a validated return path. No action auto resumes after reauthentication. Read cancellation uses existing Axios signal forwarding. Errors offer safe retry without losing nonsecret form input. Disable/restore use existing explicit confirmations. Permanent deletion uses the separate child contract.

Every navigation item has an accessible name and current state. Native desktop tables use headers and row action labels. Mobile summaries preserve the same information priority. Dialogs trap focus, close with Escape before submission, and return focus to the trigger or stable heading. A pending accepted job is not canceled by closing a dialog. Charts have an accessible data table. No counts have leading zeros.

## Build plan

1. Implement protected creator detail in the new shell and verify denial and theme isolation, parent AC-1, AC-2, AC-9 through AC-11.
2. Add bounded lists/search, page detail, and existing disable/restore actions, parent AC-2, AC-4, AC-9 through AC-11.
3. Integrate reports, appeal inbox/detail, and audit with preserved deep links and confirmations, parent AC-1, AC-3, AC-9 through AC-11.

## Critical test scenarios

1. Real isolated database list/search proves filtering, safe projections, order, cursor binding, limits, and absent private fields, AC-2 and AC-9.
2. Visitor, creator, disabled administrator, expired session, and invalid origin cannot read or act, AC-4 and AC-9.
3. Desktop/mobile keyboard journeys cover all destinations, empty/error recovery, stale actions, and focus return, AC-1, AC-3, AC-10.
4. Public landing, sign in, creator workspace, and public templates retain rendered styles after admin theme and component changes, AC-11.
5. Creator email search accepts a valid 254 character address, including that address surrounded by whitespace, in both browser and API tests. The browser must preserve the complete padded value until validation trims it, rather than truncate it through input attributes. Reject an otherwise syntactically valid 255 character address, blank values, internal whitespace, nonstrings, unknown request fields, and nonASCII input. Surrounding whitespace and case normalize to the same exact search. A real database test stores an address containing uppercase `I` and confirms that its lowercase query matches through the explicit `C` collation. Confirm the index uses the same collation and expression as the query. Plus tags and underscores remain literal. An underscore must not match another character. A changed email rejects a prior search cursor; equivalent normalized email preserves its binding. No email appears in URLs, query keys, logs, errors, or persistent storage. Legacy records outside the search contract remain accessible by ID. Covers AC-2, AC-9, and AC-10.

## Consequences

Fresh scoped presentation adds maintenance. Search identity is deliberately not resumable through shared URLs. Existing moderation services stay reusable while the visible shell changes.

## Rationale

The existing API already supplies the sensitive action protections. Dedicated metadata queries and scoped styling add the requested workspace without rebuilding that foundation. Ordinary tables and dialogs fit the work better than a new interactive grid system.
