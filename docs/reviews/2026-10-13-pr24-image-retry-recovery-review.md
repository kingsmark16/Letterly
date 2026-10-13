# Review, feat/m12-image-retry-regression, 2026-10-13

**Reviewed by**: GPT-5.6 Terra (author on GPT-6 Luna)
**Scope**: 1 file, uncommitted
**Verdict**: Approve

## Summary

This test-only fix makes image recovery depend on the three distinct logical `previewAttempt` values rather than the number of raw browser requests. It preserves the intended two 503 responses and requires a successful image load only once logical attempt 2 is reached, while accommodating duplicate WebKit requests for an existing attempt. I found no regression or weakened assertion.

## Strengths

- The `Set` records the normalized logical attempts, so a duplicate raw request cannot incorrectly advance the fixture to success.
- The successful load assertion and the explicit `0`, `1`, `2` assertion together verify both observable recovery and bounded retry identity.

## Test coverage

The changed Playwright journey covers two failed logical attempts followed by preview rendering on the third. The adjacent all-failure case continues to assert that retries stop after the same three logical attempts. I did not run tests for this review.
