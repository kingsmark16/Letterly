# Database package

## Overview

`@letterly/database` owns the Prisma 7 schema, generated client, PostgreSQL driver adapter setup, migration configuration, and runtime client lifecycle. The schema contains the creator, page, media, question, submission, and report models used by the API.

## Key files

| File                                     | Owns                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| `packages/database/prisma/schema.prisma` | Prisma generator, PostgreSQL datasource, and application models |
| `packages/database/prisma.config.ts`     | Prisma schema, migration path, and connection configuration |
| `packages/database/src/client.ts`        | Lazy Prisma client creation and disconnect helper           |
| `packages/database/src/index.ts`         | Public database package and generated client exports          |
| `packages/database/src/json.ts`          | JSON value helpers for Prisma boundaries                       |
| `packages/database/.env.example`         | Local database variable names                               |

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
- Keep application models and migrations aligned with the approved `/architect data model` decision.
- API infrastructure owns database client startup and shutdown when this package is connected to NestJS.

_Drafted by /sync from the introducing change, worth a quick human pass._
