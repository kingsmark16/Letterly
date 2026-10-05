# Audio provider ownership review

Date: 2026-10-05

## Implemented

The YouTube SDK loader and browser interfaces have a focused owner beside the Secret Letter player. The direct import preserves the singleton and loading behavior without a barrel, new dependency, or generic framework. The player remains the owner of playback state, UI, and animation.

Source comparison against the prior commit confirms the full `SecretLetterAudioPlayer`, `formatTime`, and `clampTime` declarations are identical after CRLF normalization. The moved loader declaration is identical apart from `export`. Its safe errors and 15 second timeout are preserved. Initial comparison attempts included different line endings and failed; normalization resolved those false mismatches.

This applies the Vercel guidance for direct imports and statically analyzable paths. It does not claim a bundle reduction, new lazy loading behavior, or faster playback.

## Tests

All 121 web unit tests passed, including one parent and five new loader subtests. The browser substitute provides script and timer operations without real provider traffic. It proves coalescing, asynchronous script setup, bounded timeout, safe network and callback failure, missing constructor rejection, script reuse, subsequent successful readiness, and cached API reuse.

The uploaded audio motion check passed on desktop and mobile. It uses the existing `verifyAudioPlayerMotion` helper to verify the disc waits for `playing`, stops on pause and buffering, resumes from its prior angle, and stops on ended. It moves from the large public letter suite to the existing editor controls suite, with explicit owner and session fixtures. The initial legacy invocation reached the sign in screen and timed out because that invocation lacked an authenticated API; it was not a playback regression.

The production fixture build, web lint, web type checks, and root commit gates passed. These are local checks. No remote CI or live YouTube playback was observed.

## Confirmed spec conflict at review time

Accepted spec 0020 requires a visible official embed, at least 200 by 200 pixels, and no public provider contact before Play. Its player design also keeps the creator SDK unloaded until Play. The later `cb19e4d` refinement commit deliberately removed retry state and visible presentation behavior. The current file calls the SDK loader once the player is active and mounted, without checking its playback opener state, and renders the provider inside `youtubeEmbedHidden`.

A local owner Music workspace probe made no Play action and intercepted one SDK request. Measured wrapper geometry was `x=-10000`, width 320, height 180, fixed positioning, and opacity 0. This proves the current owner behavior conflicts with AC-5, AC-6, and AC-8. Source inspection shows the same activation condition applies to the public player. A separate public network reproduction remains required before claiming equivalent runtime evidence there.

Additional source findings under spec 0020: the current error JSX suppresses YouTube errors, Retry is absent, no privacy enhanced host is passed to the provider constructor, and no observer pauses playback when the player moves fully outside the viewport. Those are source findings, not completed runtime verification.

The temporary characterization case and config were removed after recording the measurements. The suite does not lock in hidden playback as expected behavior. The SDK extraction intentionally leaves the player body unchanged. Scope feature 19 still says done; that curated completion statement is contradicted by the remaining source findings and is flagged here rather than silently downgraded. The overall repository migration remains in progress.

## Decision resolution, 2026-10-05

The user chose to keep the existing hidden, preloaded player. Spec 0020 now records that decision, including that an active player can contact YouTube before Play. The earlier visible-embed/no-request-before-Play conflict is resolved at the contract level; the owner-only network probe remains the only direct pre-Play runtime reproduction, so equivalent public behavior is not claimed here.

## Focused accessibility follow-up, 2026-10-05

The public player now presents the before-Play provider-contact disclosure beside its compact opener and again in the expanded player. The opener and Play control reference it with `aria-describedby`. The hidden player wrapper is both `aria-hidden` and `inert`, so the provider iframe is not a second keyboard or screen-reader control surface. A focused public-letter Playwright case intercepted the SDK request, confirmed the disclosure was visible and opaque before that request, confirmed a focusable fixture iframe could not receive focus while inert, and scanned the current player state with the repository's WCAG 2.0/2.1 A/AA and 2.2 AA Axe rules. It passed at 390 and 1440 pixels in Chromium with no Axe violations.

The fixture runner remained alive after printing the passing test result and was interrupted during process shutdown; no clean runner exit was observed. This is focused assertion evidence, not a cross-browser or viewport matrix. The separate final Axe-suite smoke case did not complete, as recorded in the [scan report](2026-10-05-shared-ui-accessibility-scan.md). No live YouTube playback was exercised.

The disclosure and hidden-frame isolation findings are resolved for this focused public fixture. The privacy-enhanced host, visible playback error and recovery action, and pause when the player leaves the viewport remain separate source findings. The broader YouTube feature and spec 0020 remain in progress.
