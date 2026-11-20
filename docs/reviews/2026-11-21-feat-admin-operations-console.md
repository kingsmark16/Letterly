# Review, feat/admin-operations-console, 2026-11-21

**Reviewed by**: Gemini 4 Neon (author on GPT-6; initial partial review by GPT-6-Astra)
**Scope**: 166 changed files, branch plus working tree fixes versus `origin/staging`, merge base `b6671a1f7f5d0858f5af08b716135683e035b3c5`
**Verdict**: Approve with nits (post fix)

## Summary

The feature delivers the dedicated light administration operations console, safe creator and page directories, a dedicated appeal inbox, durable page and creator deletion jobs with storage settlement evidence, and transactional UTC platform analytics behind an explicit activation barrier. All 166 changed files were inspected in full across migrations, operations scripts, shared contracts, API modules, page repositories, web routes and components, and automated tests. The two findings from the prior partial review are confirmed fixed and covered by passing database tests. Full inspection uncovered one additional blocker in `AdminController.mapAdminMutationError`, which returned HTTP 500 instead of 409 or 404 on deletion blocked or missing moderation targets; that defect was reproduced, fixed, and verified with new database regression coverage.

## Resolved findings verified in this review

### Prior blocker (verified fixed): Adopt outstanding cleanup tasks for ordinary page jobs, `apps/api/src/modules/admin/infrastructure/prisma-deletion-worker.repository.ts:740`

`queueMediaBatch` now adopts outstanding `MediaCleanup` tasks in the exact `pages/<pageId>/` namespace for both ordinary and detached page jobs under `lockDeletionPageScope`, invalidating active cleanup leases and retaining existing `REVIEW` status until manual retry and verified acknowledgement. All nine ordinary `MediaCleanup` producers in `apps/api/src/modules/pages/` were verified to hold User then Page barrier locks and reject after deletion acceptance. The new `PAGE` and `CREATOR` database regression cases in `apps/api/test/admin-deletions.database.e2e-spec.ts:313-410` pass independently on Node 24.

### Prior major (verified fixed): Replay accepted page deletion before applying the new acceptance flag, `apps/api/src/modules/admin/application/admin-deletions.service.ts:47`

`AdminDeletionsService.accept` now delegates `'PAGE'` and `this.enabled` into `PrismaAdminDeletionsRepository.accept`, where active administrator authorization and both retained `DeletionAcceptanceReceipt` checks run before rejecting genuinely new requests while `ADMIN_DELETION_ENABLED` is false. Previews remain gated by `requireEnabled()`. The database regression case in `apps/api/test/admin-deletions.database.e2e-spec.ts:279-311` passes independently before and after physical page removal.

### New blocker found and fixed during full review: Map `AdminDeletionError` and database unavailability in `mapAdminMutationError`, `apps/api/src/modules/admin/presentation/admin.controller.ts:143`

**Problem**: `PrismaAdminModerationRepository` calls `lockModerationBarrier` across all moderation mutations (`mutateReport`, `mutatePage`, `mutateUser`, `createAppeal`, `mutateAppeal`), throwing `AdminDeletionError('DELETION_IN_PROGRESS')` for deletion blocked targets and `AdminDeletionError('NOT_FOUND')` for missing pages. The `AdminDeletionError` handler was added only to `mapAdminReadError` (`admin.controller.ts:94`), while all mutation handlers call `mapAdminMutationError` (`admin.controller.ts:143`). As a result, moderation mutations against deletion blocked targets or missing pages fell through to `ApiExceptionFilter` as HTTP 500 `INTERNAL_SERVER_ERROR` instead of HTTP 409 `DELETION_IN_PROGRESS` or HTTP 404 `NOT_FOUND`. The existing race test (`admin-deletions.database.e2e-spec.ts:665`) missed this because `/restore` ran only inside a conditional branch that was skipped when the concurrent report write won.

**Resolution verified**: Reproduced the HTTP 500 failure with a deterministic database regression test in `apps/api/test/admin-deletions.database.e2e-spec.ts:681-817`, added `AdminDeletionError` and `isDatabaseUnavailableError` handling to `mapAdminMutationError` (`apps/api/src/modules/admin/presentation/admin.controller.ts:143-162`), and verified 404 `NOT_FOUND` on missing page disable plus 409 `DELETION_IN_PROGRESS` on blocked page restore, report review, and creator restore.

## Minor

### 🟡 Manual retry resets at most 100 linked `REVIEW` cleanup tasks per transaction, `apps/api/src/modules/admin/infrastructure/prisma-admin-deletions.repository.ts:518`

**Problem**: Both `PrismaAdminDeletionsRepository.retry` (`take: 100`) and `PrismaDeletionWorkerRepository.releaseReviewTasks` (`take: 100` across up to 50 children in a parent retry batch) reset at most 100 linked `REVIEW` tasks in a single transaction while moving the affected job(s) out of `NEEDS_ATTENTION`.
**Why it matters**: If a page job or a 50 child creator retry batch has more than 100 linked `REVIEW` tasks, the overflow tasks stay in `REVIEW` until the worker moves the job back to `NEEDS_ATTENTION`, requiring another manual retry.
**Suggested fix**: Track or loop bounded task releases across worker ticks before clearing `NEEDS_ATTENTION` if large retry waves become common in practice.

### 🟡 Page list responses omit parent creator deletion job ID before child discovery, `apps/api/src/modules/admin/infrastructure/prisma-admin-operations.repository.ts:255`

**Problem**: `pages()` resolves `deletionJobId` only from `targetType: 'PAGE'` jobs, whereas `page()` detail (`lines 294-306`) falls back to the parent `CREATOR` job ID when a creator deletion barrier is active before child discovery creates the `PAGE` child job.
**Why it matters**: Brief list/detail inconsistency between creator deletion acceptance and the first child discovery tick (`deletionRequestedAt` is populated while `deletionJobId` is null in the list).
**Suggested fix**: Optionally query `CREATOR` deletion jobs for rows whose `creator.deletionRequestedAt` is set and no `PAGE` job exists yet.

### 🟡 Overview controller imports Prisma repository directly, `apps/api/src/modules/admin/presentation/admin-overview.controller.ts:28`

**Problem**: `AdminOverviewController` injects `PrismaAdminOverviewRepository` directly rather than an application port/service, differing from `AdminController`, `AdminOperationsController`, and `AdminDeletionsController`.
**Why it matters**: Minor consistency drift from the module's boundary pattern in `apps/api/src/modules/admin/AGENTS.md` (application layer itself remains clean).
**Suggested fix**: Introduce a thin `AdminOverviewService` and repository symbol if overview logic grows beyond a single read query.

### 🟡 Auth deletion barrier trigger function omits explicit `SET search_path`, `packages/database/prisma/migrations/20261119101500_creator_auth_deletion_barrier/migration.sql:25`

**Problem**: `letterly_reject_auth_write_during_creator_deletion()` references `"user"` and `letterly_linked_verification_user` without `SET search_path FROM CURRENT`, unlike `letterly_capture_admin_analytics()` in migration `20261119180000`.
**Why it matters**: Safe under the standard application schema search path, but more fragile if an operator session invokes auth writes with a restricted search path.
**Suggested fix**: Pin `SET search_path FROM CURRENT` in a future additive hardening migration if nondefault search paths are introduced.

### 🟡 Public page visits acquire `FOR UPDATE` locks on creator and page rows, `apps/api/src/modules/pages/infrastructure/prisma-page-analytics.repository.ts:40`

**Problem**: `recordVisit` uses `lockPageBarrier`, which locks both `"user"` and `"Page"` rows `FOR UPDATE` on every public page visit to serialize against deletion acceptance.
**Why it matters**: High concurrent traffic to a popular page or creator will serialize on those row locks in addition to the daily counter row in `DailyAdminMetrics`.
**Suggested fix**: Measure both row lock wait times and daily counter contention during the required staging load rehearsal documented in `docs/runbooks/admin-analytics-activation.md`; consider `FOR KEY SHARE` on `"user"` and `"Page"` in a later slice if visit contention appears under load.

## Nits

- ⚪ `apps/web/src/features/admin/admin-page-deletion.tsx:224`, formats `preview.expiresAt` as a raw ISO string instead of reusing `<AdminDate>`.
- ⚪ `apps/web/src/features/admin/admin-action-panel.tsx:85`, closes and refreshes the dialog on `STALE_MODERATION_VERSION`, while `DELETION_IN_PROGRESS` keeps the dialog open with a generic retry prompt until canceled.
- ⚪ `apps/api/src/modules/admin/infrastructure/prisma-admin-deletions.repository.ts:527`, resets linked `REVIEW` cleanup tasks without explicitly nulling `leaseOwner` and `leaseExpiresAt` (selection already requires null or expired leases, so behavior is safe, just inconsistent with `releaseReviewTasks`).

## Strengths

- Cleanup acknowledgements enforce fresh claim tokens, unchanged link sets, settlement gates, and database clock leases under a consistent User, Page, parent job, child job, task lock order; linking a new job invalidates existing ordinary cleanup claims.
- Every ordinary `MediaCleanup` producer across the page, image, and audio repositories acquires User then Page barrier locks and checks active or uncertain processing before mutating or removing records.
- Recovery evidence parsing enforces strict 16 KiB byte limits, duplicate JSON key rejection, canonical version 1 hashing, operator session revalidation inside the locking transaction, and transactional 730 day retention in bounded 100 job batches.
- Analytics capture uses `VOLATILE` triggers with `clock_timestamp()`, enforces `READ COMMITTED`, activates behind `SHARE ROW EXCLUSIVE` source table locks with a 10 second timeout, and preserves exact `BigInt` counts across API decimal strings, overview totals, and accessible chart tables.
- Admin styling is isolated under `[data-admin-root]` including Radix portals, query caches clear on access loss and unmount, email search keeps identity out of URLs and query keys, and desktop/mobile views avoid duplicating active controls in the accessibility tree.

## Test coverage and verification performed

Independently reproduced and verified on Node 24.20.0 against the isolated PostgreSQL 17 container (`letterly-admin-console-test`, loopback port 5544, database `letterly_admin_test`):

- 124/124 API integration tests passed across 8 suites (`admin-deletions.database.e2e-spec.ts` 15/15 including all 4 regression cases, `admin-operations.database.e2e-spec.ts`, `admin-creators.database.e2e-spec.ts`, `admin-overview.database.e2e-spec.ts`, `pages-image-cleanup.database.e2e-spec.ts`, `pages-audio-cleanup.database.e2e-spec.ts`, `admin-composition.e2e-spec.ts`, and `pages-public-analytics.e2e-spec.ts`).
- `pnpm check:commit` passed across all 7 lint packages (0 warnings), Prettier formatting checks, and all 7 TypeScript projects.
- `pnpm test` passed across all 5 test enabled workspaces (including 659/659 API unit tests across 89 suites).
- `pnpm build` passed across all 3 buildable workspace targets (`@letterly/database`, `api`, and `web`).
- Browser Playwright suites in `apps/web/e2e/admin-*.spec.ts` use mocked API responses (previously recorded as 65 passing checks with 1 intentional mobile skip); staging verification remains open under `Verify it` for live OAuth, deletion alert delivery, real R2 provider settlement and Azure Container Apps processor termination proof, `PageUploadGrant.creatorId` backfill and `NOT NULL` enforcement, and analytics activation under representative staging load.
