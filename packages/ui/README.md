# Shared UI

This package owns reusable presentation primitives. Import components through their public subpaths, such as `@repo/ui/button` and `@repo/ui/card`. Import class composition through `@repo/ui/lib/utils`. The root `@repo/ui` alias is a source generator destination, not a runtime barrel import.

Design values live in `src/tokens.css`. The web application owns font loading and the Tailwind compiler in `apps/web/app/globals.css`. Its semantic aliases reference those tokens. The web unit suite checks breakpoint adapter alignment, semantic aliases, motion utilities, and shared generator configuration. Token changes that affect a breakpoint must update its static adapter in the global stylesheet.

## Source generation

`components.json` is the package authoring configuration. The web configuration routes shared UI and class utilities into this package while leaving application compositions in the web workspace. Both use the same style and base color. No runtime shadcn package or icon library is required by the shared primitives.

From this directory, inspect the resolved paths before generating source:

```sh
pnpm dlx shadcn@4.21.1 info --json
```

Version 4.21.1 was used to verify the current configurations. Review future CLI versions before adopting them. Adding a component copies source and can propose dependencies; review the resulting diff and adapt it to the existing token, accessibility, and server component contracts. Existing Button loading announcements, forwarded refs, and semantic Card behavior are customized public contracts, so replacing their source with stock generated code requires restoring and verifying those contracts.

The CLI reports its default Radix icon authoring choice when no icon library is specified. That metadata does not install an icon dependency. Keep the existing named inline SVG approach unless a separate design decision changes it.

The package `ui` destination is `src`, utilities are under `src/lib`, and future hooks have a `src/hooks` destination. Keep public component exports compatible. A generated helper or hook needs an appropriate package export before another workspace imports it; the component wildcard targets TSX files. Do not add empty folders or barrel files just to satisfy generator aliases.

## Checks

```sh
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
pnpm --filter @repo/ui test
pnpm --filter web test
pnpm --filter web test:e2e:fixtures
```

The browser fixture suite covers current consumers and the initial landing performance budgets. The baseline fixture must not be regenerated to conceal a regression. Other primitives still use `ui.module.css` during the incremental Tailwind migration; remove a selector only after its consumers have migrated and passed compatibility checks.
