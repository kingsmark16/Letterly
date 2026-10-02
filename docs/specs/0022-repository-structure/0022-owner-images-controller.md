# 0022. Owner image controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Move the six owner image upload/list/complete/retry/delete/read routes into `presentation/owner-page-images.controller.ts` with two colocated owner unit cases. Preserve paths, decorators, guards, contract pipes, status codes, response projections, and existing cache headers.
- AC-2: Preserve session supplied creator identity, upload type/size/checksum/replacement validation, upload limiter ordering, optional media service and limiter injection, completion/retry/deletion rules, and buffered WebP response bytes. Register the new controller once, remove old owner image handlers and their constructor dependency, and update affected audio test constructors.
- AC-3: Export the existing image error mapper once from `presentation/page-media-error.mapper.ts` for owner and public image operations. Preserve its public safe fallback and private error behavior. Keep the public controller, media application service, production factory, ports, storage adapter, persistence, processing bounds, and template rules unchanged.
- AC-4: Verify the real controller and production media factory through HTTP with fixture sessions and mocked ports. Cover all routes, ownership forwarding, safe output, limits, malformed input, missing resources/services, optional limiter, lifecycle conflicts, binary delivery, and private failures. Pass repository lint, formatting, type checks, unit tests, integration tests, and build. Keep the parent migration In Progress.

## Decision and rationale

This records the completed extraction authorized by the user's next instruction under the existing repository ownership decision. The owner image routes already delegate to PageMediaService. Their controller needs only that service and the image upload limiter. Keeping one shared mapper avoids copying image error policy into both owner and public controllers. Image reads retain buffered delivery; audio stream behavior is separate.

No new API, pagination policy, mutation limiter, cache policy, provider, or template dispatch is introduced. Current mutations have no explicit cache decorator, while list and read routes retain their existing private/no-store headers. Further cache consistency work remains a separate concern under the parent review.

## Verification

See [the owner image controller review](../../reviews/2026-10-03-owner-images-controller.md). All six handler bodies and decorators match their prior source exactly. The shared mapper body and public controller class are unchanged. Fifty one new HTTP cases and the relocated unit cases pass.
