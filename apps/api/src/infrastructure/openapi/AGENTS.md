# API OpenAPI infrastructure

## Overview

This area builds the Letterly-owned OpenAPI document from Nest route metadata and shared Zod contracts. It exposes interactive docs only outside production and generates the same document for CI review. Better Auth owns `/api/auth/*`; those routes stay outside this document.

## Key files

| File | Owns |
| --- | --- |
| `openapi-document.ts` | Stable document metadata, selected Nest modules, cookie schemes, and environment-gated docs routes |
| `zod-openapi.decorators.ts` | Zod input/output conversion and route documentation decorators |
| `generate-openapi.ts` | Deterministic package-level OpenAPI JSON generation |

## Commands

```bash
pnpm --filter api openapi:generate
pnpm --filter api test:e2e --runInBand --runTestsByPath test/openapi.e2e-spec.ts
```

The generator writes ignored `apps/api/openapi.json`; CI uploads that file as `letterly-api-openapi` after the quality and browser checks pass.

Run the generator through `pnpm --filter api openapi:generate`. Its Nest CLI compilation emits the constructor metadata needed to instantiate `AppModule`; running the TypeScript source directly with `tsx` skips that metadata and fails dependency injection.

## Conventions

- Use the same Zod schema for runtime boundary validation and its OpenAPI input or output shape. Documentation metadata never replaces guards, authorization, parsing, or response mapping.
- Keep explicit wire schemas for query fields whose coercing Zod input accepts unknown values. Do not document those fields as unconstrained objects.
- Recursive JSON schemas need stable Zod metadata IDs so the converter can promote definitions into OpenAPI components. Unnamed cycles and unrepresentable schemas must fail generation.
- Add controllers only through the explicit module list in `openapi-document.ts`. Keep Better Auth routes excluded and protected routes paired with their session cookie alternatives.
- Register Swagger UI and JSON routes only outside production. Keep generated JSON out of source control.
- Document route errors with the shared API error envelope and describe streamed media with its actual status and content type.

## Related specs

- [API OpenAPI contract](../../../../../docs/specs/0022-repository-structure/0022-api-openapi-contract.md)
- [API error envelopes and request context](../../../../../docs/specs/0004-api-errors-request-context.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
