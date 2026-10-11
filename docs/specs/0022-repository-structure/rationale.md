# Repository structure review

**Date**: 2026-10-02 (Asia/Manila)
**Branch**: `feat/ui-fixes-follow-up`
**Commit reviewed**: `16986d0e4083f84314c4e3c773010bc988b7c0f6`
**Scope**: Folder and file ownership, dependency direction, maintainability, and migration readiness.

## Context

You asked for a careful review of the full repository and a structure that is maintainable, scalable, and consistent with industry practice. The project already separates the web application, API, shared contracts, pure template definitions, database, configuration, and interface primitives. The larger issue is that responsibilities inside those boundaries have accumulated in broad files and folders.

The recommended response is an incremental ownership migration. A new framework, a new monorepo tool, or more deployable services would add cost without solving the specific problems found here. The blueprint explicitly excludes microservices and other distributed infrastructure from the MVP.

## Review coverage and limits

The baseline contained **627 tracked files**, including **587 text files**, **40 binary assets**, **363 JavaScript or TypeScript files**, and **82 files matching test or spec naming conventions**. Every tracked file is listed below. Counts include declarations, test helpers, configuration, docs, assets, and the dependency lockfile. Line counts include blank lines.

The review used a full tracked file inventory and structural content scans of all text files. Those scans covered imports, exports, directory ownership, file sizes, repeated content, JSON validity, dependency direction, test discovery, manifest scripts, and documentation headings and status. The principal architecture, configuration, route, transport, and ownership problems received closer source inspection. Read only scouts independently inspected the API and web areas. This is **not** a claim that every line received a semantic correctness audit or that every binary asset was visually inspected.

The working tree was clean at the start. The review produced only this evidence and the proposed structure document. It did not move source files, change dependencies, run database commands, start services, or alter runtime configuration.

Local directories were also identified. Dependency, generated, build, cache, browser artifact, and personal agent directories were excluded from maintained source review: `node_modules`, `.pnpm-store`, `.git`, `.next`, `dist`, `generated`, `.turbo`, `output`, `.playwright-cli`, `.playwright-mcp`, `test-results`, `.agents`, `.claude`, and `.codex`. These are separate from the tracked repository. The local `.env` files, `.neon`, personal test preferences, editor settings, generated `next-env.d.ts`, and debug log were identified by path without reading credential contents. No deletion is proposed merely because a file is local.

The authoritative blueprint DOCX referenced by `AGENTS.md` is absent from this checkout. The review uses `docs/references/letterly-blueprint.md`, including the engineering requirements in sections 13 through 19 and its structure rules. Requirements omitted from that summary remain unverified against the original document.

## Workspace findings

| Area                                | Tracked files | Assessment                                                                                 |
| ----------------------------------- | ------------: | ------------------------------------------------------------------------------------------ |
| Repository root and GitHub workflow |            13 | Appropriate workspace root, weak onboarding and incomplete check orchestration             |
| `apps/api`                          |           189 | Good feature seams, broad pages transport and repository files, application boundary drift |
| `apps/web`                          |           259 | Good template and feature foundation, broad pages component folder and split ownership     |
| `packages/config`                   |             5 | Keep package, split API and web implementation only as needed                              |
| `packages/contracts`                |            17 | Keep pure Zod boundary, reconsider server ports in the root barrel                         |
| `packages/database`                 |            30 | Keep schema, migrations, client boundary, and seed ownership                               |
| `packages/eslint-config`            |             7 | Keep package, extend it to enforce actual repository boundaries                            |
| `packages/templates`                |            10 | Keep framework independent definitions, wire meaningful local checks                       |
| `packages/typescript-config`        |             6 | Keep package, reconcile API compiler baseline                                              |
| `packages/ui`                       |            23 | Keep shared primitives, resolve duplicate app primitives and stale accepted spec           |
| `docs`                              |            68 | Useful durable history, some status and implementation drift, needs navigation             |

## Prioritized findings

### 1. Application dependencies contradict the recorded boundary (high)

**Evidence:** `apps/api/src/modules/pages/application/page.service.ts:1` imports NestJS. Line 2 imports database recovery infrastructure. Twelve production files under application import `@nestjs/common`. `page-media.service.ts:9` imports the shared storage adapter contract from infrastructure and imports the concrete image processor. `page-password.service.ts:10` imports unlock HTTP helpers. `application/public-availability.ts:1` imports Prisma types and returns `Prisma.PageWhereInput`.

**Why it matters:** The folder name promises framework independent application logic, but changing the HTTP framework, processor, or persistence query can affect that logic directly. It also makes plain use case tests harder and encourages future imports in the wrong direction.

**Recommendation:** Preserve repository interfaces and plain domain types. Construct plain application use cases in Nest module provider factories. Introduce application owned ports for media processing, storage, unlock operations, and transient failure classification where actually needed. Put the Prisma query builder in infrastructure. Preserve all publication predicates. This is substantive dependency cleanup, not simply moving files into new directories.

### 2. The pages controller combines unrelated transport responsibilities (high)

**Evidence:** `apps/api/src/modules/pages/pages.controller.ts` has 2,903 lines. It contains `PagesController` at line 665 and `PublicPagesController` at line 1782, with 46 route decorators across lifecycle, questions, journeys, analytics, media, passwords, reports, visits, and submissions.

**Why it matters:** Reviewing an upload change requires navigating a file that also controls anonymous unlock and private responses. Shared helpers and error handling make accidental coupling easier. Merely moving the whole file into `presentation` would improve naming but leave the concentration intact.

**Recommendation:** Put cohesive controllers under `pages/presentation/controllers`. Separate owner lifecycle, media, questions, journeys, submissions, analytics, and public operations gradually. Keep route strings and behavior stable. Verify route specificity, guards, throttles, safe error mapping, visitor identity, cookie handling, and streaming behavior for each extraction.

### 3. Web primitive ownership conflicts with accepted spec 0009 (high)

**Evidence:** `packages/ui/src/button.tsx` and `card.tsx` coexist with `apps/web/src/components/ui/button.tsx` and `card.tsx`. Consumers use both systems. The accepted design system spec requires canonical primitives in the shared package and explicitly says there should be no app local duplicate. The package currently uses CSS Modules while the accepted spec describes a Tailwind migration and generator setup that are not fully reflected in the tree.

**Why it matters:** There are two places to change default appearance and behavior. The package button owns loading semantics that a visual substitution could lose. An accepted spec also cannot serve as a reliable migration contract when it describes a different implementation.

**Recommendation:** Reconcile spec 0009 before consolidation. Prefer shared ownership for Button and Card, with compatibility adapters as needed. Keep chart and web specific composition local. Verify accessibility and loading behavior rather than merging components by name alone.

### 4. Large files need responsibility based extraction (high)

| File                                                                        | Lines | Candidate responsibility splits                                           |
| --------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------- |
| `apps/web/app/page.module.css`                                              | 7,430 | Landing section styles, component styles, responsive variants             |
| `apps/web/src/templates/secret-letter/renderer.module.css`                  | 3,988 | Envelope, letter, gallery, locked presentation, motion                    |
| `apps/web/src/features/pages/components/draft-editor.module.css`            | 3,075 | Editor shell, content controls, sharing, overview                         |
| `apps/api/src/modules/pages/pages.controller.ts`                            | 2,903 | Cohesive HTTP controllers                                                 |
| `apps/web/e2e/public-secret-letter.spec.ts`                                 | 2,475 | Public viewing, unlock, media, motion journeys and fixtures               |
| `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts`      | 1,865 | Lifecycle queries, projections, shared transaction helpers                |
| `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.spec.ts` | 1,740 | Matching adapter suites and common test builders                          |
| `apps/web/src/templates/secret-letter/audio-player.module.css`              | 1,458 | Player controls and media presentation                                    |
| `apps/web/src/features/pages/components/draft-editor.tsx`                   | 1,369 | Form state, save coordination, shell, content sections                    |
| `apps/web/src/templates/secret-letter/renderer.tsx`                         | 1,297 | Pagination, opening experience, letter view, optional media               |
| `apps/web/src/features/pages/components/image-editor.tsx`                   | 1,089 | Upload coordination, preview, list state, controls                        |
| `apps/web/src/templates/secret-letter/audio-player.tsx`                     | 1,072 | YouTube adapter, playback synchronization, controls                       |
| `apps/web/app/page.tsx`                                                     |   964 | Landing feature sections and reusable legal documents                     |
| `apps/api/src/modules/admin/admin-moderation.repository.ts`                 |   920 | Repository port and Prisma implementation, cohesive moderation operations |
| `apps/web/src/lib/api-client.ts`                                            |   865 | Shared transport and feature endpoint modules                             |

**Why it matters:** These sizes indicate concentrated responsibilities and expensive reviews. A long schema or cohesive test suite is not automatically wrong. There should be no arbitrary line limit that forces related invariants into scattered helpers.

**Recommendation:** Extract one coherent responsibility at a time. Preserve CSS cascade order and transaction boundaries. The landing stylesheet has 756 selector blocks and 379 unique selector strings in a simple scan; repeats can be valid responsive or state rules, so that count is a review signal, not proof of dead CSS.

### 5. The API client combines transport with most product endpoints (medium)

**Evidence:** `apps/web/src/lib/api-client.ts` owns admin actions starting at line 170, Axios clients at lines 278 and 288, shared request handling at line 337, and page, media, questions, journey, publication, submission, and analytics functions throughout the remainder.

**Why it matters:** Feature changes modify one shared file and spread schema imports across unrelated concerns. You need centralized transport, but you do not need one centralized file for every endpoint.

**Recommendation:** Retain shared clients and safe errors in `src/lib/api`. Move endpoint functions and query keys to their owning feature. Maintain a temporary compatibility export while callers move. Preserve signed upload behavior, checksums, response validation, and cancellation.

### 6. The pages web folder has become a broad ownership bucket (medium)

**Evidence:** `src/features/pages/components` includes creator navigation, workspace home and FAQs, draft editing, private response dashboards, public unlock and report forms, audio and image editing, and Choose Your Heart editor and renderer code. `src/components/template-preview-content.tsx` also imports template rendering, a visitor response form, and a catalog draft action.

**Why it matters:** The path no longer tells you which use case owns a file. Generic components contain product orchestration, while named template behavior is outside its template folder.

**Recommendation:** Group pages by editor, dashboard, public, responses, and media responsibilities. Move catalog preview orchestration into catalog ownership. Place Choose Your Heart presentation under its template and provide values and callbacks from page orchestration. Do not create a separate package for every group.

### 7. Reusable legal content is exported from route entry files (medium)

**Evidence:** `apps/web/app/page.tsx:23` imports the Privacy route and line 24 imports the Terms route. Those route modules export `PrivacyDocument` and `TermsDocument`. Privacy imports the Terms route stylesheet at `app/privacy/page.tsx:5`.

**Why it matters:** A route becomes a component library for another route. Its metadata, data loading, and reusable document presentation can no longer evolve independently.

**Recommendation:** Extract shared document bodies and styles to `src/features/legal`. Preserve the route wrappers, metadata, URLs, and landing dialogs. This is a useful first narrow migration because its callers and browser behavior are easy to name.

### 8. Validation tasks do not cover every authored workspace (medium)

**Evidence:** The Turbo dry run reports no lint script for config, contracts, database, or templates. Only API and UI have `test` scripts. Web has `test:e2e` but no `test`. `apps/web/lib/catalog.test.ts` is documented as a command executed through the API workspace, and `next.config.test.mjs` is outside a standard web unit command. CI invokes only API unit tests and one Playwright smoke file, so UI Vitest tests are not included by that CI step. Prisma generation and migration deployment run, but explicit `prisma validate` is not a CI step.

**Why it matters:** A passing root command can look more comprehensive than it is. There is no meaningful migration gate unless its real coverage is understood.

**Recommendation:** Add lint commands to the shared authored TypeScript packages, wire web unit/config tests into web ownership, and run root unit tests in CI. Keep integration and browser suites explicit. Pure template rules are currently covered in some API specs, but the template package has no local suite; move or add meaningful package tests as that ownership migrates. Do not duplicate tests merely to populate every folder.

### 9. Unit test caching lacks dependency source propagation (medium)

**Evidence:** Root `turbo.json:25` defines `test` with no dependency tasks. The dry run shows `api#test` has no task dependencies and its input file map is limited to the API workspace. Those tests import shared template and contract source.

**Why it matters:** A shared source change needs to invalidate tests that consume it. This task definition does not explicitly propagate those source hashes through the graph. A successful cached result could therefore fail to represent changed shared validation.

**Recommendation:** Model upstream source propagation with a transit task or suitable dependencies, then verify the actual hash changes with a controlled shared source edit during implementation. This review established the configuration gap; it did not reproduce a stale cache hit. Treat database integration tests separately from cacheable unit tests.

### 10. Lint and compiler conventions are inconsistent (medium)

**Evidence:** The API lint command includes `--fix`. API ESLint disables `no-explicit-any` and does not extend the shared ESLint package. The API compiler enables individual strict options but does not enable `strict: true` or extend the shared compiler baseline. The shared ESLint base loads `eslint-plugin-only-warn`; web and UI compensate with zero warning limits. UI has some restricted imports, but application layer restrictions are not enforced across the repository.

**Why it matters:** A verification command can mutate files. Architecture rules depend on reviewers remembering them. Different workspaces also get different error and strictness behavior.

**Recommendation:** Separate `lint` and `lint:fix`. Add a Nest specific shared configuration and file scoped boundary rules. Reconcile strict compiler settings deliberately, preserving decorator and module requirements. Do not convert every warning to an error without measuring the resulting work.

### 11. Formatting and commit gate configuration are incomplete (medium)

**Evidence:** Root `format` writes only TypeScript, TSX, and Markdown. There is no root `format:check` or `.prettierignore`. The API owns a `.prettierrc`; there is no comparable repository formatting baseline. The tracked tree has no commit hook or commit message gate configuration. CI does not run a separate formatting check.

**Why it matters:** The recorded selected commit gate is stronger than the installed configuration. A broad write glob also lacks an explicit policy for generated files and configuration extensions.

**Recommendation:** Define a repository formatting baseline, intended extensions, and explicit ignores. Add a read only check to CI. Document whether commit enforcement is installed tooling or a convention. No additional hook dependency was selected or installed during this review.

### 12. Small API modules have different layer conventions (medium)

**Evidence:** Pages has explicit layers. Admin places services, repository interfaces, Prisma implementations, guards, and controllers together. `admin-reports.repository.ts:17` defines its port and line 99 defines its Prisma implementation. Catalog service injects Prisma and combines querying, registry resolution, and contract parsing.

**Why it matters:** A new contributor has to inspect contents to discover the responsibility of a service or repository file. Applying the pages rule to one module and a flat adapter pattern to another obscures the intended boundary.

**Recommendation:** Separate admin ports from implementations and use application, infrastructure, and presentation directories as those responsibilities are moved. Extract catalog persistence when changing that boundary. Keep simple modules small; do not impose empty layers on every feature.

### 13. Web sources are split between root and `src` (low)

**Evidence:** Routes are under `apps/web/app`, the server catalog reader is under `apps/web/lib`, and most helpers are under `src/lib`. Route imports use long relative traversals. The web alias already points `@/*` to `src/*`.

**Why it matters:** The split adds navigation and import maintenance cost, but it is a supported Next.js structure and is not itself a defect.

**Recommendation:** Move the catalog reader to feature ownership first. Keep root routes until a dedicated `src/app` migration. That migration must update fonts, images, CSS discovery, proxy location, tests, and documented paths. Empty `stores` or `types` directories are unnecessary.

### 14. Onboarding and durable docs need reconciliation (medium)

**Evidence:** Root README contains only the project name. API and web READMEs are starter documentation. Root Node engine permits `>=18`, while the project rules and CI use Node 24. Scope marks stack and architecture and YouTube music done, while specs 0001 and 0020 say In Progress. Spec 0001 also records earlier social only authentication. The authoritative DOCX is absent. A stock Docker Compose file exists for Redis, but tracked app Dockerfiles do not exist despite the original scaffold spec discussing images.

**Why it matters:** Setup and architecture documents must distinguish the current system from an earlier plan. Otherwise a new developer follows commands or assumptions that do not describe this checkout.

**Recommendation:** Add root navigation, environment setup, workspace commands, real test coverage, and the request flow. Replace starter READMEs with app specific guides. Reconcile statuses and superseded decisions through the owning workflow. Keep historical reviews and migrations intact. Restore access to the authoritative blueprint or explicitly document its location.

### 15. Cleanup candidates need caller verification (low)

**Evidence:** Static import searches found no consumers for `GlareHover.tsx`, `SpotlightCard.tsx`, `hero-still-life.tsx`, local badge, or local separator. Public starter SVGs remain. Reusable animation components use PascalCase filenames and default exports, while most authored reusable components use kebab case and named exports.

**Why it matters:** Unused starter code makes the supported component set unclear. Static imports cannot prove a public URL asset unused, and external or string based consumers may not be visible.

**Recommendation:** Treat these as candidates, not confirmed deletion targets. Search imports, URL strings, docs, CSS, and runtime references before removal. Normalize naming when touching the supported components. Keep font licenses with their assets.

**Closure check (2026-10-04):** Repository-wide searches found only the definitions and historical audit entries for `GlareHover`, `SpotlightCard`, and the dashboard still life. No import or dynamic path, route use, matching CSS selector, test, or other documentation reference was found. The three unused source files were removed. Searches also found no in-repository URL references to the seven starter SVGs. They remain under `public/` because removing public paths could break consumers outside this repository.

### 16. Legacy routes and migration history should be preserved (informational)

**Evidence:** `/dashboard/letters/[pageId]/edit` and `/responses` explicitly redirect to `/dashboard/pages/...`. Their loading files duplicate the corresponding canonical route loaders. `return-path.ts` accepts both prefixes. Prisma migrations represent applied schema history, including SQL behavior that should not be recreated by folder cleanup.

**Recommendation:** Retain compatibility redirects until a deliberate deprecation. Share loading presentation if useful, without deleting the old URLs. Keep the Prisma schema and migration sequence in the database package. An imported asset belongs under assets; a stable URL asset belongs under public. Neither location needs consolidation for appearance alone.

## What the repository already gets right

The outer application boundaries fit the product. Contracts and template definitions are framework independent. Database access has a shared client boundary rather than one client per feature. API repository interfaces and adapters already provide useful seams. Unit tests are colocated with many API files, integration tests live at the API edge, and browser journeys live at the web edge. Template implementations are substantially independent. Private operations and public projection rules have explicit infrastructure and application support.

A simple static relative import screen found no cycles. This is not proof of absence of all cycles, because package exports, dynamic imports, and runtime dependency injection need additional analysis. The inspected package manifests did not reveal an application importing another application or the web importing the database.

## Options considered

1. **Gradual ownership migration with enforcement, recommended.** Keeps changes reviewable and preserves the existing stack. Costs several milestones and temporary compatibility exports.
2. **One complete restructuring change.** Produces a consistent tree sooner. Carries a large route, DI, CSS, import, and test blast radius and makes regressions harder to localize.
3. **Document conventions only.** Adds very little implementation risk. Leaves the observed dependency violations and verification gaps in place.

## Rationale

The code already has feature modules, contracts, templates, and shared adapters. Improving those seams is cheaper than replacing them. The first thin migration should prove that files, callers, tests, and user behavior can move together. Later migrations can repeat that pattern. Prioritize inward dependency violations and verification coverage before cosmetic package names or folders.

The recommendation concerns development and team scalability. Runtime scale needs separate measurements of database queries, upload processing, cache behavior, and operational capacity. Folder depth is not a throughput optimization.

## Verification performed

The review ran a Git tracked file census, parsed all tracked JSON files successfully, checked manifests and workspace dependency direction, scanned relative imports, examined actual test discovery and script coverage, and ran `pnpm.cmd exec turbo run lint check-types test --dry=json` using Turbo 2.10.8. That command planned tasks without executing them. Its task commands and inputs confirmed the missing scripts and test graph configuration described above.

No lint, type check, unit suite, build, integration suite, or browser journey was executed for application behavior. API lint currently writes fixes, so it would be inappropriate to present it as a read only review command. The project remains behaviorally unverified in this review. Implementation milestones need the actual checks described in the proposal.

## References

Project sources: root and nested `AGENTS.md`, the blueprint working reference, specs 0001 and 0009, scope, package manifests, Turbo configuration, and the GitHub workflow. Some of these disagree; the findings distinguish recorded intentions from installed code.

The proposed structure applies feature ownership, separation of concerns, dependency inversion, explicit package interfaces, and incremental migration. These are architectural recommendations fitted to this codebase, not a claim that one universal folder tree is an industry standard.

Both route root placements are supported by [Next.js source folder documentation](https://nextjs.org/docs/app/api-reference/file-conventions/src-folder). Internal workspace packages and their exported interfaces are described by [Turborepo internal package guidance](https://turborepo.dev/docs/crafting-your-repository/creating-an-internal-package). Feature composition and controller delegation are described by [NestJS modules](https://docs.nestjs.com/modules) and [NestJS providers](https://docs.nestjs.com/providers). These official sources support retaining the framework and package seams; the specific folder groups in the proposal are this review's recommendations.

## Skill alignment

You additionally requested alignment with the installed NestJS and Vercel React best practices skills. This section extends the structure review with their rules. It records source inspected candidates and project specific adaptations, not a complete performance or security certification. Application code has not been changed for this alignment pass.

The local skills are `.agents/skills/nestjs-best-practices/SKILL.md` and `.agents/skills/vercel-react-best-practices/SKILL.md`. Their rule IDs below let a later implementation connect a change to a specific recommendation. Generic impact figures in those skills are not measurements of Letterly and are not claimed here.

### NestJS rule mapping

| Rules                                                                          | Current evidence                                                                                                          | Alignment action                                                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `arch-feature-modules`, `arch-single-responsibility`                           | Feature modules already exist; pages transport combines 46 handlers and several responsibilities                          | Retain feature modules, split cohesive controllers and use cases inside them                                                   |
| `arch-use-repository-pattern`                                                  | Pages has ports and Prisma adapters; catalog service directly queries Prisma; admin ports and implementations share files | Complete repository separation where persistence and use cases are currently mixed                                             |
| `di-prefer-constructor-injection`, `di-use-interfaces-tokens`                  | Constructor injection and symbol tokens already appear throughout pages module wiring                                     | Preserve these seams and use module provider factories for plain application use cases                                         |
| `arch-module-sharing`, `arch-avoid-circular-deps`                              | PrismaModule exports its client token; module sharing exists                                                              | Verify providers have one intended owner during extraction; preserve explicit exports; no module cycle defect is asserted here |
| `di-scope-awareness`                                                           | Request IDs are carried on the request in HTTP middleware; global database infrastructure is explicit                     | Preserve request isolation; inspect mutable provider fields before moving registrations; no blanket scope change               |
| `error-use-exception-filters`, `error-throw-http-exceptions`                   | ApiException extends HttpException; ZodValidationPipe produces a safe validation envelope                                 | Keep transport errors and the shared filter; map plain application errors at the HTTP boundary                                 |
| `security-validate-all-input`, `security-use-guards`, `security-rate-limiting` | Existing Zod pipe, session and admin guards, rate limit infrastructure                                                    | Preserve protections while splitting controllers and verify each moved route; no replacement auth or validation library        |
| `db-use-transactions`, `db-use-migrations`, `db-avoid-n-plus-one`              | Prisma adapters and committed migrations already own persistence                                                          | Preserve atomic operations and lock order; investigate query counts and plans before optimizing                                |
| `test-use-testing-module`, `test-e2e-supertest`, `test-mock-external-services` | Nest testing utilities, colocated Jest specs, and Supertest integration suites exist                                      | Plain use case tests plus provider wiring and HTTP tests; mock providers, use isolated databases for real invariants           |
| `api-use-dto-serialization`, `api-use-pipes`, `api-use-interceptors`           | Shared contracts, Zod pipes, public mappers, timing interceptor, and request context exist                                | Preserve DTO and safe projection boundaries rather than expose persistence objects                                             |
| `devops-use-config-module`, `devops-graceful-shutdown`, `devops-use-logging`   | Validated config loaders, shutdown hooks, Prisma lifecycle provider, and safe monitoring infrastructure exist             | Retain the equivalent mechanisms, verify cleanup and safe operational fields when wiring changes                               |

Provider wiring is not inherently a violation of Nest best practices. The reason for removing decorators from application use cases is the stronger project rule that application code remain framework independent. Nest custom provider factories allow that requirement and constructor injection to coexist.

### React and Next.js rule mapping

| Rules                                                                 | Current evidence                                                                                                                                    | Alignment action                                                                                                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `async-parallel`, `server-parallel-fetching`                          | `apps/web/lib/catalog.ts` fetches categories and templates with Promise.all; question refresh also has parallel independent reads                   | Preserve existing parallel work; inspect newly extracted loaders for waterfalls                                                                                   |
| `bundle-dynamic-imports`, `bundle-conditional`                        | TemplatePreviewDialog statically imports TemplatePreviewContent, which imports SecretLetterRenderer and VisitorResponseForm; charts import Recharts | Candidate: defer preview payload until opening and charts until their surface needs them; verify actual production chunks before claiming savings                 |
| `bundle-analyzable-paths`                                             | Templates have explicit known keys and independent implementations                                                                                  | Use literal import paths for supported templates and keep runtime keys mapped to trusted implementations                                                          |
| `bundle-barrel-imports`                                               | Runtime template definition imports sometimes use the package root; many other imports already use subpaths                                         | Prefer existing typed exported subpaths for runtime values; distinguish erased type imports from runtime dependencies                                             |
| `client-swr-dedup`                                                    | QueryProvider lazily creates a QueryClient and disables automatic retries; feature code uses TanStack Query                                         | Preserve the selected TanStack Query equivalent, stable keys, targeted invalidation, and provider ownership                                                       |
| Client request lifecycle and deduplication                            | Draft editor query functions do not consume a signal; inspected API read functions accept no AbortSignal; dashboard cancels old creator queries     | Thread query cancellation through read functions to Axios and preserve creator isolation; verify an obsolete read is canceled                                     |
| `rerender-derived-state-no-effect`, `rerender-move-effect-to-event`   | Image editor mirrors images to callbacks and refs with effects; journey editor synchronizes server versions into an editable graph                  | Review state ownership and callback updates; preserve dirty edits, uploads, conflicts, and cleanup; these effects are candidates for analysis, not confirmed bugs |
| `rerender-lazy-state-init`, `rerender-use-ref-transient-values`       | QueryClient uses lazy initialization; editor timers and media coordination use refs                                                                 | Retain these appropriate patterns; inspect frequent render subscriptions only with profiling evidence                                                             |
| `server-no-shared-module-state`, `server-serialization`               | Public server reader uses request headers locally and validates safe public projections; provider state is created inside a component               | Preserve local request ownership, narrow public payloads, and safe client props; no cross request leakage is asserted here                                        |
| `server-cache-react`, `server-cache-lru`, `js-cache-function-results` | Public reads deliberately use no-store; private query data has explicit privacy boundaries                                                          | Deduplication and caching require a safe scope and correct keys; shared private caches are outside the allowed architecture                                       |
| `async-suspense-boundaries`, rendering and rerender rules             | Existing route loading presentation and complex editor/template interactions provide review seams                                                   | Introduce streaming or render optimizations only for identified loading or profiling problems; retain accessibility and readable public content                   |

The preview import chain is a confirmed static dependency, but a bundler can optimize module graphs. No bundle analyzer or network measurement has run. Charts are candidates because of their dependency weight and optional surface, not proof of a measured bottleneck. The source screen found no Next dynamic import boundary in the inspected preview flow.

Form resets and server revision reconciliation are not ordinary display derivation. For example, DraftEditor preserves current dirty values while accepting a new content version, and ChooseYourHeartEditor reports a newer server revision instead of replacing a dirty graph. Simplifying those effects without regression coverage can lose edits. Audio playback, online/offline subscriptions, iframe messaging, object URLs, and observers are also genuine external synchronization.

### Project specific adaptations

| Generic skill example                 | Letterly adaptation and reason                                                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT authentication                    | Keep Better Auth sessions and API guards, as selected by the blueprint                                                                         |
| class-validator DTOs                  | Keep shared Zod contracts and ZodValidationPipe; validate bodies, parameters, and queries at the boundary                                      |
| TypeORM repositories                  | Keep Prisma repositories and transactions behind application owned ports                                                                       |
| HTTP exceptions in services           | Use plain application/domain errors and ApiException at the HTTP boundary; the Nest rule explicitly allows this for layer independent services |
| Nest ConfigModule                     | Keep validated shared config loaders and inject deliberate configuration values; add no second configuration system                            |
| SWR and SWR mutations                 | Use the selected TanStack Query system for deduplication, queries, mutations, and invalidation                                                 |
| Local storage optimization            | Apply only to deliberately permitted nonprivate preferences; never persist drafts, sessions, responses, or unlock proofs                       |
| Cross request caching                 | Restrict to explicitly safe data; preserve private and locked content cache prohibitions                                                       |
| Lazy client components with ssr false | Use only where a browser dependency requires it; retain server rendered essential public letter content and accessible loading/fallbacks       |
| Events, queues, microservices         | No mandatory adoption from a generic rule; the modular monolith and blueprint non goals remain authoritative                                   |

### Alignment completion criteria

Each implemented slice needs a record of relevant rule IDs, changed files, checks, and outstanding exceptions. API slices must preserve route behavior, provider resolution, isolation, transaction invariants, and safe errors. Frontend slices must preserve server/client boundaries, dirty editing, focus restoration, mobile layout, reduced motion, media cleanup, and private cache rules as applicable. Performance claims require before and after measurements of bundle size, requests, or rendering.

The baseline milestone remains first. It makes these checks meaningful before broader refactoring. This pass extends the proposal and evidence only; it does not mark either application fully aligned or advance the proposal to shipped status.

Framework mechanisms were checked against [NestJS custom providers](https://docs.nestjs.com/fundamentals/custom-providers), [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading), and [TanStack Query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation). These support factory wiring, deliberate client code splitting, and passing a query signal to Axios. The proposed owners and migration sequence remain project specific recommendations.

## Category and template growth findings

You require future additions to categories and templates with consistent ownership and minimal repeated boilerplate. The proposal now includes this requirement. This pass inspects the existing extension seams; it does not activate additional launch categories or templates.

| Current seam                 | Evidence                                                                                                              | Growth risk                                                                                                                  | Recommended extension                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Catalog data model           | Category, Template, and TemplateVersion are already separate models                                                   | The data model is extensible, but code still assumes the current launch content                                              | Retain the relational catalog and active status checks                                                                           |
| Template identity            | Template has a unique categoryId and key pair                                                                         | The same template key can legally occur in two categories; bare key lookup becomes ambiguous                                 | Resolve full category, template, and immutable version identity                                                                  |
| Version identity             | TemplateVersion.registryKey is globally unique; the code registry currently retains one descriptor per named template | Replacing the registry entry with v2 can strand existing pages, and reusing the same database key for v2 violates uniqueness | Preserve old descriptors; give future versions distinct stable registry keys, validate recorded version                          |
| Draft initialization         | PageService.createDraft detects Choose Your Heart and otherwise initializes Secret Letter content/settings            | A third content shape cannot be added through the current definition alone                                                   | Resolve typed template adapters for initialization, validation, and safe projection                                              |
| Owner contracts              | ownerPageProjectionSchema uses Secret Letter content/settings schemas despite generic template metadata               | Generic ownership metadata currently masks template specific payload assumptions                                             | Keep common envelopes, validate content through the registered version without flattening schemas                                |
| Public rendering             | The public page route imports both renderers and branches on Choose Your Heart                                        | Each new renderer requires editing shared route logic and may add eager dependencies                                         | Centralize typed version dispatch, preserve server rendering and isolate client interaction bundles                              |
| Preview selection            | Preview route has a fixed defaults map; preview content branches on template names                                    | Metadata and mock content are maintained in several places                                                                   | Consume catalog metadata and trusted per version preview definitions                                                             |
| Catalog presentation         | Intro copy, thumbnail selection, and category icons use explicit known keys                                           | New categories require editing scattered maps; unknown visuals can become unsupported states                                 | Put optional visual metadata in one owner, use generic safe presentation fallbacks                                               |
| Initial catalog provisioning | Database seed repeats upsert blocks for both templates                                                                | Each added template duplicates persistence boilerplate; version updates can obscure immutability intent                      | A controlled catalog publication manifest with reusable provisioning, preserving current activation and immutable version policy |

The most consequential gap is not directory depth. The definition registry exists, but shared services and transport types are still partly tied to Secret Letter. Moving those files alone would leave future template additions dependent on shared code edits.

The recommended model separates pure definitions, API behavior adapters, and web presentation. Those are distinct responsibilities and need distinct registration boundaries. An explicit registration is useful boilerplate: it lets TypeScript check supported versions and lets bundlers see literal imports. Duplicating catalog copy, media authorization, page lifecycle, and template name branches across files is the repetition to remove.

Categories are catalog metadata, not automatically separate API modules or route trees. Templates need their own implementations when behavior differs. A generator should produce consistent useful starter files after the existing templates prove the convention; it should not manufacture empty layers or activate new catalog entries implicitly.

The shared contract suite must prove that defaults match schemas, capabilities are consistent, unknown versions fail safely, and older pages remain pinned to their supported definition. Cross category key collisions need explicit tests because the database permits them. Future capabilities can require legitimate API or schema work; promising every future template is configuration only would be misleading.

Existing launch limitations stay in force. The proposal prepares for expansion while preserving one active category and two launch templates. No existing migration or catalog record was changed. Runtime performance and bundle growth still need measurements before a scalability claim.

## Current closure audit, 2026-10-03

The findings and inventory are the original review snapshot. They remain historical evidence, not a claim that every path still exists. This audit checks the sixteen original findings against current files and verified milestones after commits `a16e2a7` and `97446c4`. It does not certify a fresh line by line review of every current file or full framework compliance.

| Original finding | Current evidence | Closure state |
| --- | --- | --- |
| 1. Inward application dependencies | Pages use plain provider ports and composition factories. Catalog/admin separate plain services from Prisma. Area lint rules enforce migrated boundaries. | Implemented slices; final cross area import audit remains |
| 2. Combined pages controller | Fourteen cohesive owner/public controllers now live under pages presentation with colocated tests. The former combined controller is removed. | Implemented and verified |
| 3. Shared primitives | Button/Card/Link/Container/Stack/Input/Textarea/Field/IconButton/Status/Dialog now have canonical package Tailwind implementations. The application Button/Card copies and unused Badge/Separator are removed. Class merging, package source scanning, computed styles, keyboard focus, and performance budgets are verified. Generator configuration, token aliases, static breakpoint adapters, and alignment checks are implemented. See [Dialog verification](../../reviews/2026-10-03-shared-dialog-migration.md) and its preceding milestone reports. The obsolete shared CSS Module is removed. Application Tabs/Chart have sole editor owners and use the canonical class merger; unused web dependency links are removed. See [editor ownership](../../reviews/2026-10-03-editor-ui-ownership.md). Wider acceptance checks remain open. | Ownership resolved, continue wider UI acceptance |
| 4. Broad source and styles | Landing route has 966 lines and CSS 7,430; Secret Letter renderer has 1,297 lines and CSS 3,988. Prisma pages repository has 1,556 lines after extraction. | Partial, review cohesive splits while preserving cascade and transactions |
| 5. Central endpoint file | Page endpoints and query keys live in features/pages/api; administrator endpoints live in features/admin/api.ts. The central api-client.ts is removed. All twelve read endpoints accept optional signals and all fourteen query callbacks consume them. Twenty four cancellation cases and the 72 browser cases pass. | Implemented and verified; final import audit remains |
| 6. Broad pages folder | Editor, dashboard, media, responses, and public groups exist. Choose Your Heart presentation lives in its template. Catalog preview composition lives in `features/catalog/preview` and its consumers import that owner directly. | Feature grouping and preview ownership implemented; final cohesion review remains |
| 7. Route owned legal bodies | Legal bodies/styles live in features/legal; route wrappers and landing dialogs consume them. | Implemented and browser verified |
| 8. Task coverage | Seven authored workspaces have lint tasks; five have meaningful unit suites. CI runs root checks, Prisma validation, isolated database integration, and browser smoke. | Configuration/local gates verified; remote execution unobserved |
| 9. Test hashes | Turbo test uses the transit graph; generator tests declare external inputs. Baseline evidence includes controlled source hash change/restoration. | Implemented and baseline verified |
| 10. Compiler/lint conventions | API now inherits the shared strict Nest configuration, including checked indexed access. Shared Nest lint rules reject explicit any, floating promises, and unsafe arguments; local feature restrictions remain. Root checks, 799 unit cases, 595 integration cases, and fresh builds pass. See [strict configuration verification](../../reviews/2026-10-03-api-shared-strict-configuration.md). | Implemented and verified; seven database dependent cases remain locally skipped |
| 11. Formatting/commit gate | Root formatting check and ignores exist and CI uses the check. Husky runs `check:commit` before commits and commitlint validates conventional messages; the latest cleanup commit passed the actual hook. | Local commit gate implemented and verified; remote CI remains unobserved |
| 12. Small API modules | Catalog/admin have layered owners. Auth has a small provider integration and thin controller/session guard without empty layers. | Catalog/admin implemented; final auth boundary review remains |
| 13. Split web source roots | Catalog reader/tests now belong to the feature; six production callers are migrated. Root app remains supported. | Required catalog move done; route root migration is optional in the parent |
| 14. Onboarding/context | Root, API, and web guides describe current ownership, setup, commands, contribution paths, and verification limits. The original blueprint DOCX is absent; the working reference records this limit. | Contributor guidance aligned; original DOCX remains unavailable; readiness and API contract documentation remains open |
| 15. Cleanup candidates | Three unused presentation components were removed after repository-wide reference searches. The seven starter SVGs have no in-repository URL references and remain under their stable public paths. | Source cleanup complete; public assets intentionally retained to avoid breaking unknown external URL consumers |
| 16. Compatibility/migrations | Historical migrations remain in the database package. Prior route migrations preserved compatibility URLs. | Preserved; include final route/history diff audit |

Template growth now has exact bindings, explicit eligibility, grouped provisioning, immutable seed identity, later version generation, retained metadata, and actual service, persistence, and web composition fixture proof. The [version acceptance audit](0022-template-version-retention.md) closes that milestone. Canonical launch metadata remains one active category and two active v1 templates.

The shared template contract is now mapped in [the contract suite report](../../reviews/2026-10-04-template-contract-suite.md). It records coverage for registered defaults, optional content, long and malformed input, capabilities, exact identities, absent media, mobile layout, keyboard use, and reduced motion for both launch templates. Category and template reads now use bounded pagination, with 100 synthetic families measured in [the catalog growth report](../../reviews/catalog-growth-measurement.md). The migration and query argument tests cover the intended index shape, but no live PostgreSQL query plan was observed. Bounded media and submission work and template bundle isolation still need current review and measurements.

The remaining implementation queue is finite:

1. Complete the cohesion review for remaining template, persistence, and large source/style modules. Extract responsibilities only where the change has a clear maintenance benefit, and preserve CSS cascade order and transaction boundaries.
2. Finish shared UI acceptance by reviewing remaining feature overrides, accessibility behavior, reduced motion, and actual 200 percent browser zoom. A narrow viewport reflow check does not prove browser zoom.
3. Complete bounded scalability evidence for media and submission work and template bundle isolation. Run a physical catalog query plan only against an isolated PostgreSQL database; existing fixtures and Prisma argument tests do not prove a production query plan.
4. Resolve the blueprint-mandated readiness and protected API contract documentation gaps through a focused spec before implementation.
5. Audit every current file and parent requirement, run the applicable local checks, reconcile scope and durable context, and commit. Keep live database, browser, and remote CI evidence distinct from local fixtures.

This queue adds no product capability, provider, launch template, or live deployment. The overall restructuring remains In Progress until required items have direct evidence.

## File by file inventory

This inventory captures the 627 tracked files at the reviewed commit. It excludes the two review documents created afterward. Each disposition concerns structural ownership only. A retention disposition does not certify behavior, accessibility, security, performance, or test completeness. Test and style files move with the implementation they cover or style. Binary entries were inventoried by name and size, not visually reviewed.

### Repository root

| File                       | Lines or bytes | Responsibility                     | Structural disposition                                                          |
| -------------------------- | -------------: | ---------------------------------- | ------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml` |       92 lines | Tooling or workspace configuration | Retain location, reconcile checks and runtime baseline, findings 8 to 11 and 14 |
| `.gitignore`               |       62 lines | Source or workspace support        | Retain current structural owner                                                 |
| `.npmrc`                   |        0 lines | Source or workspace support        | Retain current structural owner                                                 |
| `AGENTS.md`                |      117 lines | Durable project context            | Preserve curated context, update owned paths after migration                    |
| `CHANGELOG.md`             |       23 lines | Workspace documentation            | Retain current structural owner                                                 |
| `CLAUDE.md`                |        6 lines | Durable project context            | Preserve curated context, update owned paths after migration                    |
| `README.md`                |        1 lines | Workspace documentation            | Replace starter or empty onboarding, finding 14                                 |
| `docker-compose.yml`       |       10 lines | Tooling or workspace configuration | Retain current structural owner                                                 |
| `package.json`             |       21 lines | Workspace manifest and scripts     | Retain location, reconcile checks and runtime baseline, findings 8 to 11 and 14 |
| `pnpm-lock.yaml`           |    14627 lines | Resolved dependency graph          | Retain current structural owner                                                 |
| `pnpm-workspace.yaml`      |       13 lines | Tooling or workspace configuration | Retain current structural owner                                                 |
| `skills-lock.json`         |      275 lines | Tooling or workspace configuration | Retain current structural owner                                                 |
| `turbo.json`               |       35 lines | Tooling or workspace configuration | Retain location, reconcile checks and runtime baseline, findings 8 to 11 and 14 |

### apps/api

| File                                                                                           | Lines or bytes | Responsibility                      | Structural disposition                                                                     |
| ---------------------------------------------------------------------------------------------- | -------------: | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/api/.env.example`                                                                        |       74 lines | Environment setup template          | Retain current structural owner                                                            |
| `apps/api/.prettierrc`                                                                         |        4 lines | Source or workspace support         | Reconcile with repository formatter baseline, finding 11                                   |
| `apps/api/AGENTS.md`                                                                           |       59 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/CLAUDE.md`                                                                           |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/README.md`                                                                           |       98 lines | Workspace documentation             | Replace starter or empty onboarding, finding 14                                            |
| `apps/api/eslint.config.mjs`                                                                   |       57 lines | Tooling or workspace configuration  | Retain location, enforce shared and inward boundaries, finding 10                          |
| `apps/api/nest-cli.json`                                                                       |        8 lines | Tooling or workspace configuration  | Retain current structural owner                                                            |
| `apps/api/package.json`                                                                        |      103 lines | Workspace manifest and scripts      | Retain location, reconcile checks and runtime baseline, findings 8 to 11 and 14            |
| `apps/api/src/app.controller.spec.ts`                                                          |       22 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/app.controller.ts`                                                               |       21 lines | Source or workspace support         | Retain current structural owner                                                            |
| `apps/api/src/app.module.ts`                                                                   |       23 lines | Source or workspace support         | Retain current structural owner                                                            |
| `apps/api/src/app.service.ts`                                                                  |        8 lines | Source or workspace support         | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/config.spec.ts`                                                   |      121 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/database/AGENTS.md`                                               |       28 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/infrastructure/database/CLAUDE.md`                                               |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/infrastructure/database/prisma-recovery.ts`                                      |       58 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/database/prisma-token.ts`                                         |        1 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/database/prisma.module.ts`                                        |       13 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/database/prisma.provider.ts`                                      |       17 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/AGENTS.md`                                                   |       36 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/infrastructure/http/CLAUDE.md`                                                   |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/infrastructure/http/api-error-writer.spec.ts`                                    |       70 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/api-error-writer.ts`                                         |       34 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/api-exception.filter.spec.ts`                                |       89 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/api-exception.filter.ts`                                     |      120 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/api-exception.ts`                                            |       19 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/browser-token.spec.ts`                                       |       66 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/browser-token.ts`                                            |       78 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/configure-http-application.spec.ts`                          |       67 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/configure-http-application.ts`                               |       84 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/rate-limit.module.ts`                                        |       18 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/rate-limit.service.spec.ts`                                  |      232 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/rate-limit.service.ts`                                       |      379 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/request-context.spec.ts`                                     |      104 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/request-context.ts`                                          |       47 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/request-timing.interceptor.spec.ts`                          |       54 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/request-timing.interceptor.ts`                               |       76 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/unlock-cookie.spec.ts`                                       |       42 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/unlock-cookie.ts`                                            |       69 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/unlock-proof.store.spec.ts`                                  |       26 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/unlock-proof.store.ts`                                       |      106 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/visitor-identity.spec.ts`                                    |       60 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/visitor-identity.ts`                                         |       63 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/zod-validation.pipe.spec.ts`                                 |       91 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/http/zod-validation.pipe.ts`                                      |       28 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/monitoring/AGENTS.md`                                             |       32 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/infrastructure/monitoring/CLAUDE.md`                                             |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/infrastructure/monitoring/monitoring.module.ts`                                  |       12 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/monitoring/safe-monitoring.spec.ts`                               |       81 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/monitoring/safe-monitoring.ts`                                    |      176 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/storage/AGENTS.md`                                                |       29 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/infrastructure/storage/CLAUDE.md`                                                |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/infrastructure/storage/media-storage.ts`                                         |       57 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/storage/r2-storage.spec.ts`                                       |      262 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/infrastructure/storage/r2-storage.ts`                                            |      283 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/main.ts`                                                                         |       20 lines | Source or workspace support         | Retain current structural owner                                                            |
| `apps/api/src/modules/admin/AGENTS.md`                                                         |       33 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/modules/admin/CLAUDE.md`                                                         |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/modules/admin/admin-audit.repository.ts`                                         |       93 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-audit.service.ts`                                            |       53 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-bootstrap.repository.ts`                                     |       65 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-bootstrap.service.spec.ts`                                   |       42 lines | Test suite or test support          | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-bootstrap.service.ts`                                        |       42 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-bootstrap.ts`                                                |       78 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-cursor.service.spec.ts`                                      |       32 lines | Test suite or test support          | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-cursor.service.ts`                                           |      102 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-moderation.repository.spec.ts`                               |      362 lines | Test suite or test support          | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-moderation.repository.ts`                                    |      920 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-moderation.service.ts`                                       |       90 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-origin.guard.ts`                                             |       58 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-reports.repository.ts`                                       |      196 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-reports.service.ts`                                          |       68 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-retention.repository.spec.ts`                                |      134 lines | Test suite or test support          | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-retention.repository.ts`                                     |      411 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-retention.service.spec.ts`                                   |      109 lines | Test suite or test support          | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin-retention.service.ts`                                        |       88 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin.controller.ts`                                               |      514 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin.guard.spec.ts`                                               |       78 lines | Test suite or test support          | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin.guard.ts`                                                    |       44 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/admin/admin.module.ts`                                                   |       90 lines | Source or workspace support         | Separate ports, Prisma adapters, HTTP, and composition by responsibility, finding 12       |
| `apps/api/src/modules/auth/AGENTS.md`                                                          |       35 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/modules/auth/CLAUDE.md`                                                          |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/modules/auth/auth.controller.spec.ts`                                            |       48 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/auth/auth.controller.ts`                                                 |       43 lines | Source or workspace support         | Retain current structural owner                                                            |
| `apps/api/src/modules/auth/auth.module.ts`                                                     |       10 lines | Source or workspace support         | Retain current structural owner                                                            |
| `apps/api/src/modules/auth/better-auth-session.guard.spec.ts`                                  |      179 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/auth/better-auth-session.guard.ts`                                       |      109 lines | Source or workspace support         | Retain current structural owner                                                            |
| `apps/api/src/modules/auth/infrastructure/auth-mail.spec.ts`                                   |      393 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/auth/infrastructure/auth-mail.ts`                                        |      503 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/auth/infrastructure/auth-validation.spec.ts`                             |      147 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/auth/infrastructure/better-auth.spec.ts`                                 |      753 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/auth/infrastructure/better-auth.ts`                                      |      664 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/catalog/AGENTS.md`                                                       |       30 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/modules/catalog/CLAUDE.md`                                                       |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/modules/catalog/catalog.controller.spec.ts`                                      |      222 lines | Test suite or test support          | Retain small feature, separate persistence when migrating boundary, finding 12             |
| `apps/api/src/modules/catalog/catalog.controller.ts`                                           |       60 lines | Source or workspace support         | Retain small feature, separate persistence when migrating boundary, finding 12             |
| `apps/api/src/modules/catalog/catalog.module.ts`                                               |        9 lines | Source or workspace support         | Retain small feature, separate persistence when migrating boundary, finding 12             |
| `apps/api/src/modules/catalog/catalog.service.ts`                                              |      109 lines | Source or workspace support         | Retain small feature, separate persistence when migrating boundary, finding 12             |
| `apps/api/src/modules/pages/AGENTS.md`                                                         |       61 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/modules/pages/CLAUDE.md`                                                         |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                               |
| `apps/api/src/modules/pages/application/image-caption.spec.ts`                                 |       35 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/media-cleanup.service.spec.ts`                         |      103 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/media-cleanup.service.ts`                              |       94 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-analytics.repository.ts`                          |       38 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-analytics.service.ts`                             |       87 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-audio-link.repository.ts`                         |       42 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-audio-link.service.ts`                            |      156 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-audio.repository.ts`                              |      112 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-audio.service.spec.ts`                            |      282 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-audio.service.ts`                                 |      277 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-journey-metrics.ts`                               |        7 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-journey-submissions.repository.ts`                |       40 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-journey-submissions.service.spec.ts`              |      134 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-journey-submissions.service.ts`                   |      170 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-journeys.repository.ts`                           |       48 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-journeys.service.spec.ts`                         |      327 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-journeys.service.ts`                              |      119 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-media.repository.ts`                              |      145 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-media.service.spec.ts`                            |      509 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-media.service.ts`                                 |      402 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-password.repository.ts`                           |       17 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-password.service.spec.ts`                         |      179 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-password.service.ts`                              |      242 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-questions.repository.ts`                          |      134 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-questions.service.ts`                             |      175 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-reports.repository.ts`                            |       13 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-reports.service.spec.ts`                          |       60 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-reports.service.ts`                               |       64 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-submissions.repository.ts`                        |      103 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-submissions.service.spec.ts`                      |       99 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page-submissions.service.ts`                           |      176 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page.service.spec.ts`                                  |      857 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/page.service.ts`                                       |      838 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/pages.repository.ts`                                   |      139 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/public-availability.spec.ts`                           |       18 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/public-availability.ts`                                |       21 lines | Application use case, port, or rule | Move Prisma predicate builder into infrastructure, finding 1                               |
| `apps/api/src/modules/pages/application/secret-letter-response-availability.spec.ts`           |      162 lines | Test suite or test support          | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/secret-letter-response-availability.ts`                |      136 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/template-version.reader.ts`                            |       12 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/unlock-proof.store.ts`                                 |        7 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/youtube-metadata.ts`                                   |      154 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/application/youtube-url.ts`                                        |       49 lines | Application use case, port, or rule | Retain application ownership, isolate framework and infrastructure imports, finding 1      |
| `apps/api/src/modules/pages/domain/page.types.ts`                                              |      188 lines | Domain types or rules               | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/image-processor.spec.ts`                            |       72 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/image-processor.ts`                                 |      157 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-analytics.repository.ts`                |      221 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-audio-link.repository.ts`               |      223 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-audio.repository.spec.ts`               |      415 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-audio.repository.ts`                    |      587 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-journey-submissions.repository.spec.ts` |      315 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-journey-submissions.repository.ts`      |      346 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-journeys.repository.ts`                 |      296 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-media.repository.spec.ts`               |      286 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-media.repository.ts`                    |      812 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-password.repository.spec.ts`            |      121 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-password.repository.ts`                 |       69 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-questions.repository.spec.ts`           |      555 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-questions.repository.ts`                |      812 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-reports.repository.spec.ts`             |       38 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-reports.repository.ts`                  |       44 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-submissions.repository.spec.ts`         |      623 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-page-submissions.repository.ts`              |      611 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.spec.ts`                    |     1740 lines | Test suite or test support          | Retain infrastructure owner, extract cohesive query responsibilities with tests, finding 4 |
| `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts`                         |     1865 lines | Infrastructure implementation       | Retain infrastructure owner, extract cohesive query responsibilities with tests, finding 4 |
| `apps/api/src/modules/pages/infrastructure/prisma-template-version.reader.ts`                  |       47 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/structured-page-journey-metrics.spec.ts`            |       61 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/structured-page-journey-metrics.ts`                 |       16 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/infrastructure/youtube-video-metadata.ts`                          |      263 lines | Infrastructure implementation       | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/pages.controller.spec.ts`                                          |      646 lines | Test suite or test support          | Split cohesive controllers and colocated coverage in presentation, finding 2               |
| `apps/api/src/modules/pages/pages.controller.ts`                                               |     2903 lines | Source or workspace support         | Split cohesive controllers and colocated coverage in presentation, finding 2               |
| `apps/api/src/modules/pages/pages.media.controller.spec.ts`                                    |      545 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/pages.module.ts`                                                   |      204 lines | Source or workspace support         | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/pages.password.controller.spec.ts`                                 |      189 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/pages.questions.controller.spec.ts`                                |      320 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/pages.reports.controller.spec.ts`                                  |       52 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/pages.submissions.controller.spec.ts`                              |      295 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/presentation/page-response.mapper.spec.ts`                         |      117 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/src/modules/pages/presentation/page-response.mapper.ts`                              |      144 lines | Transport mapper or projection      | Retain current structural owner                                                            |
| `apps/api/test/app.e2e-spec.ts`                                                                |       29 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/test/authentication.database.e2e-spec.ts`                                            |      354 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/test/jest-e2e.json`                                                                  |       24 lines | Tooling or workspace configuration  | Retain current structural owner                                                            |
| `apps/api/test/page-journeys.database.e2e-spec.ts`                                             |      307 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/test/pages-drafts.database.e2e-spec.ts`                                              |      300 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/test/pages-drafts.e2e-spec.ts`                                                       |      348 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/test/pages-publishing.e2e-spec.ts`                                                   |      344 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/test/pages-submissions.database.e2e-spec.ts`                                         |      287 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/test/pages-submissions.e2e-spec.ts`                                                  |      260 lines | Test suite or test support          | Retain current structural owner                                                            |
| `apps/api/tsconfig.build.json`                                                                 |        4 lines | Tooling or workspace configuration  | Retain current structural owner                                                            |
| `apps/api/tsconfig.json`                                                                       |       26 lines | Tooling or workspace configuration  | Retain location, enforce shared and inward boundaries, finding 10                          |

### apps/web

| File                                                                             | Lines or bytes | Responsibility                      | Structural disposition                                                                    |
| -------------------------------------------------------------------------------- | -------------: | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `apps/web/.env.example`                                                          |       27 lines | Environment setup template          | Retain current structural owner                                                           |
| `apps/web/.gitignore`                                                            |       38 lines | Source or workspace support         | Retain current structural owner                                                           |
| `apps/web/AGENTS.md`                                                             |      100 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/CLAUDE.md`                                                             |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/README.md`                                                             |       36 lines | Workspace documentation             | Replace starter or empty onboarding, finding 14                                           |
| `apps/web/app/admin/layout.tsx`                                                  |       11 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/admin/moderation/audit/page.tsx`                                   |       30 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/admin/moderation/reports/[reportId]/page.tsx`                      |       27 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/admin/moderation/reports/page.tsx`                                 |       30 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/create/not-found.tsx`                                              |       13 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/create/page.tsx`                                                   |       28 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/dashboard/home/page.tsx`                                           |       11 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/dashboard/layout.tsx`                                              |       11 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/dashboard/letters/[pageId]/edit/loading.tsx`                       |       12 lines | Next.js framework entry             | Preserve compatibility redirect or loader, finding 16                                     |
| `apps/web/app/dashboard/letters/[pageId]/edit/page.tsx`                          |       12 lines | Next.js framework entry             | Preserve compatibility redirect or loader, finding 16                                     |
| `apps/web/app/dashboard/letters/[pageId]/responses/loading.tsx`                  |       12 lines | Next.js framework entry             | Preserve compatibility redirect or loader, finding 16                                     |
| `apps/web/app/dashboard/letters/[pageId]/responses/page.tsx`                     |       12 lines | Next.js framework entry             | Preserve compatibility redirect or loader, finding 16                                     |
| `apps/web/app/dashboard/loading.tsx`                                             |       11 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/dashboard/page.tsx`                                                |        5 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/dashboard/pages/[pageId]/edit/loading.tsx`                         |       12 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/dashboard/pages/[pageId]/edit/page.tsx`                            |       18 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/dashboard/pages/[pageId]/responses/loading.tsx`                    |       12 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/dashboard/pages/[pageId]/responses/page.tsx`                       |       17 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/dashboard/pages/page.tsx`                                          |       19 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/editor-preview/secret-letter/page.tsx`                             |       26 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/fonts/GeistMonoVF.woff`                                            |    67864 bytes | Imported image or font asset        | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/fonts/GeistVF.woff`                                                |    66268 bytes | Imported image or font asset        | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/forgot-password/page.tsx`                                          |       31 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/globals.css`                                                       |      196 lines | Styles or design tokens             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/layout.tsx`                                                        |      113 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/loading-state.tsx`                                                 |       10 lines | Source or workspace support         | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/loading.tsx`                                                       |        5 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/not-found.module.css`                                              |       31 lines | Styles or design tokens             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/p/[slug]/audio/metadata/route.ts`                                  |       62 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/p/[slug]/audio/route.ts`                                           |       61 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/p/[slug]/media/[imageId]/route.ts`                                 |       67 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/p/[slug]/page.tsx`                                                 |      177 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/p/[slug]/report/route.ts`                                          |       79 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/p/[slug]/responses/route.ts`                                       |       97 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/p/[slug]/unlock/route.ts`                                          |       89 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/p/[slug]/visit/route.ts`                                           |       50 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/p/[slug]/visit/time/route.ts`                                      |       63 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/page.module.css`                                                   |     7430 lines | Styles or design tokens             | Extract landing responsibilities, findings 4 and 7                                        |
| `apps/web/app/page.tsx`                                                          |      964 lines | Next.js framework entry             | Extract landing responsibilities, findings 4 and 7                                        |
| `apps/web/app/preview/[templateKey]/page.module.css`                             |       69 lines | Styles or design tokens             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/preview/[templateKey]/page.tsx`                                    |      120 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/privacy/page.tsx`                                                  |      520 lines | Next.js framework entry             | Retain routes, extract reusable legal document bodies and styles, finding 7               |
| `apps/web/app/reset-password/page.tsx`                                           |       31 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/sign-in/page.tsx`                                                  |       38 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/sign-up/page.tsx`                                                  |       38 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/templates/[categoryKey]/page.tsx`                                  |      152 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/templates/category-filter-rail.tsx`                                |      340 lines | Template definition or presentation | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/templates/page.module.css`                                         |      358 lines | Styles or design tokens             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/templates/page.tsx`                                                |      217 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/app/terms/page.module.css`                                             |      508 lines | Styles or design tokens             | Retain routes, extract reusable legal document bodies and styles, finding 7               |
| `apps/web/app/terms/page.tsx`                                                    |      414 lines | Next.js framework entry             | Retain routes, extract reusable legal document bodies and styles, finding 7               |
| `apps/web/app/verify-email/page.tsx`                                             |       30 lines | Next.js framework entry             | Retain root routes until dedicated migration, finding 13                                  |
| `apps/web/assets/categories/anniversary/anniversary-thumbnail.png`               |  2669536 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/categories/birthday/birthday-thumbnail.png`                     |  2489893 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/categories/confession/confession-thumbnail.png`                 |  2345588 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/categories/thankyou/thankyou-thumbnail.png`                     |  2812797 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Fraunces-500.woff2`                                       |    36620 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Fraunces-600.woff2`                                       |    36620 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Fraunces-650.woff2`                                       |    36620 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Geist-400.ttf`                                            |    72916 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Geist-600.ttf`                                            |    73048 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Geist-700.ttf`                                            |    72984 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/LICENSE-Fraunces.txt`                                     |       93 lines | Asset license                       | Retain current structural owner                                                           |
| `apps/web/assets/fonts/LICENSE-Geist.txt`                                        |       93 lines | Asset license                       | Retain current structural owner                                                           |
| `apps/web/assets/fonts/LICENSE-Manrope.txt`                                      |       93 lines | Asset license                       | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Manrope-400.woff2`                                        |    24836 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Manrope-500.woff2`                                        |    24836 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Manrope-600.woff2`                                        |    24836 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/fonts/Manrope-700.woff2`                                        |    24836 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/home.png`                                                       |  1930905 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/how.png`                                                        |  1448813 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/image-carousel.png`                                             |  1592570 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/images/app-favicon.png`                                         |   787402 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/images/app-logo.png`                                            |   333805 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/images/fb.png`                                                  |    14788 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/images/google.png`                                              |    18527 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/images/secret-letter/bg.png`                                    |  1645749 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/images/secret-letter/sample template.png`                       |  2383540 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/letter-card.png`                                                |  1993197 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/settings.png`                                                   |  1075725 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/sidebar.png`                                                    |  1515753 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/template-layout.png`                                            |  1568757 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/assets/templates.png`                                                  |  1606647 bytes | Imported image or font asset        | Retain current structural owner                                                           |
| `apps/web/components.json`                                                       |       23 lines | Tooling or workspace configuration  | Retain current structural owner                                                           |
| `apps/web/design.md`                                                             |      451 lines | Workspace documentation             | Retain current structural owner                                                           |
| `apps/web/e2e/admin-moderation.spec.ts`                                          |       22 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/audio-player-motion-check.ts`                                      |       81 lines | Source or workspace support         | Wire into deliberate test command or document manual tooling, finding 8                   |
| `apps/web/e2e/auth-sign-in.spec.ts`                                              |      628 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/authenticated-draft-loop.spec.ts`                                  |      648 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/catalog-navigation.spec.ts`                                        |       87 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/confirmation-dialogs.spec.ts`                                      |      352 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/design-system-compatibility.spec.ts`                               |       47 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/landing-foundation.spec.ts`                                        |      445 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/legal-dialog.spec.ts`                                              |       94 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/privacy.spec.ts`                                                   |       56 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/public-report.spec.ts`                                             |      168 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/public-secret-letter.spec.ts`                                      |     2475 lines | Test suite or test support          | Split cohesive journeys with shared fixtures as needed, finding 4                         |
| `apps/web/e2e/terms.spec.ts`                                                     |       56 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/visitor-responses-real.spec.ts`                                    |      126 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/visitor-responses.spec.ts`                                         |      326 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/e2e/workspace-navigation.spec.ts`                                      |      297 lines | Test suite or test support          | Retain current structural owner                                                           |
| `apps/web/eslint.config.js`                                                      |        4 lines | Tooling or workspace configuration  | Retain current structural owner                                                           |
| `apps/web/lib/catalog.test.ts`                                                   |       72 lines | Test suite or test support          | Move with tests into catalog ownership, findings 8 and 13                                 |
| `apps/web/lib/catalog.ts`                                                        |       88 lines | Shared helper or transport          | Move with tests into catalog ownership, findings 8 and 13                                 |
| `apps/web/next.config.js`                                                        |      134 lines | Tooling or workspace configuration  | Retain current structural owner                                                           |
| `apps/web/next.config.test.mjs`                                                  |       16 lines | Test suite or test support          | Wire into deliberate test command or document manual tooling, finding 8                   |
| `apps/web/package.json`                                                          |       50 lines | Workspace manifest and scripts      | Retain location, reconcile checks and runtime baseline, findings 8 to 11 and 14           |
| `apps/web/playwright.config.ts`                                                  |       56 lines | Tooling or workspace configuration  | Retain current structural owner                                                           |
| `apps/web/postcss.config.mjs`                                                    |        7 lines | Tooling or workspace configuration  | Retain current structural owner                                                           |
| `apps/web/proxy.ts`                                                              |       64 lines | Source or workspace support         | Retain current structural owner                                                           |
| `apps/web/public/file-text.svg`                                                  |        3 lines | Public vector asset                 | Check public URL usage before starter asset cleanup, finding 15                           |
| `apps/web/public/globe.svg`                                                      |       10 lines | Public vector asset                 | Check public URL usage before starter asset cleanup, finding 15                           |
| `apps/web/public/next.svg`                                                       |        1 lines | Public vector asset                 | Check public URL usage before starter asset cleanup, finding 15                           |
| `apps/web/public/turborepo-dark.svg`                                             |       19 lines | Public vector asset                 | Check public URL usage before starter asset cleanup, finding 15                           |
| `apps/web/public/turborepo-light.svg`                                            |       19 lines | Public vector asset                 | Check public URL usage before starter asset cleanup, finding 15                           |
| `apps/web/public/vercel.svg`                                                     |       10 lines | Public vector asset                 | Check public URL usage before starter asset cleanup, finding 15                           |
| `apps/web/public/window.svg`                                                     |        3 lines | Public vector asset                 | Check public URL usage before starter asset cleanup, finding 15                           |
| `apps/web/scripts/dev.mjs`                                                       |      110 lines | Source or workspace support         | Retain current structural owner                                                           |
| `apps/web/src/components/BlurText.tsx`                                           |      186 lines | Reusable presentation               | Retain current structural owner                                                           |
| `apps/web/src/components/GlareHover.tsx`                                         |      114 lines | Reusable presentation               | Check all callers before possible removal, finding 15                                     |
| `apps/web/src/components/SpotlightCard.tsx`                                      |       72 lines | Reusable presentation               | Check all callers before possible removal, finding 15                                     |
| `apps/web/src/components/confirmation-dialog.module.css`                         |      148 lines | Styles or design tokens             | Retain current structural owner                                                           |
| `apps/web/src/components/confirmation-dialog.tsx`                                |      116 lines | Reusable presentation               | Retain current structural owner                                                           |
| `apps/web/src/components/legal-policy-dialog.module.css`                         |      328 lines | Styles or design tokens             | Retain current structural owner                                                           |
| `apps/web/src/components/legal-policy-dialog.tsx`                                |      103 lines | Reusable presentation               | Retain current structural owner                                                           |
| `apps/web/src/components/loading-state.module.css`                               |      170 lines | Styles or design tokens             | Retain current structural owner                                                           |
| `apps/web/src/components/loading-state.tsx`                                      |      106 lines | Reusable presentation               | Retain current structural owner                                                           |
| `apps/web/src/components/music-icon.tsx`                                         |      121 lines | Reusable presentation               | Retain current structural owner                                                           |
| `apps/web/src/components/site-footer.module.css`                                 |      113 lines | Styles or design tokens             | Retain current structural owner                                                           |
| `apps/web/src/components/site-footer.tsx`                                        |       40 lines | Reusable presentation               | Retain current structural owner                                                           |
| `apps/web/src/components/template-first-section-thumbnail.module.css`            |      110 lines | Styles or design tokens             | Move preview orchestration into catalog ownership, finding 6                              |
| `apps/web/src/components/template-first-section-thumbnail.tsx`                   |       80 lines | Reusable presentation               | Move preview orchestration into catalog ownership, finding 6                              |
| `apps/web/src/components/template-preview-content.tsx`                           |      188 lines | Reusable presentation               | Move preview orchestration into catalog ownership, finding 6                              |
| `apps/web/src/components/template-preview-dialog.module.css`                     |      385 lines | Styles or design tokens             | Move preview orchestration into catalog ownership, finding 6                              |
| `apps/web/src/components/template-preview-dialog.tsx`                            |       82 lines | Reusable presentation               | Move preview orchestration into catalog ownership, finding 6                              |
| `apps/web/src/components/ui/badge.tsx`                                           |       47 lines | Reusable presentation               | Check all callers before possible removal, finding 15                                     |
| `apps/web/src/components/ui/button.tsx`                                          |       63 lines | Reusable presentation               | Resolve primitive owner, retain web specific composition, finding 3                       |
| `apps/web/src/components/ui/card.tsx`                                            |      101 lines | Reusable presentation               | Resolve primitive owner, retain web specific composition, finding 3                       |
| `apps/web/src/components/ui/chart.tsx`                                           |      373 lines | Reusable presentation               | Resolve primitive owner, retain web specific composition, finding 3                       |
| `apps/web/src/components/ui/separator.tsx`                                       |       27 lines | Reusable presentation               | Check all callers before possible removal, finding 15                                     |
| `apps/web/src/components/ui/tabs.tsx`                                            |       68 lines | Reusable presentation               | Resolve primitive owner, retain web specific composition, finding 3                       |
| `apps/web/src/content/letterly-information.ts`                                   |      111 lines | Source or workspace support         | Retain current structural owner                                                           |
| `apps/web/src/features/admin/AGENTS.md`                                          |       32 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/src/features/admin/CLAUDE.md`                                          |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/src/features/admin/admin-audit-console.tsx`                            |      186 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/admin/admin-report-console.tsx`                           |      474 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/auth/AGENTS.md`                                           |       33 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/src/features/auth/CLAUDE.md`                                           |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/src/features/auth/components/auth-recovery-page.tsx`                   |      504 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/auth/components/email-password-form.tsx`                  |      399 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/auth/components/sign-in-form.module.css`                  |     1251 lines | Styles or design tokens             | Retain current structural owner                                                           |
| `apps/web/src/features/auth/components/sign-in-form.tsx`                         |      269 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/catalog/catalog-copy.ts`                                  |       23 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/catalog/components/catalog-template-card.module.css`      |      222 lines | Styles or design tokens             | Retain current structural owner                                                           |
| `apps/web/src/features/catalog/components/catalog-template-card.tsx`             |       75 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/catalog/components/create-draft-button.module.css`        |       25 lines | Styles or design tokens             | Retain current structural owner                                                           |
| `apps/web/src/features/catalog/components/create-draft-button.tsx`               |       90 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/landing/components/how-it-works-progress.tsx`             |      202 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/landing/components/landing-effects.tsx`                   |      178 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/landing/components/template-scroll-stack.tsx`             |      150 lines | Feature presentation or interaction | Retain current structural owner                                                           |
| `apps/web/src/features/pages/AGENTS.md`                                          |       53 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/src/features/pages/CLAUDE.md`                                          |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/src/features/pages/components/audio-editor.module.css`                 |      771 lines | Styles or design tokens             | Group with pages/media owner and callers, findings 4 and 6                                |
| `apps/web/src/features/pages/components/audio-editor.tsx`                        |      659 lines | Feature presentation or interaction | Group with pages/media owner and callers, findings 4 and 6                                |
| `apps/web/src/features/pages/components/choose-your-heart-editor.tsx`            |      749 lines | Feature presentation or interaction | Separate page orchestration from template owned editor or renderer, finding 6             |
| `apps/web/src/features/pages/components/choose-your-heart-renderer.tsx`          |      311 lines | Feature presentation or interaction | Separate page orchestration from template owned editor or renderer, finding 6             |
| `apps/web/src/features/pages/components/dashboard-footer.tsx`                    |       17 lines | Feature presentation or interaction | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/dashboard-header.tsx`                    |      151 lines | Feature presentation or interaction | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/dashboard-icons.tsx`                     |      304 lines | Feature presentation or interaction | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/dashboard-shell.tsx`                     |      183 lines | Feature presentation or interaction | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/dashboard-sidebar.tsx`                   |      277 lines | Feature presentation or interaction | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/draft-dashboard.module.css`              |      878 lines | Styles or design tokens             | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/draft-dashboard.tsx`                     |      351 lines | Feature presentation or interaction | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/draft-editor.module.css`                 |     3075 lines | Styles or design tokens             | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/draft-editor.tsx`                        |     1369 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-analytics.module.css`             |      470 lines | Styles or design tokens             | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-analytics.tsx`                    |      605 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-field-checklist.tsx`              |      326 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-letter-preview-frame-content.tsx` |       82 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-letter-preview-protocol.ts`       |       56 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-letter-preview.module.css`        |      472 lines | Styles or design tokens             | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-letter-preview.tsx`               |      532 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-overview.tsx`                     |      210 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-section-nav.module.css`           |      294 lines | Styles or design tokens             | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-section-nav.tsx`                  |      265 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-settings.module.css`              |      811 lines | Styles or design tokens             | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-settings.tsx`                     |      488 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/editor-viewers.module.css`               |      254 lines | Styles or design tokens             | Group with pages/responses owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/editor-viewers.tsx`                      |      144 lines | Feature presentation or interaction | Group with pages/responses owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/hero-still-life.tsx`                     |      174 lines | Feature presentation or interaction | Check all callers before possible removal, finding 15                                     |
| `apps/web/src/features/pages/components/how-letterly-works.module.css`           |     1061 lines | Styles or design tokens             | Group with landing or workspace information owner and callers, findings 4 and 6           |
| `apps/web/src/features/pages/components/how-letterly-works.tsx`                  |      230 lines | Feature presentation or interaction | Group with landing or workspace information owner and callers, findings 4 and 6           |
| `apps/web/src/features/pages/components/image-editor.module.css`                 |      861 lines | Styles or design tokens             | Group with pages/media owner and callers, findings 4 and 6                                |
| `apps/web/src/features/pages/components/image-editor.tsx`                        |     1089 lines | Feature presentation or interaction | Group with pages/media owner and callers, findings 4 and 6                                |
| `apps/web/src/features/pages/components/locked-letter.tsx`                       |      119 lines | Feature presentation or interaction | Group with pages/public owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/public-report-form.tsx`                  |      349 lines | Feature presentation or interaction | Group with pages/public owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/public-visit-tracker.tsx`                |      127 lines | Feature presentation or interaction | Group with pages/public owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/publish-controls.tsx`                    |      410 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/qr-sharing-panel.tsx`                    |      283 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/question-editor.module.css`              |      929 lines | Styles or design tokens             | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/question-editor.tsx`                     |      769 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/question-form-dialog.tsx`                |      391 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/question-limits.ts`                      |        9 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/question-list.tsx`                       |      252 lines | Feature presentation or interaction | Group with pages/editor owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/response-dashboard.module.css`           |       35 lines | Styles or design tokens             | Group with pages/responses owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/response-dashboard.tsx`                  |      596 lines | Feature presentation or interaction | Group with pages/responses owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/sidebar-icon.tsx`                        |       62 lines | Feature presentation or interaction | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/submission-response-dialog.module.css`   |      690 lines | Styles or design tokens             | Group with pages/responses owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/submission-response-dialog.tsx`          |      333 lines | Feature presentation or interaction | Group with pages/responses owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/visitor-response-form.module.css`        |      957 lines | Styles or design tokens             | Group with pages/public owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/visitor-response-form.tsx`               |      618 lines | Feature presentation or interaction | Group with pages/public owner and callers, findings 4 and 6                               |
| `apps/web/src/features/pages/components/workspace-faq.module.css`                |      230 lines | Styles or design tokens             | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/workspace-faq.tsx`                       |       31 lines | Feature presentation or interaction | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/workspace-home.module.css`               |      667 lines | Styles or design tokens             | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/workspace-home.tsx`                      |      249 lines | Feature presentation or interaction | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/features/pages/components/workspace-navigation.module.css`         |      863 lines | Styles or design tokens             | Group with pages/dashboard owner and callers, findings 4 and 6                            |
| `apps/web/src/lib/api-client.ts`                                                 |      865 lines | Shared helper or transport          | Split shared transport from feature endpoints, finding 5                                  |
| `apps/web/src/lib/auth-client.ts`                                                |       10 lines | Shared helper or transport          | Retain current structural owner                                                           |
| `apps/web/src/lib/category-thumbnails.ts`                                        |       19 lines | Shared helper or transport          | Retain current structural owner                                                           |
| `apps/web/src/lib/page-journey-metrics.ts`                                       |       18 lines | Shared helper or transport          | Move into page or template interaction ownership, finding 6                               |
| `apps/web/src/lib/page-keys.ts`                                                  |       11 lines | Shared helper or transport          | Move with page API and query ownership, finding 5                                         |
| `apps/web/src/lib/public-page.ts`                                                |      108 lines | Shared helper or transport          | Retain current structural owner                                                           |
| `apps/web/src/lib/query-provider.tsx`                                            |       26 lines | Shared helper or transport          | Retain current structural owner                                                           |
| `apps/web/src/lib/return-path.ts`                                                |       79 lines | Shared helper or transport          | Retain current structural owner                                                           |
| `apps/web/src/lib/server-admin-auth.ts`                                          |       31 lines | Shared helper or transport          | Retain current structural owner                                                           |
| `apps/web/src/lib/server-config.ts`                                              |       13 lines | Shared helper or transport          | Retain current structural owner                                                           |
| `apps/web/src/lib/visitor-identity.ts`                                           |       41 lines | Shared helper or transport          | Retain current structural owner                                                           |
| `apps/web/src/templates/AGENTS.md`                                               |       42 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/src/templates/CLAUDE.md`                                               |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration                              |
| `apps/web/src/templates/choose-your-heart/first-section.tsx`                     |      117 lines | Template definition or presentation | Retain current structural owner                                                           |
| `apps/web/src/templates/secret-letter/assets/coffee-mornings.jpg`                |    58161 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/assets/floral-envelope.png`                |  2714021 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/assets/handwritten-letter.jpg`             |    46888 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/assets/holding-hands.jpg`                  |    51131 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/assets/playfair-display-600-italic.ttf`    |   111208 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/assets/playfair-display-600.ttf`           |   123672 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/assets/playfair-display-700.ttf`           |   123536 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/assets/plus-jakarta-sans-400.ttf`          |    63336 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/assets/plus-jakarta-sans-600.ttf`          |    63412 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/assets/vibrant-blooms.jpg`                 |    89141 bytes | Imported image or font asset        | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/audio-player.module.css`                   |     1458 lines | Styles or design tokens             | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/audio-player.tsx`                          |     1072 lines | Template definition or presentation | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/first-section.tsx`                         |       72 lines | Template definition or presentation | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/index.ts`                                  |        2 lines | Template definition or presentation | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/message-scene.module.css`                  |       11 lines | Styles or design tokens             | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/message-scene.tsx`                         |       61 lines | Template definition or presentation | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/question-section.module.css`               |      196 lines | Styles or design tokens             | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/question-section.tsx`                      |      209 lines | Template definition or presentation | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/reasons-section.module.css`                |      276 lines | Styles or design tokens             | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/reasons-section.tsx`                       |      276 lines | Template definition or presentation | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/record-tonearm.tsx`                        |      173 lines | Template definition or presentation | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/renderer.module.css`                       |     3988 lines | Styles or design tokens             | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/src/templates/secret-letter/renderer.tsx`                              |     1297 lines | Template definition or presentation | Retain template owner, extract cohesive renderer and player parts where needed, finding 4 |
| `apps/web/tsconfig.json`                                                         |       22 lines | Tooling or workspace configuration  | Retain current structural owner                                                           |

### docs

| File                     | Lines or bytes | Responsibility                       | Structural disposition          |
| ------------------------ | -------------: | ------------------------------------ | ------------------------------- |
| `docs/authentication.md` |      186 lines | Product or engineering documentation | Retain current structural owner |

### docs/policies

| File                              | Lines or bytes | Responsibility                       | Structural disposition          |
| --------------------------------- | -------------: | ------------------------------------ | ------------------------------- |
| `docs/policies/acceptable-use.md` |       20 lines | Product or engineering documentation | Retain current structural owner |
| `docs/policies/child-safety.md`   |       19 lines | Product or engineering documentation | Retain current structural owner |
| `docs/policies/copyright.md`      |       17 lines | Product or engineering documentation | Retain current structural owner |
| `docs/policies/privacy.md`        |       25 lines | Product or engineering documentation | Retain current structural owner |

### docs/references

| File                                    | Lines or bytes | Responsibility                       | Structural disposition          |
| --------------------------------------- | -------------: | ------------------------------------ | ------------------------------- |
| `docs/references/letterly-blueprint.md` |      165 lines | Product or engineering documentation | Retain current structural owner |

### docs/reviews

| File                                                                         | Lines or bytes | Responsibility                       | Structural disposition       |
| ---------------------------------------------------------------------------- | -------------: | ------------------------------------ | ---------------------------- |
| `docs/reviews/2026-08-07-feat-stack-and-architecture.md`                     |       89 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-10-feat-data-model-completion.md`                      |       53 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-14-feat-data-model-completion-final-review.md`         |       47 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-14-feat-data-model-completion-post-debug-review.md`    |       29 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-14-feat-data-model-completion-post-expiry-rereview.md` |       30 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-14-feat-data-model-completion-post-expiry-review.md`   |       35 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-14-feat-data-model-completion-rereview.md`             |       47 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-14-feat-data-model-completion.md`                      |       46 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-15-feat-data-model-completion.md`                      |       78 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-15-protected-links-qr-sharing.md`                      |       34 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-16-feat-data-model-completion.md`                      |       30 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-21-main.md`                                            |       21 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-22-feat-design-system-ui-foundation.md`                |       31 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-23-feat-choose-your-heart-template-rereview.md`        |       40 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-23-feat-choose-your-heart-template.md`                 |      113 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-24-feat-launch-hardening-and-administration.md`        |       20 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-08-26-feat-launch-hardening-and-administration.md`        |       92 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-09-01-main.md`                                            |       63 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-09-09-refine-secret-letter-editor-redesign.md`            |       76 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-09-10-refine-secret-letter-editor-redesign.md`            |       56 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-09-14-feat-email-password-auth.md`                        |       81 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-09-15-feat-dashboard-overview-redesign-final-rereview.md` |       39 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-09-15-feat-dashboard-overview-redesign-final-review.md`   |       36 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-09-15-feat-dashboard-overview-redesign-rereview.md`       |       30 lines | Product or engineering documentation | Preserve historical evidence |
| `docs/reviews/2026-09-15-feat-dashboard-overview-redesign.md`                |       26 lines | Product or engineering documentation | Preserve historical evidence |

### docs/runbooks

| File                                                                           | Lines or bytes | Responsibility                       | Structural disposition          |
| ------------------------------------------------------------------------------ | -------------: | ------------------------------------ | ------------------------------- |
| `docs/runbooks/evidence/launch-hardening/2026-08-26-restore-drill-20260826.md` |       44 lines | Product or engineering documentation | Preserve historical evidence    |
| `docs/runbooks/evidence/launch-hardening/README.md`                            |        9 lines | Product or engineering documentation | Preserve historical evidence    |
| `docs/runbooks/evidence/launch-hardening/template.md`                          |       41 lines | Product or engineering documentation | Preserve historical evidence    |
| `docs/runbooks/launch-hardening-checklist.md`                                  |       44 lines | Product or engineering documentation | Retain current structural owner |
| `docs/runbooks/launch-hardening-restore.md`                                    |       85 lines | Product or engineering documentation | Retain current structural owner |

### docs/scope

| File                  | Lines or bytes | Responsibility                       | Structural disposition                                        |
| --------------------- | -------------: | ------------------------------------ | ------------------------------------------------------------- |
| `docs/scope/scope.md` |      444 lines | Product or engineering documentation | Reconcile current status and implementation facts, finding 14 |

### docs/specs

| File                                                                                    | Lines or bytes | Responsibility                       | Structural disposition                                                       |
| --------------------------------------------------------------------------------------- | -------------: | ------------------------------------ | ---------------------------------------------------------------------------- |
| `docs/specs/0001-stack-and-architecture.md`                                             |      224 lines | Product or engineering documentation | Reconcile current status and implementation facts, finding 14                |
| `docs/specs/0002-data-model/index.md`                                                   |      392 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0002-data-model/rationale.md`                                               |       73 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0002-data-model/verify.md`                                                  |       37 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0003-authenticated-secret-letter-draft-loop.md`                             |      310 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0004-api-errors-request-context.md`                                         |      315 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0005-public-secret-letter-publishing.md`                                    |      294 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0006-secret-letter-media.md`                                                |      300 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0007-protected-links-and-qr-sharing.md`                                     |      220 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0008-visitor-responses-and-creator-dashboard.md`                            |      323 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0009-design-system-ui-foundation/index.md`                                  |      360 lines | Product or engineering documentation | Resolve UI ownership and implementation conflict before migration, finding 3 |
| `docs/specs/0009-design-system-ui-foundation/rationale.md`                              |      105 lines | Product or engineering documentation | Resolve UI ownership and implementation conflict before migration, finding 3 |
| `docs/specs/0009-design-system-ui-foundation/verify.md`                                 |       44 lines | Product or engineering documentation | Resolve UI ownership and implementation conflict before migration, finding 3 |
| `docs/specs/0010-choose-your-heart-template/index.md`                                   |      240 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0010-choose-your-heart-template/rationale.md`                               |       41 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0011-launch-hardening-and-administration/0011-administration-api.md`        |       39 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0011-launch-hardening-and-administration/0011-administration-interface.md`  |       41 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0011-launch-hardening-and-administration/0011-moderation-state-and-data.md` |       44 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0011-launch-hardening-and-administration/0011-operational-readiness.md`     |       33 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0011-launch-hardening-and-administration/index.md`                          |      225 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0011-launch-hardening-and-administration/rationale.md`                      |       76 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0012-landing-page-enhancement.md`                                           |      188 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0013-secret-letter-cinematic-redesign.md`                                   |      208 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0014-guided-question-builder.md`                                            |      243 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0015-linear-question-builder.md`                                            |      260 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0016-romantic-glass-secret-letter.md`                                       |       69 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0017-shared-page-audio.md`                                                  |      218 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0018-email-password-verification-and-recovery.md`                           |      416 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0019-dashboard-overview-redesign.md`                                        |      243 lines | Product or engineering documentation | Retain current structural owner                                              |
| `docs/specs/0020-youtube-music-links.md`                                                |      292 lines | Product or engineering documentation | Reconcile current status and implementation facts, finding 14                |
| `docs/specs/0021-published-letter-overview.md`                                          |       29 lines | Product or engineering documentation | Retain current structural owner                                              |

### packages/config

| File                            | Lines or bytes | Responsibility                     | Structural disposition                                             |
| ------------------------------- | -------------: | ---------------------------------- | ------------------------------------------------------------------ |
| `packages/config/AGENTS.md`     |       32 lines | Durable project context            | Preserve curated context, update owned paths after migration       |
| `packages/config/CLAUDE.md`     |        6 lines | Durable project context            | Preserve curated context, update owned paths after migration       |
| `packages/config/package.json`  |       20 lines | Workspace manifest and scripts     | Retain package, reconcile intended local checks, finding 8         |
| `packages/config/src/index.ts`  |      390 lines | Validated runtime configuration    | Keep public loaders, separate API and web implementation as needed |
| `packages/config/tsconfig.json` |        7 lines | Tooling or workspace configuration | Retain current structural owner                                    |

### packages/contracts

| File                                         | Lines or bytes | Responsibility                     | Structural disposition                                              |
| -------------------------------------------- | -------------: | ---------------------------------- | ------------------------------------------------------------------- |
| `packages/contracts/AGENTS.md`               |       36 lines | Durable project context            | Preserve curated context, update owned paths after migration        |
| `packages/contracts/CLAUDE.md`               |        6 lines | Durable project context            | Preserve curated context, update owned paths after migration        |
| `packages/contracts/package.json`            |       32 lines | Workspace manifest and scripts     | Retain package, reconcile intended local checks, finding 8          |
| `packages/contracts/src/analytics.ts`        |       47 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/auth.ts`             |      119 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/catalog.ts`          |       34 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/errors.ts`           |      112 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/index.ts`            |       54 lines | Transport schema or API type       | Retain transport boundary, reconsider server ports and barrel scope |
| `packages/contracts/src/metrics.ts`          |      111 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/moderation.ts`       |      305 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/page-journeys.ts`    |      163 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/pages.ts`            |      519 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/questions.ts`        |      198 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/reports.ts`          |       24 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/submissions.ts`      |      141 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/src/visitor-identity.ts` |       83 lines | Transport schema or API type       | Retain current structural owner                                     |
| `packages/contracts/tsconfig.json`           |        4 lines | Tooling or workspace configuration | Retain current structural owner                                     |

### packages/database

| File                                                                                                         | Lines or bytes | Responsibility                     | Structural disposition                                       |
| ------------------------------------------------------------------------------------------------------------ | -------------: | ---------------------------------- | ------------------------------------------------------------ |
| `packages/database/.env.example`                                                                             |        5 lines | Environment setup template         | Retain current structural owner                              |
| `packages/database/AGENTS.md`                                                                                |       37 lines | Durable project context            | Preserve curated context, update owned paths after migration |
| `packages/database/CLAUDE.md`                                                                                |        6 lines | Durable project context            | Preserve curated context, update owned paths after migration |
| `packages/database/package.json`                                                                             |       33 lines | Workspace manifest and scripts     | Retain package, reconcile intended local checks, finding 8   |
| `packages/database/prisma.config.ts`                                                                         |       25 lines | Tooling or workspace configuration | Retain current structural owner                              |
| `packages/database/prisma/migrations/.gitkeep`                                                               |        1 lines | Source or workspace support        | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260808095209_initial_core/migration.sql`                              |      208 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260811210000_secret_letter_media/migration.sql`                       |       76 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260814170646_question_response_model/migration.sql`                   |      160 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260815100000_question_response_constraints/migration.sql`             |       22 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260816090000_visitor_response_tombstones_ordering/migration.sql`      |       39 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260822212721_add_page_journey_models/migration.sql`                   |      151 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260823120000_make_page_journey_foreign_keys_deferrable/migration.sql` |       58 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260823130000_release_deleted_submission_keys/migration.sql`           |        7 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260824120000_add_launch_hardening_and_administration/migration.sql`   |      187 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260825100000_add_question_finish_state/migration.sql`                 |        6 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260908090000_add_page_audio/migration.sql`                            |       29 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260909060000_add_page_audio_display_title/migration.sql`              |        5 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260911090000_reduce_image_caption_limit/migration.sql`                |       10 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260927130000_add_page_audio_links/migration.sql`                      |       28 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260929110000_add_page_visits/migration.sql`                           |       11 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260929120000_count_page_views/migration.sql`                          |        1 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/20260929130000_add_page_view_sessions/migration.sql`                    |       13 lines | Immutable database migration       | Preserve migration history and order, finding 16             |
| `packages/database/prisma/migrations/migration_lock.toml`                                                    |        3 lines | Tooling or workspace configuration | Preserve migration history and order, finding 16             |
| `packages/database/prisma/schema.prisma`                                                                     |      726 lines | Database schema                    | Retain current structural owner                              |
| `packages/database/prisma/seed.ts`                                                                           |      132 lines | Source or workspace support        | Retain current structural owner                              |
| `packages/database/src/client.ts`                                                                            |       69 lines | Source or workspace support        | Retain current structural owner                              |
| `packages/database/src/index.ts`                                                                             |        4 lines | Source or workspace support        | Retain current structural owner                              |
| `packages/database/src/json.ts`                                                                              |        1 lines | Source or workspace support        | Retain current structural owner                              |
| `packages/database/tsconfig.json`                                                                            |        8 lines | Tooling or workspace configuration | Retain current structural owner                              |

### packages/eslint-config

| File                                       | Lines or bytes | Responsibility                 | Structural disposition                                            |
| ------------------------------------------ | -------------: | ------------------------------ | ----------------------------------------------------------------- |
| `packages/eslint-config/AGENTS.md`         |       22 lines | Durable project context        | Retain location, enforce shared and inward boundaries, finding 10 |
| `packages/eslint-config/CLAUDE.md`         |        6 lines | Durable project context        | Retain location, enforce shared and inward boundaries, finding 10 |
| `packages/eslint-config/README.md`         |        3 lines | Workspace documentation        | Retain location, enforce shared and inward boundaries, finding 10 |
| `packages/eslint-config/base.js`           |       32 lines | Source or workspace support    | Retain location, enforce shared and inward boundaries, finding 10 |
| `packages/eslint-config/next.js`           |       57 lines | Source or workspace support    | Retain location, enforce shared and inward boundaries, finding 10 |
| `packages/eslint-config/package.json`      |       24 lines | Workspace manifest and scripts | Retain location, enforce shared and inward boundaries, finding 10 |
| `packages/eslint-config/react-internal.js` |       39 lines | Source or workspace support    | Retain location, enforce shared and inward boundaries, finding 10 |

### packages/templates

| File                                          | Lines or bytes | Responsibility                      | Structural disposition                                       |
| --------------------------------------------- | -------------: | ----------------------------------- | ------------------------------------------------------------ |
| `packages/templates/AGENTS.md`                |       45 lines | Durable project context             | Preserve curated context, update owned paths after migration |
| `packages/templates/CLAUDE.md`                |        6 lines | Durable project context             | Preserve curated context, update owned paths after migration |
| `packages/templates/package.json`             |       24 lines | Workspace manifest and scripts      | Retain package, reconcile intended local checks, finding 8   |
| `packages/templates/src/choose-your-heart.ts` |       86 lines | Template definition or presentation | Retain current structural owner                              |
| `packages/templates/src/graphemes.ts`         |       49 lines | Template definition or presentation | Retain current structural owner                              |
| `packages/templates/src/index.ts`             |      144 lines | Template definition or presentation | Retain current structural owner                              |
| `packages/templates/src/journey.ts`           |      393 lines | Template definition or presentation | Retain current structural owner                              |
| `packages/templates/src/media.ts`             |       17 lines | Template definition or presentation | Retain current structural owner                              |
| `packages/templates/src/secret-letter.ts`     |      151 lines | Template definition or presentation | Retain current structural owner                              |
| `packages/templates/tsconfig.json`            |        4 lines | Template definition or presentation | Retain current structural owner                              |

### packages/typescript-config

| File                                            | Lines or bytes | Responsibility                     | Structural disposition                                       |
| ----------------------------------------------- | -------------: | ---------------------------------- | ------------------------------------------------------------ |
| `packages/typescript-config/AGENTS.md`          |       21 lines | Durable project context            | Preserve curated context, update owned paths after migration |
| `packages/typescript-config/CLAUDE.md`          |        6 lines | Durable project context            | Preserve curated context, update owned paths after migration |
| `packages/typescript-config/base.json`          |       19 lines | Tooling or workspace configuration | Retain current structural owner                              |
| `packages/typescript-config/nextjs.json`        |       12 lines | Tooling or workspace configuration | Retain current structural owner                              |
| `packages/typescript-config/package.json`       |       14 lines | Workspace manifest and scripts     | Retain package, reconcile intended local checks, finding 8   |
| `packages/typescript-config/react-library.json` |        7 lines | Tooling or workspace configuration | Retain current structural owner                              |

### packages/ui

| File                              | Lines or bytes | Responsibility                     | Structural disposition                                                         |
| --------------------------------- | -------------: | ---------------------------------- | ------------------------------------------------------------------------------ |
| `packages/ui/AGENTS.md`           |       34 lines | Durable project context            | Preserve curated context, update owned paths after migration                   |
| `packages/ui/CLAUDE.md`           |        6 lines | Durable project context            | Preserve curated context, update owned paths after migration                   |
| `packages/ui/eslint.config.mjs`   |       86 lines | Tooling or workspace configuration | Retain current structural owner                                                |
| `packages/ui/package.json`        |       32 lines | Workspace manifest and scripts     | Retain package, reconcile intended local checks, finding 8                     |
| `packages/ui/src/button.tsx`      |       52 lines | Reusable presentation              | Retain shared owner, reconcile accepted UI spec and app duplication, finding 3 |
| `packages/ui/src/card.tsx`        |       28 lines | Reusable presentation              | Retain shared owner, reconcile accepted UI spec and app duplication, finding 3 |
| `packages/ui/src/code.tsx`        |       11 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/container.tsx`   |       27 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/css.d.ts`        |        4 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/dialog.tsx`      |      135 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/field.tsx`       |       89 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/icon-button.tsx` |       32 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/input.tsx`       |       24 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/link.tsx`        |       31 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/stack.tsx`       |       50 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/status.tsx`      |       48 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/test-setup.ts`   |       23 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/textarea.tsx`    |       30 lines | Reusable presentation              | Retain current structural owner                                                |
| `packages/ui/src/tokens.css`      |      138 lines | Styles or design tokens            | Retain current structural owner                                                |
| `packages/ui/src/ui.module.css`   |      362 lines | Styles or design tokens            | Retain shared owner, reconcile accepted UI spec and app duplication, finding 3 |
| `packages/ui/src/ui.test.tsx`     |      318 lines | Test suite or test support         | Retain current structural owner                                                |
| `packages/ui/tsconfig.json`       |        9 lines | Tooling or workspace configuration | Retain current structural owner                                                |
| `packages/ui/vitest.config.ts`    |        8 lines | Tooling or workspace configuration | Retain current structural owner                                                |

## Current state reconciliation, 2026-10-05

The October 2 inventory and October 3 closure table remain historical snapshots. [The fresh reconciliation](../../reviews/2026-10-05-repository-current-state.md) reviews all sixteen findings against source at `755d8d4`, with an inventory of 1,158 tracked files, current import/task checks, and unchanged baseline migration blobs. Later readiness, OpenAPI, database plan, transitive boundary, browser zoom, and owner extraction evidence supersedes pending statements in that earlier table. Shared UI acceptance, remaining cohesion review, and the explicitly recorded specification gaps remain open. This update does not certify the full objective complete.
