# 0022. Catalog identity invariants

**Date**: 2026-10-03
**Status**: Complete

## Summary

Validate the canonical catalog before consumers construct registries or provision records. Reject conflicting identities instead of silently replacing an older template definition. Preserve the two launch definitions and their keys.

## Context

The registry uses `Object.fromEntries`, which overwrites duplicate keys. Database `TemplateVersion.registryKey` is globally unique, and the parent structure spec already recommends distinct keys for future immutable versions. The compatible approach preserves existing version 1 keys and assigns a new stable key to each future version. It does not change the database uniqueness constraint.

You authorized automatic continuation of repository structure and extensibility work on 2026-10-03. This milestone records and enforces the existing identity decision. It neither registers another template nor claims complete support for additional content models.

## Requirements

- AC-1: Canonical catalog evaluation rejects duplicate category keys, unknown category references, duplicate registry keys, and duplicate category/renderer/version tuples before consumers can overwrite definitions.
- AC-2: Every definition has a nonempty registry and renderer key and a positive safe integer version. Validation is plain TypeScript without framework, database, or provider dependencies.
- AC-3: Different categories may reuse a renderer key. A template may retain versions 1 and 2 together when their registry keys differ. Existing launch arrays, inferred literal types, public resolutions, and seed metadata remain unchanged.
- AC-4: Meaningful fixture tests run through the templates workspace and root test task. Lint, formatting, type checks, tests, and build pass.

## Decision

Add a pure catalog identity validator in the templates package and invoke it at canonical catalog evaluation. Keep registration arrays explicit and preserve their literal types. Export the validator through a documented package subpath for fixture and future contribution checks.

This fixes the existing silent overwrite path in place. Replacing registry identity with a composite database key would require a migration and contradict the already selected globally unique registry key model. Runtime discovery would weaken static registration and is outside scope.

Implementation skills: architect, develop, NestJS best practices, Vercel React best practices, and Turborepo. No new dependency is required.

## Design and value sourcing

Inputs are readonly category descriptors containing `key`, and readonly template descriptors containing `categoryKey` and definition `registryKey`, `version`, and `renderer.key`. Metadata, schemas, and capabilities retain their current owners and are not reconstructed here.

Validation throws a stable developer facing error naming the conflicting identity. It does not normalize keys, mutate entries, activate records, or select a latest version. Uniqueness sets derive solely from input descriptors. Category/renderer/version identity uses a serialized tuple to avoid separator collisions. API transport error handling remains unchanged.

The existing resolution predicate is shared through `resolveTemplateFromDefinitions`, allowing fixtures to prove exact version retention and ambiguous identity rejection without registering fixture templates. `resolveTemplate` remains the canonical launch wrapper with its current return type.

## Build plan

1. Add the validator and call it at canonical evaluation, retaining public types (AC-1, AC-2).
2. Add fixture tests for conflicting identities, separate versions, cross category reuse, and launch resolution (AC-3).
3. Wire native Node tests into existing task coverage, run gates, and update registration guidance (AC-4).

## Critical test scenarios

Conflicting category and registry keys, orphan category references, repeated category/renderer/version tuples, empty identities, and invalid versions fail deterministically (AC-1, AC-2). Distinct version keys and cross category renderer reuse pass without mutating input (AC-3). Both launch identities resolve exactly, mismatched versions fail, and existing seed tests remain green (AC-3, AC-4).

## Consequences and follow-up

Invalid trusted registrations fail early rather than losing definitions silently. This is a prerequisite for wider catalog growth, not automatic integration. Adapter coverage, distinct future version registration, scaffold version restrictions, draft update ownership, and broader content contracts remain separate milestones. The parent migration stays In Progress.

## Verification

All 616 repository unit tests passed, including 60 templates workspace tests (14 catalog/identity tests and 46 scaffold tests). Repository lint, formatting, type checks, and production build passed. The two launch identities and seed behavior remain unchanged. No live seed or migration ran. This is implementation self verification, with no independent review.

Evidence: [catalog identity verification](../../reviews/2026-10-03-catalog-identity-invariants.md).
