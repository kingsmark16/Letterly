# Administrator browser endpoint ownership

## Result

Eight administrator browser endpoints and their private mutation header helper now live in `apps/web/src/features/admin/api.ts`. The report and audit consoles import that feature owner directly. Their shared WebApiError import points to `src/lib/api/errors.ts`.

The former definitions and moderation contract import are removed from `src/lib/api-client.ts`, reducing that file by 133 lines. No compatibility exports remain because both consumers migrated. Other page, media, question, journey, public, and submission endpoints still require subsequent ownership moves.

This implements the parent [repository ownership decision](../specs/0022-repository-structure/index.md). It changes no endpoint behavior, request payload, query schema, response schema, URL encoding, operation union, or X-CSRF-Token value. The shared credentialed Axios client, timeout, response validation, and safe error normalization remain in browser transport.

## Verification

A TypeScript parser comparison against HEAD inspected all eight function declarations and `adminMutationConfig`. Each declaration's complete source matches its former implementation after newline normalization. The moderation import clause also matches. None of those declarations remains in the old central file. A repository search confirms the only production callers are the two migrated consoles.

| Check | Outcome |
| --- | --- |
| Declaration/import preservation comparison | PASS, eight endpoints and one helper unchanged |
| Caller and obsolete definition search | PASS |
| Web unit tests | PASS, 67 tests |
| Root unit tests | PASS, 775 tests across five workspaces; API, database, and UI reused unchanged input caches |
| Web types | PASS, route generation and TypeScript |
| Root lint | PASS, seven tasks, fresh web lint |
| Root formatting | PASS |
| Root production build | PASS, fresh Next.js build; unchanged API/database inputs reused caches |
| Diff whitespace | PASS |

The unit suites do not include an administrator console browser journey. No new browser or API integration run was performed for this exact source relocation. Earlier browser evidence remains in [catalog ownership verification](2026-10-03-web-catalog-ownership.md); it is not claimed as administrator endpoint coverage. The source comparison establishes preserved request behavior, and compilation validates the updated module paths. No before/after bundle performance improvement is claimed.

## Context and alignment

The admin context points to the new endpoint owner. Shared transport remains separate from feature requests. Direct feature imports follow the ownership intent of Vercel React rule `bundle-barrel-imports`, without bypassing public package exports or adding a barrel. This milestone adds no dependency, activation, schema, environment value, or production action.

The parent restructuring remains In Progress. This report records self verification, not an independent review.
