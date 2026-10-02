# Registering categories and templates

Catalog metadata is defined in `packages/templates/src/catalog.ts`. The trusted runtime registry, database seed, and browser catalog fixture consume those entries. React components and API business rules remain in their owning applications.

## Add a category

Add a category definition with a stable key, name, description, and display order. Register its templates against that key. The seed upserts categories and templates from those definitions without adding another seed branch. Run the seed deliberately against the intended development database; a source change alone does not insert catalog rows.

Categories with new artwork or category specific marketing content also need presentation assets and copy. The canonical database metadata does not replace those distinct responsibilities.

## Add a template

1. Put its framework independent schemas, defaults, capabilities, audio policy, version, registry key, and renderer key in `packages/templates/src/`. Export it through the package boundary.
2. Add one entry to `templateDefinitions` in `src/catalog.ts`, referencing its definition and owning category. `src/registry.ts` derives the trusted registry from this list.
3. Add its web presentation under `apps/web/src/templates/<template-key>/`. Keep assets, styles, and motion beside that implementation. Editors receive typed values and callbacks. Page reads, writes, conflicts, authorization, and lifecycle controls belong to feature adapters.
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

## Current ownership

* `packages/templates/src/secret-letter.ts`: Secret Letter schemas and definition.
* `packages/templates/src/choose-your-heart.ts`: Choose Your Heart schemas and definition.
* `packages/database/src/seed-catalog.ts`: Generic catalog upserts, accepting an injected store for tests.
* `apps/web/src/templates/choose-your-heart/editor.tsx`: Controlled graph authoring.
* `apps/web/src/features/pages/editor/choose-your-heart-editor.tsx`: Query, save, expected version, conflict, and publishing adapter.

* `apps/web/src/templates/choose-your-heart/renderer.tsx`: Visitor traversal, progress, outcomes, and message interaction.
* `apps/web/src/features/pages/public/choose-your-heart-page.tsx`: Validated submissions, idempotent retry, safe mutation states, and bounded metrics.
* `packages/templates/src/registry.ts`: `resolveTemplate` checks every supplied identity field and the immutable version. Explicitly undefined keys do not fall back to a different identity.

Web previews, thumbnails, public metadata, and public rendering now use explicit presentation registrations. Metadata resolution does not import React loaders. Preview dialogs mount samples only while open; route previews retain server rendering. Sample forms belong to catalog adapters and enter pure renderers through slots.

New catalog preview links carry category and immutable version. Existing `/preview/<template-key>` links work only when uniquely resolvable. A future category can reuse a template key, and a template can have multiple versions, but an ambiguous legacy link must show unavailable content. Unknown thumbnails use a generic placeholder. New API public projections include the globally unique registry key, renderer key, and pinned version, including locked safe metadata. Public web parsing, metadata, and rendering validate that same identity. Older responses without registry keys work only when name/version resolves uniquely. Supplied mismatches never fall back. Registry keys encode category ownership, so reusing a renderer name in another category does not require exposing database IDs.

Draft creation, application publication requirements, persistence publication, and creator editor selection use explicit registered policies, adapters, and loaders. Draft persistence initialization uses registered adapters. Draft updates and landing artwork still contain explicit template branches or compatibility assumptions. Owner detail and dashboard summaries, public repository mapping, and API transport projection construction use registered template adapters. Consolidate those before considering a generator. Category metadata registration is shared; new template behavior still needs application implementation.
