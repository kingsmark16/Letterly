# 0022. Draft template policies and creator editor registration

**Date**: 2026-10-02
**Status**: In Progress

## Summary

Continue the approved template adapter migration through draft creation and creator editor selection. Keep framework and persistence concerns outside template policies and mount only the selected web editor.

## Requirements

* AC-1: Registered API draft policies preserve Secret Letter command overrides, default settings, Choose Your Heart's compatibility content envelope, graph validation, and graph validation metrics. Unsupported identities fail before a persistence write.
* AC-2: Draft policies use plain TypeScript and shared schemas, without NestJS, Prisma, repositories, provider clients, or telemetry transport. PageService retains active version lookup, orchestration, errors, metrics, and persistence.
* AC-3: Creator dispatch reads the owner page once, resolves registry key, renderer key, and pinned version, and loads one registered editor. Choose Your Heart must not initialize Secret Letter question requests, form, autosave, media, or preview hooks.
* AC-4: Shared owner loading, safe errors, retry, deletion, and existing editor URLs remain compatible. Secret Letter keeps its saved baseline, autosave, conflicts, media, section navigation, and offline behavior. Choose Your Heart keeps dirty exit protection and publishing controls.
* AC-5: API policy regressions and service tests pass. Browser checks cover both editors, wrong and unsupported pinned identities, journey dirty exit protection, and absence of Secret Letter requests while editing a journey. Repository checks and production builds pass.

## Decision

Register draft initialization policies by trusted registry key with exact immutable version checks. Return typed content/settings plus optional graph validation. Emit operational metrics in the application service before rejecting invalid defaults, preserving existing behavior. Keep the current database compatibility envelope explicit, since replacing its Secret Letter shaped content/settings requires a separate data model decision.

The owner query lives in a small web dispatch component. Pass its existing query result to the Secret Letter editor so conflict reloads retain the same observer and cache. Move journey workspace navigation and dirty exit behavior into a dedicated adapter. Extract shared deletion controls once. Use explicit static dynamic imports with compile time registration coverage and reset editor instances when page/version identity changes.

## Build plan

1. Extract pure draft policy implementations and resolve them before repository writes.
2. Extract shared deletion and the journey workspace; separate the Secret Letter editor from registered dispatch.
3. Add policy and browser regressions, verify existing behavior, and sync ownership documentation.

## Consequences

Adding an editor or draft policy no longer requires a name branch in generic draft dispatch. Publishing, repository projections, public transport identity, and further template workflow registration remain separate migrations. No new template, dependency, route, schema, live seed, or generator is introduced.
