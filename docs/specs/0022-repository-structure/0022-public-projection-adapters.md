# 0022. Template owned public repository projections

**Date**: 2026-10-02
**Status**: In Progress

## Requirements

* AC-1: Resolve public projection adapters by trusted registry key and exact immutable version, after validating stored registry and renderer identity. Unsupported identities have no fallback.
* AC-2: The shared repository mapper retains trusted audio capability filtering, ready audio state, same-page audio link ownership, encoded public media paths, and allowlisted media fields. Adapters receive only the supplied record, trusted definition, and prepared safe media.
* AC-3: Secret Letter owns content/settings validation, deterministic question/choice ordering, response availability, capability rules, and allowed body fields. Preserve its existing response omission when settings are absent.
* AC-4: Choose Your Heart owns existing compatibility content/settings validation, published revision requirements, graph/question/outcome mapping, and response capability rules. Only published revision content reaches the public projection. Map outcome fields explicitly so extra database fields cannot leak.
* AC-5: Keep public queries, availability predicates, database access, password guarding, locked response handling, retry behavior, and API transport validation outside projection adapters. No new provider, schema, route, migration, template, or live seed.
* AC-6: Tests cover both projections, identities, unsupported versions, missing published revisions, deterministic ordering, capability filtering, media ownership, privacy allowlists, and legacy settings behavior. Repository gates, API integration checks, and production builds pass.

## Decision

Continue the parent spec's explicit template adapter pattern at the public repository mapping boundary. A typed infrastructure record captures the existing selected data. Each adapter owns its template-specific mapping; the shared mapper constructs safe media once and resolves exact trusted identity before dispatch. Keep Prisma clients, queries, HTTP, and provider clients out of these mapping implementations.

This extraction preserves existing behavior and the current Secret Letter shaped compatibility envelope. The single privacy hardening is explicit outcome field projection, matching the current transport contract rather than spreading future database fields. PageService's remaining transport projection branches and legacy no-response shortcut are a later slice.

## Build plan

1. Extract typed public records and the two registered projection implementations.
2. Replace the shared mapper's template name branches with trusted dispatch and shared media.
3. Add projection regressions, run checks, and reconcile registration/context documentation.

## Consequences

A new template has an explicit public mapping owner and registration. Template content behavior no longer sits in the shared repository mapper. Existing stored content types, other persistence mappings, API transport shaping, and landing artwork remain further work. The broader structure migration stays In Progress.
