# Review, codex/pr27-accessibility-targets, 2026-10-13

**Reviewed by**: GPT-5.6 Terra (author on GPT-6 Luna)
**Scope**: 14 files, branch vs origin/feat/milestone-10-final-hardening-audit
**Verdict**: Approve with nits

## Summary
The patch makes the administrator confirmation dialog usable in a short viewport, raises standalone legal-page link targets to the 44 px token minimum, and moves the new dialog layout rules into their feature stylesheets. The behavior is covered with focused Playwright checks for keyboard reachability, overlay order, and rendered link dimensions across both legal routes. One current-state statement in the completion audit is stale after the supplied successful CI run for the PR head.

## Minor
### 🟡 Completion audit says the current patch has not passed CI, `docs/reviews/2026-10-05-repository-completion-audit.md:49`
**Problem**: The audit says that the “current patch still needs its full hosted workflow,” while the review context records that the full hosted CI workflow passed at the PR head `b4427aadeb3927887201a1318dcf56f2b7158992`.
**Why it matters**: This is a current-state audit used as repository evidence. Leaving the pending-workflow claim in place misstates the available verification and makes a later reviewer believe the branch has an unresolved delivery gate.
**Suggested fix**: Replace the pending-workflow statement with the passed head revision and retain the distinction between hosted CI evidence and unobserved production-provider behavior.

## Strengths
- The administrator regression verifies keyboard focus progression, fully visible action controls, correct dialog stacking over the workspace header, and no accidental mutation.
- The legal regression checks actual DOM dimensions for every scoped target across both policy routes and six viewport widths.
- The CSS-module extraction preserves feature ownership while keeping the shared Dialog’s typed composition slots intact.

## Test coverage
Configured Playwright coverage exercises both new accessibility behaviors: short-viewport confirmation-dialog reachability and 44 by 44 px standalone legal targets. The existing legal-dialog cases still exercise dialog opening, mobile overflow, closing, and focus restoration after the dialog CSS moved into the feature stylesheet. No tests were run for this read-only review; the supplied hosted CI result for head `b4427aadeb3927887201a1318dcf56f2b7158992` passed all checks.

## Scope
Feature 20’s `Review it` box was already checked and remains unchanged.
