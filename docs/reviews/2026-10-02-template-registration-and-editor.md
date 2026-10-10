# Template registration and editor ownership

Date: 2026-10-02
Branch: `feat/repository-verification-baseline`
Contract: [template registration and editor ownership](../specs/0022-repository-structure/0022-template-registration-and-editor.md)

The catalog now has one metadata source consumed by the trusted registry, database seed, and browser fixture. The Choose Your Heart graph editor lives in its template folder and receives typed values and callbacks. Its pages adapter owns requests, saves, conflicts, and publishing.

## Changes and compatibility

`packages/templates/src/catalog.ts` contains the launch category and template metadata. `src/registry.ts` derives registry entries from those definitions. Shared capability schemas live in `src/capabilities.ts`. Secret Letter's definition moved beside its schemas; existing root exports, keys, versions, defaults, capabilities, and audio rules remain compatible. Package subpath imports resolve the same TypeScript source under Node and Next.js.

The seed uses injected category, template, and version upserts instead of repeating a complete branch for each template. Its tests assert the previous launch metadata, active status, stable keys, version numbers, and failure propagation. No database schema changed, and no live seed was executed.

The original 749 line Choose Your Heart editor became a controlled template editor and a pages adapter. Graph operations and markup remain with the template. The adapter passes publishing controls through a presentation slot, so the template imports no pages feature, API client, query library, persistence, or authorization code.

Web ESLint enforces this boundary across template source files by rejecting feature, browser API client, query library, and database imports.

The local draft retains its saved baseline and edited graph. Clean values come directly from query data. Refresh conflicts are derived when a newer remote signature arrives while dirty, preserving the original expected content version until explicit reload. This replaces an effect that copied query results into multiple state variables.

Two existing error cases were corrected: an initial journey request failure previously stayed behind the loading branch, and unsaved status text previously hid save failure messages. Loading errors now offer retry, and save errors are announced while edits remain available for retry.

## Verification

* Production web build passed, including type compilation and route generation.
* Repository lint, all seven configured type tasks, and formatting passed.
* All four forbidden template import classes were rejected by an ESLint probe; `git diff --check` passed.
* API: 391 unit tests across 57 suites passed after the export migration.
* API integration: 39 passed, 7 skipped. These results are not full live database coverage.
* Web: 23 unit tests passed, including four draft baseline and conflict tests.
* Database package: three catalog definition and injected seed tests passed.
* Shared UI: 15 tests passed through the repository test command.
* Browser: all 42 cases passed across desktop and mobile, with zero failures or skips in the final run.

The six new browser cases cover initial request retry, save failure and explicit retry without losing edits, save and reopen, dirty remote refresh, disabled saving during conflict, explicit reload, expected versions, and published read only controls. The previous 36 cases also pass.

The first run exposed test setup issues, corrected without weakening assertions: the query focus manager listens for visibility changes on `window`, and the select lookup now uses its accessible combobox role. The final run used the fixture configuration with server startup disabled in an ignored wrapper, against the production build and fixture servers started by `test:e2e:fixtures`. Windows sandbox teardown required stopping those verified servers after the checks.

## Remaining structure work

The public Choose Your Heart renderer still owns visitor submission orchestration within the pages feature. API template branches and web presentation dispatch are still explicit. A catalog entry alone does not implement a new template behavior. Those seams should be consolidated before adding a generator.

Contribution steps are recorded in [template registration](../references/template-registration.md). The parent repository structure spec remains in progress. The existing no JavaScript policy rendering issue is unchanged. No independent model review ran, no changes were pushed, and the existing `skills-lock.json` edit is excluded.
