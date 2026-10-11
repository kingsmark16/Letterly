# Public catalog module

## Overview

This module serves the public category and template catalog at `/api/v1/categories` and `/api/v1/templates`. It reads active database records and resolves template versions against the trusted `@letterly/templates` registry without exposing creator or page data.

## Key files

| File | Owns |
| --- | --- |
| `catalog.module.ts` | NestJS factory composition and repository alias |
| `presentation/catalog.controller.ts` | Public query parsing and safe HTTP errors |
| `application/catalog.service.ts` | Plain registry resolution and response validation |
| `application/catalog.repository.ts` | Plain selected record types and repository port |
| `infrastructure/prisma-catalog.repository.ts` | Injected Prisma catalog queries |
| `presentation/catalog.controller.spec.ts` | Public route and production module wiring coverage |

## Conventions

* Validate responses with the catalog schemas from `@letterly/contracts/catalog`.
* Return only active templates and active template versions.
* Resolve every returned version by both registry key and version in `@letterly/templates`.
* Map an unknown or inactive requested category to the safe `NOT_FOUND` envelope.
* Map a missing trusted registry definition to the safe `SERVICE_UNAVAILABLE` envelope.
* Keep creator authorization, private page data, and template implementation code outside this module.
* Application code imports contracts, definitions, and plain ports; ESLint rejects framework, database, infrastructure, and presentation imports, including type imports.

## Related specs

* [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)
* [Flexible template data model](../../../../../docs/specs/0002-data-model/index.md)
* [Catalog boundaries](../../../../../docs/specs/0022-repository-structure/0022-catalog-boundaries.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
