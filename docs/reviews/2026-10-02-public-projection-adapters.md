# Template owned public repository projection adapters

Date: 2026-10-02
Branch: `feat/repository-verification-baseline`
Contract: [public projection adapters](../specs/0022-repository-structure/0022-public-projection-adapters.md)

## Result

The public repository mapper now validates stored registry key, renderer key, and pinned version, resolves an exact registered adapter, and constructs safe media once. The two projection implementations live beside their owning infrastructure adapters. A shared typed public record captures the existing selected fields without introducing database or framework code into the mapping implementations.

Secret Letter owns its content and settings validation, deterministic question/choice sorting, response availability, capability rules, and allowed body fields. Its existing omission of response metadata when settings are absent is preserved. Choose Your Heart owns compatibility content/settings validation, published revision requirements, graph projection, and response rules. It maps published outcomes field by field so future database additions cannot leak through an object spread or array passthrough.

Shared audio filtering retains trusted capability, READY state, and same-page link ownership. Images and audio retain encoded same-origin public paths and explicit field projection. Public queries, availability predicates, transient recovery, password guards, locked metadata, canonical identity, and transport shaping remain at their existing boundaries. Unknown or mismatched identity has no Secret Letter fallback.

## Verification

* Repository unit suite: 55 passed. Nine new cases cover published revision projection, explicit outcome privacy, no draft fallback, unknown/mismatched/unsupported identity, nonready/foreign audio filtering for both templates, permitted ready audio, and hidden audio capability.
* Full API unit suite: 434 passed across 59 suites. Web unit tests: 33 passed. Database/catalog tests: 6 passed. Shared UI tests: 15 passed. Total unit tests: 488.
* API integration: 39 passed, 7 skipped across four passing and four skipped suites. Passing HTTP suites use mocked application dependencies; they do not prove real database/provider behavior.
* Root lint, type checks, formatting checks, and unit tests pass. Both production builds pass, with all three build tasks executed rather than served from cache.
* `git diff --check` passes.

Existing repository checks retain safe Secret Letter fields, response question ordering, legacy absent-settings behavior, current public availability predicates, and transient pool recovery. New journey fixture fields include private owner/password/storage notes and a private draft root; none reach the projected result. The allowed-audio case temporarily changes a trusted definition capability in an isolated unit fixture and restores it in finally. The launch journey capability remains hidden.

## Documentation and scope

Updated API pages context, template registration instructions, and the parent structure spec links. The overall migration remains In Progress. Historical reports and unrelated scope entries were preserved. The preexisting skills-lock.json edit is excluded from this milestone.

## Limits and next work

No web source, shared contract, schema, migration, route, provider, dependency, live seed, or template activation changed. Browser journeys were not rerun for this repository mapping extraction; the preceding 72 browser checks remain historical evidence. Seven integration cases remain skipped. No independent fresh model review, push, pull request, deployment, or live database mutation ran.

The adapter record and Page domain still reflect the current compatibility content model. Journey mapping preserves the existing Secret Letter shaped content validation before mapping its published graph. This is not a generalized persistence envelope. The PageService transport projection still contains its shape branch and legacy no-response validation shortcut; those are the next bounded extraction. Owner mappings and draft persistence also retain specific branches. The previously recorded visible no JavaScript fallback problem remains unresolved.

Next: register template-owned API transport projections and remove the generic service's payload shape branch, while retaining password checks, canonical identity, safe errors, and deliberate legacy compatibility. Consider generalized stored content types only through a separate data model decision.
