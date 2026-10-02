# Registering categories and templates

Catalog metadata is defined in `packages/templates/src/catalog.ts`. The trusted runtime registry, database seed, and browser catalog fixture consume those entries. React components and API business rules remain in their owning applications.

## Add a category

Add a category definition with a stable key, name, description, and display order. Register its templates against that key. The seed upserts categories and templates from those definitions without adding another seed branch. Run the seed deliberately against the intended development database; a source change alone does not insert catalog rows.

Categories with new artwork or category specific marketing content also need presentation assets and copy. The canonical database metadata does not replace those distinct responsibilities.

## Add a template

1. Put its framework independent schemas, defaults, capabilities, audio policy, version, registry key, and renderer key in `packages/templates/src/`. Export it through the package boundary.
2. Add one entry to `templateDefinitions` in `src/catalog.ts`, referencing its definition and owning category. `src/registry.ts` derives the trusted registry from this list.
3. Add its web presentation under `apps/web/src/templates/<template-key>/`. Keep assets, styles, and motion beside that implementation. Editors receive typed values and callbacks. Page reads, writes, conflicts, authorization, and lifecycle controls belong to feature adapters.
4. Connect its API validation and web dispatch for the behavior it needs. The existing API still has explicit branches for Secret Letter and Choose Your Heart; adding a catalog entry alone does not implement a new behavior or persistence model.
5. Add contract and browser checks. The catalog tests check unique keys, category membership, valid defaults, registry identity, and seed metadata. Browser fixtures need stable template/version IDs in `apps/web/e2e/fixtures/catalog.ts` when a journey references them.

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

API template workflows and web presentation dispatch still have explicit branches. Consolidate those through typed behavior adapters before considering a template generator. Category metadata registration is already shared; new template behavior still needs application implementation.
