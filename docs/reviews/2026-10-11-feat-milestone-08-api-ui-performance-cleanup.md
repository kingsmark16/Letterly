# Review, feat/milestone-08-api-ui-performance-cleanup, 2026-10-11

**Reviewed by**: GPT-5.6 Terra, author model unconfirmed
**Scope**: 171 files from `origin/staging` at `64ae773b27718687aa11d97352d841e84eecc14a` to `6514b32ad06c909037b46b87417d037db879d55f`
**Verdict**: Approve
**Scope status**: `Review it` is already ticked for feature 20 in `docs/scope/scope.md`.

## Summary

This milestone separates repository responsibilities, bounds submission summary work, and records the supporting browser and database evidence. The initial review found one major issue and one minor issue. Commit `6514b32` fixes both, and the follow up review confirms the fixes in the final scope.

The author model is unconfirmed because the user selected "Another model or unsure." GPT-5.6 Terra performed this review, but that uncertainty means cross author independence cannot be guaranteed.

## Resolved findings

### Major, public YouTube request before Play, `apps/web/src/templates/secret-letter/audio-player.tsx:235`

The initial code loaded the YouTube iframe API and created a player as soon as a public compact player mounted. This could contact YouTube before the visitor selected Play.

Commit `6514b32` now requires `youtubeEmbedOpen` for the compact player loader and hidden iframe mount. The public renderer uses the compact player. The new browser regression in `apps/web/e2e/web-template-registration.spec.ts` checks that no iframe API request occurs before Play and that exactly one occurs after the visitor selects Play.

### Minor, deleted journey summary count retained, `apps/api/src/modules/pages/infrastructure/prisma-page-submissions.repository.ts:555`

The initial deletion path set `journeyAnswerCount` to zero while it cleared the journey snapshot. This left invented summary metadata on a deleted response.

Commit `6514b32` now sets `journeyAnswerCount` to null. The repository unit assertion verifies that the deletion update clears the count.

## Strengths

The YouTube fix places the same compact state boundary around the hidden iframe and the provider loader. This keeps the public request rule clear and prevents the two paths from drifting apart.

The deletion fix matches the nullable database design and the documented rule that response deletion clears both snapshot and count.

## Test coverage

The repository has configured tests. The reviewer did not run tests. Author run evidence records one passing Playwright regression for the public YouTube flow, one passing targeted Jest case for deletion metadata, and a passing commit hook with lint, formatting, and type checks.

The Playwright file is included by `apps/web/playwright.fixtures.config.ts`, so the regression runs in the fixture browser suite.
