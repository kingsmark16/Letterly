# Letterly

## Stack

- **Language / Runtime**: TypeScript, Node.js 24
- **Framework**: Next.js 16.3 web application and NestJS REST API
- **Key dependencies**: pnpm workspaces, Turborepo, React 19, PostgreSQL on Neon, Prisma 7, Better Auth
- **Package manager**: pnpm 11.20.0

## Build approach

**Tracer Bullet**, prove one narrow real path through the database, API, interface, and user experience before adding breadth.

## Commands

```bash
# Install
pnpm install

# Development servers
pnpm dev

# Build
pnpm build

# Lint
pnpm lint

# Typecheck, current scaffold command
pnpm check-types

# Test, to be added by /develop tooling and /test
pnpm test
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Product reference

The authoritative product and engineering blueprint is [Letterly_Confession_Platform_Blueprint_v3_2.docx](Letterly_Confession_Platform_Blueprint_v3_2.docx), revision 3.2, August 2026.

Use [docs/references/letterly-blueprint.md](docs/references/letterly-blueprint.md) as the concise working summary. The original blueprint wins when the summary is incomplete. The blueprint defines product scope, user journeys, domain rules, security boundaries, template behavior, performance requirements, and launch constraints. Do not add features that it lists as non goals without a new product decision.

Sections 6 and 13 through 19 of the original blueprint are mandatory engineering rules. Before changing monorepo structure, web, API, configuration, security, tests, or delivery code, read the corresponding sections in [docs/references/letterly-blueprint.md](docs/references/letterly-blueprint.md). If an older spec conflicts with those rules, surface the conflict and resolve the spec before silently diverging.

## Rules

- Organize application code by feature, with clear `domain`, `application`, `infrastructure`, and `presentation` responsibilities where a feature needs them.
- Keep the dependency direction inward. Domain code has no framework or input and output dependency.
- Keep framework code, database clients, and external services out of `domain/` and `application/`.
- Use cases orchestrate work and call interfaces. Infrastructure implements those interfaces.
- Keep entities and business invariants as plain objects. Do not leak domain entities into presentation code.
- Use strict TypeScript, avoid `any`, and make types exhaustive where practical. Use named exports for reusable code; framework required entry files may use default exports.
- Use DTOs or plain objects at boundaries, consistent error handling, startup environment validation, and consistent naming.
- Meet a WCAG AA accessibility baseline, including keyboard access, focus states, labels, errors, and reduced motion support.
- Use conventional commits and keep public APIs documented.

## Tooling

- Linting and formatting use ESLint plus Prettier.
- The selected commit gate runs lint, formatting checks, and type checks.
- The selected test gate uses Vitest for unit tests, Supertest for API integration tests, and Playwright for browser journeys.
- GitHub Actions will run lint, typecheck, tests, and build on pushes and pull requests.
- `/develop tooling` installs missing test, formatting, commit, and CI configuration. `/audit` records these choices but does not install project tooling.

## Git

- integration: on
- branch prefix: `feat/`
- commit: per-milestone

## Agent skills

- [architect](.agents/skills/architect/): `jsmastery-pro/skills`, records load bearing technical decisions and build specifications
- [audit](.agents/skills/audit/): `jsmastery-pro/skills`, maintains durable project context files
- [better-auth-best-practices](.agents/skills/better-auth-best-practices/): `better-auth/skills`, configures Better Auth integrations and sessions
- [better-auth-security-best-practices](.agents/skills/better-auth-security-best-practices/): `better-auth/skills`, hardens authentication and session security
- [check](.agents/skills/check/): `jsmastery-pro/skills`, verifies behavior and reviews code before merge
- [create-auth](.agents/skills/create-auth/): `better-auth/skills`, scaffolds Better Auth in TypeScript applications
- [debug](.agents/skills/debug/): `jsmastery-pro/skills`, investigates failures and applies minimal fixes
- [develop](.agents/skills/develop/): `jsmastery-pro/skills`, builds approved features from specifications
- [document](.agents/skills/document/): `jsmastery-pro/skills`, writes human facing change documentation
- [neon](.agents/skills/neon/): `neondatabase/agent-skills`, routes Neon platform work to the right guidance
- [neon-postgres](.agents/skills/neon-postgres/): `neondatabase/agent-skills`, guides Neon PostgreSQL setup and operations
- [playwright-cli](.agents/skills/playwright-cli/): `microsoft/playwright-cli`, guides Playwright browser automation
- [playwright-dev](.agents/skills/playwright-dev/): `microsoft/playwright`, provides Playwright development guidance
- [prisma-cli](.agents/skills/prisma-cli/): `prisma/skills`, guides Prisma command line operations
- [prisma-client-api](.agents/skills/prisma-client-api/): `prisma/skills`, guides Prisma Client queries and CRUD operations
- [prisma-compute](.agents/skills/prisma-compute/): `prisma/skills`, guides Prisma Compute deployment work
- [prisma-database-setup](.agents/skills/prisma-database-setup/): `prisma/skills`, guides database provider configuration for Prisma
- [prisma-driver-adapter-implementation](.agents/skills/prisma-driver-adapter-implementation/): `prisma/skills`, guides Prisma 7 SQL driver adapter implementation
- [prisma-postgres](.agents/skills/prisma-postgres/): `prisma/skills`, guides Prisma Postgres provisioning and operations
- [prisma-postgres-setup](.agents/skills/prisma-postgres-setup/): `prisma/skills`, guides local connection to Prisma Postgres
- [prisma-upgrade-v7](.agents/skills/prisma-upgrade-v7/): `prisma/skills`, guides Prisma 6 to Prisma 7 migration work
- [scope](.agents/skills/scope/): `jsmastery-pro/skills`, maintains the living product scope
- [sync](.agents/skills/sync/): `jsmastery-pro/skills`, reconciles durable context after changes
- [test](.agents/skills/test/): `jsmastery-pro/skills`, creates tests for changed features and routes
- [turborepo](.agents/skills/turborepo/): `vercel/turborepo`, guides workspace tasks, caching, and monorepo boundaries
- [vercel-react-best-practices](.agents/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, guides React and Next.js performance practices
- [web-design-guidelines](.agents/skills/web-design-guidelines/): `vercel-labs/agent-skills`, reviews web interface quality and accessibility

MCP servers: neon (connected), Better Auth (connected), GitHub (connected through the workspace connector)

## Context files

- [apps/api/AGENTS.md](apps/api/AGENTS.md): NestJS API boundaries, commands, and current test setup
- [apps/api/src/infrastructure/database/AGENTS.md](apps/api/src/infrastructure/database/AGENTS.md): Prisma client injection, shutdown cleanup, and transient connection recovery
- [apps/api/src/infrastructure/http/AGENTS.md](apps/api/src/infrastructure/http/AGENTS.md): API transport errors, request context, visitor identity, and rate limits
- [apps/api/src/infrastructure/monitoring/AGENTS.md](apps/api/src/infrastructure/monitoring/AGENTS.md): safe Sentry redaction and bounded operational metrics
- [apps/api/src/infrastructure/storage/AGENTS.md](apps/api/src/infrastructure/storage/AGENTS.md): Private Cloudflare R2 media storage adapter and object lifecycle context
- [apps/api/src/modules/auth/AGENTS.md](apps/api/src/modules/auth/AGENTS.md): Better Auth provider and route context
- [apps/api/src/modules/admin/AGENTS.md](apps/api/src/modules/admin/AGENTS.md): administrator bootstrap, moderation, appeals, and audit API context
- [apps/api/src/modules/catalog/AGENTS.md](apps/api/src/modules/catalog/AGENTS.md): public category and trusted template registry catalog context
- [apps/api/src/modules/pages/AGENTS.md](apps/api/src/modules/pages/AGENTS.md): Page lifecycle, owner operations, and public projection context
- [apps/web/AGENTS.md](apps/web/AGENTS.md): Next.js web application context
- [apps/web/src/features/auth/AGENTS.md](apps/web/src/features/auth/AGENTS.md): Google and Facebook sign in UI context
- [apps/web/src/features/admin/AGENTS.md](apps/web/src/features/admin/AGENTS.md): protected moderation and audit console context
- [apps/web/src/features/pages/AGENTS.md](apps/web/src/features/pages/AGENTS.md): Creator page flows and public Secret Letter presentation context
- [apps/web/src/templates/AGENTS.md](apps/web/src/templates/AGENTS.md): Independent public and preview template implementations
- [packages/config/AGENTS.md](packages/config/AGENTS.md): validated environment configuration package
- [packages/contracts/AGENTS.md](packages/contracts/AGENTS.md): shared Zod schemas and provider interfaces
- [packages/database/AGENTS.md](packages/database/AGENTS.md): Prisma 7 PostgreSQL package and lifecycle rules
- [packages/eslint-config/AGENTS.md](packages/eslint-config/AGENTS.md): shared ESLint configuration context
- [packages/templates/AGENTS.md](packages/templates/AGENTS.md): shared template registry, schemas, defaults, and journey validation context
- [packages/typescript-config/AGENTS.md](packages/typescript-config/AGENTS.md): shared TypeScript configuration context
- [packages/ui/AGENTS.md](packages/ui/AGENTS.md): shared React UI component context

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
