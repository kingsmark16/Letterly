# 0022. Cleanup scheduling boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: MediaCleanupService has plain repository/storage/optional audio repository constructor inputs. Preserve runOnce, image/audio expiry order, task claims, batch size, worker identity, lease duration, deletion, and failure codes. Remove NestJS imports/decorators and lifecycle hooks from application work.
- AC-2: An infrastructure MediaCleanupScheduler owns the existing 15-minute interval, unref behavior, suppressed scheduled failures, and shutdown cancellation. PagesModule registers one scheduler and one typed cleanup factory under the existing service token. Repository/storage remain required and audio repository optional.
- AC-3: Audio removal and the scheduler depend on a plain MediaCleanupRunner interface; module composition retains the existing class token and overrides. Preserve optional immediate cleanup semantics and existing audio tests.
- AC-4: Real container tests cover factory injection, cleanup order, task success/failure leases, optional audio expiry, required dependencies, overrides, initialization, timing, scheduled failure recovery, and shutdown. Root lint, formatting, type checks, unit tests, build, and API integration checks pass.

## Decision and rationale

The approved repository boundary keeps lifecycle/framework ownership in infrastructure. Extract the existing timer methods into infrastructure/media-cleanup.scheduler.ts; keep the service class token and runOnce method. Introduce application/media-cleanup.ts with MediaCleanupRunner because audio and the scheduler need only that operation. PagesModule constructs the plain service and retains the existing singleton repository aliases. The interval constant moves to the scheduler; repository search found no consumers of its former application export.

Preserve existing scheduling semantics: first execution after 15 minutes, no immediate startup run, interval failures swallowed, and no new overlap/locking policy. Repeated module initialization outside the normal Nest lifecycle is not a new supported workflow. No new scheduling dependency, provider, route, database, or configuration is introduced.

The later [bounded media cleanup](0022-bounded-media-cleanup.md) enhancement replaces the absence of a service overlap policy and the preserved task concurrency. Scheduler ownership, interval timing, shutdown cancellation, and task lease behavior remain governed here.
