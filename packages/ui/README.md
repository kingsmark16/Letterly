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
pnpm --filter web test:e2e:ui
```

The browser fixture suite covers current consumers, legal dialogs, and initial landing performance budgets. The baseline fixture must not be regenerated to conceal a regression. The shared primitives use static Tailwind classes and the shared class merger; the obsolete shared CSS Module is removed. Feature CSS Modules may still customize composition and template art.

Dialog retains its native modal lifecycle and inclusive compact layout at 48rem. Its width caps live in the canonical tokens. The web configuration test checks that its static compact query matches the tablet token. The native fixture suite exercises Chromium, Firefox, and WebKit, including route links without JavaScript or showModal. Wider accessibility acceptance remains open.

Use the optional `classNames` prop for content, header, heading (the title/description container), title, and description layout composition. Each slot combines its default utilities and caller utilities through `cn`, so intentional conflicts resolve to the caller. This configuration is consumed by the component and never forwarded to HTML. The existing root `className` remains available. Keep feature content and template art outside the shared package; avoid descendant CSS selectors that reach into primitive internals.

```tsx
<Dialog
  classNames={{ content: "gap-0 p-0", header: "gap-2" }}
  onClose={closePreview}
  open={open}
  title="Preview"
>
  {content}
</Dialog>
```

Catalog preview composition lives in `apps/web/src/features/catalog/preview`, and legal policy dialog composition lives in `apps/web/src/features/legal`. Both supply root and slot utilities and use the canonical full screen compact layout. Their CSS stays with feature content and template art. Icon only close composes the shared IconButton and retains a 44 px target; features do not override its base or interaction styles.
