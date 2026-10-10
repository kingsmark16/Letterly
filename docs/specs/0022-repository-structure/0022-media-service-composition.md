# 0022. Media service composition and logging boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: PageMediaService has plain repository, storage, image processor, and failure logger constructor inputs without NestJS imports/decorators. Preserve upload/retry/read/remove behavior, completion stage/error mapping, cleanup keys, lease durations, and concurrency counters.
- AC-2: A plain PageMediaFailureLogger port defines the existing completion event. An infrastructure adapter uses NestJS Logger with the existing PageMediaService context. Preserve log fields and exclusion of provider message/stack. PagesModule registers the logger alias and typed service factory, retaining existing class/repository/storage/processor tokens and singleton scope.
- AC-3: Real container tests exercise the production factory, sanitized completion sequence, provider failure stages, processor failure mapping, cleanup records, slot caps/release, required dependencies, and overrides. Move obsolete decorator-based unit composition coverage to the production factory suite; update log unit checks to the plain port and verify the infrastructure logger separately.
- AC-4: Extend framework import enforcement. Root lint, formatting, type checks, unit tests, build, and API integration checks pass. Keep the parent migration In Progress.

## Decision and rationale

The approved framework boundary requires logging and construction outside application code. A required error(event) port preserves the existing logger call semantics and exposes only the existing event shape. The adapter retains the NestJS context rather than choosing a new logging provider. Existing redaction and error classification remain in the application helper, unchanged; logger failures retain their prior propagation behavior. No new concurrency, telemetry, storage, or transaction policy is introduced.
