# 0022. Journey submission service composition boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: PageJourneySubmissionService uses plain repository and optional metrics constructor inputs without NestJS imports or decorators. Preserve canonical payload hashing, raw repository input, observed password version, scope lookup, result/error mapping, metric redaction and ordering, and exported paths.
- AC-2: PagesModule registers a typed factory under the existing class token, requiring PAGE_JOURNEY_SUBMISSIONS_REPOSITORY and optionally injecting PAGE_JOURNEY_METRICS. Preserve repository and metrics aliases, singleton resolution, and provider overrides.
- AC-3: Exercise the production factory in a real Nest container with mocked persistence. Cover accepted submissions with and without metrics, a fixed canonical hash, all six rejected result variants, repository failure propagation with optional metrics, scope lookup, required repository failure, and service overrides.
- AC-4: Extend framework import enforcement. Root lint, formatting, type checks, unit tests, build, and API integration checks pass. Keep the parent migration In Progress.

## Sources and implementation

The existing constructor, repository result union, hash helper, and metrics interface define this migration. PagesModule owns construction through the established factory pattern. The repository still owns path validation and transaction invariants; this slice does not move them into the service.

Preserve route contracts, persistence, hashing rules, metrics failure behavior, and template identity. No additional application wiring file is needed.
