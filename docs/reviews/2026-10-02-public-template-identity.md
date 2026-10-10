# Public template registry identity

Date: 2026-10-02
Branch: `feat/repository-verification-baseline`
Contract: [public template identity](../specs/0022-repository-structure/0022-public-template-identity.md)

## Result

Public repository projections carry the trusted registry key alongside the renderer key and immutable version for both templates. PageService validates every supplied field before returning locked or unlocked data, and emits the canonical registry key for uniquely resolved legacy repository projections. Locked identity remains safe metadata and contains no page body, media, password, database IDs, or creator identity.

Shared public transport schemas retain optional registryKey for compatibility with older API deployments. Omission is accepted only for a unique renderer/version match. Explicit unknown, mismatched, undefined, empty, null, or unsupported identity cannot fall back. The shared trusted resolver now rejects multiple matches rather than selecting the first definition.

Web public contract parsing is a pure helper, separate from no-store fetch, visitor signing, cookies, and transport error handling. It validates locked or template-specific body contracts and checks registered identity. Payloads with a state field must parse as locked metadata, so an otherwise valid body cannot bypass that discriminator. Malformed payloads use the existing unavailable error. Metadata and public rendering use the same plain public identity adapter without importing React loaders into metadata resolution.

## Verification

* API unit tests: 425 passed across 59 suites. The four new cases verify rejection of supplied public registry mismatches/unknown/undefined keys and canonical identity emission for a legacy journey. Exact public repository and locked/unlocked service expectations now include registry identity.
* Web unit tests: 33 passed, including five public parser regressions for both identities, legacy omission, invalid constraints, locked body stripping, and malformed content.
* Database/catalog tests: 6 passed. A scoped collision fixture proves renderer-only resolution fails while exact registry identity remains stable. The fixture is removed in finally and does not activate a new catalog template.
* Shared UI tests: 15 passed. Total unit tests: 479.
* API integration: 39 passed, 7 skipped across four passing and four skipped suites. Passing suites use mocked application boundaries, so they do not prove live database/provider behavior.
* Root lint, type checks, and formatting checks pass. Two added test files/fixtures were checked again after the initial gate, including the final PageService fixture's required nullable journey choice targets.
* API production build and the isolated production web build pass.
* Browser fixtures: 72 passed across eight desktop/mobile suites, including canonical Secret Letter identity, legacy journey identity, mismatched/unknown registry unavailable rendering and metadata, explicit legacy compatibility, unsupported versions, and locked body privacy.
* `git diff --check` passes.

The Windows fixture harness again waits during server teardown. An ignored wrapper reused its running servers without Playwright server management and exited successfully after all 72 checks. Only the verified test server processes owned by this run were stopped afterward.

## Documentation and scope

Updated API pages, web pages, web workspace, shared contracts, and shared template context. The registration guide now describes canonical public identity and the legacy omission transition. The parent structure spec links this contract and verification report. The overall restructuring remains In Progress; historical reports and unrelated scope were preserved.

## Limits and next work

Registry keys identify category ownership globally, so another category can reuse a renderer name without a public database ID. The two launch schemas still have explicit renderer discriminators; a new template requires its contract and registered behavior. Compatibility fields are optional at the transport boundary, while new API output always includes the canonical key. No schema migration, live seed, category activation, new template, provider, or dependency changed.

The web tests mock browser API requests, and the seven skipped integration cases were not executed. No independent fresh model review, push, pull request, deployment, or live database mutation ran. The preexisting skills-lock.json edit is excluded.

Template-specific persistence projection mapping and remaining content parsing still need registered adapters before broader template growth. The existing legacy API projection shortcut when response metadata is absent remains outside this extraction. The previously recorded visible no JavaScript fallback problem remains unresolved; server HTML presence does not prove a visible fallback.

Next: extract public projection construction into template-owned API adapters, keeping privacy, capability filtering, and exact registry identity checks at the shared boundary. Continue generalizing stored content types only with a separate persistence decision.
