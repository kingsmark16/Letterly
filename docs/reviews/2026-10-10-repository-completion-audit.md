# Repository completion audit, 2026-10-10

Branch: `feat/repository-verification-baseline`

Route migration commit: `6344125` (`feat(web): migrate route tree to src/app and proxy to src/proxy.ts`)

## Outcome

The remaining repository organization and template extensibility work is verified on the feature branch. This audit reconciles all sixteen original findings from [the current state audit](2026-10-05-repository-current-state.md), checks the route migration against its before and after evidence, and records the current local gates. The final route change did not alter API, database, authentication, or template registration behavior.

The source branch is local. GitHub Actions has no run for it, and this audit does not claim a remote CI result. The original blueprint DOCX comparison remains skipped at the user's direction; the available [blueprint summary](../references/letterly-blueprint.md) and accepted repository decisions govern this work.

## Original finding reconciliation

| Finding | Current source and verification evidence | Result |
| --- | --- | --- |
| 1. Inward dependencies | API application and domain boundaries are enforced by area lint rules. The [transitive boundary review](2026-10-05-api-transitive-boundaries.md) records the source graph and Nest initialization evidence. Fresh type checks, lint, and API tests pass. | Resolved within the audited source and runtime scope. |
| 2. Broad pages controller | Owner and public endpoints are split among focused presentation controllers with route metadata and API coverage. The former combined controller is absent. | Resolved and covered by the current API test task. |
| 3. Shared primitive ownership | Shared Button, Card, Link, form, layout, status, and dialog primitives have one package owner; feature controls remain with their consumers. [The 0009 verification checklist](../specs/0009-design-system-ui-foundation/verify.md) records surface acceptance, keyboard behavior, forced colors, zoom, and reduced motion. | Resolved, including the manual accessibility review for criterion 41. |
| 4. Large files and repeated styles | [The independent cohesion review](2026-10-05-large-owner-cohesion-luna.md) reviewed all 50 production owners over 400 lines. Its two actionable findings are closed by the [cleanup queue ownership](2026-10-05-cleanup-repository-ownership.md) and [exact CSS repetition](2026-10-05-exact-css-repetition.md) reports. | Resolved for the reviewed owners and identified repetitions. |
| 5. Central API transport | Browser requests use the shared transport and safe response/error handling; feature endpoint owners, cancellation behavior, and tests are colocated. The fresh web unit task passes. | Resolved and covered by current tests. |
| 6. Broad pages directory | Editor, dashboard, media, responses, public presentation, and API concerns have feature folders and direct owners. The cohesion review supplies the large-owner check. | Resolved for the audited feature layout. |
| 7. Reusable content inside routes | Legal documents and shared presentation live under feature ownership. Route entries compose those owners; browser fixtures cover legal dialog and fallback behavior. | Resolved and covered by browser fixtures. |
| 8. Workspace task and CI coverage | Authored workspaces declare lint and type tasks; five workspaces provide unit tests. CI defines Prisma validation and migration, API integration, browser, performance, accessibility, and OpenAPI artifact steps. Fresh local unit, quality, build, schema, and fixture checks pass. | Resolved locally. Remote workflow execution remains a delivery check after a pull request is opened. |
| 9. Turborepo dependency and cache graph | Workspace tasks declare dependency transit and external template scaffold inputs. The earlier controlled cache invalidation evidence remains applicable because those task declarations were not changed by the route migration. | Resolved; cache behavior was previously measured. |
| 10. Compiler and lint consistency | The API uses the shared strict Nest TypeScript baseline and read only lint rules. The current root quality gate passes lint and type checks across the workspaces. | Resolved and freshly checked. |
| 11. Formatting and commit gates | The root format check covers maintained source and configuration. Husky runs the sequential quality gate and commitlint checks conventional messages. The current commit gate and prior milestone commit hooks pass. | Resolved and freshly checked. |
| 12. Smaller API feature boundaries | Catalog and admin use application ports and infrastructure adapters; the auth integration retains the provider structure required by its boundary. The API boundary review and tests record these decisions. | Resolved and reviewed. |
| 13. Split web roots | Routes now live under `apps/web/src/app`, with `apps/web/src/proxy.ts` beside the route tree. The migration preserved all 34 route manifest entries. The [production runtime comparison](2026-10-09-route-tree-runtime-comparison.md) found zero differences across 23 representative GET requests. | Resolved and verified at runtime. |
| 14. Onboarding and durable context | Root and workspace guides document ownership, setup, commands, registration, and verification limits. Active web context and design-spec path references now point to `src/app`; historical reports retain paths that describe their original snapshots. The source blueprint document remains skipped as noted above. | Resolved within the available project context. |
| 15. Unused candidates | Earlier caller, route, style, and cascade reviews support the removed application components and stylesheet rules. The exact CSS scan found no remaining candidates under its documented matching rules. | Resolved for the reviewed cleanup candidates. |
| 16. Compatibility and history | Comparing the branch with `origin/main` shows two added database migrations and no modified or deleted migration files. Legacy redirects, package exports, pinned identities, and saved template-version dispatch remain covered by source and fixture tests. | Preserved and rechecked. |

## Template growth and API contracts

The [version retention spec](../specs/0022-repository-structure/0022-template-version-retention.md) reconciles its six acceptance criteria against exact API registration maps, grouped category provisioning, immutable version identities, safe scaffolding, and pinned editor/public dispatch. The [scaffold contract](../specs/0022-repository-structure/0022-template-scaffold-generator.md) describes the unregistered-only contribution path. Tests retain old versions for published pages while allowing later versions to coexist. Adding a new content model still requires an explicit implementation; the registration system does not generate arbitrary business behavior.

The [readiness contract](../specs/0022-repository-structure/0022-api-readiness-contract.md) records PostgreSQL and critical Redis checks, generic failure responses, shutdown behavior, and the migration release gate. The [OpenAPI contract](../specs/0022-repository-structure/0022-api-openapi-contract.md) records the nonproduction route and CI artifact behavior. Their implementation and focused coverage are in the branch; live production providers were not exercised by the web fixture suite.

## Checks run for this closeout

- `pnpm.cmd check:commit`: passed. Seven lint tasks, formatting check, and seven type-check tasks succeeded.
- `pnpm.cmd exec turbo run test --force --output-logs=errors-only`: passed. Five test-enabled workspace tasks ran without Turbo cache.
- `pnpm.cmd exec turbo run build --force --output-logs=errors-only`: passed. Three build tasks ran without Turbo cache.
- `pnpm.cmd --filter @letterly/database validate`: passed. Prisma reports the schema valid.
- `pnpm.cmd --filter web test:e2e:fixtures`: passed. The production fixture app built and the desktop/mobile suite reported 292 passed, 12 intentional skips, and zero failures across 304 cases.
- The route migration's [before and after production comparison](2026-10-09-route-tree-runtime-comparison.md) records 34 matching route entries, zero differences across 23 representative GET requests, and the same 292 passing migrated browser fixture cases.

## Limits

The fixture API and mocked sessions are not PostgreSQL, Better Auth, Redis, or R2. This run therefore proves the web route tree and browser behavior against the configured fixture contract, not production provider connectivity. The workflow's database-backed API integration step and remote GitHub Actions have not been rerun as part of this closeout. The route comparison also documents the fixture's shared 500 for an unknown public slug and the authenticated server-shell limits; those are not migration differences.

The project `pnpm format:check` intentionally checks maintained source and configuration rather than Markdown. Historical audits and reports remain unchanged so their original evidence stays attributable to the revision they inspected.
