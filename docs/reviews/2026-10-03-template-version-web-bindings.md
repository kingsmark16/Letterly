# Web template version binding verification

Date: 2026-10-03

## Resulting behavior

Editor, catalog preview, and public presentation maps now declare each implementation's registry key and version. The web implementation registry validates complete canonical coverage with the existing shared implementation registry, then resolves metadata and implementation together against the supplied renderer, registry key, version, and optional category. It snapshots registration identities and map bindings. Retired definitions remain usable, and an ambiguous or conflicting identity has no newest fallback.

Editor query ownership, error states, and remount keys are preserved. Editor and preview loaders retain their literal next/dynamic import calls. Public presentation functions retain their existing contract narrowing and server readable output. Registered previews receive renderer, registry key, and version together rather than only an ID. Presentation metadata remains separate from component loaders.

The preview route previously detected a registered family by asking for one uniquely resolvable unversioned registration. With two retained versions that lookup is ambiguous, which could allow an invalid or ambiguous known identity into catalog fallback. The route now checks family membership independently of exact version resolution and returns its existing unavailable state for unresolved known families. Unknown catalog fallback behavior is unchanged.

## Evidence

Ten new web cases exercise the actual shared dispatcher with isolated v1/v2 component bindings. Six cases render distinct editor, public, and preview fixture components through React server rendering, including inactive v1 and active v2. Output remains readable and escapes user text. Other cases cover missing, unknown, or mismatched bindings; conflicting and ambiguous request identities; legacy unique version lookup; preview URL round trips; known ambiguous family detection; and source array/map mutation after construction.

These fixtures use small independent components. They do not mount a future version through the complete owner query component or public Next.js route. The production wrappers use the tested dispatcher, while the browser suite below exercises their current launch bindings. This distinction remains part of the outstanding combined composition proof.

| Command | Outcome |
| --- | --- |
| Web unit suite | PASS, 49 cases including ten new binding cases |
| Root unit tests | PASS, 757 cases across five workspaces |
| Root lint | PASS, seven tasks |
| Root formatting check | PASS |
| Root type check with concurrency two | PASS, seven tasks |
| Root production build | PASS, fresh Next.js build; unchanged database and API inputs reused their build caches |
| API integration suite | PASS, 595 cases; seven skipped, 25 passing suites and four skipped suites |
| Desktop/mobile browser fixture journeys | PASS, 72 cases, fresh fixture build and normal test server teardown |
| Diff whitespace check | PASS |

Browser cases cover creator dispatch and unsupported versions, saved editor state, lazy preview mounting and focus restoration, full and legacy preview identities, public metadata, initial public HTML, locked content, unavailable projections, and private visitor interactions. The server logged a closed response stream during mobile preview navigation; no assertion failed, and this log was not investigated as a separate issue.

The browser command ran with process access for Playwright to close its own local servers. A preceding sandboxed milestone had passed its assertions but could not finish server teardown. This run completed normally with exit zero. No process tree was stopped manually. A regular production build is restored after the fixture run.

## Remaining work

No template was activated, no page was migrated, and no dependency was added. Registration guidance and the two affected durable context files now describe exact web component bindings. The existing web test command includes the new suite.

The service and repository fixture proofs are recorded separately. Future version behavior through complete application wrappers still needs a combined composition proof; the browser run retains the launch catalog. Real PostgreSQL seed rollback remains unproven and seven database dependent integration cases remain skipped. Keep the governing version retention spec and overall restructuring In Progress. This report records self verification, not an independent review.
