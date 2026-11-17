# Admin operations console reasoning

## Context

Your current application already has protected reports, report detail actions, externally received appeal intake, and audit history. It lacks a dedicated overall admin workspace, creator/page discovery, a separate appeal inbox, permanent administrative deletion jobs, and retained platform activity history.

You chose all three areas together and confirmed the data model through the design conversation. You requested a fresh visual identity unrelated to the current UI, specifically using Tailwind and shadcn/ui. You chose light surfaces, graphite navigation, restrained blue accents, light mode only, and seven navigation destinations. The build approach remains Tracer Bullet.

This is a repo wide enhancement with related decisions separated into three children. The older administration feature is already recorded done. This spec does not change its completion status or claim that the new feature is shipped. After ratification, you chose to enroll the enhancement as scope feature 24, Admin operations console. Its in progress scope status records completed design, while this spec remains Proposed until implementation begins.

## Options considered

### Improve the existing screens in place

Keep the current shell and extend its report views. This minimizes visual migration and reuses current components, but does not meet your explicit fresh design requirement and would overload the report console with unrelated management work. (basis: existing admin feature context and spec 0011.)

### Extend the existing application with a new admin surface

Keep the authorization and persistence foundation, add narrow safe query and job contracts, and introduce scoped presentation. This meets the confirmed scope without another service. It costs new migrations, worker behavior, and theme isolation verification. This is the chosen option. (basis: root AGENTS.md, blueprint reference, spec 0022 admin boundaries, incremental replacement.)

### Replace administration with a separate application

A dedicated app could isolate assets and deployment. It would add authentication, routing, delivery, and shared contract work before proving the requested journeys. There is no confirmed organizational or deployment need for that cost. (basis: root monorepo structure and existing server admin access integration.)

## Rationale

Fresh design does not require a second authorization boundary. The existing application already has versioned moderation, idempotency records, safe projections, private responses, signed cursors, and storage cleanup leases. Reusing those mechanisms reduces migration risk while meeting the requested operating workflows. (basis: spec 0011, spec 0022, admin and media cleanup code inventory.)

Use shadcn semantic variables for the new theme and native table/dialog semantics for admin tasks. Keep Tailwind theme declarations at the top level and apply the visual scope through ordinary wrapper variables. The wrapper technique is an inference from the documented distinction between generated theme utilities and ordinary scoped CSS variables. (basis: shadcn monorepo and theming documentation, Tailwind theme documentation, W3C table and modal dialog patterns.)

PostgreSQL jobs are preferred over another queue provider because bounded background infrastructure already exists. Durable completion links are necessary because existing successful media cleanup deletes its row. A synchronous request or a missing task row cannot prove completion. (basis: MediaCleanupService, PrismaMediaCleanupRepository, Prisma transaction documentation.)

Database triggers are preferred over postcommit application hooks for daily counters because every counted event must commit atomically with its increment, including Better Auth managed user insertion. Application increments are the runner up, but only when they can share every source transaction without duplicated provider handling. Daily aggregate rows trade some write contention for simple retained history; staging measurement is required. (basis: confirmed coverage/history rules, PostgreSQL transactional behavior, Prisma transaction documentation.)

## Code inventory and evidence

Read only code mapping identified these owners:

1. `apps/api/src/modules/admin/presentation/admin.controller.ts` and `admin.module.ts` compose protected API routes and providers. New use cases and ports remain under application, Prisma adapters under infrastructure.
2. `AdminModerationService` and `PrismaAdminModerationRepository` own current conditional actions, audit writes, and safe idempotency. Permanent deletion is a new operation.
3. `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts` owns page lifecycle persistence and existing page deletion media enumeration and slug reservation handling.
4. `PrismaMediaCleanupRepository.markCleanupSucceeded` currently removes the task row. It needs transactional job acknowledgement before removal. Existing cleanup uses five attempts, batch 50, and concurrency 4.
5. `PageVisit` uniquely identifies page, browser hash, and UTC day; its viewCount supplies views. These are page visits, not global unique people.
6. `apps/web/src/features/admin/` contains current consoles, API adapters, confirmation presentation, and safe detail presentation. `src/lib/server-admin-auth.ts` supplies the server access probe.
7. Both components.json files already use shadcn `new-york`, neutral base, semantic CSS variables, and shared `@repo/ui` aliases. Tailwind v4 already scans application and shared production sources.

Repository readiness checkpoint before design: local commit `076ef5a` closed the pending logout redirect fix. Working tree was clean afterward. Root lint, formatting, types, test tasks, production build, commit hooks, and fresh desktop/mobile logout journeys passed. Several Turbo tasks reused cache. The shell used Node 26 rather than required Node 24. No push, deployment, live deletion, or new implementation was performed. OAuth verification and staging provisioning remain open in scope.

## References

### Fresh critique and approved resolutions

You selected a fresh critique using the same model. The reader examined all five spec files without editing them or fetching references. It found six material gaps, and you explicitly approved applying all six recommended fixes.

| Finding | Applied resolution | Build contract |
| --- | --- | --- |
| Existing media processors could write after deletion starts | Durable output manifests, claim fencing, explicit processing quiescence, and attention required when shutdown cannot be proven | Deletion worker and concurrency |
| Account child failure and retry behavior was incomplete | WAITING_FOR_CHILDREN, propagated attention state, independent child retry, and bounded parent retry waves | Deletion worker and concurrency |
| Analytics activation did not fence old writers | Fixed source table lock order, atomic activation, wall clock trigger timestamps, and an explicit source isolation contract | Analytics activation boundary and event clock |
| 24 hour idempotency did not support retained deletion replay | Minimal acceptance receipt retained and purged with its job | Deletion data model and acceptance |
| Reopened target details had no source for a job link | Nullable deletion fields and exact retained job lookup by logical target | Interface detail projections and unavailable state |
| New DTO fields and list behavior were underspecified | Field allowlists, projection sources, sort tuples, cursor binding, and bounded sizes | Appeal and deletion response contracts |

This records approved changes, not an independent verification of their implementation. You accepted the revised spec content on 2026-11-17. Its lifecycle status remains Proposed because implementation has not started. An uncertain media processor may keep a deletion job blocked until operations can establish quiescence; the system must prefer an honest unresolved job over premature completion.

### Project sources

1. Root `AGENTS.md` and `docs/references/letterly-blueprint.md`, feature boundaries, delivery strategy, privacy, and mandatory engineering rules.
2. `docs/specs/0011-launch-hardening-and-administration/`, current moderation and appeal contracts.
3. `docs/specs/0022-repository-structure/0022-admin-boundaries.md`, plain application services and inward dependencies.
4. `apps/web/src/features/admin/AGENTS.md`, current protected consoles and interaction requirements.
5. Media cleanup and admin source owners listed in the code inventory, current success deletion and lease behavior.
6. Existing components.json configuration, current shared primitive integration.

### Practices and standards

Incremental replacement, explicit idempotency, atomic database transactions, WCAG AA, native table semantics, and modal dialog focus management underpin the decisions above.

### Verified official links

These pages were checked once during design on 2026-11-17. Reuse these references without fetching them again during spec review or implementation.

1. [shadcn monorepo support](https://ui.shadcn.com/docs/monorepo)
2. [shadcn theming](https://ui.shadcn.com/docs/theming)
3. [Tailwind theme variables](https://tailwindcss.com/docs/theme)
4. [Prisma v7 transactions and idempotency](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)
5. [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
6. [W3C table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
