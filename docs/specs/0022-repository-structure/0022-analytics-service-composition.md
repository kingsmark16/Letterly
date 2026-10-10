# 0022. Analytics service composition boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

* AC-1: PageAnalyticsService has a plain repository constructor and no NestJS imports or decorators. Preserve UTC date calculations, period defaults, zero filled activity, visitor duration forwarding, owner queries, errors, and exported paths.
* AC-2: PagesModule registers one typed factory under the existing class token, requiring PAGE_ANALYTICS_REPOSITORY. Preserve the existing Prisma alias, singleton scope, and repository/service overrides.
* AC-3: Exercise the production factory and real owner/public HTTP controllers with mocked repositories, rate limiting, page projections, and fixture sessions. Verify UTC date boundaries, owner identity, public visit/duration identity, locked-page rejection, unavailable owners, and unchanged repository error propagation. Test required dependencies and service overrides.
* AC-4: Extend migrated service lint enforcement. Root lint, formatting, types, unit tests, build, and API integration checks pass. Keep the parent migration In Progress.

## Sources and implementation

The existing constructor and repository token supply the dependency. Date inputs still come from new Date, with UTC components and the existing 30 day default. Counts and stored activity come from the repository; missing dates use the existing zero fields. HTTP contracts provide requested periods and duration bounds. Session identity, page projection checks, browser identity hashing, and response mapping remain in controllers. A fixed test clock exercises current behavior without adding a clock abstraction.

The module factory follows the established password, question, and reporting pattern. No metric definition, authorization rule, provider, query, route, schema, or deployment changes are part of this slice.
