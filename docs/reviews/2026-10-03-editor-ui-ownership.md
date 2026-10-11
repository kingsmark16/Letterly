# Editor UI ownership

Date: 2026-10-03

## Implementation

The sole Secret Letter Tabs wrapper now lives at `features/pages/editor/editor-tabs.tsx`. The sole owner analytics Chart wrapper lives at `features/pages/editor/editor-chart.tsx`. Consumers import their feature owners directly. Named exports, client boundaries, Radix and Recharts behavior, static class strings, and feature CSS overrides remain in place. Both wrappers use the canonical `@repo/ui/lib/utils` class merger, eliminating the standalone cn implementation.

The decision is recorded in [the ownership spec](../specs/0022-repository-structure/0022-editor-ui-ownership.md). These wrappers remain with the editor because there is one consumer for each, and the shared primitive package does not need chart or additional client dependencies. No barrel, duplicate implementation, or new shared API was introduced.

The web workspace removes its unused direct cn and class-variance-authority dependencies. The canonical UI package retains its own variant dependency. The lockfile changes only thirteen removed lines: the two web importer links and the now unreachable cn package and snapshot. No dependency version changed. Frozen offline installation succeeds and unlinks one package, with scripts deliberately skipped for this existing installation consistency check. The first sandboxed lockfile operation could not open the outside workspace store; the bounded approved retry used the existing store successfully.

## Verification

- Repository unit gate passes 831 cases. UI, web, and template tasks ran freshly; API and database used valid cache entries.
- All 94 desktop/mobile Chromium fixture cases pass. Existing editor section navigation still works. The added published owner analytics journey renders both actual charts with visible SVGs and positive dimensions, changes to Preview and back to Overview, preserves the selected period, and records no browser page errors.
- Maintained web source has no imports of the former components/ui owners or standalone cn. The old Tabs/Chart files are removed. The web manifest has neither unused dependency; the shared package still owns its required variant dependency.
- Lint and types pass seven tasks each. Formatting passes after formatting the shortened editor import. The final normal build passes three tasks after browser fixtures, with fresh web compilation. UI and web types ran freshly after the normal build, restoring ordinary build configuration.
- Both measured profiles load 369,952 CSS bytes and 1,203,656 client JavaScript bytes, matching the preceding Dialog milestone. Ten unchanged font requests total 428,152 bytes, and observed initial CLS is zero. Existing budgets pass without rebaselining.

## Remaining scope

Canonical shared primitives and the two remaining application wrappers now have explicit owners. Wider spec 0009 acceptance, including browser engines and accessibility, remains open. Source/style decomposition, contributor onboarding, commit tooling, template contract/growth evidence, and the full repository acceptance audit remain required. API integration was not rerun for this web ownership change. Remote CI and database dependent skips remain unobserved. This is self verification, with no independent review claimed. The user's skills-lock.json change remains untouched.
