# 0022. Public media controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Extract public image/audio/audio metadata handlers into `presentation/public-page-media.controller.ts`, with their parameter schemas and colocated unit tests. Preserve exact handler bodies/decorators, routes, optional dependencies, response schemas, status codes, cache headers, and image indexing headers.
- AC-2: Keep visitor media limits ahead of password checks and content access. Preserve verified visitor identity and fallback behavior, trusted page scoped unlock cookies, password configuration errors, locked content denial, and safe metadata. Reuse existing range/stream and error helpers without duplication.
- AC-3: Register the new controller once before PublicPagesController. Remove its old handlers, schemas, imports, and media/audio/link constructor dependencies. Update positional test inputs while preserving all remaining public handler bodies. Services, production factories, provider ports, persistence predicates, storage, and template behavior remain unchanged.
- AC-4: HTTP checks use the three production media factories with mocked repositories, storage, metadata cache, password service, and limiter. Verify anonymous bytes, safe metadata, ranges, guarded content access, cookies, identity, rate limits, optional services, missing resources, UUID validation, safe errors, and privacy headers. Pass repository gates and keep the parent migration In Progress.

## Decision and rationale

This records the completed public media slice authorized by the user's next instruction under the existing ownership decision. Public delivery has one coherent transport responsibility separate from page reads, unlock, analytics, reports, and submissions. Its focused controller keeps the existing media policy explicit, without a generic abstraction or a new policy. The shared helpers retain both owner and public behavior.

All media and protection values continue to come from validated parameters, request identity/cookies, injected services, and their existing repository/provider interfaces. The current optional password and limiter behavior is preserved. No new session guard, provider, cache policy, template dispatch, or database migration is introduced.

## Verification

See [the public media controller review](../../reviews/2026-10-03-public-media-controller.md). Exact source comparison confirms unchanged media handler bodies/decorators and remaining public handler bodies. Thirty nine new HTTP cases and six relocated public media unit cases pass.
