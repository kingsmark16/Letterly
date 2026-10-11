# Audio provider loader ownership

Date: 2026-10-05

**Status**: Accepted

## Contract

Keep the existing YouTube browser interfaces, global declaration, SDK promise, script loading, callbacks, safe errors, timeout, and recovery in `secret-letter/youtube-iframe-api.ts`. The audio player imports the loader and player type directly. This follows the typed browser provider boundary in spec 0020 without changing any source eligibility, loading trigger, playback state, JSX, animation, or CSS.

The entire player function and time helpers remain identical after line ending normalization. The loader function remains identical apart from its named export. Its singleton stays at module scope, and importing the module performs no SDK request. The existing player still determines when to call it.

## Verification

Node tests cover shared pending requests, script reuse, timeout, network failure, callback failure, missing provider constructor, later recovery, and successful API reuse. Browser probes intercept provider traffic and record observed behavior separately from acceptance. The existing uploaded audio motion case moves to the fixture based editor suite with explicit owner session data, while retaining the same motion helper.

Run affected unit tests, the production fixture build, desktop and mobile motion checks, lint, formatting, and types. Record results and unresolved spec conflicts in [the report](../../reviews/2026-10-05-audio-provider-loader.md).

## Limits

This is an ownership extraction, with no new provider abstraction or generalized plugin system. Spec 0020's visible, manual YouTube presentation conflicts with the later audio refinement commit. That behavior decision is pending and is not silently changed by this milestone. The parent structure requirement and complete audio acceptance remain open.
