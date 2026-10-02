# 0022. Journey service composition boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: PageJourneyService has plain repository and optional metrics constructor inputs, without NestJS imports or decorators. Preserve graph validation, metric metadata and ordering, owner scope, save inputs, errors, and exported paths.
- AC-2: PagesModule registers a typed factory under the existing class token, requiring PAGE_JOURNEYS_REPOSITORY and optionally injecting PAGE_JOURNEY_METRICS. Preserve existing Prisma and structured metrics aliases, singleton resolution, and provider overrides.
- AC-3: Exercise the production factory in a real Nest container with mocked persistence. Cover valid saves with and without metrics, invalid graph rejection before persistence, owner scope and stale version errors, required repository failure, and service overrides.
- AC-4: Extend framework import enforcement for this service. Root lint, formatting, type checks, unit tests, build, and API integration checks pass. Keep the parent migration In Progress.

## Sources and implementation

The existing constructor and repository/metrics interfaces define the inputs. The graph validator and repository result union retain their current behavior. PagesModule owns construction through the established factory pattern, without another application wiring file.

This slice preserves routes, validation rules, metrics failure behavior, persistence, template identity, and response contracts.
