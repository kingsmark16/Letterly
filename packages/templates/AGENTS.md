# Template registry package

## Overview

`@letterly/templates` is the canonical framework independent owner of template schemas, defaults, capabilities, registry metadata, grapheme limits, and Choose Your Heart graph validation. API, database, and web code consume its validated exports instead of duplicating template rules.

## Key files

| File | Owns |
| --- | --- |
| `src/index.ts` | Compatible public exports for definitions, schemas, and helpers |
| `src/capabilities.ts` | Shared capability and audio policy schemas and types |
| `src/catalog.ts` | Canonical category and template catalog metadata consumed by the seed and browser fixture |
| `src/catalog-validation.ts` | Pure catalog identity invariants checked before registry construction |
| `src/registry.ts` | Trusted registry derived from catalog definitions and exact identity/version resolution |
| `src/secret-letter.ts` | Secret Letter content, render model, settings, and private password schemas |
| `src/journey.ts` | Bounded journey schemas, graph validation, and immutable response snapshot types |
| `src/choose-your-heart.ts` | Choose Your Heart defaults and registry entry |
| `src/graphemes.ts` | Shared Unicode grapheme counting |
| `package.json` | Browser safe package exports and the local type check command |
| `tools/scaffold/` | Node 24 CLI, pure planning/rendering, guarded writes, and temporary workspace tests for unregistered starters |

## Commands

```bash
pnpm --filter @letterly/templates lint
pnpm --filter @letterly/templates check-types
pnpm --filter @letterly/templates test
pnpm scaffold:template --category <key> --template <key> --version <integer> --dry-run
```

## Conventions

* Keep this package free of React, NestJS, Prisma, API calls, persistence, authorization, and provider clients.
* Resolve definitions with `resolveTemplate`; every supplied registry key or renderer key must match the requested version. An explicitly undefined identity fails closed rather than falling back to another key. Resolution also fails when multiple definitions match, so renderer-only identity cannot choose an arbitrary category.
* Treat registry entries as trusted server definitions. Never persist executable code or arbitrary HTML.
* Catalog identities must have unique category keys, known category references, globally unique registry keys, and unique category/renderer/version tuples. Preserve launch keys and give each future immutable version a distinct registry key.
* Keep schemas, defaults, capabilities, publish requirements, and renderer metadata aligned for each immutable template version; Secret Letter's definition lives beside its schemas in `src/secret-letter.ts`.
* Keep template audio policy in trusted registry metadata, using `hidden`, `optional`, or `required` to control attachment and publish readiness.
* Count user visible limits in Unicode graphemes through the shared helper.
* Keep journey validation deterministic, bounded, and separate from Zod shape parsing.
* Export named schemas, types, helpers, and registry entries through the package boundary.
* Use package subpath imports inside this source exported package so Node and Next.js resolve the same TypeScript files. Contribution steps live in [template registration](../../docs/references/template-registration.md).
* Keep Node scaffold tooling outside browser exports. Generation creates only unregistered starters, never catalog entries or database activation, and rejects existing identities at any version.

## Gotchas

`Intl.Segmenter` is required for grapheme counting. Journey node keys must remain stable within a revision, and a valid graph must have one existing root, no cycles, no unreachable nodes, and a path to an outcome.

## Related specs

* [Flexible template data model](../../docs/specs/0002-data-model/index.md)
* [Authenticated Secret Letter draft loop](../../docs/specs/0003-authenticated-secret-letter-draft-loop.md)
* [Choose Your Heart template](../../docs/specs/0010-choose-your-heart-template/index.md)
* [Shared page audio](../../docs/specs/0017-shared-page-audio.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
