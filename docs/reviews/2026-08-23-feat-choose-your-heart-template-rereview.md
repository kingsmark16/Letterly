# Review, feat/choose-your-heart-template, 2026-08-23

**Reviewed by**: GPT-5.6 Codex (author on a separate model, name not supplied)
**Scope**: 57 files, branch versus `91b244f042c5b362f21380d9840ee4303ccac020`
**Verdict**: Changes requested

## Summary

The latest fixes resolve the earlier production findings for grapheme bounded public content, maximum depth calculation, dirty response settings, public metric scope, result back navigation, and Next workspace imports. The implementation now has a coherent private data path and no remaining production correctness or security bug was found in the reviewed code. One Major remains because the configured tests still do not exercise the new public visitor state machine or the real database transactions required by the feature specification.

## Blockers

None.

## Major

### 🟠 The critical visitor and persistence paths are still not proved, `apps/web/e2e/public-secret-letter.spec.ts:588`

**Problem**: The Choose Your Heart browser section contains one mocked authoring test and one protected page test that is skipped unless `PUBLIC_CH_PROTECTED_SLUG` is supplied. It does not exercise public branching, progress, result back navigation, continue without a message, private message submission, retry with one idempotency key, stale graph handling, unpublish during traversal, the creator response dashboard, mobile layout, keyboard traversal, or reduced motion. The repository coverage at `apps/api/src/modules/pages/infrastructure/prisma-page-journey-submissions.repository.spec.ts:221` uses mocked Prisma methods, and `PrismaPageJourneysRepository` has no direct transaction test against PostgreSQL.

**Why it matters**: These are new branching, error, concurrency, privacy, and authorization paths. AC-18 requires them to be proved. The current suite can stay green while the public experience, deferred foreign key cycle, immutable revision save, idempotent replay, password recheck, or page first lock behavior fails against the real application and database.

**Suggested fix**: Add deterministic Playwright journeys for the complete public flow, including back, progress, result, both response actions, retry, mobile, keyboard, and reduced motion. Add isolated PostgreSQL integration coverage for starter creation, immutable save, publish overlap, stale version, protected submission, idempotent replay, deletion key release, and snapshot retention. Keep the optional live protected page smoke test as extra coverage, not the only protected journey proof.

## Minor

None.

## Strengths

* Public graph text now uses the same grapheme aware schemas as saved graph validation, including emoji at the exact limits.
* Maximum depth uses memoized suffix depth and is covered for reconverging graphs in both choice orders and for the maximum bounded graph.
* The editor protects dirty journey work before response setting changes and keeps lifecycle content versions coordinated after publication.
* Public metrics resolve the slug through the safe published projection before recording a bounded event with no raw identifiers or private content.
* The submission transaction locks the page before the journey, rechecks publication, response availability, password version, graph version, idempotency, and browser uniqueness, then stores an immutable private snapshot.
* Result Back navigation preserves the earlier path, and the response retry keeps its idempotency key until the payload changes.

## Test adequacy

All 40 API suites and 230 tests pass. Web lint and type checking pass. Contracts and templates type checking pass. Prisma validation passes, and `git diff --check` reports no whitespace errors. Focused tests cover grapheme safe public schemas, memoized depth, starter creation, service error mapping, page first lock order through mocks, snapshot construction, idempotent replay through mocks, password version recheck through mocks, metric redaction, controller routing, deleted response key release, and creator topology authoring. The remaining gap is production significant because no deterministic browser journey covers the visitor renderer and no isolated database test proves the new relational transactions.
