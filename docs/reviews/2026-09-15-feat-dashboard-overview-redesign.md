# Review, feat/dashboard-overview-redesign, 2026-09-15

**Reviewed by**: Codex (inline fresh reviewer; author model unavailable)
**Scope**: 9 files, branch vs main
**Verdict**: Approve with nits

## Summary
The redesign preserves the existing authenticated data flow, route destinations, safe summary projections, and catalog boundary while adding a clearer overview composition and scoped motion. The populated, empty, retry, responsive, and template interaction paths are covered by the changed browser tests, and the web lint and type checks pass. Two minor issues remain: the response failure state is not actionable, and the changed responsive test does not exercise the normal motion path or the desktop breakpoint at 1024 pixels.

## Minor
### 🟡 Response failure state has no recovery action, `apps/web/src/features/pages/components/dashboard-overview.tsx:589`
**Problem**: When every recent submission query fails, the error state tells the creator to open a page inbox but renders no link, button, or retry action.
**Why it matters**: This leaves the dashboard section without the recovery route required by AC-6, so a creator has to infer that the sidebar or another screen can be used to recover.
**Suggested fix**: Add a link to the existing `/dashboard/pages` route or expose a retry action for the failed submission queries, and cover that action in the response failure browser scenario.

### 🟡 Responsive and motion branches are not fully exercised, `apps/web/e2e/catalog-navigation.spec.ts:7`
**Problem**: The overview assertions run with `reducedMotion: "reduce"`, so the new `prefers-reduced-motion: no-preference` GSAP branch is not exercised. The viewport loop ends at 1440 pixels before the sticky sidebar assertion, so the `lg` behavior at the required 1024 pixel breakpoint is only checked for overflow.
**Why it matters**: With tests configured, regressions in the normal entrance enhancement or the desktop shell transition at 1024 pixels could pass the affected suite even though AC-8 and AC-9 require both paths.
**Suggested fix**: Add a no-preference overview assertion that waits for the final visible state, and perform the sidebar and navigation assertions separately at 1024 and 1440 pixels.

## Strengths
- The refactor keeps private page and submission data behind the existing API and TanStack Query boundary, renders only safe summary fields, and adds no browser persistence or raw HTML.
- The new browser coverage verifies populated continuation actions, selected reply links, template preview and start actions, page retry recovery, forced colors, zoom, and the required no-overflow widths.

## Test coverage
The supplied isolated browser run passed all 48 affected web tests. The normal API backed run was attempted but was affected by the preexisting API watcher database catalog reset, so the passing run used a local catalog fixture and the built web server. Web lint, web type checking, and `git diff --check` passed. The changed tests cover the primary populated, empty, page failure, responsive overflow, forced colors, and reduced motion states, but they do not cover response query failure recovery or the normal motion and 1024 pixel shell branches described above.
