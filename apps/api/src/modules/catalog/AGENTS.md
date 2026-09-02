# Public catalog module

## Overview

This module serves the public category and template catalog at `/api/v1/categories` and `/api/v1/templates`. It reads active database records and resolves template versions against the trusted `@letterly/templates` registry without exposing creator or page data.

## Key files

| File | Owns |
| --- | --- |
| `catalog.module.ts` | NestJS module composition |
| `catalog.controller.ts` | Public query parsing and safe HTTP errors |
| `catalog.service.ts` | Prisma catalog reads, registry resolution, and response validation |
| `catalog.controller.spec.ts` | Public catalog route coverage |

## Conventions

* Validate responses with the catalog schemas from `@letterly/contracts/catalog`.
* Return only active templates and active template versions.
* Resolve every returned version by both registry key and version in `@letterly/templates`.
* Map an unknown or inactive requested category to the safe `NOT_FOUND` envelope.
* Map a missing trusted registry definition to the safe `SERVICE_UNAVAILABLE` envelope.
* Keep creator authorization, private page data, and template implementation code outside this module.

## Related specs

* [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)
* [Flexible template data model](../../../../../docs/specs/0002-data-model/index.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
