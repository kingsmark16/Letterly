# API application

## Overview

This workspace is the NestJS REST API. It owns authentication integration, authorization, validation, business rules, persistence access, and provider adapters. The current scaffold exposes `GET /` and `GET /health`; Better Auth, domain features, and database wiring are not implemented yet.

## Key files

| File | Owns |
|---|---|
| `apps/api/package.json` | API dependencies and workspace commands |
| `apps/api/src/main.ts` | NestJS startup and validated application configuration |
| `apps/api/src/app.controller.ts` | Current health and root HTTP endpoints |
| `apps/api/src/app.module.ts` | Root NestJS module composition |
| `apps/api/src/app.controller.spec.ts` | Controller unit coverage |
| `apps/api/test/app.e2e-spec.ts` | Supertest HTTP coverage |

## Commands

```bash
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api check-types
pnpm --filter api test
pnpm --filter api test:e2e
```

## Conventions

- Keep the API as the authorization boundary. Browser checks are for usability and never replace server checks.
- Keep framework code at the presentation boundary and place use cases, domain rules, and provider implementations in feature focused areas as they are added.
- Import shared request and response contracts from `@letterly/contracts`.
- Keep database access behind API infrastructure providers. Controllers must not create Prisma clients or call provider SDKs directly.
- Validate environment values at startup and never log secrets, cookies, tokens, credentials, or confession content.
- The current API tests use Jest and Supertest. Do not treat the future Vitest and Playwright plan as implemented tooling.

## Related specs

- [Stack and architecture](../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
