# 0022. Category and template scaffold generator

**Date**: 2026-10-03
**Status**: Complete

## Summary

Add a small repository CLI that creates an unregistered template definition, a clearly labeled renderer placeholder, and a registration checklist. Use the existing Node runtime and templates workspace. Keep activation, business rules, API adapters, and database changes explicit. You accepted implementation on 2026-10-03 through the next milestone instruction.

## Context and registration review

The current registration workflow is documented in `docs/references/template-registration.md`. Categories and template metadata share one source in `packages/templates/src/catalog.ts`. Registry resolution, database seeding, and browser catalog fixtures consume that source. A new category needs metadata rather than another seed branch.

Template implementation spans these deliberate registrations:

| Responsibility                                     | Current owner                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Pure schemas/defaults/capabilities                 | `packages/templates/src/secret-letter.ts`, `choose-your-heart.ts`                                    |
| Package exports                                    | `packages/templates/package.json`, `src/index.ts`                                                    |
| Category/template metadata and trusted registry    | `packages/templates/src/catalog.ts`, `registry.ts`                                                   |
| Draft initialization and publish requirements      | API `application/templates/draft-policies.ts`, `publish-policies.ts`                                 |
| Draft creation and publication persistence         | API `infrastructure/templates/draft-persistence-adapters.ts`, `publication-adapters.ts`              |
| Owner detail/dashboard and public record mapping   | API `infrastructure/templates/owner-projection-adapters.ts`, `public-projection-adapters.ts`         |
| Validated public transport mapping                 | API `application/projections/public-projection-adapters.ts`                                          |
| Presentation metadata, thumbnails, preview imports | Web `templates/registration.ts`, `thumbnails.tsx`, `features/catalog/preview/registered-preview.tsx` |
| Editor and public feature adapters                 | Web `features/pages/editor/draft-editor.tsx`, `features/pages/public/template-content.tsx`           |
| Deliberate provisioning and fixtures               | `packages/database/src/seed-catalog.ts`, `apps/web/e2e/fixtures/catalog.ts`                          |

The two launch templates exercise these boundaries, but broader template behavior is not fully generic. Draft update persistence still writes letter fields in `prisma-pages.repository.ts`. API domain projections, shared response contracts, and web public parsing still describe the two existing template shapes. A new schema/capability needs its own implementation decision.

The runtime registry uses `Object.fromEntries` keyed by registry key; adding two versions of the same key would overwrite an entry. Several API/web maps also permit one implementation per key. Version comparison protects current pinned definitions but does not provide simultaneous version retention. The seed sets registered categories, templates, and versions ACTIVE. A starter must therefore remain outside catalog registration.

## Requirements

- AC-1: Provide `pnpm scaffold:template --category <key> --template <key> --version <integer>`, forwarding to the templates workspace. Support `--dry-run` and `--help`. Reject missing, duplicate, and unknown options; malformed keys; unsafe integer versions; path escapes; and existing identities/targets. Print stable actionable errors without changing files on validation failure.
- AC-2: Derive registry identity as `<category>.<template>`. Read registered identities from the canonical catalog through native TypeScript import. Reject an already registered registry key at every requested version until simultaneous version retention is implemented. Also reject an existing generated category/template directory, regardless of version, so an unregistered draft cannot be regenerated as a second version. Permit a new category and reuse of a template key in a different category because generated paths are fully namespaced.
- AC-3: Create only the three specified starter files with exclusive creation. Keep them unregistered, with explicit placeholder status and no working business flow implied. Never modify catalog arrays, package exports, adapter maps, existing files, database records, migrations, or lockfiles.
- AC-4: Dry run prints the same planned relative paths and registration checklist without creating directories or files. A repeated normal run rejects existing targets. Detect case insensitive path collisions and symlink/junction ancestors. On failure, remove only files/directories created by this invocation that remain unchanged and owned; report any preserved partial output for manual recovery.
- AC-5: Print category status, immutable identity/version, created/planned files, and the complete registration checklist below. Categorize missing integration as pending, never as activated or production ready. Unknown category output includes a category metadata draft in the checklist; existing categories require no new category record.
- AC-6: Add meaningful temporary workspace tests for validation, collisions, dry run, identity/version handling, exact generated sources, repeated execution, failure recovery, and unchanged registrations. Run through `pnpm test`; include maintained tooling in type/lint/format checks. Prove both launch templates and seed metadata remain unchanged. No live seed or new launch template is part of this milestone.

## Options considered

1. Continue the manual checklist. Lowest implementation cost, but repeated file setup and forgotten registration steps remain.
2. Add a small CLI in the existing templates workspace. Recommended: it reuses canonical identities, workspace checks, Node, and existing schemas without adding a generator framework.
3. Add a general generator framework or automatic registry rewriting. This adds dependencies and source transformation rules, and could activate incomplete definitions through the current seed. It exceeds the present need.

## Decision

Use option 2. Implement a TypeScript CLI under `packages/templates/tools/scaffold/`, invoked by native Node TypeScript support. Keep planning/rendering pure and filesystem work behind a small injected interface so failure tests are deterministic. Do not export tooling through browser package exports. Use Node filesystem/path utilities; no generator dependency or new workspace is needed. Add Node types at the version already used by this repository if required by tooling type checks.

Implementation skills: `nestjs-best-practices`, `vercel-react-best-practices`, `turborepo`, and `develop`, using their installed `.agents/skills/` instructions. The blueprint and established project dependencies take precedence over generic examples.

## Feature design

### Inputs and outputs

Keys must match `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`, be at most 64 characters, and reject Windows reserved device names and trailing dot/space forms. Version is a canonical decimal positive safe integer, with no leading zeros. Category/template are separate inputs; no arbitrary output directory, force overwrite, or activation flag is provided. Node 24 is required. Help, dry run, and successful generation exit with 0; validation, catalog loading, or write failure exits with 1.

Resolve the repository root from the CLI module location and verify the expected workspace files before writing. Preflight all outputs before any mutation. Output paths for a new identity are:

```text
packages/templates/src/<category>/<template>/v<version>/definition.ts
apps/web/src/templates/<category>/<template>/v<version>/renderer.tsx
docs/templates/<category>/<template>/v<version>.md
```

The definition exports named `templateScaffold` and `scaffoldStatus` (`unregistered`) values, with the derived registry key, renderer key, version, empty content/settings schemas and valid empty defaults, no optional capabilities, hidden audio, and no required content fields. It uses Zod directly within its owning package. These values are placeholders to replace before registration, not default policies for a finished template.

The renderer exports a named `TemplateScaffoldRenderer` with a visible static message that the template is unimplemented. It remains a Server Component with no effects, animation, forms, network calls, or third party imports. Do not generate blank CSS files, empty folders, generic API services, fake functional editors, or persistence adapters whose business rules are unknown.

The Markdown file records the identity, unregistered status, files, and checklist. Names/descriptions/artwork and real content models remain pending product design. Nested category/template/version paths avoid collisions between different categories; existing launch folders remain unchanged.

### Value sourcing

| Value                                           | Source                                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Category/template/version                       | Validated CLI arguments                                                                        |
| Registry key and output paths                   | Derived from those arguments and the fixed path layout                                         |
| Category existence and identity collision       | Canonical category/template definitions                                                        |
| Existing targets/case collisions/link ancestors | Filesystem preflight under the resolved root                                                   |
| Candidate schema/default/capability values      | Explicit inactive starter constants defined above                                              |
| Renderer placeholder                            | Fixed unimplemented message, no invented product content                                       |
| Registration instructions                       | The audited ownership table and checklist below                                                |
| Created files and recovery ownership            | This invocation's successful exclusive writes, captured file identity, and exact written bytes |

### Registration checklist

1. Decide category metadata, template design, real schemas/defaults/capabilities, and immutable version behavior.
2. Implement pure definition and public/preview/editor presentation. Add useful tests and styles only as required.
3. Add package subpath exports and public named exports. Use typed public package imports across applications.
4. Implement required draft/publish policies, persistence adapters, owner/public projections, contracts, and feature editor/public adapters. Extend shared types only through a deliberate capability/data decision.
5. Add literal preview/editor imports, lightweight thumbnail, and web metadata registrations. Keep data/query/authorization code out of pure renderers, preserve server content and accessibility, and avoid runtime filesystem discovery.
6. Add the category if absent and the template to canonical catalog metadata only after all required registrations compile and tests pass. The generator never performs this step.
7. Update fixtures and contract/browser checks. Preserve full identity, pinned version, and unavailable behavior for unknown/mismatched inputs.
8. Run gates and deliberately provision the intended development database. Current seed activates every registered entry; source registration and database activation are separate reviewed actions.

## Build plan

1. Implement argument validation, canonical catalog loading, root/path planning, collision checks, and dry run, with temporary fixtures (AC-1, AC-2, AC-4).
2. Render the three useful starters and checklist; add exclusive write/recovery handling and CLI output tests (AC-3, AC-4, AC-5).
3. Add workspace/root commands and include tooling tests in the existing Turbo test task. Ensure ESLint, TypeScript, and Prettier cover maintained tooling; generated fixture directories stay temporary (AC-6).
4. Verify generated starters compile in an isolated temporary checkout, registry arrays/seed behavior stay unchanged, and repository gates pass. Document usage and limitations (AC-2, AC-3, AC-6).

## Critical test scenarios

- Invalid, duplicated, missing options; traversal; Windows reserved names; malformed/unsafe versions fail without writes (AC-1, AC-4).
- Existing registry key at the same or a different version fails; a different category with the same template key gets distinct paths (AC-2).
- Dry run creates nothing; normal run creates exactly three valid files; repeat/case/link collisions preserve existing bytes (AC-3, AC-4).
- Mid write failure preserves unrelated/concurrently changed files and reports owned partial output if cleanup is unsafe (AC-4).
- New versus existing category checklist differs only in required metadata registration; all adapters/exports/provisioning remain explicit (AC-5).
- Source registration, seed metadata, and current page behavior remain unchanged; tooling/generation tests participate in repository gates (AC-6).

## Migration plan

Add tooling alongside the current manual workflow. Prove one fixture scaffold, then document normal use. Do not relocate launch definitions/presentations, rewrite registries, or activate a third template. Rollback removes only the tooling milestone; manually generated starters remain reviewable unregistered files. Risks are partial filesystem writes, platform path behavior, stale checklists, and mistaking starter generation for complete integration.

## Consequences

You get consistent initial files, collision checks, and a single actionable checklist. New template behavior still needs deliberate implementation. The first generator cannot create another version of an existing template, and it cannot make current response contracts accept arbitrary template shapes. Those restrictions prevent the tooling from concealing gaps in runtime extensibility.

## Rationale and follow-up

The repeated setup is small enough for an existing workspace CLI. Explicit source registrations retain type coverage and statically analyzable web imports. Runtime discovery or source rewriting would weaken those boundaries and could activate unfinished catalog entries.

Before registering additional live versions, change the registry and adapters to retain full key/version identities and prove old pages keep their pinned behavior. Before adding a new content shape, address draft update ownership and projection/contract extension. Generator implementation is authorized. No independent review has run. The parent structure migration remains In Progress.

## Implementation and verification

Implemented under `packages/templates/tools/scaffold/`, with root delegation, native Node execution, pure planning/rendering, an injected filesystem interface, exclusive writes, and ownership checked recovery. Tooling stays outside browser package exports. The templates test task records the external workspace marker and seed source inputs it reads in Turbo caching.

The generator suite has 46 passing tests using temporary workspaces, including generated definition/schema validation and isolated TypeScript compilation of both source starters. Repository lint, formatting, type checks, unit tests, and build passed. API integration has 568 passed tests and 7 database dependent skips. No live seed ran, no third template was registered, and the two launch identities remain unchanged.

Detailed evidence: [template scaffold verification](../../reviews/2026-10-03-template-scaffold-generator.md).
