# Registering categories and templates

Catalog metadata is defined in `packages/templates/src/catalog.ts`. The trusted runtime registry, database seed, and browser catalog fixture consume those entries. React components and API business rules remain in their owning applications.

Canonical catalog evaluation validates category references, unique category/registry keys, positive safe versions, and unique category/renderer/version tuples through `validateCatalogIdentities`. Invalid registrations fail before registry construction can overwrite definitions. The database requires a globally unique registry key for each immutable version. Preserve the existing launch keys; a future version needs its own stable registry key, for example `confession.secret-letter.v2`, and its explicit API/web registrations. Version numbers alone do not create those integrations.

API policy and adapter maps use `createTemplateImplementationRegistry` with every canonical definition. Its construction rejects missing or unknown registrations and mismatched implementation keys or versions. It copies key bindings and resolves only the exact requested identity. Retain released version implementations when adding another key; saved pages must never select the newest binding. The wider provisioning, generator, and saved page proof is tracked in [template version retention](../specs/0022-repository-structure/0022-template-version-retention.md) and remains in progress.

Web editor, preview, and public component maps use `createWebTemplateImplementationRegistry` with every plain web registration. Each binding declares its exact `registryKey`, `version`, and `implementation`. Coverage and identity are validated by the same shared helper as API bindings. Keep each editor or preview's `dynamic(() => import("literal-path"))` call explicit in its owning map. Retained inactive versions stay registered. Preview dispatch receives renderer key, registry key, and pinned version together; a known family with an ambiguous or invalid identity must show unavailable content instead of falling through to catalog metadata.

## Generate an unregistered starter

With Node 24 or newer, you can inspect a starter before creating it:

```bash
pnpm scaffold:template --category celebration --template birthday-note --version 1 --dry-run
pnpm scaffold:template --category celebration --template birthday-note --version 1
pnpm scaffold:template --help
```

The example is a development starter, not additional launch content. Generation creates exactly three files:

```text
packages/templates/src/celebration/birthday-note/v1/definition.ts
apps/web/src/templates/celebration/birthday-note/v1/renderer.tsx
docs/templates/celebration/birthday-note/v1.md
```

The definition contains empty schemas and defaults, no capabilities, hidden audio, and explicit unregistered status. The renderer visibly states that it is unimplemented. The Markdown file and command output list the remaining registration steps, including a metadata draft for an unknown category. Replace these placeholders with the approved template design before integration.

Keys use lowercase letters and digits separated by single hyphens, start with a letter, and have at most 64 characters. Windows device names are rejected. Versions must be positive safe integers without leading zeros. Unknown/duplicate options, registered exact versions, derived registry key conflicts, occupied exact version directories or checklist files, case collisions, and linked ancestors fail before writes. Different categories may reuse a template key. Existing sibling versions are preserved.

To inspect a later starter beside the registered launch v1, use `pnpm scaffold:template --category confession --template secret-letter --version 2 --dry-run`. Normal generation creates the same three files under the category and template's v2 paths, and leaves existing launch folders unchanged. It derives `confession.secret-letter.v2` as the immutable registry key and `secret-letter` as the renderer key. Generation does not register v2, activate it, or migrate saved pages; retain v1 definitions and implementations when integrating another version.

Dry run creates nothing. Normal generation uses exclusive writes and never changes registrations, package exports, adapters, database records, migrations, or lockfiles. On failure it removes only owned, unchanged output. If ownership or contents changed, it preserves the paths and reports them for manual recovery. You can review those paths before retrying. There is no overwrite or activation flag.

Implementation and verification are recorded in [the scaffold generator spec](../specs/0022-repository-structure/0022-template-scaffold-generator.md).

## Add a category

Add a category definition with a stable key, name, description, display order, and explicit `ACTIVE` or `INACTIVE` provisioning status. Register its templates against that key. The seed upserts categories and templates from those definitions without adding another seed branch. Run the seed deliberately against the intended development database; a source change alone does not insert catalog rows.

Categories with new artwork or category specific marketing content also need presentation assets and copy. The canonical database metadata does not replace those distinct responsibilities.

## Add a template

1. Put its framework independent schemas, defaults, capabilities, audio policy, version, registry key, and renderer key in `packages/templates/src/`. Export it through the package boundary.
2. Add one entry to `templateDefinitions` in `src/catalog.ts`, referencing its definition, owning category, and explicit provisioning status. `src/registry.ts` retains all definitions, including `INACTIVE` entries, for exact saved page resolution.
3. Add new web presentation under `apps/web/src/templates/<category>/<template-key>/v<version>/`. Existing launch folders keep their established paths. Keep assets, styles, and motion beside that implementation. Editors receive typed values and callbacks. Page reads, writes, conflicts, authorization, and lifecycle controls belong to feature adapters.
4. Add presentation metadata keyed by the immutable registry key in `apps/web/src/templates/registration.ts`. Add a statically analyzable preview import in `src/features/catalog/preview/registered-preview.tsx`, a lightweight thumbnail entry in `src/templates/thumbnails.tsx`, and a public adapter in `src/features/pages/public/template-content.tsx`. These maps require compile time coverage of registered keys. Keep public projection narrowing inside each adapter and feature forms outside pure templates.
5. Add a plain draft initialization policy under `apps/api/src/modules/pages/application/templates/` and register its exact key and version in `draft-policies.ts`. Add its static editor import to `apps/web/src/features/pages/editor/draft-editor.tsx`. Both maps require coverage of canonical registry keys. The dispatcher owns the owner query; editors receive that existing result through `editor-context.ts`. Keep template requests and local state in the selected editor.
6. Add its plain publishing policy beside the draft policy and register it in `publish-policies.ts`. Describe content readiness and whether the existing owned journey lookup is required. PageService keeps shared audio checks, ownership, slug handling, metrics, and persistence orchestration.
7. Register a persistence publication adapter in `apps/api/src/modules/pages/infrastructure/templates/publication-adapters.ts`. Templates with no additional publication persistence can return a no-op prepared operation. Template-specific locks, revision selection, and promotion belong in the adapter, using only the transaction supplied by the repository. Acquire Page before PageJourney and commit only after the conditional Page update succeeds. Connect remaining API validation and transport projections for the behavior it needs; adding metadata alone does not implement new behavior or a persistence model.
8. Register its public repository mapper in `apps/api/src/modules/pages/infrastructure/templates/public-projection-adapters.ts`. Use the selected record, trusted definition, and prepared safe media to return only allowed template content and response fields. Keep database queries, availability predicates, media ownership/capability filtering, and password guards at the shared boundaries. Template-specific public settings and published content mapping belong to the adapter.
9. Register its API transport mapper in `apps/api/src/modules/pages/application/projections/public-projection-adapters.ts`. Map only the public body supplied by the repository and validate against the transport contract. PageService owns canonical identity, URLs, password guards, retries, and safe errors. Keep adapters independent of NestJS and database clients.
10. Register its owner detail and dashboard summary mapper in `apps/api/src/modules/pages/infrastructure/templates/owner-projection-adapters.ts`. Return only safe content/settings or recipient labels/previews. Validate stored registry, renderer, and version before dispatch. Password indicators, media, dates, ownership queries, and pagination stay shared. Journey summaries use the selected draft revision, with explicit choice fields.
11. Register its draft persistence adapter in `apps/api/src/modules/pages/infrastructure/templates/draft-persistence-adapters.ts`. The internal create port receives trusted identity from PageService. Prepare validated content/settings, defer constraints if necessary before page creation, and perform template writes afterwards using only the supplied transaction. The repository retains slug allocation and reservation, verifies created template identity before commit, and retries unique collisions.
12. Add contract and browser checks. The catalog tests check unique keys, category membership, valid defaults, registry identity, and seed metadata. Browser fixtures need stable template/version IDs in `apps/web/e2e/fixtures/catalog.ts` when a journey references them.

Keep existing keys and immutable versions stable. A materially changed template needs a deliberate version and migration decision, rather than silently changing pages that already reference its version.

Keep each retained descriptor's name and presentation metadata with its version. `resolveCatalogTemplate` resolves that descriptor by pinned identity, including inactive versions, and uses the same mismatch and ambiguity checks as definition resolution. Owner details and dashboard summaries use its name instead of the mutable database family name. Catalog family metadata may advance to the highest eligible version without relabeling saved pages. Public web metadata likewise comes from its exact presentation registration.

## Current ownership

- `packages/templates/src/secret-letter.ts`: Secret Letter schemas and definition.
- `packages/templates/src/choose-your-heart.ts`: Choose Your Heart schemas and definition.
- `packages/database/src/seed-catalog.ts`: Generic catalog upserts, accepting an injected store for tests.
- `apps/web/src/templates/choose-your-heart/editor.tsx`: Controlled graph authoring.
- `apps/web/src/features/pages/editor/choose-your-heart-editor.tsx`: Query, save, expected version, conflict, and publishing adapter.

- `apps/web/src/templates/choose-your-heart/renderer.tsx`: Visitor traversal, progress, outcomes, and message interaction.
- `apps/web/src/features/pages/public/choose-your-heart-page.tsx`: Validated submissions, idempotent retry, safe mutation states, and bounded metrics.
- `packages/templates/src/registry.ts`: `resolveTemplate` checks every supplied identity field and the immutable version. Explicitly undefined keys do not fall back to a different identity.

Web previews, thumbnails, public metadata, and public rendering now use explicit presentation registrations. Metadata resolution does not import React loaders. Preview dialogs mount samples only while open; route previews retain server rendering. Sample forms belong to catalog adapters and enter pure renderers through slots.

New catalog preview links carry category and immutable version. Existing `/preview/<template-key>` links work only when uniquely resolvable. A future category can reuse a template key, and a template can have multiple versions, but an ambiguous legacy link must show unavailable content. Unknown thumbnails use a generic placeholder. New API public projections include the globally unique registry key, renderer key, and pinned version, including locked safe metadata. Public web parsing, metadata, and rendering validate that same identity. Older responses without registry keys work only when name/version resolves uniquely. Supplied mismatches never fall back. Registry keys encode category ownership, so reusing a renderer name in another category does not require exposing database IDs.

Draft creation and content updates, application publication requirements, persistence publication, and creator editor selection use explicit registered policies, adapters, and loaders. Draft persistence initialization, owner detail/dashboard summaries, public repository mapping, and API transport projections use registered template adapters. Generic draft persistence invokes the selected pure update policy against the current locked content, preserving concurrency and image lifecycle behavior. Both launch update policies explicitly use their existing letter compatibility envelope. Owner content types, update commands, and shared public contracts still describe launch content; new shapes require a deliberate type/contract extension. Category metadata registration is shared; new template behavior still needs application implementation.

The scaffold generator creates unregistered starters with explicit integration and activation steps. Each retained version has its own globally unique registry key and all required API and web bindings. Do not treat new files or a version number alone as complete runtime integration. Later version generation is implemented; the combined saved page API/web proof remains in progress.

## Provision and retire a version

`createCatalogProvisioningPlan` groups descriptors by category and renderer key, retains every version, and orders versions numerically. Family catalog metadata comes from the highest active version, or the highest retained version when none is active. A family is active only when its category is active and at least one version is active. The seed writes one family row per group; browser fixtures use the same plan to produce one card with its active version choices.

Retire a version by setting its descriptor to `INACTIVE`, keeping its definition and API/web implementations registered, then deliberately provisioning the catalog in the intended environment. This removes its new draft eligibility while keeping saved page references and exact readers. The source status is authoritative when provisioning: setting a matching descriptor to `ACTIVE` explicitly reactivates that row. Unrepresented rows are not deleted or rewritten by the seed; retain released descriptors whenever saved pages may reference them.

The actual seed command uses `seedCatalogInTransaction` with bounded 30 second transaction wait and execution limits. Existing version upserts never update identity. A registry key conflict, or a lost identity match before the status write, aborts the transaction and rolls back category, family, and version changes. The seed has no Page write capability and performs no content migration. A metadata or version change requires deliberate source registration and release review, and never retargets an existing `Page.templateVersionId`.
