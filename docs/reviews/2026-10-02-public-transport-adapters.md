# Public transport adapter milestone

Date: 2026-10-02

## Result

PageService dispatches unlocked public bodies through registered template adapters. Secret Letter and Choose Your Heart own their body fields and existing Zod transport validation in application/projections. The map requires compile time coverage of canonical catalog keys and resolves exact registry key and version.

The service retains repository reads and retries, trusted registry and renderer identity, canonical URL construction, page password checks, locked metadata, and bounded validation error logging. Unsupported identities have no fallback. No route, provider, schema, database migration, catalog record, or deployment changed.

## Compatibility and validation

Legacy Secret Letter pages without response settings still omit the response field, but their body now passes transport validation first. Pages with disabled response settings retain an explicit disabled response. Journey pages retain the existing disabled response default. Optional media still follows the existing schemas and defaults.

This deliberately closes an unsafe validation shortcut. Invalid legacy content or media now produces PublicPageReadUnavailableError. Contract normalization, including trimmed text, applies consistently. A test fixture used a non UUID audio link identifier only because the old shortcut bypassed validation; it now uses a valid identifier matching real stored rows.

Template adapters reject bodies belonging to the other template. Public media is parsed, so unexpected private fields cannot pass through nested media objects. A locked page test supplies invalid message content and still receives only locked metadata, proving body validation stays behind the password guard.

## Evidence

| Check | Result |
| --- | --- |
| Root lint | Passed |
| Root formatting check | Passed |
| Root type checks | Passed |
| Root unit tests | 502 passed, API 448, web 33, database 6, UI 15 |
| API integration suite | 39 passed, 7 skipped, four passing suites and four skipped suites |
| Root production build | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Projection import boundary probes | Four prohibited imports blocked and four intended imports allowed |

Fourteen additional unit cases cover both catalog registrations, unsupported keys and versions, template/body mismatch, published graph mapping, response compatibility, malformed legacy body/media, and media privacy. Existing service tests continue to cover transient reads, canonical identity, and password proofs. The locked guard case was strengthened rather than counted as an additional test.

Boundary probes exercised ESLint against NestJS, the database package, an application repository, and infrastructure imports. Allowed probes covered contract schemas, template definitions, plain page types, and local mapping files. The separate template policy restriction remains intact.

## Limits and next work

This is implementation verification by the implementing agent, not an independent fresh model review. HTTP integration suites use mocked application dependencies; skipped database suites did not verify live PostgreSQL. No live provider, database seed, or deployment was exercised. Browser tests were not rerun for this API mapping slice; the prior 72 passing fixture browser tests remain historical evidence.

The broader structure migration stays In Progress. Owner persistence mappings and draft persistence initialization still have template branches. Stored content compatibility types need a separate design and migration decision. The known visible no JavaScript fallback issue remains unresolved. Continue with owner persistence mapping ownership as the next bounded structure slice.
