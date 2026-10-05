# Review, feat/repository-verification-baseline, 2026-10-05

**Reviewed by**: GPT-6 Luna (author on GPT-6)
**Scope**: 9 files, uncommitted
**Verdict**: Approve

## Summary

The change narrows Tailwind's production scan to the web app, web source, and shared UI source, while excluding colocated test/spec files; it also extends the existing performance gate across 19 production route and state surfaces. The measured artifact has one desktop and one mobile sample for every surface, and its route-specific comparisons preserve the original landing baseline. I found no material correctness issue. A stale verification placeholder identified in the first review pass was replaced with the reported wider-run outcome and verification limits before this final pass.

## Resolved finding

The initial review flagged `docs/reviews/2026-10-05-shared-ui-surface-performance.md:29`, which said wider verification results would be recorded below although the section ended there. The updated report now distinguishes the 38-case performance run from the 426-case interaction run (395 pass, 30 intentional skips, one Firefox 1440 reset-success failure), records the 20/20 isolated repetition and the 32-pass/10-skip surrounding Firefox auth suite, and states that the original failure remains unexplained. It also records the author-reported normal build, direct web types, and root gates. This resolves the documentation finding; I did not rerun those gates or browsers.

**Problem**: The report says broader browser checks, build restoration, root gates, and independent review “are recorded below after their results are available,” but that line is the final bullet and those results are now available.

**Why it matters**: Readers cannot tell from this milestone report that the separate 426-case UI run ended with one Firefox 1440 reset-success failure. Its trace showed filled inputs but no reset HTTP request; the cause is unproven. The unchanged case then passed 20 isolated repetitions, which is useful diagnostic evidence but does not erase the full-run failure.

**Suggested fix**: Replace the placeholder with the final evidence, keeping the 38-case performance run, the 426-case browser run, and the 20-case isolated repetition distinct. Record the 395 passed, 30 intentional Coming Soon skips, and one failure; state that the failure remains unexplained and that the surrounding Firefox auth suite is still running. Do not describe the wider run as fully passing.

## Strengths

- The explicit source paths are relative to `apps/web/app/globals.css` and cover the maintained web app, web feature/template owners, and `packages/ui/src`. The production test also exercises the resulting output instead of treating source-path string assertions as sufficient proof.
- The performance helper uses explicit, deterministic fixture routes and waits for each surface's distinguishing state, loaded fonts, animation frames, and pending static assets before recording decoded CSS, JavaScript, fonts, and layout shifts. The capture checks static request failures and retains a per-run artifact even when a budget assertion fails.
- Historical baseline provenance includes the detached source commit, fixture source commit, lockfile and harness hashes, and a clear record of the initial secret-gated failures and focused rerun. I previously independently matched all 38 historical samples to their raw measurement files; each record was exactly equal. The retained landing baseline hash also matched its recorded SHA-256.

## Test coverage

The current performance test has one Chromium desktop/mobile case for each of 19 surfaces. It checks route-specific CSS and JavaScript limits, font request counts and hashes, viewport and device scale, loaded fonts, and horizontal overflow; the initial landing CLS limit remains tied to the original landing baseline. The author reports 38 performance cases and 121 web unit tests passing. Separately, the author reports a 426-case three-engine browser run with 395 passed, 30 intentional email/password Coming Soon skips, and one Firefox 1440 reset-success failure. The request was absent from the trace despite filled fields; its cause is not established. The unchanged case passed 20 isolated repetitions, and the surrounding Firefox authentication suite passed 32 enabled cases with ten intentional skips. The author also reports the normal build, direct web route/type check, and root commit gates passing. I did not rerun browser or build commands and do not treat the full run as passing. The temporary historical capture spec has been removed; its hash remains recorded, but is not independently recomputable from the current checkout.
