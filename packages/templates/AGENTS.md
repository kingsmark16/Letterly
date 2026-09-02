# Template registry package

## Overview

`@letterly/templates` is the canonical framework independent owner of template schemas, defaults, capabilities, registry metadata, grapheme limits, and Choose Your Heart graph validation. API, database, and web code consume its validated exports instead of duplicating template rules.

## Key files

| File | Owns |
| --- | --- |
| `src/index.ts` | Public exports, template capabilities, and the trusted template registry |
| `src/secret-letter.ts` | Secret Letter content, render model, settings, and private password schemas |
| `src/journey.ts` | Bounded journey schemas, graph validation, and immutable response snapshot types |
| `src/choose-your-heart.ts` | Choose Your Heart defaults and registry entry |
| `src/graphemes.ts` | Shared Unicode grapheme counting |
| `package.json` | Browser safe package exports and the local type check command |

## Commands

```bash
pnpm --filter @letterly/templates check-types
```

## Conventions

* Keep this package free of React, NestJS, Prisma, API calls, persistence, authorization, and provider clients.
* Treat registry entries as trusted server definitions. Never persist executable code or arbitrary HTML.
* Keep schemas, defaults, capabilities, publish requirements, and renderer metadata aligned for each immutable template version.
* Count user visible limits in Unicode graphemes through the shared helper.
* Keep journey validation deterministic, bounded, and separate from Zod shape parsing.
* Export named schemas, types, helpers, and registry entries through the package boundary.

## Gotchas

`Intl.Segmenter` is required for grapheme counting. Journey node keys must remain stable within a revision, and a valid graph must have one existing root, no cycles, no unreachable nodes, and a path to an outcome.

## Related specs

* [Flexible template data model](../../docs/specs/0002-data-model/index.md)
* [Authenticated Secret Letter draft loop](../../docs/specs/0003-authenticated-secret-letter-draft-loop.md)
* [Choose Your Heart template](../../docs/specs/0010-choose-your-heart-template/index.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
