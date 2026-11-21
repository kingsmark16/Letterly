# 0001. Admin operations console

**Date**: 2026-11-17
**Status**: Verified
**Content ratified**: 2026-11-17, including the six approved fresh critique resolutions. Implementation has not started.
**Email search clarification ratified**: 2026-11-17, after a fresh review using the same model, approval of both recommended corrections, and final content acceptance. Milestone 1 is built; milestone 2 remains open.
**Processor recovery clarification ratified**: 2026-11-18, after a fresh review using the same model, approval and application of all five corrections, and final content acceptance. This includes the source upload settlement gate. Milestones 1 and 2 are built. Milestone 3 has not started. Earlier ratification statements describe their dated baseline.
**Creator grant ownership clarification ratified**: 2026-11-19, after a fresh review using the same model, approval and application of all six corrections, and final content acceptance. Milestones 1 through 3 are built. This clarification governs milestone 4.

## Summary

Give your administrators a dedicated workspace for oversight, creator and page management, moderation, deletion progress, and usage trends. Build a fresh light interface with Tailwind and shadcn/ui. Extend the existing API and privacy controls through small working slices.

## Structure

1. [Interface and operations](0001-interface-and-operations.md) defines navigation, safe record search, moderation, and accessible screens.
2. [Deletion jobs](0001-deletion-jobs.md) defines immediate access blocking, confirmed deletion, durable progress, and cleanup recovery.
3. [Platform analytics](0001-platform-analytics.md) defines daily aggregates, event sources, coverage, and overview charts.

## Requirements

As an administrator, you can find creators and pages, act on reports and appeals, remove records deliberately, and follow cleanup without reading private writing. You can see moderation work and platform activity from one overview.

1. **AC-1**: All seven admin destinations share the new responsive light console. Existing report and audit deep links continue working.
2. **AC-2**: Creator search and detail expose only the approved identity fields, dates, moderation state, and page counts. Page search and detail expose safe operational metadata. Both support filters and direct lookup.
3. **AC-3**: Reports and a dedicated appeal inbox link to target details and audit history. Existing confirmed actions, appeal transitions, versions, and retry semantics remain intact.
4. **AC-4**: Administrators can disable and restore creators and pages. Account actions cannot target administrators. Role management, bulk actions, creator content editing, and new email delivery are absent.
5. **AC-5**: Permanent creator and page deletion requires a reason, impact summary, typed target ID, valid current confirmation, and an idempotency key. Accepted deletion immediately blocks access and returns a durable job.
6. **AC-6**: Deletion removes applicable database records and uploaded media in bounded background work. Progress survives target deletion, retries resume the same job, and completion requires verified cleanup. Completed job records remain for 730 days.
7. **AC-7**: Overview shows pending reports, requested appeals, unfinished deletions, current creator and page totals, and trends for signups, page creation, publish actions, total page views, and daily page visits. Periods are 7, 30, and 90 UTC days, with 30 selected initially.
8. **AC-8**: Daily aggregates contain no personal identifiers, survive target deletion, and count each successful event once. Coverage begins at controlled rollout. Earlier periods are unavailable and the first partial day is labeled.
9. **AC-9**: API authorization, trusted origins, private caching, bounded reads, rate limits, safe errors, and redacted audit history cover every new endpoint. No private confession content, visitor messages, passwords, or storage keys reach admin projections.
10. **AC-10**: Every screen has loading, empty, error, expired session, forbidden, conflict, and relevant pending states. Keyboard, focus return, narrow screens, reduced motion, and chart alternatives meet the project accessibility baseline.
11. **AC-11**: Existing public and creator experiences retain their styling and behavior. Node 24 checks, isolated database integration tests, concurrency tests, and practical desktop and mobile browser journeys verify the new paths.

## Decision

**Chosen option**: Extend the existing modular application through a separate admin visual system and focused API additions. Keep the current providers and shared infrastructure. Use PostgreSQL jobs rather than adding a queue service. (basis: root AGENTS.md, blueprint reference, existing admin boundaries, incremental replacement.)

**Implementation skills**: `ui-styling` (`.agents/skills/ui-styling/`), `ui-ux-pro-max` (`.agents/skills/ui-ux-pro-max/`), `antislop` and its UI, human, and mobile skills (`.agents/skills/antislop*/`), `nestjs-best-practices` (`Kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`), `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`). Tailwind and shadcn are already configured, so no new tool discovery or installation is assumed.

## Feature design

### Scope and precedence

This is a new enhancement across `apps/web`, `apps/api`, `packages/contracts`, and `packages/database`. Store it in the repo wide spec location. Existing flat numbered specs stay in place.

Spec 0011 remains the contract for moderation, appeal transitions, retention, and privacy except where these children explicitly add deletion and approved creator identity projections. This spec replaces its requirement to reuse the current Letterly visual design for admin routes. The approved creator name and email projection is an explicit expansion of the older metadata only list rule, limited to creator management screens. Report and audit projections remain unchanged. Specs 0009 and the current web `design.md` continue governing other surfaces. Preserve the boundaries in spec 0022.

### Shared contracts

All new paths start at `/api/v1/admin`. Reuse Better Auth session verification, current database `ADMIN` role checks, disabled account precedence, AdminOriginGuard, shared error envelopes, request IDs, signed cursors, existing rate limit infrastructure, and `private, no-store` responses. Read limits remain 120 requests per minute per administrator and mutation limits 30. Read only search POST requests consume the read budget and also validate origin.

All new action bodies use exact Zod schemas. Reuse existing reason enums for moderation; deletion requires `reasonCode` from the report reason enum and permits an optional trimmed `note` of up to 500 characters. Action bodies include `confirm: true`, current expected version, and an idempotency key of 1 to 200 trimmed characters. Retry requests use the original stored reason rather than asking for another. Worker and API outcomes never include private content. Idempotency means retries reuse the stored operation rather than repeating it.

New safe errors are `DELETION_IN_PROGRESS`, `STALE_DELETION_IMPACT`, `INVALID_DELETION_STATE`, and `ANALYTICS_UNAVAILABLE`, alongside existing protected target, invalid cursor, stale version, confirmation, and idempotency errors. Declare all schemas and OpenAPI metadata with their HTTP status in contracts. Use 401 for expired sessions, 403 for denied role/origin, safe 404 for absent targets, 409 for state conflicts, 422 for invalid input, 429 with Retry-After for limits, and safe 503 for unavailable dependencies.

Remote data belongs to TanStack Query, forms to React Hook Form and Zod, nonpersonal filters to URL parameters, and temporary presentation state to React. Never persist admin records or searches in browser storage. Clear admin query data on logout or lost access. Preserve exact mutation payloads and idempotency keys on uncertain retries, refresh on stale versions, and never replay an action automatically after signing in again.

### Value sourcing

| Display or operation | Authoritative source |
| --- | --- |
| Acting administrator | Verified Better Auth session and current User row |
| Creator identity and counts | Explicit User projection and related Page counts |
| Creator email search validation and canonical lookup | `adminCreatorEmailSearchSchema` and literal equality against `lower("email" COLLATE "C")` with the canonical parameter also using `C`, as defined in the ratified interface child clarification dated 2026-11-17. |
| Page metadata and owner link | Page, Template, pinned TemplateVersion, and creator ID |
| Reports, appeals, history | Existing PageReport, Appeal, ModerationAction, and AuditEvent projections |
| Deletion target, reason, and confirmation | Validated action body and current impact preview |
| Accepted deletion replay after ordinary idempotency expiry | Retained DeletionAcceptanceReceipt and referenced job |
| Target deletion link after removal | Exact logical target lookup in DeletionJob |
| Account failure and retry progress | Child job states, parent reconciliation, and persisted retry cursor |
| Cleanup status and counts | DeletionJob, its child jobs, and durable DeletionJobMedia completion links |
| Running processor cleanup safety | Persisted processing attempt token, state, output manifest, and settled completion |
| Processor identity and exceptional recovery | Ratified deletion child clarification dated 2026-11-18: persisted process boot UUID and host identity, storage write outcome, verified operator session, canonical evidence, and retained replay record. |
| Source upload settlement | Ratified deletion child clarification dated 2026-11-18: immutable issued grant ledger, frozen job manifest/count/deadline, and retained operator supplied provider settlement proof. Expiry alone is insufficient. |
| Creator ownership of grants after page removal | Ratified deletion child clarification dated 2026-11-19: immutable creator ID on the grant, exact historical Page ownership from a verified database restore, and a retained page child with its own settlement proof and fresh cleanup claim. |
| Current totals and workload | Bounded aggregate database queries named in analytics child |
| Trend buckets | DailyAdminMetrics and AnalyticsCoverage.startedAt |
| UTC period and refresh time | Validated period input and database timestamp returned by the API |
| Labels, colors, responsive behavior | Interface child token and composition contract |

### Exclusions

No role grants through the browser, action against administrator accounts, bulk moderation, content editing, visitor identity analytics, custom date periods, notification provider, dark mode, payment feature, or new infrastructure service is included. Keep appeal intake through support references entered by administrators.

### Configuration and ownership

Add validated server configuration `ADMIN_DELETION_ENABLED`, default false. It gates new deletion acceptance and previews, not progress reads, retries of already accepted work, worker recovery, or access barriers. Bind it through the existing API configuration infrastructure. No new browser secret, provider credential, or deployment resource is required. Worker limits and retention are named constants in their owning feature. Preserve plain application ports and infrastructure owned Prisma, signing, scheduling, and monitoring adapters.

## Build plan

Use the project Tracer Bullet approach. Each slice proves database, API, interface, and a real user action before adding breadth.

1. Prove protected creator lookup and detail inside the new shell, with one database projection, contract, API endpoint, and desktop/mobile journey. Establish scoped styles and denial states. Satisfies AC-1, AC-2, AC-9, AC-10, AC-11.
2. Complete bounded creator/page search, detail, disable and restore; integrate existing reports, dedicated appeal inbox, and audit navigation. Preserve old links. Satisfies AC-1 through AC-4, AC-9 through AC-11.
3. Prove one page deletion through impact preview, immediate blocking, database removal, media cleanup, progress screen, and retry. Add the deletion schema with nullable additions before enabling actions. Satisfies AC-5, AC-6, AC-9 through AC-11.
4. Extend the same path to account deletion with bounded child page jobs, session revocation, concurrency barriers, late upload handling, and retention. Satisfies AC-4 through AC-6, AC-9 through AC-11.
5. Add the aggregate schema and transactional event capture. Activate coverage only after every event source is installed. Complete the real overview and chart alternatives. Satisfies AC-7 through AC-11.
6. Verify cross feature behavior, restore and deletion races, permissions, privacy, theme isolation, and deployment recovery. Record evidence per criterion and reconcile scope/context after implementation. Satisfies AC-1 through AC-11.

## Migration plan

**Strategy**: Incremental replacement with additive database migrations and server controlled action availability.

1. Add schema and worker support, initially with destructive entry points disabled through validated `ADMIN_DELETION_ENABLED=false`.
2. Introduce the new shell and management screens while retaining existing report/audit routes. Enable deletion only after isolated integration and staging cleanup evidence.
3. Deploy all aggregate capture mechanisms, then activate coverage through the source table write barrier and event clock contract in the analytics child. Do not backfill partial history.

**Rollback**: Disable new deletion requests and roll back interface changes first. Keep a compatible worker and access blocking code deployed until outstanding jobs drain. Do not restore deleted content or undo migrations. Analytics rollback must retain capture triggers; if capture is interrupted, stop trend serving until coverage can be represented accurately through a new decision.

**Risks**: Deletion is irreversible, storage failure can prolong cleanup, and daily counters add database writes. A frontend rollback does not reverse accepted jobs.

## Consequences

You gain a dedicated operating surface without another service or authorization system. Fresh scoped styles cost maintenance and need regression evidence. Permanent deletion requires durable workers and operational monitoring. Daily history starts at rollout rather than presenting reconstructed numbers as complete.

## Follow-up

1. The spec content is ratified after the selected fresh critique using the same model and approval of all six fixes.
2. Tracked as feature 24, Admin operations console, in [scope](../../../scope/scope.md). The existing administration feature remains done. Design progress is recorded; implementation has not started.
3. Capture the admin design exception and relevant UI skill pointers in `apps/web/src/features/admin/AGENTS.md` when implementation begins.
4. Node 24 verification, OAuth verification, and staging provisioning remain separate release prerequisites. Local cleanup did not complete them.

## Rationale

Reasoning, alternatives, code inventory, and verified references are in [rationale.md](rationale.md).
