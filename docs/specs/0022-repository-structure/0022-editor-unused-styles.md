# Editor unused stylesheet cleanup

Date: 2026-10-05

**Status**: Accepted

## Contract

Remove only whole rules from `editor/draft-editor.module.css` when every local class in their selector is absent from all importing source files. Use current TypeScript syntax trees to collect property and literal element accesses for each actual CSS import. Stop if a stylesheet object escapes those accesses, or if global selectors, composition, imports, or value exports complicate ownership. Do not prune selector branches or consolidate active overrides.

Keep every retained rule, declaration, surrounding condition, and relative order unchanged. Keep shared consumers in editor and responses intact. This is cleanup of unused internal module classes, not a redesign, shared control migration, or runtime optimization claim.

## Verification

Record all owners, removed selectors, source hashes, and a normalized retained rule comparison. Remove empty conditional blocks only when they contain no nodes. Run the affected existing editor browser checks using the production fixture build across the configured engines and widths, web units, and root lint, formatting, and types. Record fixture limits and preserve the unrelated user lockfile edit.

The broad run exposed protocol latency in the existing audio resume assertion. Its test helper may measure the transition and elapsed time in one browser evaluation, using the player's existing eight second rotation period to bound normal forward movement. Preserve the stopped state assertions and subsequent motion polls. No playback code change is part of this cleanup.

## Decision source

Spec 0022 authorizes caller verified cleanup and cohesive source/style review while preserving the cascade. Every selector and visual value comes from the current stylesheet. Every supported class use comes from current importing components. This local cleanup introduces no new provider, dependency, feature, or visual decision. The existing same model cross check preference applies.
