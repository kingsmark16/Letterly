# Review, feat/m12-landing-test-sync, 2026-10-13

**Reviewed by**: GPT-5.6 Terra (author on GPT-6 Luna)
**Scope**: 4 files, branch vs origin/feat/milestone-12-deployment-workflow
**Verdict**: Approve

## Summary
This test only change replaces an unstable landing network idle wait with a bounded static asset settle check and makes no script navigations stop at DOMContentLoaded. The guard waits for visible content, fonts, two animation frames, a 500 ms static asset quiet period, every observed response body, and a stable request generation before keeping the immutable byte, font, overflow, and CLS comparisons. The baseline scope text now separates the historical capture conditions from the current gate, so it does not refresh measurements or hide a regression. Scope: ticked `Review it` for the M12 landing timing test fix in feature 21.

## Strengths
- `apps/web/e2e/ui-performance.spec.ts` tracks each static request before navigation, rejects failed or unreadable assets, and rechecks both activity and the request generation after body draining.
- `apps/web/e2e/landing-foundation.spec.ts` keeps the no script journey assertions intact while removing the navigation wait that can hang when JavaScript is disabled.
- The fixture values and source commits are unchanged. Only their scope descriptions record the current deterministic capture gate.

## Test coverage
The changed performance guard executes for all 19 route and state surfaces at both 390 px and 1440 px, for 38 configured Chromium browser cases. The no script journey continues to assert the fallback preview link, the Secret Letter preview route, the Choose Your Heart catalog content, and the preview region after each DOMContentLoaded navigation. This source review did not run the browser suite.
