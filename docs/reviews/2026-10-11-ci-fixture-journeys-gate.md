# Review, feat/milestone-02-staging-sync, 2026-10-11

**Reviewed by**: GPT-5.6 Terra (author on GPT-6)
**Scope**: 4 files, `origin/feat/milestone-02-ownership-foundations` at `6189f5080e55fca457f4ba943baba742801ae06b` through `HEAD` at `b93886d`
**Verdict**: Approve

## Summary

This correction merges the current staging CI configuration into the milestone branch and adds the fixture browser journeys to the existing `quality` job. The workflow retains the `staging` push branch, the pull request trigger, the isolated database setup, the real API smoke journey, and the Chromium installation.

The new fixture step runs `pnpm --filter web test:e2e:fixtures` after Chromium installation and after the smoke journey. That command builds the web application with the local catalog fixture on port 3002, then starts its own production web server on port 3100 before executing the five desktop and mobile Playwright suites. Its inherited secrets and database settings are sufficient, and the runner deliberately replaces the inherited API origin with its fixture origin.

This resolves the Major finding at `.github/workflows/ci.yml:89` in `docs/reviews/2026-10-11-feat-milestone-02-ownership-foundations.md`. The remaining range additions are prior review records from the staging merge, which are documentation only and match the corrections now present in the workflow.

## Strengths

1. `.github/workflows/ci.yml:5` keeps `staging` in the explicit push branch list, so a staging merge starts the same quality gate.

2. `.github/workflows/ci.yml:100` through `.github/workflows/ci.yml:109` add the fixture journey command without replacing the real API smoke test at line 98.

3. `apps/web/scripts/run-browser-fixtures.ts:5` through `apps/web/scripts/run-browser-fixtures.ts:35` supplies the fixture specific origins and test flag, builds the required web output, and returns a failing Playwright exit code to GitHub Actions.

4. `git diff --check 6189f5080e55fca457f4ba943baba742801ae06b..HEAD` reports no whitespace errors.

## Test coverage

The configured test signal is Jest with Playwright browser journeys. This review did not run repository tests because it assesses a declarative CI change. Static inspection confirms that the existing Chromium installation at `.github/workflows/ci.yml:86` precedes both browser commands, and the new fixture command invokes the package script that runs the five fixture browser suites on desktop and mobile. A GitHub Actions run is still the runtime proof of the hosted runner environment.
