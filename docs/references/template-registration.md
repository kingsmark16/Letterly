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
6. Add its plain publishing policy beside the draft policy and register it in `publish-policies.ts`. Describe content readiness and whether the existing owned journey lookup is required. PageService keeps shared audio checks, ownership, slug handling, metrics, and persistence orchestration. Connect API validation, locked persistence publication, and transport projection for the behavior it needs. Persistence and projection layers still contain explicit template branches; adding a catalog entry alone does not implement a new behavior or persistence model.
7. Add contract and browser checks. The catalog tests check unique keys, category membership, valid defaults, registry identity, and seed metadata. Browser fixtures need stable template/version IDs in `apps/web/e2e/fixtures/catalog.ts` when a journey references them.

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

New catalog preview links carry category and immutable version. Existing `/preview/<template-key>` links work only when uniquely resolvable. A future category can reuse a template key, and a template can have multiple versions, but an ambiguous legacy link must show unavailable content. Unknown thumbnails use a generic placeholder. The API public projection currently supplies only key and version, so a collision there remains unavailable until its transport contract carries full identity.

Draft creation, application publication requirements, and creator editor selection use explicit registered policies and loaders. Locked persistence publication, public projection parsing, and landing artwork still contain explicit template branches. Consolidate those before considering a generator. Category metadata registration is shared; new template behavior still needs application implementation.
