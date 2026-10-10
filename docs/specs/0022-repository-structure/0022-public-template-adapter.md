# 0022. Public template adapter and registry resolution

**Date**: 2026-10-02
**Status**: In Progress

## Summary

Separate the Choose Your Heart public renderer from its submission and operational metric adapter. Centralize repeated trusted definition lookup while preserving each caller's identity and version checks. This continues the authorized template ownership migration.

## Requirements

* AC-1: Template presentation owns traversal, progress, outcomes, and message interaction, and imports no API client, query library, page feature, or database code.
* AC-2: The pages adapter owns schema validation, TanStack Query submission mutations, safe errors, idempotency keys, and bounded operational metrics. An unchanged failed submission retries with the same key; changed input or a new traversal gets a new key.
* AC-3: Registry lookup preserves exact registry key, renderer key, and version constraints, including existing renderer-only callers. Missing identities or unsupported versions fail closed.
* AC-4: Browser checks cover traversal, back and restart, enabled and disabled responses, private submission, retry identity, changed input, and safe metric payloads on desktop and mobile.
* AC-5: Existing creator and public checks, API tests, lint, types, formatting, and production build pass. Keys, versions, API routes, validation rules, and database schema remain unchanged.

## Context and decision

The renderer currently mixes presentation, API submission, retry identity, and metrics. The API repeats definition scans across catalog, lifecycle, media, questions, and responses. A template move without extraction would preserve mixed ownership. A broad runtime plugin framework would replace more behavior than this slice can safely prove.

Keep the presentation in `src/templates/choose-your-heart/renderer.tsx` and the public adapter in `src/features/pages/public/choose-your-heart-page.tsx`. Pass submission status, safe errors, and callbacks through typed props. Retain the existing layout and response copy. Disable navigation and message edits during a pending submission so an accepted response cannot appear against a different traversal.

Keep one shared `resolveTemplate` helper in the trusted registry package. Its criteria retain field presence, so an explicitly missing registry key does not fall back to a renderer match. Preserve callers that intentionally resolve by renderer key alone. Replace repeated scans with equivalent criteria, without changing template specific business logic.

## Build plan

1. Extract presentation and implement the public feature adapter (AC-1, AC-2).
2. Add registry lookup criteria and migrate equivalent API scans (AC-3).
3. Add fixture backed public journeys and registry regressions, run existing checks, and sync ownership pointers (AC-4, AC-5).

## Consequences and follow up

The template no longer depends on page persistence or telemetry transport. Registry identity checks get one implementation. Schema discriminants and template specific API workflows remain explicit; removing those needs a separate typed strategy design. No automatic discovery, new template behavior, or live data migration is introduced.

## Verification

Check valid, unknown, wrong version, mismatched identity, explicitly missing identity, and renderer-only resolution. Confirm that no private message or answer content enters metric payloads. Verify retry keys and disabled forms through real browser interaction with mocked submission endpoints and validated public fixtures.
