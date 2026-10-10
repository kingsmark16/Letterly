# 0022. Owner journey controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Move the authenticated Choose Your Heart GET and PUT endpoints into `presentation/owner-page-journeys.controller.ts`. Preserve their paths, guards, UUID/body validation, session supplied owner identity, response projection, HTTP status, and private cache headers.
- AC-2: Preserve optional journey service and rate limit injection, creator write limiting before ownership lookup, trusted template checks, expected version forwarding, graph validation, and every existing error translation. Keep the two private response/error helpers with their controller. Register the controller once and remove the old handlers and journey service dependency.
- AC-3: Real HTTP tests with the production journey factory cover safe read/save responses, side effect ordering, unauthenticated requests, malformed inputs, missing owner data, unsupported templates, stale/invalid/missing save results, invalid graphs, rate limit failures, optional dependencies, and unexpected failures. Update positional test construction affected by the removed dependency.
- AC-4: Root lint, formatting, type checks, unit tests, production builds, and API integration checks pass. Public controller source, application service, persistence, and web behavior remain unchanged. Keep the parent migration In Progress and record verification limits.

## Decision and rationale

This records the implemented extraction authorized by the user's next instruction under the existing repository ownership decision. Both owner journey endpoints use one service and the same two HTTP helpers, so they remain together in one focused presentation controller. The controller has only the journey service and creator rate limit inputs. No new route, provider, product policy, persistence behavior, or template capability is introduced. Optional injection and all handler/helper bodies retain the prior behavior.

## Verification

See [the owner journey controller review](../../reviews/2026-10-03-owner-journeys-controller.md). Both handlers and helper bodies match the prior source exactly. The public controller is unchanged. Twenty one focused HTTP cases pass with the real application factory and mocked persistence.
