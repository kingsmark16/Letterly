# Image processing application port

Date: 2026-10-03

## Result

PageMediaService now depends on ImageProcessingPort and its application IMAGE_PROCESSOR token, rather than the concrete infrastructure class. Application owns the existing sanitize input/output types and ImageProcessingError. The contract is plain TypeScript with no Sharp, file-type, NestJS, or database imports.

The existing infrastructure ImageProcessor implements that contract. PagesModule keeps one ImageProcessor provider and aliases the token with useExisting. It does not register a second processing instance. All imports of the moved error now resolve to the application definition, preserving instanceof handling between the processor and service.

The processor method bodies were compared against their prior Git contents and are unchanged. Source byte limits, MIME detection, checksum checks, dimensions, pixel limits, multi-page rejection, rotation, WebP conversion, output checksums, and failure codes retain their implementation. PageMediaService changed only its contract import, injected token, and parameter type, leaving completion claims, processing slots, cleanup, ready/failed transitions, and safe errors unchanged.

## Verification and enforcement

The existing processor suite now resolves the port through a real isolated Nest container before running its image validation and PNG to WebP tests. It confirms the port resolves to the same processor instance. Service tests resolve a mocked port by token and no longer cast a mock into the concrete class. The focused two suites passed all 19 existing cases; no duplicate cases were added.

Application/domain ESLint rules reject concrete processor imports, including JavaScript suffixes, and Sharp/file-type imports. Six probes verified four prohibited imports and two allowed imports. Existing database, storage, and template policy restrictions remain intact.

| Check | Result |
| --- | --- |
| Root lint | Passed, including final expanded boundary rule |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 540 passed, API 486, web 33, database 6, UI 15 |
| API integration | 39 passed, 7 skipped, four passing suites and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Dependency probes | Six expected results passed |

## Limits and next work

Verification was performed by the implementing agent, not an independent fresh model reviewer. Tests use real Sharp conversion for the existing image fixture, mocked type detection, and isolated Nest bindings. They do not establish an end to end upload against live R2 and PostgreSQL or a full production application startup. HTTP integration suites use mocked dependencies. Seven database tests remain skipped; browser tests, seeds, migrations, and deployments were not run. Prior browser results remain historical evidence.

Only unlock-cookie handling remains as a direct infrastructure import in production pages application files found by the current scan. That does not make the application layer fully framework independent; existing decorators and runtime provider behavior remain broader work. Next, move HTTP cookie parsing out of application password verification while preserving proof scope and expiry. Draft update assumptions, stored compatibility types, and the known visible no JavaScript fallback issue also remain unresolved. The parent migration stays In Progress.
