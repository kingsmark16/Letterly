# Review, feat/milestone-02-ownership-foundations, 2026-10-11

**Reviewed by**: GPT-5.6 Terra, with GPT-6 synthesis (author on GPT-6)
**Scope**: 117 files, `feat/milestone-02-ownership-foundations` against its `staging` merge base, ending at `6189f5080e55fca457f4ba943baba742801ae06b`
**Verdict**: Changes requested

## Summary

This milestone gives legal documents a feature owner, centralizes browser HTTP transport, moves the creator page list into its feature, separates owner page operations into a dedicated controller and use case, and groups page interface files by responsibility. The route paths, authentication guard, creator identity binding, input validation, private cache headers, lifecycle rate limits, and safe error mapping are preserved in the reviewed controller extraction.

The required browser regression suite was added, but the configured CI job does not invoke it. The existing successful CI job therefore does not prove the changed page list, response, navigation, and mobile behaviors before merge.

The `staging` push trigger is present on the current base branch. Its absence at this PR head is a consequence of the branch being behind its retargeted base, rather than an incremental milestone change, so it is outside this finding set.

## Blockers

None.

## Major

### 🟠 The new browser regression suite is not part of the merge gate, `.github/workflows/ci.yml:89`

**Problem**: The workflow runs only `pnpm --filter web test:e2e e2e/authenticated-draft-loop.spec.ts`. The newly added `test:e2e:fixtures` command in `apps/web/package.json:13` is not called by the workflow or by the root `pnpm test` command.

**Why it matters**: The new fixture suite contains the page list cursor and safe error recovery checks, response privacy and focus recovery checks, workspace navigation checks, design compatibility checks, and their desktop and mobile variants. They can fail without failing the required PR job. This conflicts with the repository structure specification, which requires relevant browser journeys for web moves and the intended browser smoke suite in CI.

**Suggested fix**: Add the fixture backed browser suite to CI, either as its own job or as a step after the existing smoke test. Keep the existing real API draft journey if it covers a separate boundary.

## Minor

None.

## Nits

None.

## Strengths

1. `apps/api/src/modules/pages/presentation/owner-pages.controller.ts` preserves the session guard, Zod contract pipes, authenticated creator ID forwarding, private owner read cache headers, lifecycle rate limits, and safe exception mapping.

2. `apps/api/src/modules/pages/application/list-owner-pages.ts` stays free of NestJS, Prisma, and infrastructure dependencies. `apps/api/src/modules/pages/pages.module.ts` constructs it through the existing repository token.

3. The transport extraction keeps credentialed Axios configuration, safe error conversion, response schemas, and cancellation identity. The page list query now passes TanStack Query's abort signal to Axios.

4. The controller, API transport, page list, and browser changes have focused unit, HTTP, and browser test files. No schema or migration change is included.

## Test coverage

The GitHub `quality` job for the specified head completed successfully. It ran lint, formatting, types, builds, workspace unit tests, API end to end tests, and the existing authenticated draft browser smoke test.

Static review also confirmed focused coverage for the extracted listing use case, owner list HTTP boundary, lifecycle rate limit behavior, browser transport, page list request cancellation and safe malformed responses, plus the added browser fixture suite. `git diff --check origin/staging 6189f5080e55fca457f4ba943baba742801ae06b` is clean.

The fixture backed suite is currently non gating, as described in the major finding. No additional commands were run for this review.
