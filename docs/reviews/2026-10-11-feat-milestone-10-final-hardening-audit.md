# Review, feat/milestone-10-final-hardening-audit, 2026-10-11

**Reviewed by**: GPT 5.6 Terra (author on GPT 6)
**Scope**: 43 files, branch vs origin/staging
**Verdict**: Approve with nits

## Summary

This branch hardens the API startup and readiness path, isolates browser fixture builds, restores public Secret Letter progressive enhancement, and reconciles the related delivery records. The Nest CLI entry points preserve dependency injection metadata, readiness converts the selected socket permission failure into the safe unavailable response, and the browser changes keep public content readable before client code is ready. One focused regression case is still missing for the exact server rendered skipped opening state.

## Minor

### 🟡 The no JavaScript test does not cover the repaired skipped opening state, `apps/web/e2e/youtube-player-accessibility.spec.ts:240`

**Problem**: The new JavaScript disabled case visits `/p/fixture-letter`, while the CSS gate changed at `apps/web/src/templates/secret-letter/renderer.module.css:879` also repairs the initial opened state used by `/p/fixture-letter?opening=1`. Existing `?opening=1` coverage runs with JavaScript enabled, so it cannot prove that the server rendered document leaves the message and lower sections visible without the client adding `data-client-ready`.

**Why it matters**: The default and hydrated cases can pass while a future selector change hides the exact no JavaScript path that this fix is meant to protect.

**Suggested fix**: Add a JavaScript disabled fixture visit to `/p/fixture-letter?opening=1` and assert the main message plus representative lower content and the footer or report slot are visible.

## Strengths

1. `apps/api/package.json` runs Nest source entry points through the Nest CLI compiler with TSX execution, preserving the emitted metadata required by constructor injection.
2. `apps/api/src/infrastructure/database/prisma-recovery.ts` and the health HTTP integration coverage keep `EACCES` out of reconnect recovery and return the established generic 503 envelope without exposing socket detail.
3. `apps/web/scripts/run-browser-fixtures.ts` gives each fixture run a validated output directory and removes only that directory in its cleanup path, preserving the ordinary `.next` build output.
4. `apps/web/src/templates/secret-letter/renderer.module.css` requires client readiness before hiding an unlocked letter, while locked pages retain their protected opening path.
5. The feature 20 repository structure row is the only matching scope item. Its `Review it` box was already checked, so this review needs no scope change.

## Test coverage

The configured Jest, Node, and Playwright suites have focused additions for database permission mapping, the safe readiness HTTP response, fixture build isolation, public letter hydration, and reset password response synchronization. The exact no JavaScript skipped opening state is missing the regression assertion described above. I did not run tests, as required for this review. The child fix runs `38146598444` and `38148864333` passed. The full branch CI run `38150521840` was in progress when reviewed.
