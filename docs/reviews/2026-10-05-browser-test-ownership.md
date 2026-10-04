# Browser journey test ownership verification

Date: 2026-10-05

## Result

The previous 2460 line public Secret Letter browser file is split by actual responsibilities. Public viewing and no script coverage remain in public-secret-letter.spec.ts. Visitor identity, creator media, creator questions, owner sharing, and Choose Your Heart journeys have separate named files. The largest new suite is about 711 lines. Existing owner record and editor helper construction live in one e2e/fixtures/owner-page-editor.ts module.

This changes test ownership only. The historical creator describe title remains in the media and questions files, preserving full test names while filenames now identify the responsibility. No production source, route, provider, template, or database behavior changed.

## Preservation and discovery

The [audit artifact](2026-10-05-browser-test-ownership.json) records the source commit, before discovery, output hashes, and preserved declarations. Before and after default Playwright discovery contains the exact same 96 title and project pairs across the desktop and mobile projects, ignoring only filenames. All 48 leaf test bodies, three suite controls, and eight helper bodies are syntax tree identical. Fixture constant initializers and the owner record type are also unchanged.

The original broad creator suite had no shared beforeEach, serial mode, or mutable setup declaration to carry across the split. Each moved case keeps its own request interceptions and local state. Environment reads remain with the suites that consume them. PUBLIC_TEST_SLUG, PUBLIC_CH_PROTECTED_SLUG, and PUBLIC_CH_PUBLIC_SLUG gates and all existing skip conditions are unchanged. No script context settings remain with the public no script suite.

Routine fixture and cross engine UI allowlists remain unchanged. The default configuration discovers these suites as before. The extracted legacy creator and live public suites are not silently activated in CI by this refactor.

## Verification and limits

All six extracted visitor identity cases passed under a temporary configuration with no webServer entries. The cases use no browser page fixture and start no API or web server. The temporary configuration was removed afterward. All 121 existing web unit cases passed. Web lint and type checks passed on the final split.

Discovery and syntax preservation do not certify live published page or authenticated creator behavior. Those journeys require deliberate isolated published pages and authentication. They were not executed against unspecified pages, and no private response, email, media upload, or live page mutation occurred during this verification. New focused fixture journeys elsewhere in the repository remain distinct from these preserved legacy cases.

[GPT-6 Luna approved the split](2026-10-05-browser-test-ownership-luna.md) with no findings, checking grouping, helper closure, preserved gates, and discovery. The reviewer did not rerun the author?s commands. Root lint, formatting, and types passed. The overall repository restructuring remains in progress.
