# Template version persistence dispatch verification

Date: 2026-10-03

## Covered paths

Ten cases call the actual PrismaPagesRepository with isolated v1/v2 definitions and fixture implementations of its four version adapter boundaries. Exact definition, catalog metadata, and adapter lookup use production resolution helpers. The fixture v1 descriptor is inactive and v2 is active. These definitions are not added to the canonical catalog. Eligibility remains the application's version reader responsibility before draft creation.

Draft preparation writes a distinguishable version title and retains the supplied templateVersionId. Before and after page operations receive the same transaction object, and after page work receives the created page ID. A stored version that conflicts with the requested identity is rejected before after page work. This test host does not implement rollback, so that rejection proves ordering and propagation, not physical database rollback.

Owner detail, dashboard summary, and public record projection select separate version markers. Owner metadata comes from the saved descriptor despite a newer database family name. Read paths perform no Page update. The public query is mocked, so these cases establish projection selection rather than publication or ownership enforcement at the database boundary.

Update cases supply the version policy's pure updater to the real repository and inspect the conditional content write. Both versions retain their saved identity and increment contentVersion. These query mocks do not model read after write storage, so the update assertions concern the write payload rather than its returned content.

Publication cases distinguish v1 and v2 by the prepared operation's content version increment rule. Preparation receives the supplied transaction and saved page ID. The conditional Page write occurs before the operation commits, and neither version writes templateVersionId. A zero count conditional write returns invalid_state without committing version work. The publication result retains the pinned template identity.

## Checks

| Command | Outcome |
| --- | --- |
| Targeted repository coexistence suite | PASS, 10 cases |
| Root lint | PASS, seven tasks |
| Root formatting check | PASS |
| Root type check with concurrency two | PASS, seven tasks |
| Root unit tests | PASS, 747 cases across five workspaces; API 581 in 78 suites |
| Final focused suite, API type check, and focused lint after isolating descriptor metadata | PASS |
| Root production build | PASS, three tasks; fresh NestJS compilation, unchanged database and web inputs reused their build caches |
| API integration suite | PASS, 595 cases; seven skipped, 25 passing suites and four skipped suites |
| Diff whitespace check | PASS |

Source reference checks show that the new fixture module is imported only by the repository test. The reused application fixture remains referenced only by tests and fixture modules. No production registration, source definition, migration, seed, or web component changed. Existing context instructions remain accurate, so no AGENTS.md change is needed.

## Limits and continuation

Prisma query and transaction calls use an injected test double. The transaction callback runs on that double without PostgreSQL constraints or rollback. The tests demonstrate repository dispatch, write payloads, identity checks, and operation ordering, not a deployed future version or arbitrary new content model. Existing launch adapter tests remain separate evidence. Seven database dependent integration cases remain skipped.

No browser rerun is warranted for this test addition. The earlier 72 desktop/mobile fixture journeys remain prior launch evidence. Editor/public component dispatch, preview selection, static lazy imports, and server readable future version output still need the isolated web coexistence proof. Real PostgreSQL seed rollback remains unproven. Keep the version retention spec and overall restructuring In Progress. This report records self verification, not an independent review.
