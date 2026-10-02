# 0022. Registered template publishing policies

**Date**: 2026-10-02
**Status**: In Progress

## Summary

Continue the registered application policy decision in the parent structure spec through PageService publication. Preserve existing behavior and repository transaction checks.

## Requirements

* AC-1: Resolve a publishing policy by trusted registry key and exact pinned version. Unknown or unsupported definitions fail before publication writes. No unsupported template falls back to Secret Letter requirements.
* AC-2: Plain policies own content readiness and whether the existing owned journey lookup is required. Secret Letter requires nonblank recipient and message. Choose Your Heart does not require those compatibility fields and does require the existing owned journey lookup.
* AC-3: PageService retains confirmation, owner lookup, trusted definition lookup, generic audio capability checks, owned journey lookup, slug validation, expected content version, repository mutation, errors, and bounded journey publication metrics. Preserve the existing metric emission boundaries and error outcomes.
* AC-4: Policies do not import NestJS, Prisma, repositories, services, or telemetry. Registration has compile time coverage of canonical trusted keys. Keep the current typed compatibility content envelope explicit.
* AC-5: Regression tests cover identity/version rejection, content readiness, correct journey lookup, missing journey service, no writes on failure, concurrency/lifecycle result mapping, and bounded metrics. Relevant unit/integration checks, repository gates, and API production build pass.

## Decision

Use the same explicit source registration shape as draft policies. Each template exports a plain publish policy with its immutable key/version, a content predicate, and an owned journey requirement. The service resolves that policy after its existing audio check and orchestrates the required journey lookup inside its existing metric/error boundary. Metrics use the already resolved trusted renderer key.

This is a mechanical extraction under the parent policy registration decision. Inputs and output behavior come from the existing publication implementation. The current getOwned call checks that an owned journey exists; it does not independently revalidate its graph. Preserve that distinction and the repository's locked revision publication behavior.

## Build plan

1. Extract and register the two template publishing policies.
2. Replace PageService's template name branch with registered policy requirements.
3. Add policy and service regressions, run checks, and reconcile ownership documentation.

## Consequences

New templates register their publishing requirements explicitly. Shared lifecycle services no longer choose readiness rules by template name. Infrastructure publication branches, graph revision persistence, public projection identity, and generalized template content types remain separate milestones. No database schema, migrations, routes, live seed, provider, dependency, or web behavior changes.
