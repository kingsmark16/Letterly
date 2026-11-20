# Administration module

## Overview

This module owns protected administrator bootstrap, access checks, report moderation, page and creator moderation, appeals, and audit history. It is the API boundary for safety actions. It never returns confession content, visitor responses, secrets, raw network identity, or provider credentials.

## Key files

| File | Owns |
| --- | --- |
| `admin.module.ts` | NestJS module composition and provider bindings |
| `presentation/admin.controller.ts` | Protected report, moderation, appeal, creator detail, and audit routes |
| `presentation/admin-operations.controller.ts` | Protected creator/page directories, POST identity/slug search, and appeal inbox routes |
| `presentation/admin-deletions.controller.ts` | Protected page/creator deletion preview, acceptance, progress, children, and retry routes |
| `presentation/admin-overview.controller.ts` | Protected overview workload, current totals, and UTC trend reads |
| `presentation/admin-recover-media-attempt.ts` | Authenticated CLI for processor attempt inspection and attested recovery |
| `presentation/admin-recover-upload-grants.ts` | Authenticated CLI for upload grant inspection and provider settlement evidence |
| `presentation/admin-activate-analytics.ts` | Controlled CLI for locking source tables and activating `AnalyticsCoverage` |
| `application/admin-operations.service.ts` | Plain directory, search, and appeal inbox use cases with signed cursor binding |
| `application/admin-deletions.service.ts` | Plain deletion preview, acceptance, progress, and retry use cases |
| `application/deletion-worker.ts` | Bounded background deletion claim and step orchestration |
| `infrastructure/prisma-admin-deletions.repository.ts` | Transactional deletion preview, receipt replay, acceptance barriers, and retry persistence |
| `infrastructure/prisma-deletion-worker.repository.ts` | Bounded page/creator cleanup, namespace task adoption, child reconciliation, and monitoring transitions |
| `infrastructure/prisma-media-recovery.repository.ts` | Operator session verified recovery evidence storage and canonical replay |
| `infrastructure/deletion-retention.ts` | Bounded 100 job transactional 730 day completed job and proof purge |
| `infrastructure/prisma-admin-overview.repository.ts` | Single query aggregate workload, current totals, and UTC daily trend projection |
| `infrastructure/moderation-barrier.ts` | Shared User then Page deletion barrier lock check for moderation mutations |
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
- `ADMIN_DELETION_ENABLED` gates deletion previews and genuinely new acceptances; exact authorized receipt replay, progress reads, retries, recovery commands, and deletion barriers remain active while disabled.
- Both read and mutation error mappers in `admin.controller.ts` must map `AdminDeletionError` (`404 NOT_FOUND` or `409 DELETION_IN_PROGRESS`) and transient database unavailability (`503 SERVICE_UNAVAILABLE`).
- Follow the common lock order across deletion, cleanup, and recovery transactions: Users (ascending ID) -> Pages (ascending UUID) -> parent DeletionJob -> child/standalone DeletionJob -> MediaCleanup/media rows.

## Related specs

- [Admin operations console](../../../../../docs/specs/_root/0001-admin-operations-console/index.md)
- [Launch hardening and administration](../../../../../docs/specs/0011-launch-hardening-and-administration/index.md)
- [Administration boundaries](../../../../../docs/specs/0022-repository-structure/0022-admin-boundaries.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
