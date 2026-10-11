# Review, shared-link-composition, 2026-10-05

**Reviewed by**: GPT-6 Luna (author on GPT-6)
**Scope**: 23 task-owned files, uncommitted (excluding the unrelated `skills-lock.json` change)
**Verdict**: Approve

## Summary

The milestone moves preview, shared-footer, auth-footer, and legal-trigger presentation from ancestor CSS selectors to explicit utility composition, and adds an anchor ref contract to the shared Link for dialog focus return. Current routes, footer composition, safe external link behavior, and the legacy auth responsive styles are preserved. I found no actionable issue in the focused change; the review and author report both keep wider 0009 acceptance open.

## Review findings

The React 19 `LinkProps` adds `RefAttributes<HTMLAnchorElement>`, and the component spreads the ref-bearing props to the rendered anchor while retaining caller class merging and the existing `_blank` `noopener noreferrer` handling. The new primitive test checks the ref points to the anchor, can focus it, and clears on unmount. Legal triggers now use that canonical Link, retain `/privacy` and `/terms` hrefs, click and Space enhancement, native dialog detection, and pass their refs to the dialog's focus-return path. All current legal-trigger callers provide explicit footer classes.

The shared footer utility preserves the previous landing footer color, type, target size, hover and focus presentation. Landing shared links and legal triggers, plus both dashboard `next/link` consumers, pass the utility explicitly; the native dashboard router import and hrefs remain unchanged. Footer CSS now owns layout and its wordmark focus rule without descendant navigation selectors. Auth retains its own explicit classes for the separate color tokens and compact/full footers. The full auth short-viewport rule is represented by the same max-width/max-height condition, 40 px target and 0.66 rem type as the removed CSS. The new recovery browser case verifies those emitted values at 390x900, 390x600 and 1440x900; the 40 px legacy size is clearly not presented as satisfying the separate 44 px target guidance. Preview margin remains in the module while both available and unavailable branches receive the same explicit typography and decoration.

## Strengths

- CSS selectors were removed only after their consumer declarations moved; the native wordmark focus styles and reduced-motion behavior remain.
- The author report records initial hover assertion failures and their test-only correction, with a bounded retry that restores pointer hover during focus and scroll settling rather than changing runtime behavior.
- The report distinguishes the focused checks from all-route performance and complete design-system acceptance. Wider landing header/hero composition and the full 0009 checklist remain open.

## Test coverage

The author reports the final fixture run passed 132 cases with 30 explicitly gated credential skips across Chromium, Firefox, and WebKit at two widths; the 12 unsupported-dialog/no-JavaScript fallback cases passed. The new compact-auth legal-focus check passed six profiles after the test's outline-offset expectation was corrected to the source's 2 px value. The full auth recovery footer responsive case passed six profiles and verifies both the default 44 px and legacy short-viewport 40 px sizes. The shared UI package passed 39 tests, including the new ref lifecycle check. The existing landing performance budget passed desktop and mobile with 195,121 decoded CSS bytes, 1,184,750 JavaScript bytes, 10 font requests totaling 428,152 bytes, and zero CLS; these measurements are explicitly limited to that fixture.

The author also reports the root commit gate, final normal build restoration, fresh direct web route type check, and whitespace check passed. The report does not claim live API behavior or complete launch/feature acceptance. I did not rerun the checks.
