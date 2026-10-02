# 0022. Owner audio controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Extract owner audio upload/link/metadata/complete/retry/delete/read routes into `presentation/owner-page-audio.controller.ts`. Preserve all seven handler bodies and decorators, class session guard, paths, validation, status codes, existing cache headers, and projections. Relocate four owner unit cases beside the controller.
- AC-2: Keep constructor injection focused on optional audio service, audio link service, and rate limiter. Preserve session supplied ownership, rights confirmation, upload limits and limiter ordering, fresh retry records, created/existing link statuses, private metadata, completion projection, and deletion semantics. Remove the now empty PagesController and update module registration and dependency metadata tests without a compatibility alias.
- AC-3: Share the existing range parser and response pipeline in `presentation/page-audio-http.ts`, and the existing audio error mapper in `presentation/page-audio-error.mapper.ts`. Preserve helper bodies, safe range failures, exact bytes, audio MIME fallback, partial response status, range/length/security headers, and response destruction after headers are sent. Public controller class and production services/factories/providers remain unchanged.
- AC-4: Verify real owner HTTP routes with production audio and audio link factories, fixture sessions, and mocked provider ports. Cover all routes, ownership forwarding, contract validation, guards, missing services/resources, optional limits, retry identity, link feature flag behavior, stream ranges and bytes, safe errors, and stream failures before/after headers. Pass repository gates and keep the parent migration In Progress.

## Decision and rationale

This records the completed slice authorized by the user's next instruction under the existing repository ownership decision. Audio upload and YouTube link routes form one cohesive owner audio boundary. Their service factories retain repository and provider decisions. Range parsing, response piping, and errors are transport concerns shared by owner and public playback, so each has one presentation implementation.

The old PagesController owned only these seven routes after previous slices. Removing it also removes unused PageService, app origin, journey submission service, and controller feature flag dependencies. The YouTube creation flag remains in its existing application factory, which continues to allow access to existing links while blocking new creation when disabled. Mutation cache policy and other product behavior are not changed.

## Verification

See [the owner audio controller review](../../reviews/2026-10-03-owner-audio-controller.md). Handler bodies/decorators, range parser, stream helper, mapper body, and public controller class match their prior source exactly. Fifty nine new HTTP cases, four relocated owner cases, and two new stream failure unit checks pass.
