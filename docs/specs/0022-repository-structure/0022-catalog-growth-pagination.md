# 0022. Catalog growth and bounded template browsing

**Date**: 2026-10-04

## Summary

Bound public template catalog work as categories and template families grow. The landing page receives a small preview per active category. Browse pages use stable cursor pagination, server side filtering, and a single current version summary per template family. Exact version identity remains available to preview resolution, and saved pages remain pinned to their original version.

## Context

This is an enhancement across the existing NestJS API, shared contracts, Prisma database package, and Next.js web application. The catalog already has a plain application service, a repository port, an injected Prisma adapter, and server rendered web readers. Keep those owners and the existing stack.

The current `GET /api/v1/templates` query returns every active template family and every active version. The landing page and browse pages then render or filter the full result. The in-repository consumers are the web server readers and test fixtures, so update them together with the shared response contract. No external API client or published API reference is present in the repository. The first release remains one active category with its two launch templates. Larger catalogs belong in isolated fixtures, not production activation.

The initial capacity target is hundreds of active template families across dozens of categories. Category records remain an unpaginated navigation list at this scale. If category count later reaches hundreds, category navigation needs its own design.

## Options considered

For browsing, keeping one full catalog response preserves the current page behavior but leaves response work proportional to every family. Offset pagination is easy to understand, but deeper pages still scan earlier rows and concurrent order changes can shift results. Cursor pages with a small per category landing preview keep request work bounded and preserve URL driven server rendering. Infinite scroll would add client state and weaker direct page navigation.

For versions, returning every active version in every collection row mirrors the current response but makes list size grow with version history. Returning the current active version in collection summaries matches the existing cards, which already select the highest version. A focused lookup can return one requested active version when preview fallback needs it, while saved pages keep their exact database version identity.

For the API, changing the current array in place is a breaking response shape change. Adding catalog routes preserves deployed clients and follows the API before web deployment order, at the cost of a legacy endpoint that must be retired before wider public catalog growth.

## Decision

Browse cards already choose the highest active version for preview and draft creation. Return that one version in each list item as `currentVersion`; do not serialize every active version into every page. A focused lookup returns one `selectedVersion`, either the current active version or a requested active version. Version registration remains immutable. Preview resolution may still select a registered version directly, and persisted pages continue to resolve their exact `templateVersionId` even when a version is no longer active for new creation.

The landing page uses a dedicated catalog overview read that returns active categories with at most four active template previews per category. The API performs this as one grouped repository operation with nested projections, rather than asking the web application to make one template request per category. The limit is the API owned constant `CATALOG_PREVIEW_SIZE = 4`.

The bounded template collection uses `GET /api/v1/catalog/templates` and accepts `categoryKey`, `q`, `size`, `cursor`, and `direction` query values. It returns a page envelope. The existing `GET /api/v1/templates` array remains unchanged during this milestone. The web application moves to the bounded routes. Remove the legacy route in a separately versioned change before enabling a catalog larger than the launch catalog.

Cursor pages use ascending `(displayOrder, id)` ordering. The unique ID tie break makes order deterministic when several families share an order value. The default page size is 20 and the maximum is 50, matching existing page query contracts. Search is trimmed, limited to 120 characters, and applied in the database before pagination as a case insensitive substring match across template name, description, and category name. Do not calculate a total count for each page. The UI describes the current page and provides previous and next links while preserving URL filters. A missing direction defaults to `after`; `before` without a cursor is invalid.

For `after`, query positions greater than the cursor in ascending order and take `size + 1`; return the first `size` rows and use the extra row only to determine whether a next page exists. For `before`, query positions less than the cursor in descending order, take `size + 1`, and reverse the returned rows so every response stays in ascending display order. Emit the next cursor from the last returned row when more rows follow, and the previous cursor from the first returned row when more rows precede. An active database version without an exact trusted registry definition is a catalog configuration failure and returns the existing `503 SERVICE_UNAVAILABLE` response; it is never silently skipped to fill a page.

Keep catalog reads uncached. This change adds no cache policy, executable template discovery, user generated template code, new service, dependency, or environment variable.

## Requirements

- AC-1: The shared catalog contracts define an overview response, a bounded template page response, a template list item with one `currentVersion`, and a focused lookup response with one `selectedVersion`. List items expose no registry key, private page data, or template implementation code. Response schemas reject more than 50 list items or more than four previews for one category.
- AC-2: `GET /api/v1/catalog/overview` returns active categories in stable `(displayOrder, id)` order. Each category contains no more than four eligible template families in stable `(displayOrder, id)` order. Each family has at least one active registered version and exposes only its highest active version. Inactive categories, templates, and versions are excluded. The web landing read makes one overview request and renders the preview plus a link to the category page.
- AC-3: `GET /api/v1/catalog/templates` applies active category, template, active version, and search filters before pagination. It returns at most the requested size, defaults to 20, rejects sizes outside 1 through 50, and reads at most `size + 1` eligible families to detect another page. Families without an active registered version are omitted. Search is trimmed and capped at 120 characters. Empty search is treated as absent. The existing `GET /api/v1/templates` response stays unchanged and is not used by the web application.
- AC-4: Template list order is stable and cursor traversal does not depend on the continued existence of the cursor row. Cursors contain a version, sort position, normalized filter fingerprint, and page size. A cursor reused with different filters or size, or a malformed cursor, receives the standard safe `BAD_REQUEST` response. Missing direction defaults to `after`, and `before` without a cursor is rejected. The first page has no previous cursor, the final page has no next cursor, and previous and next navigation return rows in the same ascending display order.
- AC-5: `GET /api/v1/catalog/templates/lookup` resolves by template key and optional category key and version. A missing or inactive family, a family without an active registered version, an inactive requested version, or an ambiguous bare key fails closed with `NOT_FOUND`. Without a requested version it selects the highest active version. The response contains that one selected version and its trusted capabilities.
- AC-6: The browse cards and landing previews continue creating drafts from the highest active version. Direct preview requests can select a registered exact version. Existing published pages continue to render from their stored version identity after another version is activated or the original version is retired from new creation.
- AC-7: The `/templates` and `/templates/[categoryKey]` server pages read filters and cursor state from the URL, keep search and category values in pagination links, and show clear loading, error, and empty states. Search status describes the current page rather than implying an exact total count. Pagination links have clear labels, visible keyboard focus, and usable touch targets. Existing reduced motion behavior and page metadata remain intact. Landing preview anchors use full template family identity so same-key families in different categories cannot create duplicate DOM IDs.
- AC-8: All route data remains server rendered and validated at the shared contract boundary. API query parsing uses the existing typed Zod contract approach. Nest controllers remain thin, application services remain framework free, and Prisma access remains in the injected catalog repository.
- AC-9: Tests use isolated fixtures with at least 100 template families, multiple categories, and two active versions for some families. They prove page limits, stable ordering, filter-bound cursors, no category-per-request loop, four-item landing previews, omission of families with no active version, current-version selection, focused exact lookup, category key collisions, and preserved version-pinned public page behavior. These fixtures do not activate new production catalog entries.
- AC-10: Verification records API response item counts and serialized JSON body sizes for the large fixture, plus browser behavior for first, middle, and final pages at mobile and desktop widths. Prisma schema validation and query argument tests verify the intended bounds and index definitions. A physical PostgreSQL query plan is reported only when an isolated database is available; no live or production database is used for this work.

## Feature design

### Data model

No new entities or columns are required. The existing relationships remain:

| Entity | Identity and relation | Use in this feature |
| --- | --- | --- |
| `Category` | `id` primary key, unique `key`; one category has many templates | Active category navigation and grouped landing previews |
| `Template` | `id` primary key, `categoryId` foreign key; unique `(categoryId, key)`; one family has many versions | Cursor ordered family collection |
| `TemplateVersion` | `id` primary key, `templateId` foreign key; unique `(templateId, version)` and unique `registryKey` | Select the highest active version for new creation and resolve an exact requested version |
| `Page` | `templateVersionId` foreign key to `TemplateVersion` | Preserve the exact version used by a saved page |

Add or refine indexes for the active filters and stable order:

| Model | Index |
| --- | --- |
| `Category` | `(status, displayOrder, id)` |
| `Template` | `(status, displayOrder, id)` for the global list |
| `Template` | `(categoryId, status, displayOrder, id)` for category pages and previews |
| `TemplateVersion` | `(templateId, status, version)` for selecting the highest active version |

The `TemplateVersion` index replaces the narrower `(templateId, status)` index because its leading columns preserve that lookup while also supporting version ordering. Keep the existing unique version and registry constraints. The migration changes indexes only and writes no catalog records or page references.

### API and value sourcing

| Route | Inputs | Result | Access and key errors |
| --- | --- | --- | --- |
| `GET /api/v1/categories` | Existing optional `active` filter | Existing category array | Public. Invalid filter returns `400 BAD_REQUEST`. |
| `GET /api/v1/catalog/overview` | None | `{ categories: [{ key, name, description, displayOrder, templates }] }`, with no more than four template summaries per category | Public. Database or trusted registry failure uses the existing `503 SERVICE_UNAVAILABLE` envelope. |
| `GET /api/v1/catalog/templates` | Optional `categoryKey`, `q`, `size`, `cursor`, and `direction` | `{ items, nextCursor, previousCursor }` | Public. Unknown or inactive category returns `404 NOT_FOUND`; invalid input or cursor returns `400 BAD_REQUEST`; database or trusted registry failure returns `503 SERVICE_UNAVAILABLE`. |
| `GET /api/v1/catalog/templates/lookup` | Required `templateKey`, optional `categoryKey` and positive `version` | One family summary plus one `selectedVersion` | Public. Missing, inactive, unsupported, or ambiguous identity returns `404 NOT_FOUND`; invalid input returns `400 BAD_REQUEST`. |
| `GET /api/v1/templates` | Existing request without pagination parameters | Existing unbounded template array | Public. Kept unchanged during the compatibility period; retire under a breaking API version before wider catalog growth. |

`displayOrder` and family `id` come from the database. The category filter is the active database category key. The search value comes from `q`, normalized by the shared query schema. `CATALOG_PREVIEW_SIZE` is an API owned constant set to four. `currentVersion` comes from the highest active database version after exact trusted registry resolution. `selectedVersion` comes from the requested positive version, or the current active version when omitted. Cursor position comes from the last or first returned family's `displayOrder` and `id`; its filter fingerprint and page size come from the normalized request. `direction` comes from the URL and defaults to `after`. Capabilities come only from the exact trusted definition keyed by registry key and version. The page identity remains the stored `Page.templateVersionId` and is never derived from the current catalog version.

### Security model

All catalog routes remain public and return only active catalog metadata plus capabilities from the trusted source registry. They never return registry keys, creator data, page content, private media references, or executable template content. Query size, search length, cursor shape, category status, and version identity are validated before repository results are returned. Existing safe error envelopes remain in use. Reads stay uncached until a separate cache policy names its invalidation behavior.

No new secrets, environment variables, external integrations, metrics, or alerts are required. No catalog-specific logging is added; existing request redaction and error monitoring rules continue to apply. The route metadata and indexing behavior do not change.

### Critical test scenarios

- **AC-2 and AC-9**: A fixture category with more than four families returns four previews, and another category with the same family key keeps its own identity.
- **AC-3 and AC-4**: Repeated page requests return every active family once in `(displayOrder, id)` order; changing category, search, or size invalidates the prior cursor.
- **AC-4**: Removing or deactivating the cursor anchor between requests does not prevent the next query from locating the next sort position.
- **AC-5 and AC-6**: A family with two active registered versions returns the higher version for new creation. Exact preview resolution still selects the requested registered version, and a persisted page pinned to the earlier version still renders after the newer one is activated.
- **AC-7 and AC-10**: First, middle, and final pages expose the right navigation links, retain URL filters, remain keyboard and touch usable, and do not overflow at mobile widths.
- **AC-8 and AC-10**: The API tests use the production catalog module composition and assert bounded Prisma projections. Measurement records fixture item counts and serialized response sizes without using a live database.

## Build plan

1. Add the shared bounded page and version summary contracts, then trace one category page end to end through the Prisma query, API response, server reader, URL cursor links, and browser fixture. Add the required indexes with this path and confirm the same pinned page version still renders. **AC-1, AC-3, AC-4, AC-6, AC-8**
2. Extend that proven collection path to the global template list and focused exact lookup. Apply category and search filters before paging, add the filter bound cursor rules, and cover real Nest module wiring, query shapes, collisions, and safe errors. **AC-3, AC-4, AC-5, AC-8**
3. Add the grouped overview read and migrate the landing server reader to four previews per active category. Verify that the repository reads categories and their previews as a grouped operation, not one request per category. **AC-2, AC-6, AC-8**
4. Add isolated growth fixtures and browser checks. Record response item counts and byte sizes, verify the legacy array remains unchanged, verify first, middle, and final page navigation at mobile and desktop widths, then run API, web, database, formatting, type, and build gates. **AC-3, AC-7, AC-9, AC-10**

## Migration plan

**Strategy**: Additive routes followed by a web cutover.

**Phases**:

1. Apply the additive index migration and deploy the new overview, page, and lookup routes. Existing category and template array clients continue to use their current endpoints.
2. Deploy the web application to the additive routes after the API is ready.
3. Run catalog browse smoke checks and confirm the existing page version retention journey. Keep the old array route through the compatibility period.

**Rollback**: Roll back the web application to its existing array reader if the new routes fail. The prior array route remains available. Keep the additive indexes in place; they do not change query results and can be removed later with a forward migration if evidence requires it.

**Risks**: The legacy array route remains unbounded during the compatibility period. It must not remain the route used by the web application, and it must be retired before activating a wider catalog. If an external client requires it for longer, catalog growth must wait for an explicit API versioning and retirement decision.

## Consequences

Each template collection request now has a strict family and nested version bound. The landing template payload grows with active categories and a fixed four-family preview, rather than every family in the database. Server rendered URL navigation avoids adding client state or infinite scroll behavior.

The new catalog collection uses a page envelope and the current web application moves to it. The existing `/api/v1/templates` array remains available for current clients. It is still unbounded, so it must be retired in a separately versioned change before public catalog growth. Cursor pages are consistent reads rather than a frozen snapshot; catalog activation or ordering changes between requests can change later pages. The public cursor grants no access and carries no private data, so it does not need a signing secret.

Substring search across a catalog of hundreds is acceptable for the initial target, but it does not gain a specialized text search index here. Revisit search indexing if measurements show meaningful latency at a larger catalog. The category list remains unpaginated for the initial target of dozens of categories.

## Follow-up

At initial verification no local isolated PostgreSQL instance was available, and the authoritative blueprint DOCX was absent as recorded in the parent rationale. A subsequent disposable PostgreSQL baseline is recorded in [the physical query plan review](../../reviews/2026-10-04-catalog-query-plan-baseline.md). Its overview family and active version overfetching and cursor filtering are corrected under [the SQL bounds contract](0022-catalog-sql-bounds.md), with [actual PostgreSQL verification](../../reviews/2026-10-04-catalog-sql-bounds.md). Search and inactive candidate costs remain data dependent. The blueprint summary remains the working reference; this measurement does not certify unreviewed original blueprint sections.

Retire `GET /api/v1/templates` under a breaking API version before enabling a catalog larger than the launch catalog. Add category navigation pagination only if category counts grow beyond the initial dozens target. Run `EXPLAIN ANALYZE` with representative active and inactive catalog rows against an isolated PostgreSQL database before making a physical query performance claim.

## Rationale

The catalog boundaries decision already put Prisma behind a repository and kept registry resolution in a plain service. This decision extends that seam instead of adding another catalog package. Existing page list contracts establish the 20 item default and 50 item maximum. The Vercel React guidance favors server data and small server to client payloads; the NestJS guidance favors narrow projections, bounded queries, and no N+1 reads. One current version in collection summaries matches current browse behavior, while exact registry identities and the page foreign key preserve older version behavior.
