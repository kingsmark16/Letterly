# Review, API readiness contract, 2026-10-04

**Reviewed by**: Codex, same model as author at the user's request
**Scope**: Readiness specification and selected health, transport, and test files
**Verdict at initial review**: Changes requested

## Summary

The readiness design keeps process health separate from PostgreSQL and Redis readiness, reuses the shared clients, bounds overlapping probes, and preserves the safe response envelope. One implementation path contradicts the spec's monitoring rule: the PostgreSQL indicator converts every thrown value into an expected dependency outage, including errors that should remain visible as server failures. The existing HTTP test currently locks in this broad conversion.

## Major

### PostgreSQL probe hides unexpected failures, `apps/api/src/infrastructure/health/postgres-health.indicator.ts:38`

**Problem**: `queryDatabase` catches every error from `$queryRaw` and replaces it with `HealthProbeUnavailableError`. The spec says only typed provider failures should become an unhealthy indicator, while unexpected failures should remain monitored 5xx errors. The HTTP test at `apps/api/test/health.e2e-spec.ts:142` uses a plain `Error` and expects the same 503 as a Redis outage, so the test cannot distinguish a real connection failure from a programming or integration error.

**Why it matters**: An unexpected Prisma or probe implementation failure is reported as an ordinary dependency outage and excluded from Sentry. This can hide a broken probe implementation during a deployment and gives operators less information than the approved contract allows.

**Suggested fix**: Map only recognized PostgreSQL connection or availability errors to `HealthProbeUnavailableError`. Re-throw unknown failures so the existing exception filter returns the generic monitored 500. Add coverage for a recognized transient database error returning the safe 503 and an unexpected error remaining a monitored server failure.

## Strengths

- Health routes set `Cache-Control: no-store` in request context before body parsing and routing.
- The probe wrapper coalesces work through the underlying operation's settlement, even after a caller deadline.
- The health endpoint test checks that process health makes no provider calls and that readiness performs no rate-limit writes.

## Test coverage

The health endpoint tests cover success, expected dependency failures, response privacy, cache policy, and request IDs. They do not cover the spec's distinction between a typed PostgreSQL availability failure and an unexpected PostgreSQL implementation error. This is the gap behind the major finding.

## Review limits

This was an inline review by the same model that authored the change, as selected by the user. It does not provide the fresh-model independence normally required by `/check review`.

## Follow up after the fix

The implementation now maps only errors recognized by the shared transient database classifier, plus the explicit five second probe deadline, to an unhealthy PostgreSQL indicator. Unknown failures pass to the API exception filter. The HTTP regression test now proves a Prisma `P1001` failure returns the safe 503 and an unexpected error returns a generic 500.

The health end to end suite passes all five tests. The focused health and exception filter unit suites pass eleven tests. API lint, type checks, build, and the root formatting check pass. The issue recorded above is resolved in the follow up change.

## Cross-check after the initial fix

**Reviewer**: Codex, same model as author at the user's request
**Scope**: API readiness contract, release runbook, and relevant health, HTTP, database, and test code
**Final verdict**: Approve with nits

The deployment decision agrees with operational readiness spec 0011 and the deployment sequence in blueprint section 19. Both require migrations to precede API traffic, preserve compatibility with active and rollback versions, and keep migration status out of each pod's readiness check. The current release runbook states the same order. NestJS's current Terminus guide supports separate readiness and liveness checks, recommends enabling shutdown hooks, and documents `logger: false` to suppress health failure logs: [NestJS Terminus health checks](https://docs.nestjs.com/recipes/terminus).

### Minor

#### Health route aliases miss the early cache and parser policy, `apps/api/src/infrastructure/http/request-context.ts:8`

**Problem**: `isHealthRequest` accepts only exact lowercase paths. The default Express router also matches different casing and a trailing slash, so `GET /HEALTH` and `GET /health/` reach the same controller route without getting the early `no-store` header or body parser bypass. A direct Express route check reproduced both aliases returning success. This falls short of AC-6's requirement that health responses remain uncacheable and bodyless before parsing.

**Why it matters**: A cache or intermediary can treat an alias response differently from the canonical probe path, and a request body on an alias can fail in the parser before routing without the health error policy.

**Suggested fix**: Make the early health path predicate follow the router's accepted path forms, or configure routing to reject those aliases. Add HTTP coverage for the selected policy, including cache headers and malformed bodies.

#### The contract does not define permanent database connection failures, `docs/specs/0022-repository-structure/0022-api-readiness-contract.md:29`

**Problem**: AC-3 says any failed dependency check returns the generic 503, while the key invariant and implementation translate only recognized provider failures into a down indicator. The database classifier recognizes network and transient codes but not PostgreSQL authentication failures such as `28P01`; those propagate to a monitored 500 instead. PostgreSQL documents `28P01` as `invalid_password`: [PostgreSQL error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html). The current HTTP fixture covers `P1001`, not this permanent provider error.

**Why it matters**: Readiness still fails closed, but the status and monitoring behavior differ from the literal AC-3 contract during a database credential error or rotation mistake.

**Suggested fix**: State which permanent connection and configuration errors are expected readiness failures and which remain monitored 500 errors, then add one representative test for that boundary. If AC-3 is intended to cover all provider-operation failures, map the chosen database error to the typed unavailable result.

### Cross-check evidence

- `pnpm.cmd --filter api test --runInBand --runTestsByPath src/infrastructure/health/health-probe.spec.ts src/infrastructure/health/readiness.service.spec.ts src/infrastructure/http/rate-limit.service.spec.ts`: 3 suites and 21 tests passed.
- `pnpm.cmd --filter api test:e2e --runInBand --runTestsByPath test/health.e2e-spec.ts`: 1 suite and 5 tests passed.
- The tests cover canonical health paths, expected transient dependency failures, generic unexpected failures, deadline behavior, and draining. They do not cover Express path aliases or a permanent database authentication failure.
- This is a same-model cross-check, as requested. It does not provide the independent perspective of a second model.

## Current finding status

The route alias finding is resolved by commit `a2a0a36`. The early health predicate now accepts the router's casing and trailing slash forms. HTTP configuration tests send malformed JSON to `/HEALTH`, `/health/`, `/ReAdY/`, and `/HeAlTh/` and confirm successful bodyless handling, `Cache-Control: no-store`, and request IDs. Request context tests cover the same early cache policy.

At the time of this review, the permanent database connection failure contract remained open. The decision and implementation follow-up below supersede that status.

## Decision and verification follow-up, 2026-10-05

The user chose to map PostgreSQL credential rejection to the same generic readiness 503 as other dependency failures, while retaining a bounded operator signal. The readiness contract now specifies Prisma `P1000` and PostgreSQL SQLSTATE `28P01` as expected unavailable results. The PostgreSQL indicator emits one fixed-label `readiness_dependency_failure_episode_total` metric during a continuous credential failure, resets the episode after a successful probe, and never records the database error text. Unrecognized errors remain monitored 500s.

Focused regression evidence: 4 API unit suites and 17 tests passed for database error classification, PostgreSQL indicator signaling, readiness orchestration, and monitoring allowlisting. The health HTTP suite passed all 6 cases, including a `P1000` response with the generic 503 envelope and no credential details. The full repository gates remain part of the final completion audit.
