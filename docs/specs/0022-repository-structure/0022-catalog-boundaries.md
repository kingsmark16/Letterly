# 0022. Catalog application and persistence boundaries

**Date**: 2026-10-03
**Status**: Complete

## Summary

Give the public catalog clear application, infrastructure, and presentation owners. Keep Prisma queries in an injected repository, registry resolution and validated response mapping in a plain service, and HTTP behavior in its controller.

## Context and decision

`catalog.service.ts` currently injects Prisma, constructs queries, resolves trusted definitions, and validates responses. The parent restructuring spec and root rules already require inward dependencies and provider independent application code. Use the established pages pattern: a plain application service, a plain repository port, an injectable Prisma implementation, and a Nest factory at module composition. No new framework or workspace is needed.

Automatic continuation is authorized. The design preserves existing query semantics and launch behavior. This is not a pagination, activation, or public caching change.

Implementation skills: architect, develop, NestJS best practices, and Turborepo.

## Requirements

- AC-1: Move the catalog service and repository port to `application/`, the Prisma implementation to `infrastructure/`, and controller plus its tests to `presentation/`. Remove obsolete flat source files without compatibility exports after updating every caller.
- AC-2: The application service depends only on contracts, trusted template definitions, and its plain repository port. Nest factories bind the service to the repository token; the Prisma implementation uses the existing injected client. Add enforced lint restrictions for catalog application imports, including type imports.
- AC-3: Preserve category active filtering, empty filter behavior, category existence/status lookup, active template/version queries, display/version ordering, selected fields, nullable descriptions, registry key/version matching, capability mapping, response validation, and safe controller errors.
- AC-4: Test plain application behavior, query shapes, provider failures and malformed records, unknown/inactive categories, unsupported versions, and module factory/alias wiring. Existing HTTP tests run against the actual CatalogModule with a fixture database provider. Repository gates and API integration pass.

## Input and output ownership

The controller retains the existing active query parser and optional category key. Repository methods receive `activeOnly`, category key, or optional category ID and return plain catalog record types. Those records retain the existing selected fields: category key/name/description/display order, category ID/status for lookup, and template metadata/category key/version ID/version/registry key for mapping. The service derives capabilities and audio policy from the canonical registry and validates the current contract schemas.

`CATALOG_REPOSITORY` is an application owned token. CatalogModule uses `useExisting` for the Prisma implementation and a typed factory to construct CatalogService. No application code imports Prisma or Nest, no client is constructed inside the feature, and no adapter uses the outer client outside its established read operations.

## Build plan

1. Add the port and extract the exact Prisma read queries (AC-1, AC-3).
2. Move the service/controller, wire the real module, and enforce application imports (AC-1, AC-2).
3. Add plain service and adapter tests, use production module composition in existing HTTP tests, and run gates (AC-3, AC-4).

## Consequences and follow-up

Catalog query changes no longer require editing application behavior, and registry/response mapping can be tested without Prisma or Nest. The existing global template query and pagination semantics are preserved. Broader catalog growth and activation rules remain explicit follow-up decisions. No database schema, migration, seed, or additional launch content is introduced.

## Verification

All four criteria are implemented. See [catalog boundary verification](../../reviews/2026-10-03-catalog-boundaries.md) for targeted behavior, query and module checks, import restriction probes, repository gates, and remaining test limitations.
