# Review, fix/m10-public-letter-no-js-opening, 2026-10-11

**Reviewed by**: GPT-5.6 Luna (author on GPT-6)
**Scope**: 1 file, branch vs base
**Verdict**: Approve with nits

## Summary

The CSS change correctly keeps the server rendered letter and its lower sections visible while `data-client-ready` is absent, which covers the JavaScript disabled `?opening=1` path. Once the client layout effect sets `data-client-ready="true"`, the existing opened and revealed state still controls the animation gate. The added reduced motion selectors now match the gate specificity and restore the main and lower sections while the letter is opened but not yet revealed. One minor follow up remains because the exact no JavaScript plus `?opening=1` regression is not covered by a focused browser case.

## Minor

### Minor: The exact no JavaScript skipped opening path has no focused browser assertion, `apps/web/src/templates/secret-letter/renderer.module.css:879`

**Problem**: The configured Playwright suites cover a no JavaScript public letter at the default URL and cover `?opening=1` after hydration in separate cases, but no changed test visits the public route with `javaScriptEnabled: false` and `?opening=1`.

**Why it matters**: This CSS change exists to fix that combination. The separate cases can both pass while a selector or server attribute regression hides the letter, gallery, reasons, or report content in the exact route state being repaired.

**Suggested fix**: Add a no JavaScript public Secret Letter case for `?opening=1` that asserts the main message and representative lower sections, including the footer or report slot, are visible in the server rendered document.

## Strengths

- The main content gate and the lower section gates now require `data-client-ready="true"`, so server rendering does not depend on hydration, GSAP, or ScrollTrigger for content visibility.
- The reduced motion block now uses matching selectors for the main content and all four lower section gates, so `prefers-reduced-motion` wins during the client ready and not revealed state.
- The change leaves `data-opened` and `data-revealed` state production in the renderer untouched, and the envelope display rule still uses the existing opened state.
- The scope file has no milestone 10 fix row that matches this change. Its repository structure `Review it` box is already checked, so no scope update was needed.

## Test coverage

The repository has configured Playwright and other runners. Existing browser coverage exercises the default no JavaScript public letter, hydrated `?opening=1`, and a reduced motion skipped opening, but it does not exercise no JavaScript with `?opening=1` or assert all lower sections in that server rendered state. The earlier reduced motion specificity finding is resolved by the matching selectors at lines 1516 to 1539. I did not run tests, as required for this review.

