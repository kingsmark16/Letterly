# 0022. Web template presentation registration

**Date**: 2026-10-02
**Status**: In Progress

## Summary

Implement the parent spec's approved full identity web presentation boundary with the two existing templates. Keep template markup in template folders and page or catalog orchestration in feature adapters.

## Requirements

* AC-1: One web descriptor binds canonical category, template, immutable version, registry key, preview copy, thumbnail appearance, and public metadata. Supplied identity constraints must all match. Unknown, ambiguous, mismatched, or unsupported identities fail closed.
* AC-2: Existing bare key preview URLs remain compatible only when uniquely resolvable. New catalog preview links carry category and version. Explicit invalid constraints never silently downgrade to bare key resolution.
* AC-3: Preview and thumbnail markup live beside their templates. Shared wrappers dispatch through explicit typed component registrations. Heavy preview implementations use static dynamic import paths and retain server rendering.
* AC-4: Public route rendering and metadata use registered presentations. Locked content stays behind the existing boundary. Public projections currently carry key and version only; resolve these only when unique, without changing transport contracts.
* AC-5: Browser checks cover existing routes, both template previews, unknown identities, explicit category/version mismatch, full identity links, and generic thumbnails. Unit checks prove cross category collisions and immutable version ambiguity. Existing checks, production build, lint, types, and formatting remain green.

## Decision

Use explicit trusted source registration, not runtime discovery. Derive identity from the shared catalog definitions. Require compile time coverage of each trusted registry key in presentation metadata and component maps. Separate plain metadata from React loaders so metadata resolution does not import template components. Feature adapters supply forms and public transport controls through template slots.

Legacy identity resolution returns a descriptor only when exactly one registration matches all supplied constraints. New preview links include category key and numeric version. Existing UUID start links continue to control draft creation; presentation resolution never replaces API authorization or activation checks.

Keep existing template markup, copy, styles, controls, route paths, public headers, no store behavior, and database definitions. Unsupported previews can retain the existing generic preview, and thumbnails use a generic decorative placeholder. Never render an unknown template as Secret Letter.

## Build plan

1. Implement descriptors and exact resolution with collision regression tests.
2. Extract preview and thumbnail presentations, wire lazy preview registrations, and pass full catalog identity.
3. Move public presentation dispatch into a pages adapter and resolve metadata from descriptors.
4. Verify browser and repository checks, document remaining boundaries, and commit this milestone.

## Consequences

New templates supply presentation metadata and typed loader registrations without adding name branches to shared preview wrappers or public routes. API workflow adapters, transport projection discriminants, creator editor dispatch, and a generator remain future slices. The recorded no JavaScript loading fallback issue remains a separate defect.
