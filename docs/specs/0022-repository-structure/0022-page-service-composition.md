# 0022. Page service composition and logging boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: PageService has plain constructor inputs without NestJS imports/decorators. Preserve all use case bodies, template identity/validation, errors, public read retries, password guards, locked projections, lifecycle transitions, metrics, and exported paths.
- AC-2: A plain PublicPageReadFailureLogger port exposes the existing warning event. An infrastructure adapter uses NestJS Logger with the existing PageService context. PagesModule registers a typed factory with required pages repository, template reader, and logger, plus optional app origin, password service, journey service, and metrics tokens. Keep the localhost app origin default and singleton/override behavior.
- AC-3: Real container tests exercise the production factory with optional providers absent/present, default/configured URLs, locked/unlocked reads, trusted page ID token forwarding, required dependency failure, journey validation/metrics, public failure stages and retry policy, and overrides. Existing use case tests use a mock logger; test the infrastructure adapter separately.
- AC-4: Since PageService is the final production pages application NestJS consumer, enforce no framework imports across pages application/domain folders, excluding unit tests. Existing database/provider restrictions remain. Root lint, formatting, type checks, unit tests, build, and API integration checks pass. Keep the parent migration In Progress.

## Decision and rationale

The approved composition boundary moves logging behind a required warning port and construction into PagesModule. Place the required logger before optional constructor arguments; update internal direct-construction tests accordingly. The factory keeps optional token semantics and the service's origin default. Preserve warning metadata extraction and logger failure propagation. A folder rule replaces per-service enumeration so future files inherit the boundary. No business, retry, configuration, persistence, route, or template policy changes are introduced.
