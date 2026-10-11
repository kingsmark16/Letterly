# Catalog identity verification

Date: 2026-10-03

Spec: [catalog identity invariants](../specs/0022-repository-structure/0022-catalog-identity-invariants.md).

Implementation self verification, not an independent review.

| Criterion | Evidence                                                                                                                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1      | Canonical catalog invokes pure validation before export consumers construct registries. Tests reject duplicate categories, orphan references, duplicate registry keys across categories/versions, and conflicting category/renderer/version identities.                                                                         |
| AC-2      | Tests reject empty identities and zero, negative, fractional, nonfinite, and unsafe versions. Validator imports no framework or provider.                                                                                                                                                                                       |
| AC-3      | Fixtures preserve distinct version keys and cross category renderer reuse without mutation. The shared resolution predicate resolves pinned versions and rejects missing, mismatched, explicitly undefined, and ambiguous criteria. Both launch identities remain exact and version 2 remains unavailable in the live registry. |
| AC-4      | Root test task runs 616 passing unit tests, including 60 templates tests. Lint, formatting, type checks, and build pass. Existing seed tests pass without live provisioning.                                                                                                                                                    |

Commands: `pnpm lint`, `pnpm format:check`, `pnpm check-types`, `pnpm test`, `pnpm build`, and `git diff --check`, all passed.

No database schema, migration, active category/template, renderer implementation, public route, or runtime adapter registration changed. Future versions still require distinct immutable registry keys and deliberate API/web integration. Generator restrictions are unchanged.

Existing `skills-lock.json` changes remain outside this milestone.
