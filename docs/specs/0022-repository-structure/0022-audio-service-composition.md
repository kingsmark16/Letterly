# 0022. Audio service composition boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: PageAudioService has plain repository, storage, and optional cleanup constructor inputs without NestJS imports/decorators. Preserve upload and retry orchestration, verification, errors, range forwarding, removal, and exported paths.
- AC-2: PagesModule registers a typed factory under the existing class token, requiring PAGE_AUDIO_REPOSITORY and MEDIA_STORAGE, optionally injecting MediaCleanupService. Preserve aliases, singleton resolution, overrides, and cleanup lifecycle registration.
- AC-3: Exercise the production factory in a real Nest container with mocked ports. Cover upload signing/failure, completion verification, owner/public range streams and failures, missing audio, removal with/without cleanup and cleanup failure, required dependencies, and service overrides. Existing retry/verification unit suites remain green.
- AC-4: Extend framework import enforcement. Root lint, formatting, type checks, unit tests, builds, and API integration checks pass. Keep the parent migration In Progress.

## Sources and implementation

The existing constructor and tokens define composition. Retain the optional cleanup class token and import its type only in the audio service. PagesModule still owns the actual cleanup provider and lifecycle hooks. This slice preserves storage contracts, validation, leases, expiry periods, rights statement, transactions, routes, and scheduled cleanup behavior. A cleanup port/lifecycle separation remains a separate decision.
