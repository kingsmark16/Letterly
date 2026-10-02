# Owner persistence projection milestone

Date: 2026-10-02

## Result

Owner detail and dashboard summary mapping now dispatch through registered template adapters in infrastructure/templates. Secret Letter owns safe settings, compatibility content parsing, recipient labels, and title previews. Choose Your Heart owns its merged safe settings, compatibility content, and draft root question preview. The map requires compile time coverage of canonical catalog keys and resolves exact immutable versions.

The shared repository validates stored registry, renderer, and version together. Unsupported or inconsistent identities raise the existing TemplateDefinitionUnavailableError instead of receiving a default Secret Letter mapping. Valid stored identities keep their existing behavior.

The shared mapper retains passwordProtected derivation from validated private settings, image expiry filtering, audio capabilities, same-page audio link ownership, replacement retry ordering, metadata, and dates. Creator predicates, status filters, cursor pagination, selected fields, transaction writes, and lock order are unchanged.

## Privacy and compatibility

Adapters return only content/settings or recipientLabel/preview. Encrypted password material is stripped before owner output. Dashboard summaries omit main messages. Journey previews use draftRevision.rootQuestion, never publishedRevision; choices preserve their supplied query order and explicitly copy key and label so unexpected fields cannot leak.

Existing title trimming, empty recipient fallback, empty Secret Letter previews, missing journey preview behavior, and responsesEnabled behavior are preserved. Journey owner content still uses the existing Secret Letter compatibility envelope. This slice does not change stored data or remove compatibility fields.

## Verification

| Check | Result |
| --- | --- |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 518 passed, API 464, web 33, database 6, UI 15 |
| API integration | 39 passed, 7 skipped, four passing suites and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Owner adapter dependency probes | Four prohibited imports blocked and four intended imports allowed |

Sixteen new tests cover current template registrations, unsupported keys and versions, detail and summary identity consistency, password privacy, safe settings, content validation, trimmed title and recipient labels, draft previews, missing draft roots, choice ordering, and summary privacy. Existing repository tests continue to cover ownership predicates, cursor/status filtering, audio retry selection, transaction locks, lifecycle operations, and public projection behavior.

The owner adapter import rule blocks NestJS, database clients, the concrete repository, and application services. It permits shared template schemas, plain page types, repository port types, and local mapping files. The application policy and public transport rules remain intact.

## Limits and next work

This is verification by the implementing agent, not an independent fresh model review. HTTP integration suites use mocked application dependencies. The skipped suites did not verify a live database. No browser tests, provider operations, seed, migration, or deployment ran for this API mapping slice. The prior 72 passing fixture browser tests remain historical evidence.

The overall structure migration remains In Progress. Continue with draft persistence initialization, retaining transactional journey creation and validation. Stored compatibility types and update assumptions require further work. The known visible no JavaScript fallback issue remains unresolved.
