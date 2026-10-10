# 0022. Template owned owner persistence projections

**Date**: 2026-10-02
**Status**: Complete

## Requirements

* AC-1: Register detail and dashboard summary mapping for every canonical template key and exact pinned version. Validate stored registry, renderer, and version together before dispatch, with the existing safe template definition error for unsupported identity.
* AC-2: Secret Letter owns content validation, safe settings, trimmed recipient labels, and optional trimmed title previews. Choose Your Heart owns its compatibility content and merged safe settings, and draft root question previews. Preserve the current empty recipient fallback and missing draft behavior.
* AC-3: Shared persistence code keeps creator ownership, pagination, status predicates, passwordProtected derivation, dates, media expiry, audio capability, attached audio link ownership, and replacement retry rules. Do not alter queries or transaction lock order.
* AC-4: Never return encrypted password material, private settings extras, main messages in dashboard summaries, or unexpected choice fields. Keep mappers plain and free of NestJS, database clients, queries, and external providers.
* AC-5: Verify both templates, identities, unsupported versions, safe settings, draft previews, summary privacy, owner isolation, media rules, and existing lifecycle behavior. Run repository gates, API integration checks, and builds.

## Decision and sources

Continue the approved registered adapter pattern in infrastructure/templates. Owner content and private settings come from the existing selected Page record. Password protection remains derived by the shared mapper from validated private settings. Summary firstQuestion comes only from the existing draftRevision.rootQuestion selection, never the published revision. Canonical identity comes from resolveTemplate with all stored identity fields supplied.

Adapters return only content/settings or recipientLabel/preview. The repository composes shared owner metadata and media. Journey choices are copied by their existing key and label allowlist, preserving query order. The existing Secret Letter compatibility content envelope remains until a separately designed storage migration.

## Remaining work

Draft persistence initialization and update behavior remain separate slices. No new template, route, schema, provider, migration, seed, or deployment is part of this milestone.
