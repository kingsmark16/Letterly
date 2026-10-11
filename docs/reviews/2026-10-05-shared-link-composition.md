# Shared Link consumer composition, 2026-10-05

Preview, shared footer, and auth footer link presentation now uses explicit utility composition under [0009](../specs/0009-design-system-ui-foundation/index.md). The [focused implementation contract](../specs/0022-repository-structure/0022-shared-link-composition.md) records the source values and preserved behavior. This advances shared UI ownership without changing the published template registry or launch content.

## Changes

- Shared Link accepts a typed anchor ref and passes it to its underlying anchor through React 19 props. Existing class merging, native anchor attributes, safe external rel handling, and public exports remain intact.
- Legal triggers use the canonical Link, with their current anchor refs, hrefs, click and Space behavior, dialog support detection, and focus return. An optional trigger class prop supplies consumer presentation; the obsolete native trigger stylesheet rules are removed.
- A plain `site-footer-link.ts` module owns the existing shared footer link utility composition. Landing shared Links, legal triggers, and dashboard Next links use it directly. Footer CSS retains layout, logo, and the native home link focus rule; it no longer selects navigation anchors.
- Auth owns its separate compact/full footer utility compositions because its color variables and responsive rules differ. Its footer anchor selectors are removed; the native logo focus selector remains. The existing short viewport full footer 40 pixel target is preserved, not newly certified as a 44 pixel target.
- Preview CSS retains back link margin only. Both registered and unavailable preview branches compose the same token based typography and decoration utilities on the shared Link.

No dependency, API, database, storage, authentication operation, template capability, or route is added. Server components remain server components. Legal content continues to be passed from server owners into the existing client dialog.

## Verification and limits

Before runtime changes, the new preview and landing footer suite passed all 12 engine/width combinations (Chromium, Firefox, WebKit at 390 and 1440 pixels) in 35.9 seconds. It checked preview color, typography, underline, margin, target, focus and navigation, plus footer sizing, typography, focus and Space/Escape legal return. This establishes a focused behavior baseline, not a full pixel comparison.

The shared UI package passed all 39 tests freshly, including the added anchor ref focus and unmount lifecycle test. Existing blank target rel/class merge coverage remains in place.

The first post migration browser run had 130 passes, 30 skips, and two failing Chromium landing Categories hover assertions. Traces showed the expected hover color briefly before the normal color returned; the dashboard checks passed with the same utility. The assertion now repositions the pointer while checking the final hover color, using a bounded Playwright retry rather than a fixed delay. This addresses pointer stability during focus/scroll movement without changing runtime scrolling. It does not establish a broader root cause for every possible browser movement issue. Thirty credential cases are explicitly gated and are not counted as verified behavior.

The final broad run passed 132 cases in 2.7 minutes with 30 gated credential skips across all three engines and two widths. It includes the three new preview/landing/dashboard cases and existing legal/auth coverage. Both production fixture builds passed.

All 12 existing unsupported native dialog and disabled JavaScript document fallback cases passed. The new compact auth legal focus case initially failed in all six profiles because its test expected the shared site footer's 3 pixel outline offset. The auth source and canonical token specify 2 pixels. Correcting that expectation without a runtime edit produced six passes in 14.9 seconds. This proves Space enhancement, Escape focus return, existing color/type, and the auth focus contract independently of the site footer.

The full recovery footer additionally passed six profiles in 12.2 seconds, each checking 390 by 900, 390 by 600, and 1440 by 900 layouts. The emitted media utility preserves the existing 12.48/10.56 pixel typography and 44/40 pixel minimum height switch, plus focus color and offset. This proves the transferred responsive rule, without claiming the retained 40 pixel legacy target meets a 44 pixel acceptance criterion.

Root `pnpm check:commit` passed, with fresh web/UI lint and type tasks and cached unrelated tasks. Formatting ran freshly. Later test-only additions are checked again by the commit gate. Performance evidence, normal build restoration, and independent review follow below. Wider landing header/hero composition and full 0009 acceptance remain open.

The unchanged landing budget passed both Chromium desktop/mobile cases in 6.0 seconds, against the existing immutable baseline. [Recorded measurements](2026-10-05-shared-link-performance.json) retain the decoded response byte totals, font asset hashes/counts, and CLS. This is the landing fixture budget, not an all route performance certification.

Both profiles measured 195,121 CSS bytes, 1,184,750 JavaScript bytes, ten font requests (428,152 bytes), and zero CLS. Normal environment `pnpm build` passed all three tasks, with fresh API/web builds and cached database generation, restoring production output after fixtures. Scope and the web/legal/UI context files record the new ownership without marking the wider feature complete.

After the additional recovery footer fixture, the final normal build again passed all three tasks (fresh web, cached API/database). A direct web `check-types` freshly regenerated routes and passed, and `git diff --check` passed. No feature completion box was changed. The user edit in `skills-lock.json` remains excluded from the milestone.

[GPT-6 Luna reviewed all 23 task files](2026-10-05-shared-link-composition-luna.md) and approved without findings. The review independently inspected source, selectors, ref forwarding, native route preservation, responsive utilities, and test scope; it did not rerun the author's gates.
