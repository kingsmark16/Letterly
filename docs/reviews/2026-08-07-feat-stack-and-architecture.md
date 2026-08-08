# Review, feat/stack-and-architecture, 2026-08-07

**Reviewed by**: GPT-5 (author on a previous model whose name was not supplied)
**Scope**: 72 files, branch vs main
**Verdict**: Changes requested

## Summary

The change creates a working pnpm and Turborepo skeleton with independent Next.js and NestJS applications, shared contracts, a generated Prisma client, a public route placeholder, local Redis, and basic API tests. AC-1 and AC-2 are met. AC-3 is only partial, AC-4 is not implemented, and AC-5 is only partial, so the branch does not yet satisfy its governing spec.

## Major

### 🟠 The API authentication boundary is absent, `apps/api/package.json:24`

**Problem**: The API has no Better Auth dependency, configuration, NestJS handler, or `/api/auth/*` route. The configuration package does not define the Better Auth secret or Google and Facebook credentials. The web configuration is also empty at `apps/web/next.config.js:2`, so the same origin `/api` rewrite described by the spec does not exist.
**Why it matters**: Google and Facebook signup and login cannot work. The browser has no same origin path to an API owned session, and none of the required cookie, trusted origin, or provider restrictions are enforced. This leaves AC-4 entirely unmet.
**Suggested fix**: Implement Better Auth inside the NestJS boundary with only Google and Facebook enabled. Add strict startup validation for its secret and provider credentials, configure the specified cookie and trusted origin rules, expose `/api/auth/*`, and add the matching Next.js rewrite. Verify the session through the web origin without exposing secrets to browser JavaScript.

### 🟠 The API cannot use the database package, `apps/api/package.json:24`

**Problem**: `@letterly/database` is not an API dependency and no NestJS infrastructure provider imports it. Prisma generation proves that a client can be generated, but it does not prove that the API can create a connection or run a PostgreSQL operation. In addition, `packages/database/prisma.config.ts:16` silently uses `DATABASE_URL` when `DIRECT_URL` is missing, despite the decision that migrations require a direct connection.
**Why it matters**: AC-3 specifically requires the API to use the Prisma 7 PostgreSQL adapter against a PostgreSQL connection. As written, the API and database are disconnected, and a migration can accidentally use a pooled URL instead of failing with a useful configuration error.
**Suggested fix**: Add the database package to the API and expose it through a NestJS infrastructure provider with clear startup and shutdown ownership. Require the direct URL for migration commands, keep generation possible without credentials through a purpose specific path, and prove one safe connection operation against the selected PostgreSQL environment. This does not require inventing domain models before the data model decision.

### 🟠 R2 and Redis are declarations rather than integrations, `packages/contracts/src/index.ts:10`

**Problem**: `BlobStorage` and `RateLimitStore` define useful boundaries, and environment fields exist, but there are no R2 or Redis client dependencies and no infrastructure implementations. Redis is available as a local container only. No code consumes `REDIS_URL` or the R2 values.
**Why it matters**: A feature cannot store an object, create a signed upload, or consume a shared rate limit through these interfaces. AC-5 asks for defined and validated integrations behind provider independent interfaces, so interface declarations alone leave that criterion partial.
**Suggested fix**: Add provider adapters under API infrastructure, keep provider clients out of domain and application code, and add focused contract tests for signed uploads, object deletion, public URL behavior, and atomic rate limit consumption. Validate only the fields required for each enabled capability.

### 🟠 Production database calls create a new connection pool, `packages/database/src/client.ts:29`

**Problem**: `getPrismaClient()` returns `createPrismaClient()` on every call when `NODE_ENV` is `production`. Each client owns a PostgreSQL adapter with a pool size of up to ten, and `disconnectPrisma()` cannot close these production instances because it only knows the development global.
**Why it matters**: Repeated repository or request setup can create many pools, exhaust Neon connection limits, and leave open handles during shutdown. This will become a production outage risk as soon as the API starts using the package.
**Suggested fix**: Give the production process one owned Prisma client and pool, preferably through the NestJS provider lifecycle. Return that instance to all callers and disconnect the same instance during application shutdown. If a serverless deployment later needs a different lifecycle, record and implement that deployment specific decision then.

### 🟠 CI does not run the existing tests, `.github/workflows/ci.yml:31`

**Problem**: The workflow installs, lints, checks types, and builds, but it has no test step. The root package has no `test` script and `turbo.json` has no test task, even though API Jest and Supertest suites exist and both the spec and `AGENTS.md` say CI runs tests.
**Why it matters**: A pull request can break API behavior while CI remains green. Local successful test output is useful evidence, but it is not a repeatable merge gate in a clean environment.
**Suggested fix**: Add a root test command and Turborepo test task, connect the current API unit and end to end suites to it, and run it in CI before build. This finding does not require adding Vitest or Playwright to this foundation scaffold.

## Minor

### 🟡 Private R2 configuration incorrectly requires a public URL, `packages/config/src/index.ts:3`

**Problem**: `R2_PUBLIC_BASE_URL` is included in the list where setting any R2 field makes every field mandatory. The spec describes that value as required only when public media delivery is enabled.
**Why it matters**: A valid private bucket or signed only upload setup cannot pass configuration validation without inventing a public URL.
**Suggested fix**: Validate core R2 credentials as one group, then require the public base URL only when the selected media delivery mode needs it.

### 🟡 The declared Node engine permits an unsupported project setup, `package.json:18`

**Problem**: The repository records Node.js 24 as its runtime, but the package engine accepts every Node version from 18 onward.
**Why it matters**: A beginner can install with Node 18, satisfy the repository engine check, and then encounter failures from the selected Next.js, NestJS, pnpm, or native dependencies.
**Suggested fix**: Declare the supported Node 24 range and add a simple version file or setup note that agrees with it.

### 🟡 The API lint command changes files inside the quality gate, `apps/api/package.json:15`

**Problem**: The API lint script uses `eslint --fix`. CI therefore repairs some violations in its temporary checkout and can continue without proving that the submitted files already satisfy the gate.
**Why it matters**: CI may pass while the branch still contains formatting or lint changes that were never committed. This also makes lint behavior different from a normal read only verification command.
**Suggested fix**: Make `lint` a check only command. Keep automatic fixes in a separate `lint:fix` or formatting command, and add a nonwriting format check to the selected commit and CI gates.

### 🟡 Local Redis is published on every host interface, `docker-compose.yml:5`

**Problem**: The port mapping publishes unauthenticated development Redis as `0.0.0.0:6379` and on IPv6, as confirmed by the running Compose service.
**Why it matters**: On a machine or Docker setup that permits external access, other network users may reach the development data store. This is unnecessary for an API running on the same developer machine.
**Suggested fix**: Bind the published port to `127.0.0.1`, or remove host publication when only containers need access. State clearly that this service is for local development and is not a production Redis configuration.

### 🟡 The promised application Docker build contexts are missing, `docker-compose.yml:1`

**Problem**: The spec says the first scaffold includes Docker images and application build contexts, but this change only defines the Redis service. There is no Dockerfile for the web or API application.
**Why it matters**: Local Redis is reproducible, but application image builds and their production runtime dependencies are not. This leaves the delivery choice in the spec incomplete.
**Suggested fix**: Either add minimal workspace aware Dockerfiles and verify both images, or narrow the current spec to local service Compose only and defer application images through an explicit follow up decision.

## Nits

- ⚪ `package.json:2`, replace the temporary scaffold name `letterly-scaffold-cGcRcY` with the repository name.
- ⚪ `apps/web/README.md:5`, the generated web and API readme files still teach generic framework commands and deployment choices instead of the root pnpm workflow used by this monorepo.

## Strengths

- AC-1 has a clear workspace split, strict shared TypeScript configuration, reusable Zod contracts, and root Turborepo orchestration.
- AC-2 has direct runtime evidence for the web route and API health endpoint, and both applications build successfully.
- The Prisma 7 package uses the PostgreSQL driver adapter, an explicit generated client path, connection timeouts, and a separate migration URL field.
- The provider interfaces keep R2 and Redis concepts out of domain code, and the public `/p/[slug]` namespace is reserved without inventing the future data model.

## Test coverage

There is no `test-preferences.json`, so the review workflow records the test signal as none yet. The existing Jest unit test and Supertest end to end test both pass and cover the scaffold root response. They do not cover `/health`, environment validation, database client lifecycle, PostgreSQL connectivity, the public route, or any provider boundary, and CI currently does not execute them. Vitest and Playwright are not required for this foundation review.
