# 0022. Audio link service composition boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: PageAudioLinkService has plain constructor inputs without NestJS imports or decorators. Preserve URL validation, slot checks, feature flag semantics, metadata service lifetime, attachment inputs, DTO projection, and errors.
- AC-2: PagesModule registers a typed factory under the existing class token with required repository, metadata provider, metadata cache, and feature flag tokens. Preserve existing aliases/configuration, singleton resolution, false flag injection, and provider overrides.
- AC-3: Exercise the production factory with a real Nest container and mocked ports. Cover creation through provider/cache overrides, URL rejection before I/O, slot and attachment error mapping, disabled creation with existing-link access, metadata errors/fallbacks, owner/public scope forwarding, required dependencies, and service overrides.
- AC-4: Extend framework import enforcement. Root lint, formatting, type checks, unit tests, build, and API integration checks pass. Keep the parent migration In Progress.

## Sources and implementation

The existing constructor and port tokens define composition. Preserve the per-service YouTubeMetadataService instance and its lookup/cache behavior. Keep construction in PagesModule through the established factory pattern. The repository retains transaction and audio source invariants; no routes, contracts, feature flag defaults, provider integrations, or caching rules change.
