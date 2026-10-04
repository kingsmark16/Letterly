# API health infrastructure

## Overview

This module owns `GET /health` and `GET /ready`. Liveness confirms only that
the API process can answer HTTP requests. Readiness checks the injected
PostgreSQL client and the shared Redis rate-limit store required by production
traffic.

## Key files

| File | Owns |
| --- | --- |
| `health.module.ts` | Terminus wiring, health providers, and explicit application tokens |
| `presentation/health.controller.ts` | Thin process-health and readiness HTTP routes |
| `postgres-health.indicator.ts` | Read-only `SELECT 1` through `PRISMA_CLIENT` |
| `rate-limit-health.indicator.ts` | Store availability through `RateLimitService` |
| `readiness.service.ts` | Concurrent dependency checks, safe failure mapping, and shutdown draining |
| `health-probe.ts` | Five-second caller deadline and per-dependency single-flight behavior |
| `health-probe.spec.ts` and `readiness.service.spec.ts` | Probe coordination and failure-classification coverage |

## Conventions

- Use existing Prisma and rate-limit clients; never create probe-only clients,
  pools, Redis keys, or rate-limit buckets.
- Run PostgreSQL and Redis checks concurrently with a five-second caller
  deadline, no retries, and at most one in-flight operation per dependency.
  Keep the operation coalesced until the shared client call actually settles,
  even after an individual caller times out.
- Map expected provider failures to the same generic `SERVICE_UNAVAILABLE`
  envelope. Do not return provider names, exceptions, connection state, or
  migration state to callers. Unexpected implementation errors remain
  monitored 5xx failures.
- Keep `/health` independent from providers. Both health routes remain
  unauthenticated, no-store, and outside route-level rate limits and visitor
  identity processing.
- When shutdown starts, reject readiness without issuing provider commands;
  keep process liveness available until the server closes.
- Apply migrations before API rollout through the [API release runbook](../../../../../docs/runbooks/api-release.md).
  Runtime readiness must not check migration versions because older compatible
  instances stay active during a rolling deployment.

## Related specs

- [API readiness contract](../../../../../docs/specs/0022-repository-structure/0022-api-readiness-contract.md)
- [Operational readiness](../../../../../docs/specs/0011-launch-hardening-and-administration/0011-operational-readiness.md)
