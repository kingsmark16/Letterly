# API application

## Overview

This workspace is the NestJS REST API. It owns authentication integration, authorization, validation, business rules, persistence access, and provider adapters. It exposes `GET /`, process health at `GET /health`, dependency readiness at `GET /ready`, the Better Auth route family at `/api/auth/*`, authenticated page and public catalog routes, and protected administration routes under `/api/v1`.

The API inherits `@repo/typescript-config/nestjs.json`, including full strict mode and checked indexed access. `@repo/eslint-config/nest` supplies shared type checked rules; the local config preserves feature dependency boundaries. Lint fails on warnings and does not write fixes. Unit and integration fixtures use `test/support/required-test-value.ts` to require expected array values and mock call order without non null casts or fallback values.

## Key files

| File                                   | Owns                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/api/package.json`                | API dependencies and workspace commands                                       |
| `apps/api/src/main.ts`                 | NestJS startup and validated application configuration                        |
| `apps/api/src/app.controller.ts`       | Root `GET /` route                                                             |
| `apps/api/src/app.module.ts`           | Root NestJS module composition                                                |
| `apps/api/src/infrastructure/health/`  | Process health and PostgreSQL/critical Redis readiness probes                 |
| `apps/api/src/infrastructure/config/app-config.module.ts` | Shared Nest bindings for validated API configuration values                  |
| `apps/api/src/infrastructure/database/` | Shared Prisma injection, lifecycle, and transient recovery                    |
| `apps/api/src/infrastructure/monitoring/` | Safe Sentry redaction and bounded operational metrics                         |
| `apps/api/src/modules/auth/`           | Better Auth instance, email/password and OAuth configuration, and `/api/auth/*` handler |
| `apps/api/src/modules/admin/`          | Administrator bootstrap, moderation, appeals, and audit routes             |
| `apps/api/src/modules/catalog/`        | Public categories and trusted template registry catalog routes                |
| `apps/api/src/modules/pages/`          | Page lifecycle, media, questions, journeys, protected links, reports, and submissions  |
| `apps/api/src/infrastructure/storage/` | Private Cloudflare R2 adapter and media object lifecycle                      |
| `apps/api/src/app.controller.spec.ts`  | Controller unit coverage                                                      |
| `apps/api/test/app.e2e-spec.ts`        | Supertest HTTP coverage                                                       |
| `apps/api/test/health.e2e-spec.ts`     | Supertest health and readiness coverage                                       |

## Commands

```bash
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api lint
pnpm --filter api lint:fix
pnpm --filter api check-types
pnpm --filter api test
pnpm --filter api test:e2e
```

## Conventions

- Keep the API as the authorization boundary. Browser checks are for usability and never replace server checks.
- Better Auth is mounted through `better-auth/node` at `/api/auth/*`. Nest body parsing is disabled at bootstrap so Better Auth receives the original request body.
- Email/password sign in, sign up, and sign out use Better Auth and the existing Prisma models. Google and Facebook remain available as social providers, and each requires a complete client ID and client secret pair before it is enabled.
- Keep framework code at the presentation boundary and place use cases, domain rules, and provider implementations in feature focused areas as they are added.
- Import shared request and response contracts from `@letterly/contracts`.
- Keep database access behind API infrastructure providers. Controllers must not create Prisma clients or call provider SDKs directly.
- Inject the shared Prisma client through `PRISMA_CLIENT`, disconnect it during application shutdown, and reserve reconnect recovery for recognized transient database failures.
- Resolve public catalog versions against the trusted `@letterly/templates` registry. Unknown or inactive categories return a safe not found response, while missing registry definitions return a safe service unavailable response.
- Keep monitoring noncritical and restricted to allowlisted operational fields. Redact request data, identity, content, credentials, messages, and stack contents before Sentry transmission.
- Validate environment values at startup and never log secrets, cookies, tokens, credentials, or confession content.
- Keep `GET /health` process-only and `GET /ready` limited to PostgreSQL and critical Redis connectivity. Both routes are unauthenticated, no-store, and bypass body parsing; migration deployment remains a release gate, not a per-instance readiness check. Follow [the API release runbook](../../docs/runbooks/api-release.md).
- Bind shared API runtime values in `infrastructure/config/AppConfigModule`; feature modules import that provider instead of owning common tokens or duplicating `loadConfig()` factories.
- The current API tests use Jest and Supertest. Do not treat the future Vitest and Playwright plan as implemented tooling.
- Follow the NestJS rules in [the blueprint reference](../../docs/references/letterly-blueprint.md): feature modules, constructor injection, thin controllers, DTO or contract validation, guards and policy services, consistent exception envelopes, request ID and timing interceptors, Prisma transactions for multi write invariants, provider adapters, health and readiness endpoints, structured logging, and Swagger for the protected API contract.
- Use route specific rate limits for authentication, public unlock, submissions, uploads, slug checks, and other high risk endpoints. Shared staging and production limits must use Redis or Valkey.
- Do not reveal whether an account, email, page password, or protected page exists. Return stable error codes, safe messages, request IDs, and retry information where applicable.
- Keep Cloudflare R2 private behind the media storage interface. Production media paths require complete R2 configuration and a separate `PUBLIC_MEDIA_PROXY_SECRET`.
- Keep public response scope checks ahead of password verification, and compare the observed password state again inside the locked submission transaction.
- Keep Choose Your Heart graph revisions immutable, acquire the Page lock before the PageJourney lock, and store submitted paths and outcome text in private snapshots.

## Related specs

- [Stack and architecture](../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
