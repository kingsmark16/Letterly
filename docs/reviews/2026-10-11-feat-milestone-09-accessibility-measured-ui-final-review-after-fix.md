# Review, M9 complete current delta after integration fix, 2026-10-11

**Reviewed by**: GPT-5.6 Terra (author on GPT-6)
**Scope**: Complete current M9 delta against `origin/staging`, including the working-tree landing integration fix and the YouTube recovery follow-up.
**Verdict**: Changes requested

## Summary

The landing integration fix leaves one `supportsHover` declaration and resolves the reported TypeScript duplicate. The previous YouTube error presentation, retry behavior, recovery link, and 44px target remain resolved. However, the compact public player still defers the provider request until Play, which conflicts with the selected preloading contract and is no longer caught by the changed browser case.

## Major

- `apps/web/src/templates/secret-letter/audio-player.tsx:272` — The loader returns while `compact && !youtubeEmbedOpen`. The public renderer always passes `compact`, and `youtubeEmbedOpen` becomes true only inside `togglePlayback`, after the visitor presses Play. Thus an active public player neither initializes the hidden iframe nor contacts YouTube when it mounts. This violates AC-5 and AC-6 in `docs/specs/0020-youtube-music-links.md`, which require active saved YouTube players to preload before Play and disclose that contact. `apps/web/e2e/youtube-player-accessibility.spec.ts:112` now clicks Play before asserting the first provider request, so it masks this behavior. Initialize and mount the hidden player for the active compact presentation before Play, then restore a browser assertion that observes the preload before activation.

## Strengths

- The landing hover test retains one capability check, so the integration fix removes the duplicate declaration without weakening the environment guard.
- The YouTube failure path keeps its announced error, canonical recovery link, safe external-link attributes, 44px target, and successful second-attempt SDK load coverage.
- The API readiness and cleanup ownership changes preserve the application-to-infrastructure dependency direction through explicit repository ports.

## Test coverage

The focused tests cover landing links, API readiness and cleanup behavior, shared UI measurements, YouTube error recovery, and SDK retry. The YouTube browser test needs a pre-Play request assertion for the compact public presentation. Tests were not run for this read-only review.
