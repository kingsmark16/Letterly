# Database package

## Overview

`@letterly/database` owns the Prisma 7 schema, generated client, PostgreSQL driver adapter setup, migration configuration, and runtime client lifecycle. The schema contains the creator, page, image/audio media, question, journey revision, submission, and report models used by the API.

## Key files

| File                                     | Owns                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| `packages/database/prisma/schema.prisma` | Prisma generator, PostgreSQL datasource, and application models |
| `packages/database/prisma/migrations/`   | Migration history, including bounded catalog indexes, page audio lifecycle, immutable page journey revisions, and response snapshot cleanup |
| `packages/database/prisma.config.ts`     | Prisma schema, migration path, and connection configuration |
| `packages/database/src/client.ts`        | Lazy Prisma client creation and disconnect helper           |
| `packages/database/src/index.ts`         | Public database package and generated client exports          |
| `packages/database/src/json.ts`          | JSON value helpers for Prisma boundaries                       |
| `packages/database/src/seed-catalog.ts`  | Catalog definition driven upserts with an injected store       |
| `packages/database/.env.example`         | Local database variable names                               |

## Commands

```bash
pnpm --filter @letterly/database generate
pnpm --filter @letterly/database validate
pnpm --filter @letterly/database lint
pnpm --filter @letterly/database check-types
pnpm --filter @letterly/database test
```

## Conventions

- Use Prisma 7 with `@prisma/adapter-pg` and `pg`.
- The catalog seed consumes `@letterly/templates` category and template definitions. Keep metadata there; the seed preserves stable category/template keys and template versions. Its unit tests use a fake store and do not connect to a database.
- `seedCatalogInTransaction` is the actual seed command entry. It wraps grouped provisioning in one Prisma transaction with bounded 30 second wait and execution limits. The injected `seedCatalog` operation is for transaction clients and isolated tests.
- Existing version upserts have an empty update. Compare the returned identity before updating status, and guard status writes by ID, template ID, version, and registry key. Conflicts propagate for transaction rollback. Source status is authoritative for deliberate provisioning; `INACTIVE` retains the definition and row, and an explicit `ACTIVE` descriptor may reactivate its matching row. Never write Page version references during seeding.
- Keep the generated client out of source control and regenerate it through package tasks.
- Use a pooled runtime connection and a direct migration connection once the environment is configured.
- The committed `.env.example` defaults target the loopback PostgreSQL service in the root Compose file. Put hosted staging or production connection strings only in the matching ignored environment or secret store.
- Keep application models and migrations aligned with the approved `/architect data model` decision.
- API infrastructure owns database client startup and shutdown when this package is connected to NestJS.
- Page journey revisions are immutable child records, and migration constraints preserve safe publication, deletion, and private snapshot lifecycles.
- `VisitorSubmission.journeyAnswerCount` is validated journey summary metadata, nullable for legacy writers. The additive migration checks nonnegative values. Page infrastructure writes it with snapshots, clears it on response deletion, and offers a bounded shared schema backfill through `pnpm --filter api submissions:backfill-counts --confirm`; run only against the explicitly selected environment.
- `Page.currentAudioId` is the single attached ready track; the schema and repository transactions must preserve page ownership and cleanup eligibility during audio replacement and removal.

_Drafted by /sync from the introducing change, worth a quick human pass._
