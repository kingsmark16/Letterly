# Letterly API

The NestJS API verifies sessions and enforces authorization, template capabilities, page lifecycle rules, private media access, rate limits, and administrator operations. The web application forwards same origin REST requests to this service.

Start with the [root setup](../../README.md#local-setup), [API context](AGENTS.md), and [contributor guide](../../CONTRIBUTING.md). Use Node 24 and pnpm 11.20.0.

## Development

Copy `.env.example` to `.env`. Supply the development database URL and an authentication secret of at least 32 characters. Keep `APP_ORIGIN` and `BETTER_AUTH_URL` aligned with the browser origin. Prepare the database workspace as described in the root guide.

```bash
pnpm --filter api dev
```

The API normally listens on port 3001. Root `pnpm dev` starts both applications. `GET /health` reports process health without contacting dependencies. `GET /ready` checks PostgreSQL and the critical Redis rate-limit store; both endpoints are unauthenticated and return `Cache-Control: no-store`. Apply database migrations as a release gate before routing traffic to a new API version; see the [API release runbook](../../docs/runbooks/api-release.md).

Optional integrations need complete configuration:

| Integration                               | Configuration                                            |
| ----------------------------------------- | -------------------------------------------------------- |
| Email verification and recovery           | Resend key and sender settings                           |
| Google or Facebook sign in                | Both client ID and secret for each enabled provider      |
| Image and audio uploads                   | All four R2 settings, using a development bucket         |
| Signed public media                       | A separate proxy secret matched with the web application |
| Page password encryption                  | Persistent encryption key and key version                |
| Administrator bootstrap and audit cursors | Dedicated secrets and the explicit bootstrap workflow    |
| YouTube validation                        | API key and explicit enable flag                         |
| Sentry                                    | DSN and optional release/environment settings            |

Optional OAuth, R2, and Sentry settings are commented out in the example. Blank or partial groups fail validation; configure them completely when needed. Development and test rate limits use memory. Production needs authenticated TLS Redis or Valkey, R2, email, signing/encryption secrets, and the other required settings in the [launch runbook](../../docs/runbooks/launch-hardening-checklist.md).

## Source ownership and request flow

`src/main.ts` loads validated configuration; `src/app.module.ts` composes the application. Feature modules live under `src/modules/`, including authentication, catalog, pages, and administration. `src/infrastructure/` owns database, HTTP, monitoring, and storage adapters.

Controllers validate boundary input and invoke use cases. Guards and policies enforce sessions, roles, ownership, availability, and template capabilities. Application use cases call injected ports; infrastructure implements those ports with provider calls and Prisma transactions. Domain and application code stay independent of framework and database clients.

Better Auth owns account credentials. Return safe projections and consistent transport errors; private content must not enter public responses or shared caches. Template behavior resolves the exact saved version through the [trusted registration flow](../../docs/references/template-registration.md).

## Testing

```bash
pnpm --filter api lint
pnpm --filter api check-types
pnpm --filter api test --runInBand
pnpm --filter api test:e2e
```

Jest unit configuration lives in [package.json](package.json). Supertest integration configuration lives in [test/jest-e2e.json](test/jest-e2e.json).

Real database integration cases require `RUN_REAL_DB_TESTS=1` and an isolated database with committed migrations and catalog provisioning. Without that opt in, the database cases are skipped. [CI](../../.github/workflows/ci.yml) explicitly prepares PostgreSQL and enables them. Record what ran and what skipped; never point test cleanup at a shared or production database.

Unit tests and controlled HTTP fixtures do not prove live providers, real transaction rollback, or browser journeys.

## Build and operations

```bash
pnpm --filter api build
pnpm --filter api start:prod
```

The production command uses `tsx` to start `dist/main.js`, including source exported workspace packages. The root build graph generates the Prisma client before dependent application builds.

Follow the [API release runbook](../../docs/runbooks/api-release.md), [launch checklist](../../docs/runbooks/launch-hardening-checklist.md), and [restore drill](../../docs/runbooks/launch-hardening-restore.md) for operational changes. The Letterly REST OpenAPI contract is specified separately; the generated schema and nonproduction documentation route are not implemented yet. Repository structure acceptance remains in progress.
