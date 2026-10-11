# Editor UI ownership

Date: 2026-10-03

**Status**: Accepted

## Decision

Keep the existing Radix Tabs wrapper and Recharts wrapper with their sole editor consumers. Tabs serves Secret Letter section navigation; Chart serves owner analytics. Neither is a canonical shared primitive in spec 0009. Moving them into the shared package would add client and chart dependencies to that package without another consumer. This follows finding 3's recommendation to keep chart and web composition local.

Move the existing sources to `apps/web/src/features/pages/editor/editor-tabs.tsx` and `editor-chart.tsx`. Keep named exports, native Radix/Recharts behavior, class strings, and feature CSS overrides. Replace their standalone cn imports with the canonical `@repo/ui/lib/utils` helper. Do not add a barrel or duplicate implementation. Remove the web workspace's unused direct cn and class-variance-authority dependencies, preserving the canonical UI package's own dependencies and required Radix/Recharts dependencies.

## Acceptance

- Both wrappers have one feature owner and their consumers use direct local imports. No maintained source references the old component paths or standalone cn package.
- The web dependency manifest and lockfile remove only the unused direct links and unreachable dependency graph. Frozen installation accepts the resulting lockfile. User skills-lock changes remain untouched.
- Unit, lint, formatting, types, normal build, and relevant browser journeys pass. Browser evidence includes editor tab navigation and owner analytics rendering, plus existing launch behavior and performance budgets.
- Update feature/package context and repository findings. This closes ownership placement, not wider accessibility, chart design, all primitive acceptance, or the whole repository restructuring.

No new product behavior, runtime discovery, public package API, framework boundary, or dependency is introduced. The approved repository autopilot authorization covers this bounded maintenance decision.

## Evidence

All four acceptance items are verified within this maintenance scope. The repository passes 831 unit cases, 94 desktop/mobile browser fixture cases, lint, formatting, types, normal build, and frozen offline installation. See [ownership verification](../../reviews/2026-10-03-editor-ui-ownership.md) for coverage, performance measurements, and remaining limits. Wider UI acceptance and parent repository requirements remain open.
