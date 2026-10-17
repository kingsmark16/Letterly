# Template and authentication unused styles

Date: 2026-10-05

**Status**: Accepted

## Contract

Remove whole rules from the Secret Letter renderer and authentication form CSS modules only when every selector branch requires a local class absent from all importing source owners. Collect property and literal element accesses from actual imports with TypeScript syntax trees. Stop if stylesheet values escape or ownership includes globals, composition, imports, or value exports.

For this bounded cleanup, exclude selectors with parentheses or escapes from consideration, remove attribute contents before identifying class tokens, and manually review every proposed selector. An unused class in a positive descendant, compound, or sibling selector makes that branch unreachable. Never treat an unused class inside a negation or alternative as required. Do not rewrite selector branches or consolidate active rules.

Preserve every retained rule, declaration, conditional ancestor, and relative order. Keep current locked presentation, opening controls, reduced motion, password focus, thumbnail, preview, and authentication behavior. The later [OAuth-only authentication decision](../0024-oauth-only-authentication.md) removes email and password entry pages while retaining OAuth. Do not remove the separate visible YouTube styles while its behavior decision is pending.

## Verification

Record owners, used classes, removed selectors, source hashes, and a retained cascade comparison. Run public and locked letter, preview, catalog thumbnail, sign in, sign up, and recovery browser checks using the production fixture build. Cover the configured three engines and two widths where supported. Use current fixtures and safe provider substitutes, not live account mutations. Run web units and the root commit gates. Record gaps honestly rather than claiming all template or authentication acceptance.

## Source of decisions

Spec 0022 authorizes caller verified historical stylesheet cleanup. Values and behavior come from current CSS and importing components. The procedure follows the verified editor cleanup while accounting for positive descendant selectors. This is an internal cleanup with no new visual value, runtime behavior, provider, or dependency. The existing same model cross check preference applies.
