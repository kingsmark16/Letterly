# Registered persistence publication adapters

Date: 2026-10-02
Branch: `feat/repository-verification-baseline`
Contract: [persistence publication adapters](../specs/0022-repository-structure/0022-persistence-publication-adapters.md)

## Result

The publication transaction resolves an explicit infrastructure adapter by trusted registry key and exact immutable version. The repository retains owner Page locking and reads, status and expected version checks, trusted audio requirements, slug reservations, conditional Page updates, result mapping, and transaction ownership.

Secret Letter prepares a no-op operation with no content version increment. Choose Your Heart locks PageJourney after Page, reads and captures the draft revision, and returns an operation bound to the supplied transaction. The repository increments the Page contentVersion once for that operation, then promotes the captured revision only after its conditional owner Page write succeeds. Missing journeys fail before Page or revision writes. Promotion errors propagate to the outer transaction. No nested transaction or separately constructed client was added.

The old literal Choose Your Heart branches in publishPage were removed. Application publishing policies remain framework independent; Prisma work lives beside the owning feature's infrastructure. The registered map has compile time coverage of canonical template keys and exact pinned version matching.

## Verification

* Repository unit suite: 46 passed, including seven new failure/transaction regressions.
* Full API unit suite: 421 passed across 59 suites. Web unit tests: 28 passed. Database catalog tests: 5 passed. Shared UI tests: 15 passed.
* API integration: 39 passed, 7 skipped across four passing and four skipped suites. These passing HTTP suites mock application dependencies, and do not prove real database concurrency or rollback.
* Root type checks, formatting checks, unit tests, and build pass. API production build was executed; unchanged web/database build tasks were cache hits from the preceding verified milestone.
* Root lint identified an untyped nested Jest matcher in the new test. It was typed using the existing Jest asymmetric matcher convention; API lint and the repository tests passed afterward. Other workspace lint tasks passed unchanged.
* `git diff --check` passes.

The lock regression now identifies the SQL table rather than labeling every queryRaw call as a Page lock. It asserts Page lock, Page read, PageJourney lock, journey read, conditional Page update, and revision promotion in that order. It verifies the exact captured revision and one content version increment. Secret Letter verifies no journey read/write and no version increment.

New checks cover unknown identities, unsupported versions for both templates, missing journeys, losing the conditional update, propagation of revision write errors, and a separate transaction object that proves all adapter operations avoid the outer client and nested transactions. Existing tests retain slug stability, stale content version rejection, ownership conditions, and lifecycle failure mapping.

## Documentation and scope

Updated API pages context, template registration steps, and the parent structure spec links. The overall migration remains In Progress. Historical evidence and unrelated scope entries were preserved. The preexisting skills-lock.json edit is excluded from the milestone commit.

## Limits and next work

No schema, migration, live seed, route, provider, dependency, or web source changed. Browser journeys were not rerun for this infrastructure extraction. No live database transaction race, independent fresh model review, push, pull request, or deployment ran. The skipped database tests were not executed.

This extraction preserves existing revision promotion. It does not introduce graph revalidation during publication or generalize the stored Secret Letter content envelope. Other persistence template branches remain in creation and projection mapping. The previously recorded visible no JavaScript fallback problem remains unresolved.

Next: carry full trusted template identity through public API projections and resolve it consistently in web presentation before allowing category key collisions or broader template growth.
