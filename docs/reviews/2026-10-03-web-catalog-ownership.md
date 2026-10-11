# Web catalog server ownership

## Result

The catalog server reader and its six existing tests now live together in `apps/web/src/features/catalog/server/`. This implements the explicit catalog move in [the repository ownership decision](../specs/0022-repository-structure/index.md). The former `apps/web/lib/catalog.ts` and `catalog.test.ts` are removed.

All six production import sites now reference the feature owner directly: the landing route, administrator layout, creator layout, catalog route, category route, and preview route. The web test command and version composition boundary mock use the new path. No compatibility barrel remains because every internal caller is migrated. Historical review and inventory paths remain historical evidence.

## Behavior and skill alignment

The reader and test contents match their former files line for line after formatting. Category and template requests still start together and use Promise.all, following Vercel React rule `async-parallel`. They retain `cache: no-store`, shared Zod parsing, one bounded transient retry, and full category identity checks for ambiguous template keys. Server catalog loading remains separate from browser Axios and interactive query ownership.

The existing framework and dependencies are retained. The local Next.js project structure documentation confirms that root routes and optional src code can coexist; this milestone does not migrate the route tree. The parent ownership decision remains the governing contract, with no additional product or data model decision needed.

## Verification

| Check | Outcome |
| --- | --- |
| Source and test comparison against HEAD | PASS, identical reader and test lines after relocation |
| Former catalog import search in web source | PASS, no remaining imports or test command references |
| Web unit tests | PASS, 67 tests including six catalog tests and eighteen version composition cases |
| Root unit tests | PASS, 775 tests across five workspaces; unchanged API, database, and UI inputs reused caches |
| Web type check | PASS, route type generation and TypeScript |
| Root lint | PASS, seven tasks; web executed fresh |
| Formatting | PASS after normalizing the moved files and changed import lines |
| Desktop/mobile browser fixtures | PASS, 72 tests, fresh fixture build and normal server teardown |
| Root production build | PASS, fresh regular Next.js build after browser fixtures; unchanged API and database builds reused caches |
| Diff whitespace | PASS |

Browser evidence covers catalog preview identities, lazy dialogs and focus, workspace navigation, owner editing, public routes and metadata, and private response interactions. Authenticated API calls and catalog infrastructure are fixtures, so this does not prove live provider or database behavior. No API source changed and API integration was not repeated for this ownership move.

The browser server logged an early destination stream close during navigation, as in the preceding runtime verification. All assertions passed; this report does not claim that log has been investigated or fixed.

## Durable context and remaining work

The web context now points to the feature server reader. The parent restructuring remains In Progress. Other original findings, template contract completeness, and version retention acceptance still require a requirement by requirement current state audit. This report records self verification, not an independent review.
