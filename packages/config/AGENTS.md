# Configuration package

## Overview

`@letterly/config` validates shared application environment values with Zod. It is framework independent and must not create database, Redis, R2, or authentication clients.

## Key files

| File | Owns |
|---|---|
| `packages/config/src/index.ts` | Environment schema, `AppConfig`, and `loadConfig` |
| `packages/config/package.json` | Package exports and type check command |

## Commands

```bash
pnpm --filter @letterly/config check-types
```

## Conventions

- Keep startup validation explicit and fail with variable names, never secret values.
- Keep optional provider configuration optional until the related capability is enabled.
- Export named schemas, types, and functions.

_Drafted by /sync from the introducing change, worth a quick human pass._
