# Pinned template metadata verification

Date: 2026-10-03

Spec: [template version registration and retention](../specs/0022-repository-structure/0022-template-version-retention.md), version specific metadata portion of AC-5. The broader saved page proof remains incomplete.

Implementation self verification, not an independent review.

## Problem and resulting behavior

The seed now chooses shared family metadata from the highest eligible version. Owner details and dashboard summaries previously selected Template.name from that mutable database family row. Provisioning a later version could therefore relabel an existing page even though its templateVersionId, registry key, and version remained unchanged.

Both projections now use the name on the trusted descriptor resolved from the page's saved registry key, renderer key, and version. Their Prisma selections no longer fetch family name. The shared catalog resolver returns the descriptor and its original definition together, using the existing exact identity matching rules. Inactive retained descriptors remain readable. Missing or mismatched owner definitions use the existing unavailable definition error, with no fallback to current family metadata or the newest version.

Public web metadata already uses exact presentation registrations through getPublicWebTemplate. This change does not alter its components, imports, contracts, or payloads. The owner response shape is unchanged, and both launch names remain their canonical v1 names.

## Evidence

- Five shared resolver cases exercise exact launch descriptors, retired v1 alongside eligible v2, separate version names, mismatch and unknown identity rejection, explicitly missing identity, category isolation, ambiguous descriptors, empty inputs, and unchanged source entries.
- Two actual PrismaPagesRepository cases use published page records for the launch templates. Their mocked database family name represents later v2 metadata. Both findOwnedPage and listPages retain the correct v1 descriptor name, saved identity, and published status. The database fixture name remains unchanged, and neither read invokes Page update operations.
- All 81 repository unit cases pass, including existing owner/public identity rejection, draft persistence, publication, projection, ownership, media, and lifecycle cases.
- Full API integration and repository unit gates pass after the production projection change. No live seed, migration, or activation ran.

| Command | Outcome |
| --- | --- |
| Targeted PrismaPagesRepository unit suite | PASS, 81 cases |
| `pnpm --filter @letterly/templates test` | PASS, 98 cases |
| `pnpm lint` | PASS, seven tasks |
| `pnpm format:check` | PASS |
| `pnpm check-types --concurrency=2` | PASS, seven tasks |
| Final API type check and focused repository test lint | PASS after extending retention cases to published page fixtures |
| `pnpm test` | PASS, 725 tests across five workspaces, including 559 API cases in 76 suites |
| `pnpm build` | PASS, fresh Prisma generation, NestJS build, and Next.js production build |
| `pnpm --filter api test:e2e --runInBand` | PASS, 595 cases; seven skipped, 25 passing suites and four skipped suites |
| `git diff --check` | PASS |

The first type check invocation exited with code one without a compiler diagnostic in its captured output or workspace logs. Repeating the same task set with concurrency limited to two succeeded without a source fix; six tasks reused successful current input cache entries and the API task ran successfully. The subsequent fresh NestJS and Next.js builds also passed. No specific cause for the first exit is established.

## Limits and continuation

Repository read cases use injected query mocks. The v1/v2 descriptor coexistence case exercises the shared resolver, not a complete future v2 editor or persistence implementation. Real PostgreSQL provisioning rollback remains unproven by this milestone, and seven database dependent integration cases remain skipped.

Browser journeys were not rerun because no web runtime source or launch response shape changed. The preceding provisioning milestone recorded 72 passing desktop/mobile fixture cases; those are prior evidence. The next stage must still prove creation, updates, owner/public projection, publication, editor/public dispatch, and preview selection using isolated later version implementations through their actual shared paths. Keep the version retention spec and overall repository restructuring In Progress.
