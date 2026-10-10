# 0022. Registered persistence publication adapters

**Date**: 2026-10-02
**Status**: In Progress

## Requirements

* AC-1: Resolve a persistence adapter by trusted registry key and exact immutable version inside the existing publication transaction. Unsupported identities fail before writes.
* AC-2: The repository retains the owner Page lock, owner predicate, status and expected version checks, audio requirements, stable slug reservations, conditional Page update, safe lifecycle mapping, and transaction ownership.
* AC-3: Choose Your Heart locks PageJourney only after Page, captures its draft revision, increments Page contentVersion once, and promotes that captured revision only after the conditional Page write succeeds. Missing journeys fail before writes. Secret Letter neither reads nor writes journey persistence and does not increment contentVersion on publication.
* AC-4: Prepare and commit use the same provided transaction, never create a Prisma client or transaction, and do not catch database failures that must roll back the outer transaction. Existing lifecycle and unique violation mapping remain compatible.
* AC-5: Repository tests cover real lock call ordering, revision promotion, missing journeys, stale/unsupported identity, conditional update failure, transaction propagation, and unchanged Secret Letter publication. Relevant repository gates, integration checks, and production builds pass.

## Decision

Continue the parent's explicit template adapter registration pattern at the infrastructure boundary. Register each template's adapter beside its infrastructure implementation. Preparation returns a typed publication operation with a content version increment flag and a commit closure bound to the provided transaction. The repository calls commit only after the owner Page update succeeds. Keep framework independent policies in application/templates and Prisma work in infrastructure/templates.

Inputs and effects come from the existing publication transaction. Preserve Page-before-PageJourney lock ordering, current revision selection, existing slug operations and error boundaries. This slice does not add graph validation or change publication requirements. Existing graph validity is established through validated draft writes; this extraction preserves the current locked revision promotion.

## Build plan

1. Extract exact registered publication adapters and their shared infrastructure interface.
2. Replace repository template identity branches with prepare/update/commit orchestration.
3. Strengthen transaction regressions and update the registration guide and context.

## Consequences

New persistence behavior has an explicit template owner. Unknown versions have no fallback. Existing data models, schemas, migrations, HTTP routes, live seeds, and web behavior remain unchanged. Public projection identity, generalized content envelopes, and other persistence branches remain future slices.
