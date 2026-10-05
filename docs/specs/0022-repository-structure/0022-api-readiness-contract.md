# 0022. API readiness contract

**Date**: 2026-10-04
**Status**: Implemented

## Summary

The API needs separate process health and dependency readiness signals. `/health` stays a cheap process check, while `/ready` checks PostgreSQL and the shared Redis service used for authentication and rate limits. Database migrations remain a release gate so a compatible rollout does not make older pods unready.

## Context

The NestJS API currently exposes `GET /health`, which returns a stable response without checking dependencies. Production requests rely on PostgreSQL and the shared Redis rate limit store. Configuration is validated before the server listens, and the Redis adapter already owns a shared, lazily connected client.

The operational readiness decision in spec 0011 currently combines dependency health, startup configuration, and migration version. Rechecking configuration and migration version in every pod duplicates release work. A schema version mismatch during an additive rollout could also mark otherwise healthy older pods unready while the release is migrating or deploying.

The API already assigns request IDs and uses a stable safe error envelope. The readiness response must preserve that contract without exposing provider details or creating a Sentry event for every expected probe failure. This change requires no database schema changes or new environment variables.

The injected Prisma pool has a 30-second connection timeout, and the singleton Redis client has a 5-second connection timeout. Health requests currently pass through request-context middleware, a JSON parser, the global exception filter, and request timing; they do not have a global authentication or rate-limit guard. The readiness implementation can therefore set cache policy and bypass body parsing at the shared transport boundary while retaining request IDs and timing.

## Requirements

**User stories**:
- As a platform operator, I want to distinguish a running API process from one that can serve required requests so that traffic is sent only to usable instances.
- As an API operator, I want database migrations to remain a release gate so that compatible old instances remain ready during a rolling deployment.

**Acceptance criteria**:
- **AC-1**: `GET /health` remains a process-only check, returns the existing `healthResponseSchema` response, and does not query PostgreSQL or Redis.
- **AC-2**: `GET /ready` returns HTTP 200 with the existing health response only when `SELECT 1` completes through the shared PostgreSQL client and the critical shared Redis rate limit store returns exactly `PONG` to `PING`. The independent checks run concurrently, have a 5-second deadline each, and do not retry.
- **AC-3**: If either dependency check fails, `GET /ready` returns HTTP 503 using the existing API error envelope, stable `SERVICE_UNAVAILABLE` code, generic safe message, and request ID. PostgreSQL authentication rejection identified by Prisma `P1000` or PostgreSQL SQLSTATE `28P01` is an expected readiness failure, even though it is permanent until credentials are corrected. Other unexpected implementation errors remain monitored 5xx responses. The route does not expose the failing dependency, exception, connection details, migration state, or database state.
- **AC-4**: Readiness checks use the existing injected Prisma client and existing rate limit store client. Their normal lazy connection or reconnection may occur through those clients; no new client, pool, or probe-only connection is created. At most one in-flight operation per dependency is active, so a timed-out query or ping cannot accumulate under repeated probes. Checks write no Redis keys and read or return no user or confession data. Development and test use of `MemoryRateLimitStore` is considered healthy.
- **AC-5**: Runtime readiness does not query configuration or migration status. Deployment instructions require `pnpm --filter @letterly/database exec prisma migrate deploy` to succeed before routing the new API version; a migration failure blocks that rollout. Migrations follow expand/contract compatibility: expand changes remain compatible with all active API versions and the rollback version; destructive contraction waits until old instances and the rollback window have retired. Existing instances remain ready based on PostgreSQL and Redis availability during compatible migrations.
- **AC-6**: Both health endpoints are unauthenticated and outside authentication, rate-limit, and visitor-identity processing. Their paths bypass JSON body parsing and set `Cache-Control: no-store` before any route or parser can fail, so success and error responses are not cached. Terminus's default failure logger is disabled. Only the typed expected readiness-unavailable exception avoids Sentry capture; unexpected 5xx errors remain monitored. A permanent PostgreSQL authentication rejection also emits one bounded, redacted failure-episode metric per process until a successful probe resets the episode; the metric contains only fixed operation, provider, and outcome labels.
- **AC-7**: Once shutdown begins, `GET /ready` immediately returns the same generic 503 without probing dependencies; it is treated as an expected readiness-unavailable response. `GET /health` remains process-only until the HTTP server closes.

## Options considered

### Option 1: Extend the current controller with custom dependency probes

Keep health endpoints in `AppController` and add bespoke probe orchestration there.

**Pros**:
- Requires no health module or health-check dependency.
- Keeps the route close to the existing process-only `/health` handler.

**Cons**:
- A controller would own provider checks instead of remaining a thin HTTP boundary.
- Bespoke orchestration duplicates a well-supported NestJS health-check pattern.

### Option 2: Add a dedicated Terminus health module with PostgreSQL and critical Redis indicators

Move the existing process-only endpoint into a focused health module and add `/ready`. Terminus coordinates custom indicators over the existing database and shared rate limit clients. The API returns its existing health success shape and safe error envelope. Startup validates configuration, and the release process applies backward-compatible expand migrations before routing traffic to the new API version; destructive contraction waits until old versions and rollback needs retire.

**Pros**:
- Measures the dependencies required for core data and production authentication and rate limiting.
- Uses existing clients and keeps expected additive rollouts compatible with older instances.
- Separates startup validation, runtime dependency health, and release migration work.
- Follows the project NestJS skill and keeps health ownership out of the root application controller.

**Cons**:
- A bad release gate can ship incompatible schema changes even while instances report dependencies ready.
- Terminus adds one API dependency and needs custom indicators because the production rate limit store is not one of its built-in indicators.
- Terminus's default response and failure logger include indicator details, so the API must discard the results and disable its default logger.
- The current repository has no production deployment workflow, so the release gate must be documented and later bound to the chosen deployment system.

### Option 3: Replace the current response with Terminus's standard health result

Return Terminus's standard `status`, `info`, `error`, and `details` response for both endpoints.

**Pros**:
- Uses the package's documented route behavior with little response mapping.
- Makes per-indicator state directly visible to operators.

**Cons**:
- Changes the existing `healthResponseSchema` success contract and bypasses the project's standard safe error envelope.
- Exposes provider names, details, and failure information from a public health endpoint.

### Option 4: Check PostgreSQL only

The readiness route checks the primary database and leaves Redis to request-time fail-closed behavior.

**Pros**:
- Smallest implementation and one fewer check on each probe.
- Detects outages of the primary persistence dependency.

**Cons**:
- Instances could receive traffic while production authentication and shared rate limits cannot use their required store.
- Does not meet the selected operational requirement for critical Redis.

## Decision

**Chosen option**: Option 2: Add a dedicated Terminus health module with PostgreSQL and critical Redis indicators.

Move `/health` into a dedicated `HealthModule`, preserving its process-only response, and add `/ready` for PostgreSQL and critical Redis. Use Terminus to coordinate custom indicators over the existing clients, but discard per-indicator output and retain the existing API response and error contracts. Each indicator maps typed provider availability errors to an unhealthy result; PostgreSQL `P1000` and SQLSTATE `28P01` authentication rejections are explicitly classified as expected unready states. Unexpected implementation errors propagate as monitored 5xx failures. Emit one redacted, bounded metric per continuous credential-failure episode and reset it after a successful database probe. Run the checks concurrently with a 5-second deadline and no retries. Coalesce overlapping checks per dependency until the underlying operation settles, including after its deadline, so a slow provider call cannot fan out. Disable Terminus's default failure logger so probe errors do not write dependency details per request. Validate configuration before listening, and apply backward-compatible expand migrations as a release gate before routing traffic to the new API version.

**Implementation skills**: `nestjs-best-practices` (`Kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`); `redis-security` (`redis/agent-skills`, `.agents/skills/redis-security/`)

## Rationale

The API uses PostgreSQL for authoritative application state and shared Redis for production authentication and rate limiting. Both must be available for an instance to serve its critical paths. The injected Prisma client and singleton-configured Redis rate limit store already own their connections, so probing them avoids creating parallel clients or pools while allowing their ordinary lazy connection or reconnection behavior. The shared Prisma pool allows a 30-second connection timeout and the shared Redis client allows a 5-second connection timeout; the readiness checks impose a 5-second caller deadline and coalesce unfinished operations. Invalid configuration syntax still fails startup, while a configured PostgreSQL credential rejected by the server is a live dependency failure: it must remove the instance from traffic routing with the generic 503. A fixed-label metric emitted once per failure episode gives operators a corrective signal without exposing the error or generating an event on every probe. (basis: `apps/api/AGENTS.md`, `apps/api/src/infrastructure/database/AGENTS.md`, and `apps/api/src/infrastructure/http/AGENTS.md`; decision recorded 2026-10-05)

Configuration is validated before Nest listens, so startup failure is the correct response to invalid configuration. Migration compatibility belongs to release sequencing; checking migration versions on each pod can remove old but compatible instances during rollout. Spec 0011 already defines migrations as part of restore and launch verification, and spec 0004 defines the safe 503 envelope and request ID. (basis: `apps/api/src/main.ts`, `docs/specs/0004-api-errors-request-context.md`, and `docs/specs/0011-launch-hardening-and-administration/0011-operational-readiness.md`)

The project NestJS skill recommends Terminus for liveness and readiness, and NestJS documents custom indicators for checks that are not covered by built-in adapters. Terminus's default response includes per-indicator state and its default logger writes failed probe details, so Letterly maps success and expected provider failure into its existing public contract and disables default failure logging. The API exception filter suppresses monitoring only for the dedicated readiness-unavailable exception; unrelated 503 responses and implementation failures remain observable. (basis: `nestjs-best-practices` (`.agents/skills/nestjs-best-practices/rules/micro-use-health-checks.md`) and [NestJS Terminus documentation](https://docs.nestjs.com/recipes/terminus))

## Feature design

**Data model sketch**: None. No database schema or persisted state changes.

**Runtime design**:
- Add a dedicated `HealthModule` that imports `TerminusModule` and `RateLimitModule`. Put its HTTP controller under `apps/api/src/infrastructure/health/presentation/`; keep `AppController` for the root route. Bind Terminus through explicit health-module tokens so readiness orchestration remains independent of framework provider types.
- Register a custom PostgreSQL indicator that runs `SELECT 1` through the injected `PRISMA_CLIENT`, and a custom rate limit indicator that calls `RateLimitService.checkAvailability(): Promise<void>`. The latter delegates to the `RateLimitStore.checkAvailability(): Promise<void>` port; the memory store resolves and Redis connects or reconnects through the existing client then issues `PING`, which must return exactly `PONG`. Keep exception handling immediately around each provider operation and translate typed provider-unavailable errors and PostgreSQL authentication codes `P1000` or `28P01` into Terminus down results; let programming or orchestration errors propagate. The controller coordinates indicators through `HealthCheckService` and returns only Letterly's existing success schema.
- Bound each dependency operation to 5 seconds, run both indicators concurrently, and do not retry. Use one in-flight operation per dependency. A timed-out caller receives an unhealthy result while the underlying client operation is allowed to settle; subsequent probes share or fail against that same in-flight operation until it settles instead of starting another query or ping. Existing client connection timeouts remain unchanged.
- Track shutdown with a `BeforeApplicationShutdown` lifecycle provider in the health module. Readiness checks this state before contacting providers and throws the same typed expected-unavailable exception once draining begins.
- Configure `TerminusModule.forRoot({ logger: false })`. Its indicator results and default per-probe failure logs contain more detail than public health responses may reveal.
- `ReadinessService` coordinates the two indicators through Terminus and converts only its unhealthy-check result into a dedicated `ReadinessUnavailableException` that maps to the existing generic `SERVICE_UNAVAILABLE` envelope. The API exception filter skips Sentry capture for this exception type only; unexpected 5xx errors, including other 503 exceptions, remain monitored.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/health` | GET | None | `200 { status: "ok", service: "api" }` matching `healthResponseSchema` | None | None |
| `/ready` | GET | None | `200 { status: "ok", service: "api" }` when both probes pass | None | `503 SERVICE_UNAVAILABLE` with the standard safe error envelope when either probe fails |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `GET /health` success | `status`, `service` | Existing `healthResponseSchema` values in the API process |
| `GET /ready` success | `status`, `service` | Existing `healthResponseSchema` values after both dependency checks pass |
| PostgreSQL check | Available or failed | `SELECT 1` through injected `PRISMA_CLIENT`, with a 5-second deadline |
| Redis check | Available or failed | Non-mutating `PING` through the existing production `RATE_LIMIT_STORE` client, healthy only on exact `PONG`; its deployed least-privilege Redis user must allow `PING`; the in-memory store resolves as available in development and test |
| Probe deadline | Maximum caller wait per dependency | Fixed 5-second constant in the health infrastructure; no new environment variable |
| `GET /ready` failure | HTTP status, code, message, request ID | Existing API error contract and request context; message is the generic `SERVICE_UNAVAILABLE` message |
| Sentry suppression | Whether a 503 is an expected readiness outage | Exact `ReadinessUnavailableException` type; path or status alone never suppresses capture |
| Credential failure signal | One record per continuous PostgreSQL authentication failure | Fixed allowlisted metric name and labels; the error object and credentials are never logged |
| Health response cache policy | `Cache-Control: no-store` | Early request-context middleware sets the header before parsing or routing, specified by **AC-6** |
| Shutdown readiness | HTTP 503 with generic safe error | Health module's `BeforeApplicationShutdown` state, specified by **AC-7** |

**Key invariants**:
- Database and Redis checks use the same clients used by application traffic. Their existing clients may establish or re-establish a connection normally, but a readiness check must not instantiate another Prisma or Redis client, pool, or probe-only connection.
- The database check is a read-only query. The Redis check uses `PING`, requires exact `PONG`, and must not call `consume` or create a probe key.
- PostgreSQL and Redis checks run concurrently, have a 5-second deadline, and do not retry. At most one operation for each dependency may remain in flight; repeated probes do not start duplicate work while a timed-out operation is still settling.
- Readiness succeeds only when both dependency indicators succeed. Any unhealthy indicator maps to the same generic 503 response.
- `/ready` reports one generic dependency-unavailable response. It does not return partial status, provider names, exception messages, or connection configuration.
- Only typed failures raised at the provider-operation boundary are translated into Terminus unhealthy results. Unexpected indicator and orchestration errors remain 500 errors and monitored; `HealthCheckService` unhealthy results alone are mapped to `ReadinessUnavailableException`.
- Terminus's default failure logger is disabled. Only the existing allowlisted request metadata and generic stable error code may be recorded for a probe failure.
- Configuration validation remains in startup. Migration status remains in the release gate and is not a per-instance readiness condition.
- Health paths bypass JSON body parsing, auth, route-level rate-limit, and visitor-identity policies; they retain only request context and bounded request timing instrumentation. Both health routes establish `Cache-Control: no-store` before any middleware or handler can return an error.
- Shutdown state is checked before dependency probes and uses the same safe expected 503 path; shutdown probes do not issue SQL or Redis commands.
- Routine readiness failures are an expected operational response, not an unhandled application exception to be captured once per infrastructure probe.
- Both endpoints send `Cache-Control: no-store` and do not require user authentication.

**Security model**: Health endpoints are publicly reachable by hosting and load balancer probes. They disclose only whether the process is live or required dependencies are available. They read no private page, user, report, or visitor content and expose no infrastructure details. The existing production Redis credential retains its least-privilege command set and must also be permitted to issue `PING`.

**Configuration required**: None. Existing startup configuration continues to require production Redis settings and validates them before listening.

**Critical test scenarios**:
- `/health` returns the existing success body while database and Redis probe adapters are failing and makes no probe calls, verifying **AC-1**.
- `/ready` returns success when PostgreSQL and production Redis probes pass, verifying **AC-2**.
- PostgreSQL failure alone and Redis failure alone each return the same generic 503 envelope and a request ID without provider details, verifying **AC-3**.
- PostgreSQL `P1000` and SQLSTATE `28P01` authentication rejections return that same generic 503. The authentication episode metric is emitted once despite repeated probes, resets after recovery, and contains no error message or credentials; unrelated database errors remain monitored 500 responses, verifying **AC-3** and **AC-6**.
- Memory store readiness succeeds in development and test; the production Redis probe uses `PING` on the existing client and writes no keys, verifying **AC-4**.
- Redis is healthy only for exact `PONG`; concurrent probes share one in-flight provider operation per dependency, expire at 5 seconds, do not retry, and do not create duplicate work while the original operation settles, verifying **AC-2** and **AC-4**.
- A migration mismatch is never queried by readiness; release instructions place `prisma migrate deploy` before API traffic, stop on failure, and require expand/contract compatibility for active and rollback versions, verifying **AC-5**.
- Health paths bypass body parsing and auth, rate-limit, and visitor processing; success and error responses are no-store. The typed readiness exception is excluded from Sentry while an unrelated 503 and unexpected 5xx errors remain monitored, verifying **AC-6**.
- When shutdown begins, readiness returns the safe generic 503 without querying either dependency; liveness stays process-only, verifying **AC-7**.

## Build plan

1. [x] Add `@nestjs/terminus` to `apps/api/package.json`. Extend `RateLimitStore` in `packages/contracts/src/index.ts` with `checkAvailability(): Promise<void>`, implemented by `MemoryRateLimitStore`, `RedisRateLimitStore`, and a delegating method on the exported `RateLimitService` in `apps/api/src/infrastructure/http/rate-limit.service.ts`. Redis uses its shared client for `PING` and maps provider-operation failures to a typed unavailable error. Satisfies **AC-2** and **AC-4**.
2. [x] Add `apps/api/src/infrastructure/health/health.module.ts`, `presentation/health.controller.ts`, `postgres-health.indicator.ts`, `rate-limit-health.indicator.ts`, `readiness.service.ts`, and explicit health provider tokens. Import `TerminusModule.forRoot({ logger: false })` and `RateLimitModule`, inject the global `PRISMA_CLIENT` into the PostgreSQL indicator, and return Terminus up/down results only for successful checks or typed provider failures. Use a shared single-flight deadline helper for concurrent checks, and let implementation errors propagate. `ReadinessService` uses `HealthCheckService` without returning Terminus's detailed result. Move `/health` from `AppController` without changing its route or response. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, and **AC-6**.
3. [x] Keep `apps/api/src/app.controller.ts` responsible for `GET /` and import `HealthModule` from `apps/api/src/app.module.ts`. Add a typed `ReadinessUnavailableException`, update `apps/api/src/infrastructure/http/api-exception.filter.ts` to skip Sentry capture only for that type, and keep other 5xx monitoring. Update early request middleware to set no-store for health paths and skip JSON parsing for these bodyless routes. Satisfies **AC-1**, **AC-3**, and **AC-6**.
4. [x] Add shutdown state handling through `BeforeApplicationShutdown`, returning the expected generic readiness 503 before provider checks. Add `docs/runbooks/api-release.md` with the migration-first release order, `prisma migrate deploy`, the stop-on-failure rule, expand/contract compatibility and rollback guidance, and health smoke checks. Link it from `apps/api/README.md` and operational readiness spec 0011; document the health endpoints and Redis `PING` permission. Satisfies **AC-5** and **AC-7**.
5. [x] Add store, indicator, controller, shutdown, middleware, and HTTP integration coverage for success, independent dependency failures, privacy, headers, memory-store behavior, `/health` isolation, bounded concurrent probes, expected error classification, and draining behavior. Verify expected probe failures do not emit Sentry events, PostgreSQL credential failures record one safe metric per failure episode, and unrelated 503 and unexpected 5xx errors remain monitored. Run API unit and e2e suites, API build, and root lint, formatting, and type checks, satisfying **AC-1** through **AC-7**.

## Verification

- `pnpm --filter api test --runInBand`: 82 suites and 640 tests passed.
- `pnpm --filter api test:e2e --runInBand`: 26 suites and 599 tests passed; 4 suites and 7 opt-in database integration tests were skipped because the real database test gate was not enabled.
- `pnpm check:commit`: root lint, Prettier check, and workspace type checks passed.
- `pnpm test`: all configured workspace tests passed.
- `pnpm build`: all workspace builds passed, including generated Prisma client, NestJS API, and Next.js production build.

## Consequences

**Positive**:
- Operators can distinguish process liveness from the availability of required data and rate limit services.
- Probes reuse the clients the API already depends on and do not mutate application state.
- Compatible older API instances remain eligible during additive schema rollout.

**Negative / tradeoffs**:
- A failed database or Redis check makes an instance unavailable even if some individual routes could still serve requests.
- A 5-second check deadline can classify a slow but recovering Neon cold start as temporarily unready; host probe timeouts and startup grace must be coordinated with this fixed bound.
- A timed-out provider call may continue inside the shared client until it settles; single-flight prevents duplicate probe calls but cannot cancel the underlying Prisma or Redis operation.
- The release procedure must reliably apply compatible expand migrations before the API rollout; this repository does not yet contain a production deployment workflow that can enforce the gate automatically.
- The API adds and maintains Terminus indicators and the small health module; operators must include Redis `PING` in the least-privilege service ACL.

## Follow-up

- Bind the documented migration gate and health probe settings to the production deployment workflow when its hosting provider and workflow are selected.
- Keep the readiness contract synchronized with the deployment platform's probe interval, 5-second internal timeout, HTTP timeout, and startup grace period.

## References

**Project sources**:
- `apps/api/AGENTS.md`
- `apps/api/src/infrastructure/database/AGENTS.md`
- `apps/api/src/infrastructure/http/AGENTS.md`
- `docs/specs/0004-api-errors-request-context.md`
- `docs/specs/0011-launch-hardening-and-administration/0011-operational-readiness.md`

**Practices & standards**:
- Separate process liveness from dependency readiness.
- Keep health probes read-only, generic, and free of user data.
- Use release-gated, backward-compatible database migrations during rolling deployment.

**Links**:
- [NestJS Terminus health checks](https://docs.nestjs.com/recipes/terminus)
