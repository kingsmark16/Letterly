# 0022. Public transport projection ownership

**Date**: 2026-10-02
**Status**: Complete

## Scope

Continue the approved template adapter pattern at the API transport boundary. Each template owns its body mapping and existing contract validation. PageService retains slug normalization, repository retries, trusted identity resolution, canonical URL construction, password guarding, locked metadata, and safe error logging.

## Acceptance criteria

* AC-1: Resolve a registered adapter by canonical registry key and pinned version after the locked page guard. Cover every current canonical template key at compile time. Unsupported identities have no fallback.
* AC-2: Secret Letter maps recipient, message, optional title and creator, and empty sections. Choose Your Heart maps only published graph values supplied by the repository. Both consume the shared public media envelope and validate against their existing transport schemas.
* AC-3: Preserve omission of response metadata for legacy Secret Letter pages, but validate the entire body before omitting that field. Existing disabled response metadata and journey defaults retain their behavior. Malformed content or media becomes the existing safe unavailable error rather than bypassing validation.
* AC-4: Keep adapters framework independent. Enforce allowed imports without weakening the separate template policy boundary. Do not add routes, schemas, providers, database writes, migrations, or templates.
* AC-5: Verify registration coverage, unsupported identities, template/body mismatch, legacy normalization, media privacy, malformed legacy input, and locked content protection. Run lint, formatting, types, unit tests, API integration checks, and production builds.

## Sources and decision

Public body values come from the existing PublicPage repository port. Canonical identity comes from resolveTemplate, and canonical URLs come from PageService.publicUrl. Contracts remain the authoritative validators. The optional legacy response shape is already expressed by PublicSecretLetterProjection, so a validated body can omit response without a cast or contract change.

Place the plain mapping implementations in application/projections, separate from the stricter application/templates policy folder. Keep the shared service independent of template body fields. Password protection completes before public body dispatch. Validation failures log only bounded error metadata.

## Remaining scope

This completes only transport mapping ownership. Stored content compatibility types, other persistence mappings, and visible no JavaScript fallbacks remain further work under the parent structure spec.
