# Administration module

## Overview

This module owns protected administrator bootstrap, access checks, report moderation, page and creator moderation, appeals, and audit history. It is the API boundary for safety actions. It never returns confession content, visitor responses, secrets, raw network identity, or provider credentials.

## Key files

| File | Owns |
| --- | --- |
| `admin.module.ts` | NestJS module composition and provider bindings |
| `presentation/admin.controller.ts` | Protected report, moderation, appeal, and audit routes |
| `presentation/admin.guard.ts` | HTTP mapping of the plain administrator access policy |
| `presentation/admin-origin.guard.ts` | Trusted origin and mutation protection |
| `application/admin-reports.service.ts` | Plain report listing and detail use cases |
| `application/admin-moderation.service.ts` | Plain page, creator, report, and appeal operations |
| `application/admin-access.service.ts` | Current role and disabled account policy |
| `application/admin-cursor.ts` | Cursor port, position, and safe error contract |
| `application/admin-*.repository.ts` | Plain repository ports, results, and failure types |
| `infrastructure/prisma-admin-reports.repository.ts` | Safe report projections, version selection, and action history |
| `infrastructure/prisma-admin-audit.repository.ts` | Private audit event queries and cursor pagination |
| `infrastructure/admin-cursor.service.ts` | Signed filter and size bound cursor implementation |
| `infrastructure/admin-retention.service.ts` | Configured retention scheduling, metrics, and safe logging |
| `presentation/admin-bootstrap.ts` | Explicit administrator bootstrap command |

## Conventions

- Keep administrator authorization, trusted origin checks, and mutation validation on the server. Browser guards only improve navigation and recovery states.
- Require expected moderation versions and idempotency keys for state changing actions so retries are safe and stale updates are rejected.
- Keep report and audit responses private and uncached. Do not add content, response text, secrets, or raw identity fields to administrator projections or audit metadata.
- Preserve stable error envelopes and request IDs for authorization, rate limit, unavailable, and conflict outcomes.
- Keep page and creator moderation changes transactional with their audit records, and expose only the safe moderation status and version needed by the console.
- Application services use plain constructors and ports; AdminModule factories own Nest composition. ESLint restricts application imports, including type imports, to contracts, template definitions, and local plain files.
- Repository errors are defined in application and used by persistence and HTTP mapping, preserving a single error identity. Cursor signing stays behind the application cursor port.

## Related specs

- [Launch hardening and administration](../../../../../docs/specs/0011-launch-hardening-and-administration/index.md)
- [Administration boundaries](../../../../../docs/specs/0022-repository-structure/0022-admin-boundaries.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
