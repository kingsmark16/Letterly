# Database package

## Overview

`@letterly/database` owns the Prisma 7 schema, generated client, PostgreSQL driver adapter setup, migration configuration, and runtime client lifecycle. The schema currently has no application models and the package is not yet wired into the API.

## Key files

| File | Owns |
|---|---|
| `packages/database/prisma/schema.prisma` | Prisma generator and PostgreSQL datasource declaration |
| `packages/database/prisma.config.ts` | Prisma schema, migration path, and connection configuration |
| `packages/database/src/client.ts` | Lazy Prisma client creation and disconnect helper |
| `packages/database/src/index.ts` | Public database package exports |
| `packages/database/.env.example` | Local database variable names |

## Commands

```bash
pnpm --filter @letterly/database generate
pnpm --filter @letterly/database validate
pnpm --filter @letterly/database check-types
```

## Conventions

- Use Prisma 7 with `@prisma/adapter-pg` and `pg`.
- Keep the generated client out of source control and regenerate it through package tasks.
- Use a pooled runtime connection and a direct migration connection once the environment is configured.
- Keep application models and migrations behind an approved `/architect data model` decision.
- API infrastructure owns database client startup and shutdown when this package is connected to NestJS.

_Drafted by /sync from the introducing change, worth a quick human pass._
