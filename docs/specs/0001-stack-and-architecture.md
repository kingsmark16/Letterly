# 0001. Stack and architecture for Letterly

**Date**: 2026-08-07
**Status**: In Progress

## Summary

Letterly will use a TypeScript monorepo with a Next.js web application and a NestJS API. The system will start as a modular monolith, which means one product with clear internal modules instead of many separately operated services. Neon PostgreSQL and Prisma will store relational data, while Better Auth will manage accounts and sessions.

This choice gives a beginner a clear local structure and keeps authorization and business rules in one API. It also leaves room to add object storage, public pages, and separate deployment targets later without rewriting the core application.

## Context

Letterly is a public web product with authenticated creators, private dashboards, public confession pages, optional passwords, media uploads, and private visitor responses. The first release is a small private beta for adults, with Confession as the only category and two templates. The first authentication release uses Google and Facebook only. The application needs strong ownership checks and clear boundaries between browser code, business rules, and persistent data.

The project is being built by one beginner developer. The system must be understandable locally, easy to debug, and inexpensive to operate while it is learning from beta users. The expected early scale does not justify a distributed system, a dedicated platform team, or multiple independently deployed backend services.

The first implementation must prove a real path through the web application, API, database, and authenticated user experience. It must also preserve room for template specific content, object storage, rate limits, and production monitoring as later slices are added.

## Requirements

**User stories**:

- As the developer, I want a single repository with clear application boundaries so I can run, understand, and debug the whole product.
- As a creator, I want the browser and API to use the same account session so private pages and dashboard data can be protected consistently.

**Acceptance criteria**:

- **AC-1**: The repository has separate web and API workspaces, shared TypeScript contracts, and package tasks that can be orchestrated from the repository root.
- **AC-2**: The web workspace can render a page and the API workspace can start independently in local development.
- **AC-3**: The API can use Prisma 7 with the PostgreSQL driver adapter and a generated client against a PostgreSQL connection.
- **AC-4**: Authentication is owned by the API boundary at `/api/auth/*`, supports Google and Facebook signup and login, and uses secure session handling that the web application can consume without exposing session secrets to browser JavaScript.
- **AC-5**: The scaffold defines and validates Cloudflare R2 and Redis integrations behind provider independent interfaces, and the public page route namespace is reserved as `/p/[slug]`.

## Options considered

### Option 1: TypeScript modular monolith in a Turborepo monorepo

This option uses `pnpm` workspaces and Turborepo with `apps/web`, `apps/api`, and shared packages. Next.js owns browser and page rendering. NestJS owns authentication integration, authorization, validation, business rules, and persistence access. PostgreSQL and Prisma provide the relational data layer.

**Pros**:

- Clear boundaries while keeping local development simple.
- Shared TypeScript contracts reduce duplicated request and response types.
- Turborepo can run package tasks and cache stable results.
- The API can enforce permissions independently of the browser.

**Cons**:

- A beginner must learn workspace commands and two application frameworks.
- Cookies and local development require deliberate web and API origin configuration.
- There are two deployable applications to monitor.

### Option 2: Next.js full stack application

This option keeps the web interface and server routes in one Next.js application, with Prisma and Better Auth in the same codebase.

**Pros**:

- Fewer applications and fewer local commands at the beginning.
- A creator page can be built quickly in one framework.
- Authentication and page rendering can share one origin naturally.

**Cons**:

- Business rules and browser composition can become tightly coupled.
- A later API for mobile clients, integrations, or separate deployments would require a larger restructuring.
- NestJS practices in the blueprint would be discarded.

### Option 3: Separate frontend and API repositories

This option uses a standalone frontend repository and a standalone NestJS API repository, each with its own package management and deployment process.

**Pros**:

- Each repository has a narrow purpose.
- Deployment permissions and release cycles can be separated later.

**Cons**:

- Shared contracts and coordinated changes become harder for a solo beginner.
- Local setup, dependency updates, and continuous integration become more fragmented.
- The project loses the single repository context needed for the learning workflow.

## Decision

**Chosen option**: Option 1: TypeScript modular monolith in a Turborepo monorepo

Use a `pnpm` and Turborepo monorepo with Next.js for the web application, NestJS for the REST API, shared TypeScript contracts, Neon PostgreSQL with Prisma 7 for relational persistence, and Better Auth for Google and Facebook accounts and sessions. Email and password authentication is outside the first authentication release.

The API is the authorization boundary. The browser may hide controls for usability, but every permission must be checked again in NestJS. Better Auth is hosted by NestJS at `/api/auth/*`, using its Prisma adapter and the shared database package. The web application reaches it through the same browser origin. The database uses a pooled connection for runtime traffic and a direct connection for migrations. Prisma 7 uses the PostgreSQL driver adapter and an explicit generated client output path.

The first scaffold configures Cloudflare R2 and Redis. R2 is behind a storage interface and Redis is behind a rate limit and short lived state interface. The first local environment may use a development R2 bucket and a local Redis container. Feature modules must not import provider clients directly.

The canonical browser origin is stored in `APP_ORIGIN`. In local development it is `http://localhost:3000`, while NestJS listens on an internal API port and receives `/api` requests through the Next.js rewrite. Better Auth trusted origins and future canonical public URLs derive from `APP_ORIGIN`. Session cookies are HTTP only, use `SameSite=Lax`, use `Secure` in production, and have a root path.

Docker and GitHub Actions are included in the first scaffold. Docker provides reproducible local services and build contexts. GitHub Actions runs the same root quality commands used locally and does not run production migrations until a later deployment decision defines the release policy.

**Implementation skills**: `turborepo` (`local/Letterly`, `.agents/skills/turborepo/`) · `better-auth-best-practices` (`local/Letterly`, `.agents/skills/better-auth-best-practices/`) · `neon` (`local/Letterly`, `.agents/skills/neon/`) · `neon-postgres` (`local/Letterly`, `.agents/skills/neon-postgres/`) · `prisma-database-setup` (`local/Letterly`, `.agents/skills/prisma-database-setup/`)

## Rationale

The product has relational ownership, lifecycle, template, media, and response data. A relational database with constraints is a better foundation than a document store for these relationships. Prisma gives typed access and migrations, while the PostgreSQL driver adapter keeps the Prisma 7 setup explicit. This follows the relational data and adapter guidance in the installed database skills (basis: installed `prisma-database-setup` and `neon-postgres` skills).

The two application split follows the blueprint and protects the most important security boundary. NestJS can enforce ownership and privacy rules even when a browser request is forged. The monorepo keeps both applications and their shared contracts in one place, which lowers coordination cost for a solo developer (basis: [Letterly Confession Platform Blueprint v3.2](../../Letterly_Confession_Platform_Blueprint_v3_2.docx), `docs/scope/scope.md`).

The main tradeoff is learning two frameworks and managing cross origin cookies during development. That cost is accepted because the project is specifically intended to grow into a real product with public pages, private dashboards, and more than one client surface. The architecture remains a modular monolith, so there is no service discovery, message broker, or container orchestration to operate (basis: modular monolith first and simplicity before distributed systems).

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Architecture | Modular monolith with two deployable applications | Keeps business rules centralized while separating browser concerns from API authorization. |
| Language | TypeScript with strict type checking | One language across web, API, contracts, tooling, and tests reduces context switching and catches mistakes early. |
| Workspace | `pnpm` workspaces with Turborepo | Manages two applications and shared packages while running package tasks through a dependency graph. |
| Web application | Next.js App Router | Supports dashboard screens, public pages, metadata, server and client composition, and accessible progressive rendering. |
| Web interface | Tailwind CSS and shadcn/ui | Provides a small reusable interface foundation without forcing template content into one visual design. |
| Web data and forms | TanStack Query, Axios, React Hook Form, and Zod | Separates server state, HTTP calls, form state, and validation in familiar TypeScript tools. |
| API | NestJS REST API | Gives the product modules, validation, guards, services, and repository boundaries for business rules. |
| Primary database | PostgreSQL on Neon, also called Lakebase Postgres | Provides transactions, relations, constraints, indexes, and JSON support for template content. |
| ORM | Prisma 7 with `@prisma/adapter-pg` and `pg` | Provides typed queries and migrations while following the current SQL driver adapter setup. |
| Authentication | Better Auth hosted by the API boundary, Google and Facebook only | Avoids custom authentication and gives the web client a shared session based on secure cookies. |
| File storage | Cloudflare R2 through an S3 compatible API, configured in the scaffold | Stores images and audio outside the relational database behind a provider independent storage interface. |
| QR codes | `qrcode` generated from the canonical public URL | Avoids storing redundant QR images during the first implementation. |
| Tests | Vitest, Supertest, and Playwright | Covers focused logic, API behavior, and critical browser journeys. |
| Logging | Pino with request correlation identifiers | Produces structured logs that can be searched when a beta flow fails. |
| Error monitoring | Sentry after the local proof is stable | Captures production failures without putting confession content into analytics events. |
| Delivery | Docker images and GitHub Actions from the first scaffold | Makes local and continuous integration environments reproducible and gives every change the same quality commands. |
| Cache and shared rate limits | Redis configured from the first scaffold behind a rate limit interface | Gives public unlock and response features a shared state path while keeping provider access out of feature modules. |

Exact dependency versions will be selected and recorded in the lockfile during scaffolding. The scaffold must verify compatible versions for Next.js, NestJS, Prisma, Better Auth, and Node.js before installation.

## Integration boundaries

**Repository packages**:

- `apps/web`: Next.js pages, browser interaction, and same origin API calls.
- `apps/api`: NestJS modules, Better Auth handlers, authorization, business rules, and provider adapters.
- `packages/contracts`: framework independent Zod schemas and API types. It imports neither application nor database code.
- `packages/database`: Prisma schema, `prisma.config.ts`, migrations, generated client, pooled runtime client, and direct migration configuration.
- `packages/config`: validated environment parsing and shared non secret configuration types.

**Authentication**:

- Better Auth routes live under `/api/auth/*` in the NestJS application.
- Google and Facebook are the only enabled providers in the first authentication release.
- Callback URLs derive from `APP_ORIGIN` and use the provider paths generated by Better Auth.
- Automatic account linking is disabled until a separate account linking decision is designed.
- The API reads the HTTP only session cookie. Browser JavaScript never reads the session secret.

**Environment configuration**:

- `APP_ORIGIN`: the canonical browser origin and Better Auth base URL.
- `BETTER_AUTH_SECRET`: the server secret for Better Auth.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth credentials.
- `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET`: Facebook OAuth credentials.
- `DATABASE_URL`: pooled PostgreSQL connection for runtime queries.
- `DIRECT_URL`: direct PostgreSQL connection for Prisma migrations.
- `REDIS_URL`: Redis connection for shared rate limits and short lived state.
- `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`: Cloudflare R2 access.
- `R2_PUBLIC_BASE_URL`: controlled public media delivery base URL when public media is enabled.

Required values are validated at startup. Error messages name the missing variable but never print its value. Logs redact cookies, authorization headers, passwords, OAuth tokens, database credentials, and confession content.

**Repository commands**:

- `pnpm dev`: starts the web and API development tasks through Turborepo.
- `pnpm build`: builds package dependencies and both applications.
- `pnpm lint`: runs package lint tasks.
- `pnpm typecheck`: runs strict TypeScript checks.
- `pnpm test`: runs the configured unit and API tests.

Root scripts delegate to `turbo run`. Package scripts own the actual task logic. GitHub Actions runs these same commands on pull requests and pushes. Dockerfiles and local service configuration are kept close to the applications and infrastructure they build.

## Consequences

**Positive**:

- The first developer can inspect all application code in one repository.
- The API remains the source of truth for authorization and privacy.
- Shared contracts make request and response changes visible to both applications.
- The system can grow one vertical slice at a time.
- The stack matches the blueprint and the installed implementation skills.

**Negative and tradeoffs**:

- The developer must learn `pnpm`, Turborepo, Next.js, NestJS, Prisma, and Better Auth.
- Local web and API development needs a clear cookie and origin strategy.
- Two deployable applications increase the number of build and deployment checks.
- Prisma 7 requires an explicit driver adapter and generated client path.
- Redis and R2 add credentials, local services, network failure modes, and cloud setup before the first page exists.
- A future high traffic deployment may need stronger caching and a selected managed hosting provider.

**Neutral**:

- The initial scaffold still does not install every future dependency. Sentry, Playwright, advanced UI packages, and email tooling are added when their slices need them. R2, Redis, and both OAuth providers are included because they were selected as foundation requirements.
- The project will use REST first. A different API style requires a new architecture decision.
- Neon branches can support isolated development and preview databases later.

## Follow-up

- [ ] `/develop` must verify current compatible package versions and commit the generated lockfile.
- [ ] `/audit` must capture these stack conventions in the root `AGENTS.md` after the scaffold exists.
- [ ] `/architect data model` must define the first domain migration before feature data is added.
- [ ] Choose the managed hosting provider in a separate deployment decision before the private beta.
- [ ] Add the `neon-postgres-branches` skill before designing preview and staging database workflows if it is needed.
- [ ] Add the `neon-object-storage` skill before changing the R2 design if its guidance is useful for the chosen upload flow.
- [ ] Define the production email and account recovery strategy before adding email and password authentication.

## References

**Project sources**:

- `Letterly_Confession_Platform_Blueprint_v3_2.docx`, the product and engineering blueprint.
- `docs/scope/scope.md`, the ordered MVP scope and workflow.
- Installed `turborepo`, `better-auth-best-practices`, `neon`, `neon-postgres`, and `prisma-database-setup` skills.

**Practices and standards**:

- Modular monolith before distributed services.
- Relational persistence for relational ownership and lifecycle data.
- Server side authorization at the API boundary.
- Package tasks and dependency graphs in a monorepo.
- Direct database connections for migrations and pooled connections for application traffic.
