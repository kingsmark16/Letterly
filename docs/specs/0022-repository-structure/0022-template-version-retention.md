# 0022. Template version registration and retention

**Date**: 2026-10-03
**Status**: In Progress

## Objective

You can register a later version of a template while retaining earlier definitions, API behavior, and web presentations for saved pages. New drafts use explicitly eligible catalog versions. Existing pages always use the version they already reference. Adding v2 must never rewrite a v1 page reference, overwrite its trusted definition, substitute the newest adapter, or silently reactivate a retired version.

You requested this next priority during the administration milestone and authorized automatic implementation. This extends the accepted globally unique registry key decision in [catalog identity invariants](0022-catalog-identity-invariants.md), rather than changing database identity or adding launch content.

## Starting evidence

- Page stores immutable templateVersionId. Draft creation reads an active version by its ID. Owner, public, update, and publication paths resolve the saved registry key and version.
- Canonical registry validation permits v1 and v2 with distinct keys. Existing launch v1 keys remain unchanged; future version keys use a stable version suffix, for example confession.secret-letter.v2.
- Seven API registration maps cover canonical registry keys at compile time, but resolve through duplicated first match loops. A map can associate a canonical key with an implementation carrying the wrong identity or version without failing registration immediately.
- Web metadata and component maps are keyed by registry identity. Exact lookup is supported; ambiguous legacy inputs fail closed. Static editor and preview imports must remain statically analyzable for Next.js.
- Catalog versions are ordered by version, and new draft cards select the last eligible catalog version. Existing public and owner rendering uses saved identities rather than that selection.
- seedCatalog currently writes registryKey into existing version rows and sets all registered records ACTIVE. Its flat descriptor iteration also upserts shared template metadata once per version.
- The generator rejects an existing template at every version and rejects its whole identity directory. It cannot produce a v2 starter beside v1.

## Decision

Retain explicit trusted source registration and globally unique registry keys. Keep legacy v1 keys, and derive generator keys as category.template for v1 and category.template.vN for later versions. Each version owns its schema, defaults, capabilities, immutable key, policies, persistence behavior, projections, and presentations. Existing exported launch paths remain compatible. Future implementations use category/template/vN paths. Reuse is explicit at registration; a later version never automatically aliases an earlier renderer or schema.

Use a framework independent implementation registry in the templates package for API bindings. At construction it validates canonical coverage, absence of unknown keys, and exact implementation registryKey/version identity. It copies bindings into a private lookup rather than depending on subsequent map mutation. Resolution returns only an exact key and version, with no latest fallback. Each existing API map retains its own typed responsibility; the helper removes duplicated identity rules without creating a universal template payload.

Add explicit ACTIVE or INACTIVE provisioning status to canonical category and version descriptors. Existing launch descriptors stay ACTIVE. All trusted definitions, including inactive ones, remain in runtime and web registries. Status controls deliberate catalog provisioning and creation eligibility, never whether an existing page can resolve its pinned version. Group seed entries by category and renderer key, write one shared template record, and write every retained version. Shared catalog metadata comes from the highest active version, or highest retained version if none is active. The template is ACTIVE only when its category is active and at least one version is active. Public and owner version behavior, including version specific presentation metadata, must derive from the saved identity rather than mutable shared family metadata when that distinction matters.

Provisioning must never change the registry key of an existing templateId/version row. An existing row with a different key causes a safe developer facing conflict instead of retargeting it. Read or upsert without changing existing identity, then guard any status update by the exact saved identity. The actual seed command runs catalog writes in a Prisma transaction so a conflict rolls back partial metadata and status changes. No existing Page.templateVersionId is updated. Source registration and status changes remain deliberate release actions; this work runs no live seed or migration.

Allow scaffold generation only for an unoccupied exact category/template/version identity. Existing sibling versions and legacy launch folders are preserved. Reject registered exact identities, conflicting derived registry keys, existing exact version output, case collisions, linked ancestors, and unsafe roots before writes. Keep exclusive creation, bounded owned output cleanup, dry run, and explicit registration checklists. The generator never adds registrations or changes provisioning status.

## Requirements

- AC-1: Add the exact implementation registry helper, meaningful v1/v2 fixtures, and exported package boundary. Migrate all seven API maps (draft policy, publish policy, draft persistence, publication, owner projection, public persistence projection, and public transport projection). Enforce exact coverage and identity at startup and preserve existing launch behavior.
- AC-2: Add explicit provisioning eligibility and grouped catalog planning. Fixtures retain both v1 and v2, choose the highest eligible version only for new draft selection, preserve inactive readers, and avoid duplicate template cards or repeated family writes. Unknown and ambiguous identities remain unavailable.
- AC-3: Guard database version identity against replacement and provision all retained versions atomically through the actual seed command. Tests prove existing v1 registry identity and Page version references are preserved, inactive versions are not reactivated implicitly, and identity conflicts propagate without a retargeting write. No database schema change or live migration is needed.
- AC-4: Extend the generator to create a later unregistered version beside earlier versions while preserving all safety and cleanup guarantees. Tests cover registered exact duplicates, retained v1 plus new v2, multiple categories, existing sibling output, partial same version collisions, and unchanged canonical registration. Supersede only the prior generator's temporary whole identity prohibition.
- AC-5: Prove pinned behavior across actual page creation, update, owner and public projection, publication, web registration, editor and public dispatch, and preview selection using isolated version fixtures. Adding a later definition does not route a saved v1 page through v2. Preserve lazy literal imports, server readable output, safe unsupported states, and current browser journeys. Fixtures do not activate another launch template or claim support for arbitrary new content models.
- AC-6: Run targeted tests and repository lint, formatting, types, unit tests, build, API integration, and relevant browser checks. Update registration guidance and durable context, reconcile the affected generator spec, record remaining limitations, and commit verified milestones on the existing feature branch. Do not mark this spec complete until all criteria are proven.

## Value sources

Category and template keys, versions, definitions, metadata, and provisioning status come from explicit canonical descriptors. API implementation identity comes from the registered policy or adapter object. Web identity comes from canonical descriptors; component implementations remain explicit static maps. New draft selection uses eligible database versions ordered numerically, while saved page selection uses Page.templateVersionId and its version row. Generator identity and paths come from validated arguments and fixed repository conventions. Seed conflict checks compare the existing database version row with the trusted descriptor. No runtime discovery, executable database templates, automatic content migration, or latest substitution is introduced.

## Build sequence

1. Validate and unify exact API bindings, with coexistence fixtures and unchanged launch checks.
2. Separate retained definitions from provisioning eligibility, group catalog seed and fixture output, and protect version identity.
3. Extend safe generation for later versions and update contribution guidance.
4. Verify pinned paths across API and web with isolated version fixtures and current browser behavior, then reconcile remaining evidence.

Implementation skills: architect, develop, NestJS best practices, Vercel React best practices, and Turborepo. Existing blueprint boundaries and user authorization govern the work. No new dependency is required.

## Progress

The first step, AC-1, is implemented: a shared exact implementation registry validates all seven API maps, with sixteen helper cases and seven production binding cases. See [exact binding verification](../../reviews/2026-10-03-template-version-bindings.md).

The second build step is implemented: category and version descriptors have explicit provisioning status, a pure plan groups retained versions into one family, and the seed and browser fixture consume that plan. Existing version upserts do not update identity. Guarded status writes and the actual transactional seed entry reject identity conflicts. Nine planning cases, eight new seed cases, six browser fixture cases, and five actual reader boundary cases exercise eligibility, retention, grouping, and failure behavior. Seed rollback and Page reference assertions use an isolated in memory transaction host, not a live PostgreSQL seed. The current browser journeys verify unchanged launch behavior; they do not yet exercise a fully implemented future v2 through the actual page dispatchers.

The third build step, AC-4, is implemented: scaffolding accepts an unoccupied exact version beside registered or generated siblings, preserves legacy v1 keys, derives distinct later keys, and keeps renderer identity separate. All root, case, link, exclusive write, and owned recovery checks remain. Both v1 and v2 starters pass schema and compilation checks, with temporary fixture coverage for existing launch paths and failed v2 recovery. See [version scaffold verification](../../reviews/2026-10-03-template-version-scaffolding.md).

The owner metadata gap is corrected: details and dashboard summaries resolve the pinned descriptor name rather than the mutable database family name. A shared catalog resolver retains inactive metadata and rejects mismatched or ambiguous identities. Five helper cases and two actual repository cases exercise metadata retention, including simulated later family metadata for both launch templates. Public web metadata already uses exact version registrations. See [pinned metadata verification](../../reviews/2026-10-03-template-version-metadata.md).

The application service portion of AC-5 now has twelve isolated coexistence cases. Actual PageService calls dispatch creation, updates, publication readiness, owner reads, and public transport projection using fixture v1/v2 definitions and exact implementation registries. Distinct behavior markers detect accidental cross version dispatch. Repository and version reader ports are mocked, so these cases do not prove persistence adapter transactions or web component dispatch. See [service coexistence verification](../../reviews/2026-10-03-template-version-service.md).

The repository portion of AC-5 now has ten isolated coexistence cases through actual PrismaPagesRepository methods. Version specific draft preparation, updater writes, owner/summary/public projections, and publication operations retain pinned identity. Failure cases reject stored identity conflicts before draft post creation work and prevent publication operation commit after a zero count conditional write. The query and transaction host is mocked and does not establish PostgreSQL rollback. See [persistence dispatch verification](../../reviews/2026-10-03-template-version-persistence.md).

The combined API/web saved page proof remains incomplete. Future version behavior through editor/public component dispatch and preview selection still needs verification. Keep this spec and its parent In Progress until all requirements are verified together. Second step verification is recorded in [catalog provisioning verification](../../reviews/2026-10-03-template-version-provisioning.md).
