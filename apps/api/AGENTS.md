# API application

## Overview

This workspace is the NestJS REST API. It owns authentication integration, authorization, validation, business rules, persistence access, and provider adapters. It exposes `GET /`, `GET /health`, the Better Auth route family at `/api/auth/*`, and the public catalog routes under `/api/v1`.

## Key files

| File | Owns |
|---|---|
| `apps/api/package.json` | API dependencies and workspace commands |
| `apps/api/src/main.ts` | NestJS startup and validated application configuration |
| `apps/api/src/app.controller.ts` | Current health and root HTTP endpoints |
| `apps/api/src/app.module.ts` | Root NestJS module composition |
| `apps/api/src/modules/auth/` | Better Auth instance, OAuth provider configuration, and `/api/auth/*` handler |
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
- Better Auth is mounted through `better-auth/node` at `/api/auth/*`. Nest body parsing is disabled at bootstrap so Better Auth receives the original request body.
- Google and Facebook are the only first release sign in providers. Each provider requires a complete client ID and client secret pair before it is enabled.
- Keep framework code at the presentation boundary and place use cases, domain rules, and provider implementations in feature focused areas as they are added.
- Import shared request and response contracts from `@letterly/contracts`.
- Keep database access behind API infrastructure providers. Controllers must not create Prisma clients or call provider SDKs directly.
- Validate environment values at startup and never log secrets, cookies, tokens, credentials, or confession content.
- The current API tests use Jest and Supertest. Do not treat the future Vitest and Playwright plan as implemented tooling.
- Follow the NestJS rules in [the blueprint reference](../../docs/references/letterly-blueprint.md): feature modules, constructor injection, thin controllers, DTO or contract validation, guards and policy services, consistent exception envelopes, request ID and timing interceptors, Prisma transactions for multi write invariants, provider adapters, health and readiness endpoints, structured logging, and Swagger for the protected API contract.
- Use route specific rate limits for authentication, public unlock, submissions, uploads, slug checks, and other high risk endpoints. Shared staging and production limits must use Redis or Valkey.
- Do not reveal whether an account, email, page password, or protected page exists. Return stable error codes, safe messages, request IDs, and retry information where applicable.

## Related specs

- [Stack and architecture](../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
