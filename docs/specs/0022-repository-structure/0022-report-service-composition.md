# 0022. Report service composition boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

* AC-1: PageReportsService has a plain repository constructor and no NestJS imports or decorators. Preserve public scope checks, slug normalization, creation, safe errors, and exported paths.
* AC-2: PagesModule registers one typed factory under the existing PageReportsService class token, requiring PAGE_REPORTS_REPOSITORY. Keep the existing Prisma alias, singleton behavior, and repository/service overrides.
* AC-3: Exercise the production factory through the real anonymous report HTTP controller with mocked persistence and rate limiting. Cover safe receipt creation, normalized inputs, unavailable pages before and after scope lookup, repository failures, and input validation. Test missing dependencies and service overrides in isolated containers.
* AC-4: Extend framework import enforcement to the migrated service. Root lint, formatting, type checks, unit tests, build, and API integration checks pass. Keep the parent migration In Progress.

## Sources and implementation

The existing constructor and repository token supply the service dependency. Existing report request/response schemas, public scope lookup, visitor identity helper, rate limit service, repository result union, and HTTP error mapper remain the sources of every request/response value. Keep their implementations unchanged. The named module factory follows the established password and question service pattern.

This bounded slice implements the parent specification's inward dependency rule. It does not alter reporting policy, public availability predicates, moderation, persistence transactions, routes, schema, or deployment.
