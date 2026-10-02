# Public availability infrastructure boundary

Date: 2026-10-03

## Result

The shared publicPageAvailabilityWhere helper and its existing test moved from pages/application to pages/infrastructure. This implements the explicit API boundary requirement in the parent repository structure spec. The helper returns a Prisma predicate, so its owner is infrastructure. Application and domain do not need a duplicate availability model for this move because none currently evaluate these rules independently.

All nine callers are infrastructure repositories: pages, analytics, uploaded audio, external audio links, images, password protection, reports, standard submissions, and journey submissions. Their imports now resolve locally within infrastructure. Searches found no remaining application/public-availability import or direct database package/Prisma client import in pages application/domain.

Both moved files were compared against their prior Git contents with line endings normalized and were unchanged. Publication status, page moderation, creator moderation, expiry with a strict greater than comparison, current slug reservation, supplied slug, and default clock behavior remain identical. Password proof remains a separate guard. No query, HTTP contract, schema, provider, migration, or deployment behavior changed.

## Enforcement

A pages application/domain ESLint rule rejects direct imports of @letterly/database and @prisma/client, including subpaths and type imports. It uses the TypeScript restricted import rule alongside the existing core restricted import rules, so it does not replace the stricter template policy restrictions or the expected HTTP exception rule.

Seven boundary probes verified application database type imports, database subpath imports, direct Prisma imports, and domain database imports are blocked. Repository port imports and infrastructure Prisma types remain allowed. The existing prohibition on direct BadRequestException imports still fires. This is a guard against direct database imports, not a claim that every transitive application dependency is already clean.

## Verification

| Check | Result |
| --- | --- |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 531 passed, API 477, web 33, database 6, UI 15 |
| API integration | 39 passed, 7 skipped, four passing suites and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Boundary probes | Seven expected results passed |

The existing availability test moved with its implementation. Existing repository suites continue to exercise public query predicates and protected read paths. No duplicate tests were added for this mechanical move.

## Limits and next work

Verification was performed by the implementing agent, not an independent fresh model reviewer. HTTP integration suites use mocked application dependencies; skipped database checks did not exercise a live database. Browser tests, provider operations, seeds, migrations, and deployments were not run for this slice. Prior browser results remain historical evidence.

The broader structure migration remains In Progress. Next, review remaining application imports from infrastructure, starting with public read retry classification in PageService. Draft update compatibility assumptions, stored content types, and the known visible no JavaScript fallback issue remain further work.
