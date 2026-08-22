# Review, feat/design-system-ui-foundation, 2026-08-22

**Reviewed by**: GPT-5.6 (author model unspecified)
**Scope**: 51 files, branch vs base
**Verdict**: Approve with nits

## Summary

This change establishes the shared token and primitive layer, loads the required local fonts, migrates the landing page, and adds focused component and browser coverage. The landing page keeps its server rendered, dynamic, no store catalog path. The new nested Suspense boundary restores the real loading presentation, the preview control now has link semantics, and the static route can resolve catalog keys outside its starter defaults.

## Minor

### 🟡 The real Suspense fallback is not exercised, `apps/web/app/page.tsx:214`
**Problem**: The loading browser check activates the test only `uiFixture === "loading"` return inside `LandingContent`. It does not delay `getLandingCatalog` and observe the outer Suspense fallback used by a real request.
**Why it matters**: The nested boundary is the fix for the production loading gap. With the configured test suite, a change that bypasses the fallback during an in flight catalog request would still pass the fixture check.
**Suggested fix**: Add a route level browser or integration test that delays the catalog response and asserts the loading presentation is visible before the landing content resolves.

### 🟡 Catalog backed preview fallback branch has no direct test, `apps/web/app/preview/[templateKey]/page.tsx:44`
**Problem**: The no JavaScript browser test visits only `secret-letter` and `choose-your-heart`, both of which use `previewDefaults`. It does not exercise `getTemplateCatalogItem` for a catalog supplied key or the unavailable result.
**Why it matters**: The data driven branch fixes a real progressive enhancement failure. A regression in the fetch, schema validation, or key lookup path would not be detected by the current focused suite.
**Suggested fix**: Add a route level test using a catalog key outside the static defaults, plus an unavailable catalog case, and assert the rendered preview and safe unavailable state.

## Strengths

- The explicit token export, Tailwind aliases, local font setup, and workspace transpilation give the foundation a clear ownership boundary.
- Shared primitives remain presentation only, and the native dialog handles focus containment, Escape, and inert background behavior through the platform.
- The landing page preserves its catalog helper, cache behavior, responsive checks, forced colors, reduced motion, and safe recovery states while restoring the production loading presentation.

## Test coverage

The Vitest suite covers core primitive contracts, including field relationships, status announcements, dialog behavior, and the default Button loading message. The focused Playwright suite covers responsive landing states, forced colors, reduced motion, loading output, enhanced and no JavaScript previews, and compatibility imports. It does not directly cover an in flight catalog request through the Suspense fallback or a catalog backed preview key outside the static defaults.
