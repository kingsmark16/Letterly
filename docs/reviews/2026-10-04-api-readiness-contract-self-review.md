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
