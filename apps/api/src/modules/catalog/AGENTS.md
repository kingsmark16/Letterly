# Public catalog module

## Overview

This module serves category navigation, grouped landing previews, bounded template pages, and focused template lookup through `/api/v1/categories`, `/api/v1/catalog/overview`, `/api/v1/catalog/templates`, and `/api/v1/catalog/templates/lookup`. The legacy `/api/v1/templates` array remains available for compatibility and is not used by the web app. Catalog responses resolve active database records against the trusted `@letterly/templates` registry without exposing creator or page data.

## Key files

| File | Owns |
| --- | --- |
| `catalog.module.ts` | NestJS factory composition and repository alias |
| `presentation/catalog.controller.ts` | Public query parsing and safe HTTP errors |
| `application/catalog.service.ts` | Plain registry resolution and response validation |
| `application/catalog.repository.ts` | Plain selected record types and repository port |
| `application/catalog-cursor.ts` | Framework independent cursor port and invalid cursor error |
| `infrastructure/prisma-catalog.repository.ts` | Injected Prisma catalog queries |
| `infrastructure/catalog-cursor.service.ts` | Cursor encoding, filter fingerprinting, and payload validation |
| `presentation/catalog.controller.spec.ts` | Public route and production module wiring coverage |

## Conventions

* Validate responses with the catalog schemas from `@letterly/contracts/catalog`.
* Return only active templates and active template versions.
* Resolve every returned version by both registry key and version in `@letterly/templates`.
* Keep overview reads grouped with at most four current version summaries per active category.
* Apply category and search filters before stable `(displayOrder, id)` cursor paging. The default page size is 20 and the maximum is 50.
* Bind cursors to their normalized filters and page size. Keep cursor encoding in infrastructure and the cursor port framework independent.
* Focused lookup may select one requested active version. Catalog changes must not alter the version identity stored by an existing page.
* Map an unknown or inactive requested category to the safe `NOT_FOUND` envelope.
* Map a missing trusted registry definition to the safe `SERVICE_UNAVAILABLE` envelope.
* Keep creator authorization, private page data, and template implementation code outside this module.
* Application code imports contracts, definitions, and plain ports; ESLint rejects framework, database, infrastructure, and presentation imports, including type imports.

## Related specs

* [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)
* [Flexible template data model](../../../../../docs/specs/0002-data-model/index.md)
* [Catalog boundaries](../../../../../docs/specs/0022-repository-structure/0022-catalog-boundaries.md)
* [Catalog growth and bounded browsing](../../../../../docs/specs/0022-repository-structure/0022-catalog-growth-pagination.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
