# Shared UI source configuration and token adapters

Date: 2026-10-03

## Implementation

`packages/ui/components.json` now owns the shared source authoring configuration. The web configuration routes UI components to `@repo/ui` and class composition to `@repo/ui/lib/utils`. Package and web TypeScript root aliases resolve the existing source folder without adding a runtime barrel. The package configuration points to the real web global stylesheet, and both configurations retain new-york style, neutral base color, TSX, React Server Component support, and an empty Tailwind v4 config path.

The prior web icon library setting was removed so both configurations use the same implicit CLI choice. The CLI reports Radix icon authoring metadata by default. No icon dependency, runtime shadcn dependency, generated component, or overwritten primitive was introduced. Package guidance explains the distinction and the need to review generated source against the customized public contracts.

The global stylesheet adds the semantic color, radius, and shadow aliases specified by design spec 0009. Every alias references its existing canonical Letterly token. Standard and slow transition utilities join the existing fast and target utilities. Static tablet, desktop, and wide variants use the specified breakpoint adapters. Four web unit cases enforce breakpoint/token alignment, utility and source scanning configuration, consistent generator destinations/stylesheet, and semantic alias references. The tests run in the existing web unit command. Package changes are included through Turbo's dependency transit.

The living scope now records repository maintenance feature 20, including the continuing shared UI rollout. The original foundation remains historical completed work. Enrollment was reconciled after the Button/Card pilot, rather than claiming it occurred before that implementation.

## Direct verification

The actual shadcn CLI version 4.21.1 ran read-only `info --json` commands for both workspaces. The package command resolved:

- UI and components: `packages/ui/src`.
- Class utility: `packages/ui/src/lib/utils.ts`.
- Library helpers: `packages/ui/src/lib`.
- Future hook destination: `packages/ui/src/hooks`.
- Tailwind stylesheet: `apps/web/app/globals.css`.

The web command resolved UI and class utility to those same package paths, while keeping application compositions in `apps/web/src/components`. The info commands did not generate source or modify dependency manifests or the lockfile. The CLI was fetched into the package manager's tool cache. These settings follow the official [monorepo configuration guidance](https://ui.shadcn.com/docs/monorepo) and the [components configuration schema](https://ui.shadcn.com/schema.json), with existing public subpaths preserved.

The repository unit suite passes 821 cases: API 581, templates 98, web 102, database 14, and UI 26. API/database used valid cached results; templates, web, and UI executed freshly. Repository lint passes seven tasks, and formatting passes. All 76 desktop/mobile production browser fixture cases pass, including Card styling, Button target/focus checks, existing creator/public behavior, and the performance budgets.

The final regular repository build passes all three tasks, with web built freshly after the fixture suite. The final repository type checks pass all seven tasks, including fresh UI/web checks after that regular build. API/database results use valid cache entries. The workspace is restored to normal build configuration.

## Performance and limits

Both measured Chromium profiles load 453,581 CSS bytes and 1,203,875 client JavaScript bytes. Against the canonical initial baseline, CSS is 2,202 bytes higher (about 0.5 percent) and JavaScript is 30,800 bytes higher (about 2.6 percent). Ten font requests and 428,152 font bytes are unchanged; exact font content checks pass. Observed initial CLS remains zero. The original fixture was not refreshed.

The configuration is verified through actual CLI path resolution, source invariants, production compilation, and current browser consumers. No add command was run, and no newly generated component is claimed as tested. Future generated hooks or helpers need suitable public exports; the existing component wildcard targets TSX. Static variants that no live component yet uses have source alignment coverage, not a claimed visual proof of a future component.

Other shared primitives still need Tailwind migration, and Badge/Chart/Separator/Tabs still need their application ownership review. Wider accessibility and dialog browser checks, cohesive source/style splits, contributor onboarding, catalog growth measurements, and the final parent audit remain open. API integration was not rerun because API and database runtime code did not change. Remote CI and existing database-dependent integration skips remain unobserved delivery limits. This is self verification, not an independent review. The user's skills-lock.json modification remains untouched.
