# Review, feat/dashboard-overview-redesign, 2026-09-15

**Reviewed by**: Codex (inline reviewer, author model unavailable)
**Scope**: 10 files, branch vs main
**Verdict**: Approve with nits

## Summary

The redesign keeps the existing authenticated data boundary, safe projections, route destinations, and catalog loading path. The two follow up fixes are correct for the common cases: a complete recent reply failure now has a retry action, and the browser coverage includes normal motion and the 1024 pixel layout. One minor edge case remains in the partial reply failure branch, where the dashboard warns that some replies are unavailable but offers no way to retry them.

## Minor

### 🟡 Partial reply failures have no recovery action, `apps/web/src/features/pages/components/dashboard-overview.tsx:631`

**Problem**: When at least one response query succeeds and another response query fails, `ResponseListSection` renders the warning at line 632 but does not render the `onRetry` button. The dashboard can therefore show an incomplete recent reply list with no recovery action for the missing page replies.

**Why it matters**: The response section is built from up to four independent page queries, so this state can occur whenever only one page request is unavailable. A creator may not know that the list is incomplete and cannot recover the missing replies from the overview.

**Suggested fix**: Add a retry control to the partial failure branch, or make the warning link to the affected page response routes. Add a browser scenario where one response query fails while another returns a reply, then verify that the recovery action retries the failed query.

## Strengths

- The overview preserves the owner only TanStack Query flow and renders safe page and response summary fields without browser persistence or raw HTML.
- The follow up browser coverage now verifies the normal GSAP path, the required 1024 pixel shell behavior, and complete response failure recovery.

## Test coverage

The supplied signal reports 50 passing Playwright tests across desktop and mobile, plus passing web lint and type checks. The changed overview tests cover populated and empty states, page failure recovery, complete response failure recovery, no overflow at 390, 768, 1024, and 1440 pixels, forced colors, reduced motion, and normal motion. The remaining gap is the partial response failure branch described above.

Scope: the dashboard row is already marked done in `docs/scope/scope.md`; no scope file change was made during this read and write review.
