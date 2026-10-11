# Review, feat/milestone-03-template-registry-foundations, 2026-10-11

**Reviewed by**: Codex independent review, author on GPT-6
**Scope**: 137 files across the ten milestone 3 commits from `6189f5080e55fca457f4ba943baba742801ae06b` through `733ba1ee3ef45590e7825325053f0fe9a9aa9236`. The comparison intentionally excludes the accepted later staging synchronization.
**Verdict**: Approve

## Summary

This milestone replaces template name branches with explicit, version pinned registrations for catalog metadata, draft initialization, publishing, persistence, owner projections, repository public projections, transport projections, and web presentations. The review traced both supported identities through draft creation, publication, public reads, owner reads, catalog seeding, previews, and browser parsing.

The registry resolver rejects absent, unsupported, and mismatched supplied identity fields. The API resolves a trusted definition before dispatch, verifies the database stored identity inside the draft transaction, keeps the Page before PageJourney publication lock order, and maps invalid public bodies to the established unavailable result. The web code applies the same identity constraints before selecting metadata or a renderer.

The target branch being ahead of this head only contains the accepted milestone 2 synchronization and CI gate update. It does not change the reviewed milestone 3 implementation, so it is not a finding in this review.

## Blockers

None.

## Major

None.

## Minor

None.

## Nits

None.

## Strengths

1. `packages/templates/src/registry.ts` treats the presence of every supplied identity field as a constraint. A supplied `undefined` registry key therefore cannot accidentally fall back to a renderer and version match.

2. `apps/api/src/modules/pages/application/page.service.ts` retains shared authorization, active template lookup, lifecycle checks, slug handling, retry behavior, password guards, and safe error mapping while delegating only template specific policy and projection decisions.

3. `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts` resolves exact adapter identity, keeps generated slug retries and the containing transaction, validates the created record identity, and uses the same transaction for prepared template persistence and publication operations.

4. The public repository and transport adapters permit only explicit projection fields. They preserve safe media filtering, response redaction, locked metadata behavior, and safe failure for malformed stored content.

5. The web registration, public parsing, creator editor dispatch, preview paths, and browser fixture data all use the same immutable registry identity. The focused browser cases exercise mismatches, legacy responses, unavailable presentation, dirty journey recovery, public traversal, and idempotent response retries.

## Test coverage

Focused Jest coverage covers draft and publishing policy resolution, PageService orchestration, public transport adapters, owner projection adapters, persistence and publication transactions, catalog seeding, and unsupported identity cases. Focused web unit coverage covers public projection parsing and web registration. Fixture browser coverage covers both editor selection and recovery paths, public identity rejection and legacy compatibility, journey traversal, response retry identity, disabled responses, and server rendered fallback content.

`git diff --check 6189f5080e55fca457f4ba943baba742801ae06b 733ba1ee3ef45590e7825325053f0fe9a9aa9236` completed without whitespace errors. This review did not rerun the test suites. The branch head predates the later accepted staging CI update that invokes the fixture browser suite, and the expected PR reconciliation will inherit that update.

## Scope

No matching milestone 3 `Review it` row exists in `docs/scope/scope.md`.
