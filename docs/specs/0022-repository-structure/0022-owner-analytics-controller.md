# 0022. Owner analytics controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Move the owner analytics handler into `presentation/owner-page-analytics.controller.ts`. Preserve `GET /api/v1/pages/:pageId/analytics`, BetterAuthSessionGuard, UUID and query validation, session supplied creator identity, response schema validation, and `private, no-store` caching.
- AC-2: Preserve optional service injection, the safe 503 unavailable response, and the safe 404 ownership response. PagesModule registers the focused controller once. Remove the handler and analytics dependency from the remaining owner controller. Preserve the public controller and analytics service factory.
- AC-3: Real HTTP tests cover the explicit seven day period, default thirty day period, invalid UUID and period rejection before persistence, guard rejection, unavailable service, ownership failure, and public visits and duration recording. Persistence and sessions remain fixtures.
- AC-4: Root lint, formatting, type checks, unit tests, production build, and API integration checks pass. Record verification limits and keep the parent migration In Progress.

## Decision and rationale

This records the implemented controller extraction authorized by the user's next instruction under the existing repository ownership decision. The controller owns HTTP validation and error translation and delegates calculations and ownership lookup to PageAnalyticsService. Its only constructor dependency is that service. Retaining optional injection preserves the existing unavailable response. This slice changes no product behavior, database schema, application calculation, template registration, or web interface.

## Verification

See [the owner analytics controller review](../../reviews/2026-10-03-owner-analytics-controller.md). The endpoint body and decorators match the prior handler exactly. The public controller matches the prior source exactly. All twelve analytics composition cases pass within the full API integration run.
