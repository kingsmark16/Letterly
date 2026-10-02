# 0022. Repository structure and ownership

**Date**: 2026-10-02
**Status**: In Progress

## Summary

You already have a suitable monorepo foundation. Keep the Next.js web app, NestJS API, and current shared packages. Improve maintainability by making feature ownership explicit, reducing broad files, enforcing inward dependencies, and making the existing checks cover the code they claim to check.

The overall structure migration remains a proposal. You authorized the first verification milestone on 2026-10-02. Its implementation contract is [0022-verification-baseline.md](0022-verification-baseline.md). The original review changed no application source, routes, package names, database migrations, or runtime configuration; the first milestone adds tooling and mechanical formatting.

## Decision

The template registration and editor milestone is specified in [0022-template-registration-and-editor.md](0022-template-registration-and-editor.md). Its verification is recorded in [the milestone review](../../reviews/2026-10-02-template-registration-and-editor.md).

The public presentation and registry resolution slice is specified in [0022-public-template-adapter.md](0022-public-template-adapter.md), with evidence in [the adapter milestone review](../../reviews/2026-10-02-public-template-adapter.md).

The web presentation registration slice is specified in [0022-web-template-registration.md](0022-web-template-registration.md), with verification in [the web registration review](../../reviews/2026-10-02-web-template-registration.md).

The draft policy and creator editor slice is specified in [0022-draft-template-adapters.md](0022-draft-template-adapters.md), with evidence in [the draft adapter review](../../reviews/2026-10-02-draft-template-adapters.md).

The application publishing policy slice is specified in [0022-publish-template-policies.md](0022-publish-template-policies.md), with evidence in [the publishing policy review](../../reviews/2026-10-02-publish-template-policies.md).

The persistence publication slice is specified in [0022-persistence-publication-adapters.md](0022-persistence-publication-adapters.md), with evidence in [the persistence publication review](../../reviews/2026-10-02-persistence-publication-adapters.md).

**Recommended option**: Gradual restructuring within the existing modular monolith, with automated boundary checks.

The alternative is one coordinated repository migration. That would give you a consistent tree sooner, but it combines route, dependency injection, styles, tests, and import changes in a difficult review. Documentation alone has the smallest immediate cost, but would leave the current dependency drift unenforced.

Use the existing flat numbering under `docs/specs/`. Do not migrate historical specs into workspace folders as part of this change.

## Standard definition

### Repository ownership

```text
Letterly/
  apps/
    web/                         Next.js deployment
    api/                         NestJS deployment
  packages/
    contracts/                   Zod transport schemas and API types
    templates/                   Pure template definitions and validation
    database/                    Prisma schema, migrations, generated client boundary
    config/                      Validated runtime configuration
    ui/                          Shared presentation primitives and tokens
    eslint-config/               Shared lint configurations
    typescript-config/           Shared compiler configurations
  docs/
    specs/                       Decisions and proposals
    references/                  Product reference
    reviews/                     Historical code review evidence
    runbooks/                    Operational procedures and evidence
    policies/                    Policy source documents
    scope/                       Living product scope
  infrastructure/                Deployment and service files when introduced
  .github/workflows/             GitHub Actions entry files
```

Keep application dependencies in their application manifests. Keep root dependencies limited to repository tooling. Keep generated code and local tool artifacts ignored. Keep the lockfile at the root. A folder is created only when it has a real owner and real files.

### Web ownership

Keep `apps/web/app/` during the first migrations. Both root `app` and `src/app` are supported by Next.js. The project blueprint requires a separate migration to move the existing route tree.

```text
apps/web/
  app/                           Thin route entries, layouts, metadata, route handlers
  assets/                        Imported images and local fonts
  public/                        Files served at stable public URLs
  scripts/                       Web workspace tooling
  e2e/                           Browser journeys
  src/
    features/
      auth/                      Account screens and auth interaction
      admin/                     Moderation and audit screens
      catalog/                   Catalog loading, selection, preview orchestration
      landing/                   Landing sections and their styles
      legal/                     Reusable policy document presentation
      pages/
        api/                     Page endpoint functions and query keys
        editor/                  Draft editing and page settings
        dashboard/               Creator workspace and page lists
        public/                  Page unlock, reports, visitor interaction
        responses/               Private creator response presentation
        media/                   Shared page image and audio editing
    templates/
      secret-letter/             Template specific editor, preview, renderer, motion
      choose-your-heart/         Template specific editor, preview, renderer, motion
    components/
      layout/                    Shared site shell and footer
      feedback/                  Shared loading and confirmation presentation
      ui/                        Deliberately web specific primitives
    lib/
      api/                       Shared Axios transport and safe error conversion
      server/                    Common server configuration and proxy helpers
```

This is an ownership sketch, not a requirement to create every listed directory immediately. Keep responses and media within the pages feature initially. Extract a separate feature only when independent callers and responsibilities justify it.

Move endpoint functions out of `src/lib/api-client.ts` by owning feature. Keep transport, credentials, timeout, cancellation, response parsing, and safe error conversion centralized. Keep server readers separate from browser clients and mark server modules with `server-only` where appropriate. Move `apps/web/lib/catalog.ts` and its tests to catalog ownership, preserving its explicit retry and cache behavior.

Route files may fetch initial data, define metadata, and compose screens. Another feature should not import reusable content from a `page.tsx` file. Reusable legal content belongs in `features/legal`; route wrappers and the landing dialog consume it there.

Templates own their specific visitor presentation and motion. A template editor can receive typed values and callbacks from the pages feature. It should not need to own page persistence or creator authorization. Moving Choose Your Heart needs this separation, rather than merely relocating its API dependent editor.

Shared `Button` and `Card` ownership needs reconciliation with accepted spec 0009 before migration. Prefer the existing shared UI package as the canonical owner for truly shared primitives. Keep web specific chart and tab composition local unless another consumer needs it. Preserve loading semantics, focus, keyboard behavior, and all existing public import paths until their callers are migrated.

Keep component styles beside the components they style. Shared tokens stay in `packages/ui`. Do not move template styles into global CSS. Split broad stylesheets by actual component responsibility, preserving cascade order and responsive rules.

### API ownership

```text
apps/api/src/
  main.ts                        Startup
  app.module.ts                  Application composition
  infrastructure/                Shared database, HTTP, storage, monitoring adapters
  modules/
    pages/
      pages.module.ts            Nest provider and controller wiring
      domain/                    Plain types, invariants, and domain errors
      application/
        lifecycle/               Page lifecycle use cases and ports
        media/                   Upload and attachment use cases and ports
        access/                  Password and unlock use cases and ports
        questions/               Question use cases and ports
        journeys/                Journey use cases and ports
        submissions/             Private response use cases and ports
        analytics/               Operational and owner analytics use cases and ports
      infrastructure/            Prisma repositories and provider implementations
      presentation/
        controllers/             Owner, public, media, and response HTTP controllers
        mappers/                 Safe transport projections
    auth/                        Provider integration and HTTP boundary
    admin/                       Moderation application, infrastructure, presentation
    catalog/                     Small catalog feature, layering where needed
```

Keep the pages aggregate together. Separate use cases and controllers by responsibility before introducing additional Nest modules. Do not split transactions or lock ownership merely to make files smaller.

The dependency direction is presentation and infrastructure toward application, and application toward domain. Application code can depend on plain interfaces, but not NestJS decorators, Prisma types, HTTP cookie parsing, concrete image processors, or database recovery implementations. Use provider factories in the Nest module to construct plain use cases. Keep DI tokens and infrastructure bindings in composition code. Treat runtime cryptography and provider operations as explicit ports when isolating those use cases.

Move the Prisma availability query builder from application into infrastructure. If domain code needs availability rules, represent those rules with plain values and translate them into Prisma predicates in the repository. Preserve all creator moderation, expiry, publication, and current slug predicates.

Keep controllers thin. Split owner lifecycle, owner media, questions, submissions, journeys, analytics, and public operations into cohesive controllers without changing HTTP paths. Preserve guards, request validation, rate limits, identity forwarding, safe error mapping, streaming headers, and route specificity.

Separate admin repository interfaces from Prisma implementations, which currently share files. Small features do not need empty domain directories or a service for every helper. Auth provider code may remain a provider integration rather than copying the pages folder tree mechanically.

### Shared packages and checks

Keep `contracts -> templates` as an explicit package dependency. Keep the database seed dependency on template definitions. Neither implies that web code should import database code.

Use package exports for consumers and relative imports inside a package. Existing source exports are a valid internal package strategy. Do not compile every package into `dist` simply for consistency.

Separate API and web configuration implementation modules while preserving their current public loaders. Shared schemas remain pure. Revisit the broad contracts barrel only when moving an actual caller. Infrastructure ports belong to the owning application or server boundary, not the browser transport barrel by default.

Make validation commands read only. Put ESLint fixes under `lint:fix`. Add meaningful lint tasks to authored shared TypeScript packages. Use a shared base plus a Nest specific lint configuration, and migrate the API to a deliberate strict compiler baseline. Do not enable a stricter rule across all files without documenting and resolving the resulting violations.

Add a repository `format:check` covering intended source and configuration extensions with explicit ignores. CI should run unit tests in every test enabled workspace, explicit Prisma validation, integration tests, and the intended browser smoke suite. Wire catalog and Next configuration tests into web commands. Migrating API Jest to Vitest is a separate tooling decision, not a folder move.

Turbo tasks that read dependency source need a dependency aware cache key. Add a transit task or suitable upstream task dependencies for unit tests. Confirm invalidation by changing a shared template source and observing the API test hash change. Keep tests that touch external databases uncached unless their environment and isolation are explicitly modeled.

## Skill alignment requirements

The restructuring must also follow the installed `nestjs-best-practices` and `vercel-react-best-practices` skills. Read the relevant individual rule files when implementing each slice. The project blueprint and your established technology choices govern adaptations of generic examples. The evidence and rule mapping are recorded under Skill alignment in [rationale.md](rationale.md).

### NestJS

Keep features encapsulated in Nest modules. Use explicit module imports and exports, constructor injection, and runtime tokens for interfaces. Construct framework independent application use cases with provider factories. Keep Nest decorators at composition, infrastructure, and transport boundaries. Do not introduce circular dependencies, service locators, duplicate provider registrations, or request scoped providers without an actual need.

Keep database work behind repositories. Preserve transactions, lock ordering, narrow projections, pagination, and migration history. Split broad services and controllers by their responsibility. Verify query count and plans before claiming a database performance improvement.

Preserve Zod input pipes, Better Auth session guards, ownership policies, route limits, safe projections, and the existing ApiException envelope and filter. Application errors stay framework independent and map to HTTP at the boundary. Preserve startup validation, request IDs, safe logging, readiness, and resource shutdown behavior while moving their owners.

Use plain unit tests for framework independent logic and Nest TestingModule for provider wiring. Supertest verifies HTTP behavior. Existing Jest tests remain supported during this migration. Mock external providers in unit tests and verify database invariants in isolated integration tests.

### React and Next.js

Keep initial public reads and route composition on the server. Keep client boundaries around actual interactions. Start independent requests together, and preserve intentional sequencing for authorization, dependent writes, and transactions. Use Suspense only where streaming improves a real loading experience.

Load heavy preview content, charts, and optional template dependencies at the interaction or section boundary that needs them. Use literal dynamic import paths. Keep essential public letter content server rendered and preserve route fallbacks, keyboard access, loading feedback, and focus restoration. Measure route bundles before and after extraction; dynamic imports alone do not establish an improvement.

Use public typed package subpaths for runtime imports where available. Type only imports are erased and are not evidence of a browser bundle problem. Do not bypass package exports to follow a generic direct import example.

Keep TanStack Query as the owner of remote data, with stable scoped keys, targeted invalidation, and bounded retry behavior. Thread its AbortSignal through read functions into Axios. Intentional cancellation should not display a misleading offline error. Do not assume canceling a mutation cancels the server write.

Derive display values during rendering. Keep local editing state distinct from server snapshots. Preserve dirty drafts, stale version conflicts, file upload state, URL cleanup, media events, and external subscriptions when revisiting effects. Test those behaviors before simplifying synchronization. Memoize expensive work only when profiling establishes a benefit.

Keep request and creator state local to the request or component tree. Pass only the required safe DTO fields across server and client boundaries. Do not introduce shared caches or local storage for sessions, drafts, locked bodies, unlock proofs, dashboard data, or private responses. Safe static configuration and browser provider singletons need separate treatment from private request state.

### Alignment verification

Each implementation milestone records the skill rule IDs it addresses, the affected files, and actual verification results. The first baseline milestone includes coverage of both applications and their shared packages. API moves require unit, provider wiring, and relevant HTTP/database checks. Web moves require type checks, production builds, and the relevant browser journeys, including dirty form recovery, preview loading, focus, mobile layout, and reduced motion where affected.

Bundle size, request count, and render performance claims need recorded measurements. Pending checks and rule categories not yet audited remain explicitly pending. Adding this requirement to the proposal does not certify the current application as fully compliant.

## Future category and template extensibility

You require straightforward additions of categories and templates with minimal repeated boilerplate. This is now part of the restructuring target. The launch still contains one active category and two templates. This section prepares extension points without activating additional product content.

### Registration and ownership

Use three explicit, typed registration boundaries:

1. `packages/templates`: trusted pure definitions, including immutable identity, schemas, defaults, capabilities, publish requirements, and versioned render model types. No React, NestJS, Prisma, authorization, or provider calls.
2. API template adapters inside `apps/api/src/modules/pages`: template specific draft initialization, validation, publish preparation, and safe projection behavior. Shared lifecycle use cases resolve a registered adapter after checking the database version. Keep persistence and authorization in the API, outside pure definitions.
3. Web presentation registry inside `apps/web/src/templates`: typed editor, preview, thumbnail, and public presentation entry points for each supported version. Use statically analyzable paths and separate server presentation from lazy client interaction so a registry does not eagerly import all template renderers into every route.

Catalog records supply category and template names, descriptions, ordering, and activation. A code owned publication manifest can supply initial records for controlled provisioning. Runtime category lists come from validated catalog responses, not a second fixed list in route components. Presentation assets and category icons may use a small explicit registry with a safe fallback. Absence of an icon must not make an otherwise valid category unavailable.

Category identity is the category key. Template identity includes the category and template key. A published definition additionally has its immutable version identity. The database currently permits the same template key in different categories, so bare `templateKey` is insufficient for global resolution. Creator operations can use `templateVersionId` as they already do; the server resolves its full trusted identity. Browser preview and renderer selection must receive that full validated identity and preserve existing preview URLs through compatibility resolution.

The current database also makes `TemplateVersion.registryKey` globally unique. Recommend preserving existing keys and assigning a distinct stable registry key to each future immutable version. Do not overwrite an earlier definition under the same key. Code resolution checks both registry key and recorded version. Any alternative composite key schema requires its own deliberate migration before adoption.

### Consistent folder convention

Use the same category, template, and version identity in definition and presentation ownership. A possible target for new modules is:

```text
packages/templates/src/definitions/<category>/<template>/v1/
  definition.ts
  content.schema.ts
  settings.schema.ts
  render-model.schema.ts
  defaults.ts
  definition.test.ts

apps/web/src/templates/<category>/<template>/v1/
  editor.tsx
  preview.tsx
  renderer.tsx
  thumbnail.tsx
  renderer.module.css
  index.ts

apps/api/src/modules/pages/templates/<category>/<template>/v1/
  template-adapter.ts
  template-adapter.spec.ts
```

This convention identifies responsibilities, not a minimum file count. Small schemas and defaults can share one definition file. A template can reuse its renderer for preview rather than create a duplicate preview implementation. Shared capability infrastructure remains shared; a template only implements the specific behavior it needs. Preserve existing exported subpaths and old version readers as current files migrate.

### Reuse and variability

Reuse page ownership, lifecycle, slug handling, moderation, passwords, upload authorization, private submission access, query transport, UI primitives, and capability controls. Shared services receive typed template behavior instead of branching on names. Keep content schema, defaults, layout, animation, interactive journey rules, and safe content mapping specific to the template when they actually differ.

Do not force all templates into Secret Letter fields or one universal content schema. Shared API envelopes carry lifecycle and identity fields; template payloads are validated by their registered version. Preserve type correlation between definition, content, editor, render model, and public projection. Narrow through typed adapters or an exhaustive discriminated boundary, not `any` or unchecked casts.

Unknown, inactive, or unsupported versions fail safely. A generic thumbnail or unavailable preview is acceptable presentation fallback. Rendering an unknown template as Secret Letter or accepting generic unvalidated content is not a safe fallback. Locked payloads remain generic safe metadata and do not contain private template bodies.

### Adding a category or template

A category with existing supported capabilities should require catalog metadata and optional visual metadata. It should not require a new route, database table, controller, or copy of the catalog feature. Its activation remains a controlled product/release action.

A template addition should require its own pure definition, API adapter where behavior differs, web presentation, explicit registry entries, catalog provisioning metadata, and tests. It should not require rewriting generic page lifecycle services, preview routes, capability controls, or the catalog listing. A genuinely new capability can legitimately require a schema or API change and deserves a separate feature decision.

After proving the pattern with the two current templates, add a repository generator that accepts category key, template key, and version. It should validate key format, reject existing identities or folders, generate only useful starter files, use placeholder content rather than silently activate catalog entries, and print the remaining explicit registration steps. Generate boilerplate only; do not rewrite established implementations through text replacement. Add no generator dependency until that implementation choice is needed.

### Extensibility verification

Use a shared template contract suite for registered defaults, schema validity, capability consistency, version resolution, safe projection, missing optional content, long content, and unsupported inputs. Template specific tests cover behavior that the contract cannot express. Browser checks cover mobile, keyboard, reduced motion, preview/public consistency, and readable fallback content for each template.

Prove a future descriptor can be added in isolated test fixtures without editing generic route or lifecycle logic. Confirm cross category key collisions resolve by full identity, unknown versions fail safely, inactive records cannot create new pages, and existing pages keep the behavior of their pinned version. Fixture coverage does not activate a third launch template.

Before wider catalog growth, verify pagination, indexed catalog queries, bounded media and submission work, and template bundle isolation with actual measurements. Dynamic registration is trusted source registration and catalog metadata, not executable templates uploaded through an administrator interface or arbitrary runtime filesystem discovery.

## Rollout

Use small milestones with unchanged behavior, following the project's tracer bullet approach.

1. Establish the check baseline and fix task coverage before moving application code. Reconcile the conflicting UI ownership spec and application boundary guidance.
2. Prove one narrow ownership migration: extract reusable legal documents from route entry files, update both policy routes and landing dialogs, and verify them in the browser.
3. Extract the shared HTTP transport and migrate one page endpoint and its callers end to end. Continue feature endpoint migrations only after the first slice passes.
4. Separate one owner controller and its corresponding adapter/use case. Verify the same route, ownership checks, response envelope, and persistence behavior before extending the pattern.
5. Group editor, dashboard, responses, and media files, moving colocated styles and tests with their owners. Split large files by cohesion and evidence.
6. Prove definition, API adapter, and web presentation registration with the two existing templates; remove generic name branching, establish a shared contract suite, and consolidate shared primitives after resolving spec 0009. Add a generator only after this pattern is verified.
7. Consider a dedicated `app` to `src/app` migration after the preceding changes are stable. Update relative imports, local font and image paths, proxy placement, Tailwind source discovery, tests, and documentation together.
8. Reconcile durable context and obsolete path references after each completed milestone. Preserve historical evidence and immutable database migration history.

The first milestone is authorized and implemented as a verification baseline. The remaining milestones are proposed migrations. Each implementation slice should record its behavior checks and use a conventional commit. Revert application changes if a slice fails; do not rewrite database history.

## Consequences

You get clearer file ownership, smaller review units, and boundaries that tooling can enforce. Existing routes, template contracts, and workspace relationships provide useful seams for gradual migration.

The cost is several coordinated milestones. Controller extraction can change decorator behavior or route precedence. Stylesheet extraction can change the cascade. Shared UI consolidation can change loading or accessibility behavior. A route root migration changes asset and import paths. Each needs targeted verification beyond a compiler check.

Folder organization improves development and team scalability. It does not by itself improve throughput, database performance, storage cost, or runtime availability.

## Follow-up

The remaining migrations need their own implementation contracts. The full evidence, known limitations, prioritized findings, and every tracked file are in [rationale.md](rationale.md).

An independent review of the proposal can check migration completeness before implementation. No independent proposal review has run yet.

## Rationale

See [rationale.md](rationale.md) for the complete repository structure review.
