# Repository current state audit, 2026-10-05

## Outcome and scope

This audit reconciles the original sixteen findings with current source at `755d8d4`. It does not mark the repository objective complete. Shared UI acceptance, remaining cohesion review, and unresolved product/specification conflicts still need explicit closure.

[The inventory and scan evidence](2026-10-05-repository-current-state-audit.json) records every one of the 1,158 tracked files, its size and hash, workspace tasks, runtime workspace dependencies, migration preservation, relative imports, and exact stylesheet import owners. It inventories 1,114 recognized text files and 683 source/style files. Import analysis covers 639 code files for relative paths and 371 production source modules for selected dependency restrictions, with 1,664 static or literal import edges. An additional scan checks 127 static imports in all 44 root web route modules for database/API implementation dependencies, with no issue found. These are structural checks, not a semantic review of every line or visual inspection of binary assets.

## Original finding reconciliation

| Finding | Current evidence | Status |
| --- | --- | --- |
| 1. Inward dependencies | Current selected boundary scan reports no violations. The [transitive audit](2026-10-05-api-transitive-boundaries.md) separately follows API application/domain dependencies and records full Nest application initialization. | Implemented and verified within the stated static and runtime scopes |
| 2. Combined pages controller | Fourteen owner/public controllers live in presentation; the combined file is absent. Current API unit suites include their route metadata tests. | Implemented and verified |
| 3. Shared primitive ownership | Canonical shared controls, feature owned tabs/chart, direct imports, token adapters, dialog focus checks, and [actual browser zoom](2026-10-04-actual-browser-zoom.md) are recorded. | Ownership implemented; wider shared UI acceptance remains open in scope 20 |
| 4. Large files | Legal/landing sections, template pagination/opening/gallery, editor sections, image preview/state, controller families, persistence projections, and repository/browser suites now have focused owners. | Substantial progress; remaining large source and stylesheet cohesion review stays open |
| 5. Central API client | Feature endpoint files consume central transport; the old endpoint barrel is absent. Current relative imports resolve, and cancellation coverage is included in web tests. | Implemented and verified |
| 6. Broad pages folder | Editor, dashboard, media, responses, public, and API groups have explicit owners. Pure templates and catalog preview own their presentation. | Grouping implemented; final cohesion review remains with finding 4 |
| 7. Route owned legal content | Reusable legal bodies/styles have feature owners; route wrappers and landing dialogs import them. | Implemented, with earlier browser evidence |
| 8. Workspace task coverage | Seven authored workspaces have lint; five have meaningful unit suites. CI declares root gates, Prisma validation, isolated integration, browser smoke, UI/zoom checks, and OpenAPI generation. | Local gates verified; remote CI execution remains unobserved |
| 9. Dependency aware test caching | `test` depends on the transit graph; template tests declare external scaffold inputs. The original controlled hash change/restoration evidence remains valid for the unchanged task contract. | Implemented and previously measured |
| 10. Compiler/lint consistency | API uses the shared strict Nest baseline, read only lint, explicit fix command, and feature boundary restrictions. | Implemented; current unit/build/type gates pass |
| 11. Formatting and commit gates | Root formatting covers maintained source/configuration; Husky runs sequential lint/format/types and commitlint. Actual milestone commits pass the hook. | Implemented and locally verified |
| 12. Small API module conventions | Catalog/admin use plain application ports and infrastructure adapters. The [API boundary review](2026-10-05-api-inward-boundaries.md) records why the small auth integration keeps its provider structure. | Implemented and reviewed |
| 13. Split web roots | Catalog reader/tests belong to the feature. Root `app` remains deliberate, supported by the parent decision; moving it is optional and separate. | Required ownership move implemented |
| 14. Onboarding/context | Registration guide, root/app READMEs, contribution guide, Node/pnpm setup, readiness/OpenAPI contracts, and release runbook exist. This pass repairs eleven skill link paths and contradictory auth guidance. | Current corrections complete; unavailable original blueprint and final context reconciliation remain |
| 15. Unused candidates | Verified unused source components and obsolete stylesheet rules were removed; public SVG paths remain deliberate compatibility assets. | Implemented, with caller and cascade evidence |
| 16. Compatibility/history | All 19 baseline migration files retain identical Git blobs; current migration directory has 21 files. Both legacy letter edit/response routes still redirect to canonical page routes. | Preserved and rechecked |

## Template growth and contributor checks

Both documented dry runs succeeded without creating their three planned files: a new category/template v1 and retained Secret Letter v2. The current guide names immutable keys, exact API/web bindings, literal lazy imports, explicit eligibility, deliberate provisioning, and retirement without removing released implementations. Unit coverage includes scaffold safety, identity validation, transactional seed conflicts, and exact version composition. This does not activate new launch categories or prove live provisioning in production.

The local Markdown path check inspected 37 contributor/context documents and 300 links before this milestone. Eleven web skill pointers used one extra parent traversal; they now resolve to the installed repository skills. The remaining missing target is the authoritative blueprint DOCX. You asked to skip locating/checking the original on 2026-10-05. Work continues against the available working blueprint reference. Requirements omitted from that summary remain unverified against the original; this document check is deliberately skipped, not a pending input blocker.

The public sign in/sign up shell currently offers Google/Facebook and labels email/password Coming soon. The workspace and feature overview now agree with the existing feature rule and rendered source. Credential/recovery implementations remain in place.

## Gates and limits

- `pnpm test`: all five configured suites passed, representing 943 tests (API 660, web 121, templates 110, database seed 14, UI 38). Web and database tasks used valid local Turbo cache entries; the other three ran freshly. The initial restricted run failed in Vitest/esbuild startup; the same gate passed with required child process access, without a code change.
- `pnpm build`: all three build tasks ran freshly and passed, restoring the normal environment production build after fixture runs.
- `pnpm check-types`: seven workspace tasks passed through the local cache. A direct `pnpm --filter web check-types` then freshly regenerated route types and passed.
- No unresolved relative import was found among 1,585 checked imports/reexports. No cycle was found among ten declared runtime workspace edges. These checks do not prove absence of dynamic runtime or provider cycles; earlier full Nest initialization supplies separate evidence.
- Root `pnpm check:commit` passed lint, formatting, and workspace type checks.
- No API/browser tests were rerun for these documentation edits. Existing milestone reports retain their actual fixture, live provider, database, and browser scopes.

The latest landing run has an unresolved intermittent WebKit preview failure followed by focused passing reruns. The retained YouTube presentation conflicts with accepted spec 0020, and permanent database credential readiness classification remains undecided. Scope also records existing gallery and opening control acceptance gaps. This audit preserves those facts and does not certify complete launch acceptance.

## Applicable skill mapping

NestJS `arch-feature-modules`, `arch-single-responsibility`, and `arch-use-repository-pattern` guide feature ownership; the stronger project inward boundary rule is checked separately. Vercel React `bundle-barrel-imports` and `bundle-analyzable-paths` guide direct owners and literal template loaders, without a new bundle performance claim. Turborepo package task ownership and transit dependencies are inspected through current manifests/configuration. Architecture owns this reconciliation evidence; sync makes only surgical context corrections.

## Next required work

Spec 0009 AC-9, its value source table, build step, and verification checklist still describe the initial `/api/v1/categories` plus `/api/v1/templates?categoryKey=confession` pair. Current `getLandingCatalog` reads and validates `/api/v1/catalog/overview`, as approved by the later [catalog growth decision](../specs/0022-repository-structure/0022-catalog-growth-pagination.md). Reconcile that stale active criterion with the later decision before claiming shared UI acceptance; retain the historical two-read baseline as history.

Complete the shared UI consumer acceptance review and remaining large owner cohesion review, reconcile the final contributor/specification pointers, and run a requirement by requirement completion audit. Resolve the pending behavior/classification decisions through their owning specifications. The original blueprint comparison is skipped at your direction. Remote production deployment and optional route root relocation are not silently added to this structure milestone.
