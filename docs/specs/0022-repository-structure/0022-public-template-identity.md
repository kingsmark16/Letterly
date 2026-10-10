# 0022. Public template registry identity

**Date**: 2026-10-02
**Status**: In Progress

## Requirements

* AC-1: Public repository projections and API responses carry the globally unique registry key, renderer key, and pinned immutable version for both launch templates. Locked metadata carries the same safe identity without private body fields.
* AC-2: Supplied registry identity must match every renderer/version constraint. Unknown, mismatched, explicitly invalid, or unsupported identity has no fallback. Legacy responses without registryKey remain compatible only when renderer/version resolves uniquely.
* AC-3: Web public parsing, metadata, and presentation selection use the same registered identity resolution. Malformed public responses show unavailable content. A payload with a state field must parse as locked metadata, never as an unlocked body.
* AC-4: Keep no-store public fetching, visitor signing, password verification, safe locked projections, rendering slots, and template bundle ownership. Do not add browser fetches or import template React loaders into metadata resolution.
* AC-5: Unit and browser regressions prove both identities, legacy compatibility, supplied mismatches, malformed content, locked body redaction, and unavailable metadata/rendering. Repository checks and production builds pass.

## Decision

Add optional registryKey to public transport identity schemas for compatibility with older API deployments. New repository mappings populate it from the trusted resolved definition, and PageService emits the canonical key even for a uniquely resolved legacy projection. Resolve trusted identity before returning locked or unlocked responses. Registry keys already encode globally unique category ownership; no database identity or creator field is exposed.

Make shared registry resolution reject multiple matching definitions. Public web parsing is a pure helper with contract validation and registration checks. Metadata and public rendering share a structural transport identity adapter in the plain registration module. Invalid responses become the established unavailable state. Preserve the state discriminator ahead of unlocked body parsing.

## Build plan

1. Carry registry identity through repository, API, and compatible shared schemas.
2. Extract pure public parsing and unify web identity selection.
3. Add identity/privacy regressions, verify browser fixtures and repository gates, and update documentation.

## Consequences

The public boundary can distinguish renderer names reused across future categories without falling back to an arbitrary match. Legacy omission is a deliberate transition, not permission for supplied invalid keys. Template content schemas and persistence projection branches remain explicit and need further adapters before wider growth. No new template, schema migration, live seed, provider, or dependency is introduced.
