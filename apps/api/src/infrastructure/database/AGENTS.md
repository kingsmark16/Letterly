# API database infrastructure

## Overview

This area binds the shared Prisma 7 client into NestJS through the `PRISMA_CLIENT` token. It owns application shutdown cleanup and the narrow recovery path for transient database connection failures.

## Key files

| File | Owns |
| --- | --- |
| `prisma.module.ts` | Global NestJS provider registration and export |
| `prisma.provider.ts` | Shared client factory and shutdown disconnect |
| `prisma-token.ts` | Stable dependency injection token |
| `prisma-recovery.ts` | Transient recovery and PostgreSQL authentication error classification |
| `prisma-recovery.spec.ts` | Nested Prisma/PostgreSQL error classification and reconnect separation coverage |

## Conventions

* Feature services inject `PRISMA_CLIENT`. They never create their own Prisma client.
* Keep the shared client factory and disconnect implementation in `@letterly/database`.
* Treat only the explicit network, Prisma, PostgreSQL, and shutdown codes as transient.
* Keep permanent authentication classification separate from transient recovery. Readiness may use PostgreSQL `P1000` and SQLSTATE `28P01` to report a generic unavailable state; these failures must not trigger reconnect attempts.
* Attempt disconnect and reconnect only after a recognized transient failure.
* Keep recovery best effort. A failed reconnect attempt must not hide the original operation failure.

## Related specs

* [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
