# 0022. Template registration and editor ownership

**Date**: 2026-10-02
**Status**: Implemented

## Summary

Use one trusted catalog definition for category and template metadata. Keep page persistence and publishing in the pages feature, and put the Choose Your Heart graph editor in its template folder. This is an incremental step within the authorized structure migration.

## Requirements

* AC-1: The two launch templates keep their existing registry keys, versions, schemas, defaults, capabilities, and audio rules. Public package exports remain compatible.
* AC-2: Category and template catalog metadata has one canonical source consumed by the seed and browser fixture. Seed operations preserve existing keys, status, descriptions, and display order without a schema migration.
* AC-3: The template graph editor imports no API client, query client, page persistence, or publishing implementation. It receives typed graph values, state, callbacks, and a lifecycle presentation slot.
* AC-4: The pages adapter owns reads, saves, expected content versions, safe errors, refresh conflicts, cache updates, and publishing. Unsaved edits survive a newer remote version until explicit reload. Published journeys remain read only.
* AC-5: Browser checks cover loading errors and retries, editing, saving, newer remote versions, explicit reload, and published state on desktop and mobile.
* AC-6: Existing web journeys and template/API tests remain valid. Lint, types, formatting, and production build pass.

## Context

The current seed repeats category and template metadata for both launch templates. The graph editor combines remote data, unsaved values, graph controls, and publishing. Existing keys, versions, defaults, and ownership checks constrain this migration.

## Options considered

A move without extraction would preserve mixed ownership. A new plugin framework would add abstractions before the two current templates prove them. A controlled editor with a feature adapter and shared metadata solves the observed duplication while preserving the established contracts.

## Decision

Extend the existing trusted source registry with catalog metadata, rather than adding runtime filesystem discovery or an administrator code upload mechanism. Put each template definition beside its schemas and keep shared capability types independent to avoid circular imports.

Use a controlled graph editor at `apps/web/src/templates/choose-your-heart/editor.tsx`. Its pages adapter is `src/features/pages/editor/choose-your-heart-editor.tsx`. Pass publishing controls as a React node, preserving their existing location without importing the pages feature into the template.

Remote data stays in TanStack Query. A local draft stores only edited values and their saved baseline. Clean values derive from the latest query response. Refresh conflicts derive from differing saved signatures while dirty; query synchronization does not need an effect. The existing parent dirty notification remains an external callback subscription.

## Build plan

1. Extract definition and capability ownership, add shared category and template catalog metadata, and retain exports (AC-1).
2. Replace duplicate seed branches and browser catalog metadata with definition driven loops (AC-2).
3. Extract the controlled graph editor and pages adapter, migrate its draft editor caller, and enforce template import boundaries through ESLint (AC-3, AC-4).
4. Add focused state and browser regressions, run existing checks, and update context (AC-5, AC-6).

## Consequences

Future catalog entries need metadata and a trusted definition instead of another seed branch. A new template still needs schemas, business validation, presentation, and tests. This milestone does not claim automatic support for arbitrary new template behavior.

Public journey renderer submission orchestration and generic renderer dispatch remain separate follow ups. No database migration or live seed execution is needed for this source restructuring. Seed behavior is checked through an injected fake store, with live database coverage reported separately.

## Rationale

A targeted extraction preserves the established two template contracts. Moving the entire existing component would keep persistence inside the template; creating a broad plugin framework would add abstractions before the existing templates prove them.

## Verification

Check canonical catalog invariants and unchanged seed upsert arguments. Exercise draft edits, save success and failure, explicit retry, dirty refresh conflicts, reload, and read only controls. Reuse the isolated catalog browser harness and existing API suite.

## Current status, 2026-10-06

The catalog, seed, editor ownership, import-boundary, and browser criteria are implemented and verified within the isolated fixtures and repository gates recorded in the [registration and editor review](../../reviews/2026-10-02-template-registration-and-editor.md). The later draft/public editor, public identity, and exact version-retention slices complete the presentation and workflow registration seams called future work here. New templates still require their own explicit behavior and tests; catalog metadata alone does not activate one.
