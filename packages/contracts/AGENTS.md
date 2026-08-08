# Contracts package

## Overview

`@letterly/contracts` contains framework independent Zod schemas, inferred types, and provider interfaces shared across the web application and API.

## Key files

| File | Owns |
|---|---|
| `packages/contracts/src/index.ts` | Health response schema and storage and rate limit interfaces |
| `packages/contracts/package.json` | Package exports and Zod dependency |

## Commands

```bash
pnpm --filter @letterly/contracts check-types
```

## Conventions

- Do not import application, framework, database, or provider client code.
- Keep schemas at transport boundaries and keep interfaces provider independent.
- Export named schemas, types, and interfaces.

_Drafted by /sync from the introducing change, worth a quick human pass._
