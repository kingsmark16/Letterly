# Review, HEAD, 2026-10-11

**Reviewed by**: GPT-5.6 Terra (author on GPT-6)
**Scope**: 101 files, HEAD vs origin/staging
**Verdict**: Changes requested

## Summary
This change cleanly separates media-cleanup queue ownership, adds safe PostgreSQL credential-readiness handling, and expands UI accessibility and measured-surface coverage. The new repository port and Nest composition preserve the existing cleanup transaction and lease behavior, while the YouTube disclosure and inert iframe work address the focused public accessibility path. However, the changed YouTube UI now suppresses its own provider failure alert, so a failed or blocked video gives a recipient no visible recovery feedback.

## Major
### 🟠 YouTube playback failures are intentionally hidden, `apps/web/src/templates/secret-letter/audio-player.tsx:1028`
**Problem**: The player sets `playbackError` for IFrame API errors, blocked autoplay, and SDK-loader failures, but the only error markup is guarded by `playbackError && !youtubeVideoId`. For a YouTube source every one of those failures is therefore invisible. This guard is introduced in this diff; the prior renderer displayed the error regardless of source type.
**Why it matters**: A recipient who opens a letter whose provider script fails, whose video becomes unavailable, or whose playback is refused receives no explanation or recovery path even though the control changes state. This violates the YouTube playback contract's requirement for an announced error and retry or canonical `Open on YouTube` recovery action, and makes an external-provider failure indistinguishable from an unresponsive Play control.
**Suggested fix**: Render a safe, announced YouTube error state as well as the uploaded-audio error state, and include the specified recovery action without clearing the saved source. Add a browser case that forces the loader or player error and asserts the alert and recovery action are reachable.

## Nits
- ⚪ `apps/web/src/templates/secret-letter/audio-player.tsx:646`, `youtubeUnmuteAfterPlayRef.current = !muted;` is assigned twice consecutively. Remove the duplicate assignment.

## Strengths
- The cleanup queue is now represented by a focused application port with a dedicated Prisma adapter; the service only retains the image-expiry operation it needs, and the Nest composition test uses independent image and queue doubles.
- Credential rejection is explicitly classified outside transient recovery, returns the safe readiness response, emits a bounded once-per-episode metric, and has focused unit plus HTTP coverage.
- The public YouTube accessibility case verifies visible disclosure before the provider request and makes the hidden iframe inert and hidden from assistive technology.

## Test coverage
The new API tests cover authentication error classification, episode reset, safe readiness output, cleanup-adapter lease and retry behavior, and factory composition. The web suite adds WCAG scans and an exercised surface matrix, including the public YouTube disclosure and hidden-frame isolation. It does not cover the changed YouTube provider-error rendering branch; that omission leaves the suppressed-alert regression undetected.
