# Page persistence projection ownership verification

Date: 2026-10-04

Baseline commit: `5d1d71f`. Contract: [page persistence projection ownership](../specs/0022-repository-structure/0022-page-persistence-projections.md).

## Outcome

The pages repository now owns persistence and transaction orchestration. Nearby `page-selects.ts` owns its five selected database record shapes. `page-projections.ts` owns trusted owner resolution and owner/public record mapping, delegating template content behavior to the existing adapter registries. No port, provider, migration, route, query behavior, or template identity changes.

The repository moved from 1,557 to 1,115 lines when counted with the trailing newline. The projection file has 232 lines and the selection file 226. Size is evidence of the moved responsibility, not the reason to split additional aggregate operations.

## Direct equivalence

Both baseline and current files were parsed with the installed TypeScript compiler. The compiler printer normalized formatting and removed comments. Added export modifiers were removed for comparison.

All nine comparisons are equal: `ownerProjection`, `mapOwnerPage`, `mapPublicPage`, `ownerPageSelect`, `ownerPageWithAudioRetrySelect`, `lifecyclePageSelect`, `publicPageSelect`, `draftSummarySelect`, and the entire `PrismaPagesRepository` class. Therefore the selected fields and limits, mapper branches, repository methods, transaction callbacks, lock order, lifecycle writes, and public read recovery remain the same AST. Imports now point to their feature owners.

## Behavior and gates

All 81 existing repository tests pass. The four current production module HTTP suites pass 71 cases across public reading, drafts, publishing, and service composition. API build and repository lint, formatting, and type checks pass. Two obsolete test names in the first invocation were corrected using the current test inventory; no application failure was found in that invocation.

## Current structure audit

The [current inventory](2026-10-04-repository-current-inventory.json) indexes 1,092 paths: the 1,090 tracked paths and the two new source owners, with role, workspace, nearest context, bytes, hash, and source line counts. Its metadata describes the exact snapshot scope. This structural inventory does not certify a new semantic review of every current file.

An AST import scan covered all 68 current API feature application/domain source files and their 138 static imports, exports, and import type dependencies. It found no direct NestJS, database, Prisma, configuration, Express, Redis, authentication provider, storage SDK, infrastructure, or presentation dependency. This is direct boundary evidence, not proof about transitive package internals or all provider behavior.

The remaining closure work includes other large feature source/style ownership, broader shared UI acceptance, actual 200 percent browser zoom, final framework and requirement reconciliation, and complete contributor documentation. Earlier physical catalog/submission plans and media transaction tests are current evidence; remote CI and deployed provider evidence remain distinct. The parent restructuring stays In Progress.
