# Review, HEAD working tree follow-up, 2026-10-11

**Reviewed by**: GPT-5.6 Terra (author on GPT-6)
**Scope**: 3 uncommitted files after e11f854
**Verdict**: Changes requested

## Summary
`git diff e11f854..HEAD` is empty because the submitted fix remains uncommitted; this review therefore inspected the three working-tree files containing the follow-up. The original major is resolved: YouTube loader failures now render an announced alert and a canonical external recovery link. The duplicate assignment nit is also resolved. A retry still does not work after the loader fails, despite the updated user copy instructing a recipient to try Play again and the governing contract requiring Retry as well as the external link.

## Major
### 🟠 Play cannot retry a failed YouTube SDK load, `apps/web/src/templates/secret-letter/audio-player.tsx:623`
**Problem**: After `loadYouTubeIframeApi()` rejects, the catch handler clears only `youtubePlaybackRequested` and records the error. The next Play click sets `youtubeEmbedOpen(true)` again, but it is already true; none of the loader effect dependencies changes (`active`, `compact`, `displayTitle`, `mounted`, `youtubeEmbedOpen`, `youtubeVideoId`), so the effect does not run and the SDK is never requested again. The newly added text says “Try Play again,” but that action leaves the control busy without retrying the failed load.
**Why it matters**: A transient provider or network failure strands the user in the error state. AC-9 requires recovery actions for a provider outage, and the player requirements explicitly require Retry plus the canonical `Open on YouTube` link. The external link is useful but does not make the promised in-letter retry work.
**Suggested fix**: Add an explicit Retry control that clears the failed player state and changes a retry key or equivalent lifecycle state so the loader effect creates a new SDK request. Cover an initial intercepted SDK failure followed by a successful retry, asserting the player leaves the error state and Play becomes available.

## Strengths
- The error block now renders for YouTube sources with an announced safe message and a canonical video URL using `_blank` with `noopener noreferrer`.
- The added browser case forces an SDK request failure and verifies both the alert and the external recovery link.
- The duplicated `youtubeUnmuteAfterPlayRef` assignment identified in the original review has been removed.

## Test coverage
The new AC-9 case detects the original hidden-alert regression and verifies the external-link fallback. It does not exercise a second Play action after the failed SDK request, so the nonfunctional retry path remains untested.
