# 0009. Letterly design system and UI foundation

**Date**: 2026-09-11
**Status**: Accepted

## Summary

Letterly will use one shared visual and interaction foundation across the landing page, creator tools, and public templates. Tailwind v4 will provide layout and styling utilities, while shadcn/ui will provide source owned component patterns that Letterly can edit. Tokens remain in `packages/ui`, shared primitives remain behind `@repo/ui`, and the expressive Secret Letter visuals stay in their template folder. The migration is incremental so working routes and custom motion are protected while the shared UI becomes more consistent.

## Requirements

**User stories**:

- As a creator or visitor, I want Letterly interfaces to feel consistent and calm so that I can focus on the message.
- As a keyboard or mobile user, I want every important control to remain accessible so that I can complete the same tasks without a mouse or animation.
- As a web developer, I want reusable primitives with clear contracts so that new pages do not invent incompatible controls.

**Acceptance criteria**:

- **AC-1**: Canonical color, typography, spacing, shape, elevation, motion, focus, target size, backdrop, and breakpoint tokens are defined once in `packages/ui` and imported by the web global stylesheet. For this migration, the checked in variables in `packages/ui/src/tokens.css` are authoritative; `apps/web/design.md` supplies visual intent and any value retuning is a separate decision. Tailwind v4 maps both Letterly utility names and shadcn semantic utility names only to those variables, with no duplicated design values. Compile time breakpoint adapters are the one explicit configuration exception and are checked against the canonical breakpoint variables.
- **AC-2**: `packages/ui` exports accessible, source owned shadcn style `Button`, `Link`, `Field`, `Input`, `Textarea`, `Card`, `Dialog`, `Status`, `IconButton`, `Container`, and `Stack` primitives with named exports, typed props, Tailwind utility classes, and documented composition rules. The project owns and reviews the component source instead of depending on a runtime shadcn package.
- **AC-3**: Shared primitives meet the WCAG AA baseline, including semantic markup, visible focus, keyboard operation, labels, error descriptions, status announcements where needed, and touch targets of at least 44 px.
- **AC-4**: Shared primitives expose only the states that make sense for their role through typed state slots. Feature code supplies messages and recovery actions, and primitives never invent feature copy or domain rules.
- **AC-5**: The foundation is verified at 1440 px and 390 px and checked at 768 px and 1024 px against the responsive behavior table in this spec. Layouts wrap and expand safely, preserve meaningful text, have no horizontal overflow, and remain complete on mobile.
- **AC-6**: Licensed Fraunces and Manrope WOFF2 assets are checked in under `apps/web/assets/fonts`, with `Fraunces-500.woff2`, `Fraunces-600.woff2`, `Fraunces-650.woff2`, `Manrope-400.woff2`, `Manrope-500.woff2`, `Manrope-600.woff2`, and `Manrope-700.woff2` plus `LICENSE-Fraunces.txt` and `LICENSE-Manrope.txt`. `apps/web/app/layout.tsx` loads them through `next/font/local` with `display: "swap"`, `preload: true`, explicit system fallbacks, and the documented Letterly type scale without blocking initial content.
- **AC-7**: Shared interaction feedback uses token backed Tailwind utility classes, CSS transitions, and keyframes with reduced motion behavior. GSAP remains limited to template specific cinematic sequences.
- **AC-8**: Shared primitives render typed text and children only. They do not render raw HTML, fetch data, authorize users, log field values, emit analytics, or persist sensitive state locally. Template specific components remain outside `packages/ui`.
- **AC-9**: The landing page is the first migration proof using the foundation. It preserves server rendering, `dynamic = "force-dynamic"`, the `getLandingCatalog` calls to `/api/v1/categories` and `/api/v1/templates?categoryKey=confession`, `cache: "no-store"`, the catalog schemas, existing metadata, and safe unavailable and empty states. It has tested normal, loading, empty, error, disabled, focus, hover, recovery, and reduced motion states.
- **AC-10**: The migration is incremental. The landing page and shared product surfaces adopt the new primitives first, while dashboard, editor, admin, and public template surfaces continue to work during the transition. No migration changes route, API, database, authentication, privacy, or rendering boundaries.
- **AC-11**: The shadcn configuration, class merge helper, variant definitions, and shared primitive source live in the agreed package boundary. `packages/ui/components.json` records the source owned setup, `packages/ui/src/lib/utils.ts` owns `cn`, variant classes are statically present in source, and Tailwind production builds include utility classes used by `packages/ui`. No generated component is imported from a remote runtime package.
- **AC-12**: Existing CSS Module consumers remain visually and behaviorally valid until each surface is migrated. A migrated primitive keeps its existing public import path, exported prop types, data attributes, loading announcement placement, and accessible DOM contract. Obsolete shared CSS is removed only after an import search and browser checks prove that no consumer needs it.

## Decision

**Chosen option**: Tailwind v4 with shadcn style source components in `packages/ui`, while `@repo/ui` remains the shared import boundary. The package owns the copied and customized component source, uses `cn` for predictable class merging and `class-variance-authority` for typed variants, and maps shadcn semantic names to the existing Letterly tokens. Fonts remain app owned because `next/font/local` is a Next.js app concern, while the shared token layer consumes the app supplied font variables.

shadcn/ui is treated as an authoring pattern, not a runtime component dependency. Shared controls use Tailwind utility classes and source owned variants. Feature code supplies layout, content, state, and recovery actions. The Secret Letter keeps its expressive template CSS and GSAP sequences when generic shared primitives cannot express its art direction without weakening the experience.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `web-design-guidelines` (`vercel-labs/agent-skills`, `.agents/skills/web-design-guidelines/`)

The design source remains [apps/web/design.md](../../../apps/web/design.md). The foundation uses self hosted fonts, named inline SVG icons, CSS motion for shared controls, and feature supplied copy and recovery actions.

## Standard definition

### Token contract

The package token stylesheet is `packages/ui/src/tokens.css` and is exported as `@repo/ui/tokens.css`. It is the only file allowed to define design values. `apps/web/app/globals.css` imports it before `@import "tailwindcss"` and contains only resets, global behavior, Tailwind aliases, explicit utilities, and compile time variants. The aliases reference variables such as `var(--letterly-color-canvas)` and never repeat a literal color, size, shadow, or timing value. The theme exposes both existing names such as `bg-wine` and shadcn names such as `bg-primary`, with both pointing to the same Letterly variables. It also maps shadcn radius, shadow, focus, target, and motion names to the existing token groups. Because the stylesheet is in `apps/web/app`, an explicit `@source "../../../packages/ui/src"` directive keeps package utility classes in the production build. `apps/web/next.config.js` keeps `transpilePackages: ["@repo/ui"]` so workspace TSX is processed by the same Next.js pipeline.

The mapping is executable rather than descriptive. `@theme inline` defines color, font, text, spacing, radius, shadow, and easing aliases. `apps/web/app/globals.css` also defines the following explicit utilities because the desired names are not guaranteed to be emitted by a variable alias alone:

```css
@utility duration-fast {
  transition-duration: var(--letterly-motion-fast);
}

@utility duration-standard {
  transition-duration: var(--letterly-motion-standard);
}

@utility duration-slow {
  transition-duration: var(--letterly-motion-slow);
}

@utility min-h-target {
  min-height: var(--letterly-target-min);
}
```

The same stylesheet defines the compile time variants `tablet`, `desktop`, and `wide` at `48rem`, `64rem`, and `90rem`. Those three adapter values are compared in an automated token sync check with `--letterly-breakpoint-tablet`, `--letterly-breakpoint-desktop`, and `--letterly-breakpoint-wide`; they are not a second runtime token source. Shared primitives use the Letterly aliases and these static variants. Existing feature code may continue to use the default Tailwind tokens during migration, but new shared components must use the semantic aliases in this spec.

The semantic aliases are fixed as follows:

| Shadcn semantic family | Tailwind aliases | Letterly source |
|---|---|---|
| Page and text | `background`, `foreground` | `color-canvas`, `color-ink` |
| Surface | `card`, `card-foreground`, `popover`, `popover-foreground` | `color-surface`, `color-ink` |
| Primary action | `primary`, `primary-foreground`, `primary-hover` | `color-wine`, `color-surface`, `color-wine-hover` |
| Secondary and muted | `secondary`, `secondary-foreground`, `muted`, `muted-foreground` | `color-surface-muted`, `color-ink`, `color-ink-muted` |
| Accent and destructive | `accent`, `accent-foreground`, `destructive`, `destructive-foreground` | `color-rose`, `color-ink`, `color-error`, `color-surface` |
| Control surfaces | `border`, `input`, `ring` | `color-border`, `color-border`, `color-focus` |
| Shape and depth | `radius-sm`, `radius-md`, `radius-lg`, `radius-full`, `shadow-sm`, `shadow-md` | the existing radius and shadow tokens |
| Motion and target | `duration-fast`, `duration-standard`, `duration-slow`, `min-h-target` | the existing motion and target tokens |

The names in this table are Tailwind theme aliases, not a second token source. A future token change is made in `packages/ui/src/tokens.css`, then consumed by both Letterly utility names and shadcn semantic names.

The token schema contains these groups and values:

| Group | Required tokens |
|---|---|
| Color | `--letterly-color-canvas: #FFF7F8`, `--letterly-color-surface: #FFFDFD`, `--letterly-color-surface-muted: #F7E8EC`, `--letterly-color-ink: #321C25`, `--letterly-color-ink-muted: #725A64`, `--letterly-color-wine: #8B2946`, `--letterly-color-wine-hover: #6F1F38`, `--letterly-color-rose: #D78499`, `--letterly-color-sand: #E7B7A8`, `--letterly-color-olive: #65704A`, `--letterly-color-border: #E5CFD6`, `--letterly-color-error: #A33A50`, `--letterly-color-warning: #8E5C2D`, `--letterly-color-focus: #8B2946`, `--letterly-color-backdrop: rgba(50, 28, 37, 0.38)` |
| Type | The checked in desktop and mobile sizes and line heights in `packages/ui/src/tokens.css` for `display`, `heading-1`, `heading-2`, `heading-3`, `body-large`, `body`, `small`, and `label`; `apps/web/design.md` remains the visual intent for later retuning |
| Spacing | The checked in migration values are `space-1` 4 px, `space-2` 8 px, `space-3` 12 px, `space-4` 16 px, `space-5` 24 px, `space-6` 28 px, `space-7` 40 px, `space-8` 52 px, and `space-9` 72 px. |
| Shape and depth | Canonical `radius-small: 8px`, `radius-medium: 12px`, `radius-large: 16px`, `radius-round: 9999px`, `shadow-low`, and `shadow-medium` in `packages/ui/src/tokens.css` |
| Motion | `motion-fast: 120ms`, `motion-standard: 220ms`, `motion-slow: 420ms`, `ease-standard`, `ease-gentle`, and `motion-reduced: 1ms` |
| Accessibility | `focus-width: 2px`, `focus-offset: 2px`, `target-min: 44px`, and `backdrop` as the color token above |
| Breakpoints | `breakpoint-tablet: 48rem`, `breakpoint-desktop: 64rem`, and `breakpoint-wide: 90rem` |

Responsive type uses the current values in `packages/ui/src/tokens.css`, with its mobile overrides below `breakpoint-tablet`. The shared `Container` contract uses 24 px inline padding below tablet, 28 px at tablet, and 40 px at desktop and wider viewports, matching the current package implementation. The current shared maximums are 1760 px for the page container and 720 px for long readable content. The larger padding guidance in `apps/web/design.md` is retained as visual intent for a later retuning decision, not as an implementation requirement for this migration. Shared primitives use Tailwind utility classes that resolve through these variables. Feature compositions may use CSS Modules while they are being migrated or when they need template specific art direction. The package must remain compatible with Next.js when imported from a workspace package, and package utility classes must be included in both development and production builds.

### Primitive contracts

All primitives are named exports from `@repo/ui`. They render semantic elements, accept `className`, use source owned Tailwind classes following shadcn composition patterns, and remain server compatible unless a row explicitly says client behavior is required. A primitive combines base classes, typed variants, and caller classes through `cn`, with the caller class winning a conflicting utility. A generated source file is edited as normal project code and must not be replaced blindly by a later generator run.

| Primitive | Required contract |
|---|---|
| `Button` | Renders `button` by default, supports `primary`, `secondary`, and `tertiary` variants, `loading`, `disabled`, and an optional `state` slot. Loading disables activation, sets `aria-busy`, preserves the accessible name, and announces a feature supplied busy label through an external polite status node. |
| `Link` | Renders a real `a` element for internal and external navigation. External links may set `target` only with `rel="noopener noreferrer"`. It has no disabled prop; callers remove the action or render a disabled `Button` when navigation is unavailable. |
| `Field` | Provides a stable `id`, visible label, optional description, error text, required marker, and the `aria-describedby` and `aria-invalid` wiring for its child control. Error text takes precedence over description in the announced relation while both remain visible when useful. |
| `Input` | Renders a native input, forwards its ref and standard input props, supports `invalid`, `disabled`, and `loading` presentation, and never uses a placeholder as its label. |
| `Textarea` | Renders a native textarea, forwards its ref and standard textarea props, supports `invalid`, `disabled`, `loading`, and an optional feature supplied character count. |
| `Card` | Renders a noninteractive `article` or `section` by default. An actionable card is an explicit `Link` composition, never a nested button or nested link. It has an optional state region but no domain status mapping. |
| `Dialog` | Is the only primitive requiring a client boundary and uses native `dialog` with a defined browser policy. It supports controlled `open`, `onClose`, accessible `title`, optional description, a visible close button, optional overlay close, and an initial focus ref. It contains focus, makes the background inert, closes on Escape, restores scroll and focus to the trigger, rejects nested modal dialogs, is full screen below `breakpoint-tablet`, and provides a real route or link fallback when JavaScript is unavailable. Chromium, Firefox, and WebKit are the supported browser targets for the native modal behavior and are covered by Playwright. Unsupported browsers receive a nonmodal document or route fallback that leaves the content reachable; the fallback is not treated as a second modal implementation.
| `Status` | Renders semantic text plus a noncolor icon or shape. It supports `loading`, `empty`, `error`, and `recovery` slots, with `role="status"` for polite progress and `role="alert"` only for actionable errors. Recovery is a caller supplied button or link. It never maps Letterly domain states itself. |
| `IconButton` | Renders a button with an inline SVG icon. An accessible name is mandatory through `aria-label` or visible text. Decorative SVGs use `aria-hidden`, inherit current color, and have stable stroke and size rules. |
| `Container` | Constrains content to the token max widths and responsive page padding. It has no loading, error, empty, or recovery API. |
| `Stack` | Provides typed vertical or horizontal direction, token gap, wrap, and alignment. It has no loading, error, empty, or recovery API. |

### State matrix

| Primitive group | Loading | Disabled | Error | Empty | Recovery |
|---|---:|---:|---:|---:|---:|
| `Button`, `Input`, `Textarea`, `IconButton` | Yes | Yes | Presentation only | No | Caller supplied action |
| `Field` | No | Child controlled | Yes | No | Caller supplied action or field correction |
| `Status` | Yes | No | Yes | Yes | Yes, through a caller supplied link or button |
| `Card` | No | No | Optional state region | Optional state region | Optional caller supplied action |
| `Link`, `Container`, `Stack` | No | No | No | No | No |

Shared components never own feature transitions, API calls, analytics, browser storage, or domain copy.

**Canonical pattern**:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-target items-center justify-center gap-2 rounded-medium px-5 text-small font-bold transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-border bg-surface text-foreground hover:border-primary hover:text-primary",
        tertiary: "bg-transparent text-primary underline underline-offset-4",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: string;
  state?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({
    children,
    className,
    disabled,
    loading = false,
    loadingLabel,
    state,
    variant,
    ...props
  }, ref) {
    return (
      <>
        <button
          {...props}
          ref={ref}
          className={cn(buttonVariants({ variant }), className)}
          data-loading={loading || undefined}
          data-variant={variant ?? "primary"}
          disabled={disabled || loading}
          aria-busy={loading || undefined}
        >
          {children}
          {state ? <span>{state}</span> : null}
        </button>
        {loading ? <span className="sr-only" role="status" aria-live="polite">{loadingLabel ?? "Loading"}</span> : null}
      </>
    );
  },
);
```

The implementation must use the token variables, preserve the caller supplied accessible name, expose a visible focus ring, and keep feature messages outside the primitive. The hidden loading status is outside the button so it announces progress without replacing or appending to the button's accessible name. The current public `ButtonProps` shape, including `data-loading`, `data-variant`, and the existing `state` slot, remains compatible during migration. A generic `"Loading"` fallback is allowed only when the caller does not provide `loadingLabel`; feature specific messages remain caller supplied. `class-variance-authority` is used only for typed visual variants, while `cn` combines base, variant, and caller classes. Every supported variant and every supported `Stack` gap has a complete static class string in source; dynamic string interpolation is not used for Tailwind class generation. The actual component API may add a typed slot when the shared contract needs it, but it must not add domain states or feature copy.

**Replaces**:

- CSS Module styling as the default implementation for shared primitives.
- One off button, input, card, dialog, and status variants repeated in feature CSS.
- Token values duplicated between web files and shared components.
- A second app local copy of shadcn primitives that competes with `@repo/ui`.
- Template components placed in the shared UI package.
- JavaScript animation used for ordinary hover, focus, loading, or error feedback.

**Enforcement**:

TypeScript named exports and explicit package exports (`./*` for components and `./tokens.css` for the token stylesheet) define the primitive boundary. `packages/ui/components.json` records the source owned shadcn configuration with TSX and React Server Component support enabled, package local aliases for `@repo/ui`, `packages/ui/src`, and `packages/ui/src/lib`, and the web global stylesheet as the Tailwind stylesheet. The generator is run from `packages/ui`; generated files are reviewed and then customized in place. There is no app level `src/components/ui` copy and no icon library is added by this decision. `packages/ui/src/lib/utils.ts` owns the `cn` helper. `cn` is implemented as `twMerge(clsx(...inputs))`: later caller utilities win for recognized Tailwind conflicts, while CSS Module selectors and inline styles remain outside its conflict model. `class-variance-authority`, `clsx`, and `tailwind-merge` are package dependencies only when a primitive uses them. CSS custom properties in the package token stylesheet are the only token source. Shared primitives use semantic Tailwind names and may not introduce literal color, spacing, shadow, or timing values. `packages/ui` keeps a `test` script using Vitest with jsdom and React Testing Library, with tests under `packages/ui/src/**/*.test.tsx`. Package lint and type checks, web lint and type checks, component tests, and Playwright journeys enforce the contract. A lint rule or import boundary check rejects network clients, browser storage, analytics clients, `dangerouslySetInnerHTML`, and new feature specific components in `packages/ui`. Code review rejects raw HTML rendering and sensitive persistence.

**Rollout**:

Keep the token layer and public primitive exports stable, add the shadcn source configuration, and migrate one shared primitive at a time. Use the landing page as the first visual proof, then migrate shared creator and administration surfaces by area. New shared controls use the standard immediately. Existing feature styles are migrated gradually, and the Secret Letter template remains a deliberate expressive exception where generic primitives do not fit.

**Exceptions**:

Template specific presentation, cinematic GSAP sequences, complex waveform visuals, and route entry files may remain in their owning web feature or template. A feature may keep a CSS Module until it is migrated, but new shared primitives must not be added there. No exception applies to token ownership, accessibility, or privacy boundaries.

## Feature design

**Data model sketch**:

No database or persistence changes. Tokens are checked in CSS and shadcn configuration is source metadata. Component state is ephemeral React state or form state owned by the consuming feature. No session, draft, response, password, or visitor data is stored by the foundation.

**State transitions**:

Shared controls expose state values such as idle, hover, focus, pressed, loading, disabled, error, and recovery according to the state matrix above. A feature owns the transition, message, and recovery action. `cn` merges base classes, typed variants, and caller overrides without changing state semantics. Dialogs additionally open, close, Escape close, initial focus, focus containment, inert background, scroll restoration, and focus return to the trigger. A nested modal dialog is not supported. The landing preview uses a real preview link or route as its non JavaScript fallback.

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Existing catalog route | Existing GET | Existing catalog query | Existing category and template contract | Public | Existing safe unavailable response |
| Shared UI primitives | React render | Typed props, children, and state slots | Accessible DOM and CSS classes | None | Invalid props rejected by TypeScript where practical |

No new REST route, database contract, auth boundary, or browser storage contract is introduced.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Render tokens | Color, type, spacing, radius, shadow, motion, focus, target, backdrop, and breakpoint values | Canonical implementation values in `packages/ui/src/tokens.css`; `apps/web/design.md` supplies intent and future visual retuning guidance |
| Map Tailwind values | Letterly utility names and shadcn semantic names for colors, type, spacing, radius, shadow, focus, and motion | `apps/web/app/globals.css` `@theme inline` aliases and the explicit `@utility` declarations that reference package variables only |
| Merge utility classes | Final class string and caller override behavior | `packages/ui/src/lib/utils.ts`, `clsx`, `tailwind-merge`, and the ordered arguments passed to `cn` |
| Select primitive variants | Variant class string | Typed primitive props and `class-variance-authority` definitions owned by the primitive |
| Include package utilities | Generated CSS for classes used by shared primitives | `@source "../../../packages/ui/src"` in the web global stylesheet and the production Tailwind build |
| Load typography | Fraunces and Manrope font faces, weights, and fallback metrics | The named licensed WOFF2 files and license records in `apps/web/assets/fonts`, plus `next/font/local` in `apps/web/app/layout.tsx` with `display: "swap"`, `preload: true`, Fraunces weights 500, 600, and 650, Manrope weights 400, 500, 600, and 700, and fallbacks `Georgia, serif` and `Arial, sans-serif`; any fallback metric tuning is owned by `layout.tsx` and must be checked for layout shift |
| Render landing catalog | Category, template name, version, and capabilities | `getLandingCatalog`, `/api/v1/categories`, `/api/v1/templates?categoryKey=confession`, `categoryCatalogResponseSchema`, and `templateCatalogResponseSchema`; selected template version and capability labels come from the validated catalog projection, with the existing feature fallback copy in `apps/web/app/page.tsx` |
| Fetch landing catalog | Server side request and cache behavior | `apps/web/lib/catalog.ts`, `cache: "no-store"`, and `dynamic = "force-dynamic"` in `apps/web/app/page.tsx` |
| Render catalog failure | Safe unavailable text and retry or reload action | The landing feature owns the copy and an explicit reload link or button; the `Status` primitive only renders the supplied slot; recovery destination is the existing reload or catalog action in `apps/web/app/page.tsx` |
| Render catalog empty state | Useful empty explanation and next action when the response is valid but has no templates | The landing feature and catalog response length; the next action and its destination remain the existing create flow in `apps/web/app/page.tsx` |
| Render feature states | Loading, empty, error, disabled, and recovery copy | The consuming feature, never the primitive; loading and disabled triggers come from the existing feature state and form submission state |
| Render public or creator content | User supplied text and safe projections | Existing template contracts and API mappers |
| Choose layout | Viewport, token breakpoints, and CSS media queries | The responsive behavior table, the shared `Container` and `Stack` implementations, and the 1440 px, 390 px, 768 px, and 1024 px checks; template specific layout remains feature owned |
| Choose template action | Create and preview destinations | Existing `createTemplateStartPath` and `apps/web/src/components/template-preview-dialog.tsx`; preview keeps a real link or route fallback |
| Render icons | Icon geometry, accessible name, and decorative treatment | Existing named inline SVG definitions and `IconButton` contract; no new icon package or remote icon runtime |

**Key invariants**:

- There is one canonical token source and no duplicated token values.
- Shadcn semantic aliases and Letterly utility aliases resolve to the same canonical token variables.
- Shared primitives merge caller classes predictably, with later caller utilities taking precedence on conflicts.
- Generic primitives contain no Letterly domain rules, authorization, data fetching, raw HTML rendering, analytics, or sensitive persistence.
- Every interactive primitive has a keyboard path, visible focus, and a minimum 44 px target.
- Meaningful text wraps instead of being silently clipped or truncated.
- Reduced motion removes spatial movement and decorative effects while preserving feedback.
- Shared CSS motion does not require client hydration for static content.
- Optional template content disappears cleanly, and template specific behavior stays outside the shared package.
- A shared primitive never requires a template CSS Module or a remote shadcn runtime package.
- The canonical migrated primitive classes win over retained feature CSS for primitive base, variant, focus, hover, disabled, loading, and error states. Retained CSS Modules may style surrounding layout and composition only; they may not override a migrated primitive selector or state. Overrides must be passed through the primitive `className` and merged with `cn`. Browser checks compare computed styles on migrated primitives to the intended variant and state classes.
- The static `tablet`, `desktop`, and `wide` adapters stay synchronized with the three canonical breakpoint variables.

### Responsive behavior

| Viewport | Navigation and layout | Type and spacing | Overflow and interaction |
|---|---|---|---|
| 390 px | One column hero and template list, navigation wraps into a second row, actions stack to full width, generic `Dialog` is full screen | Mobile type values, shared `Container` uses 24 px inline padding, token gaps | No horizontal scrollbar, no clipped heading or action label, all targets at least 44 px |
| 768 px | Two column template grid and two column hero where content permits, navigation may remain wrapped, generic `Dialog` becomes a centered modal | Tablet type transition, shared `Container` uses 28 px inline padding | Long headings and capability lists wrap, dialog remains usable without horizontal scrolling |
| 1024 px | Desktop navigation on one row, two column hero, two column template grid, generic `Dialog` remains a centered modal | Desktop type values, shared `Container` uses 40 px inline padding | Dialog has focus containment and a visible close action; a template owned preview may still use its separately specified side drawer |
| 1440 px | Content remains centered in the current 1760 px maximum container, two column hero and template grid | Desktop type values, shared `Container` uses 40 px inline padding | No layout shift from fonts, no overflow, and no clipped actionable text |

The landing proof includes fixtures for a long heading, long body copy, long capability labels, multi line error and recovery text, an empty catalog, and an unbroken long token. Assertions require `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at every viewport and require all actionable text to remain visible. Zoom at 200 percent and forced colors are included in the accessibility pass. A component that cannot reflow at 320 CSS pixels is a failure even though the primary mobile proof is 390 px.

### Accessibility and progressive enhancement rules

Every control has a programmatic accessible name. Links navigate, buttons act, and icon only controls require a visible or `aria-label` name. `Field` owns label, description, error, `aria-invalid`, and `aria-describedby` relationships. Status text includes a noncolor cue and announces only when content changes. `role="status"` is polite, while `role="alert"` is reserved for actionable errors. Focus remains visible in normal and forced color modes. Keyboard operation includes Tab, Shift Tab, Enter, Space, Escape, and dialog focus movement. Shared motion honors `prefers-reduced-motion` by removing spatial movement and decorative effects. The template owned visitor motion control and page menu remain outside `packages/ui`.

The native `Dialog` opens with an initial focus target, uses the browser modal behavior to inert the background, closes from Escape and the visible close button, optionally closes from the overlay only when the caller opts in, restores the previous scroll position, and returns focus to the trigger when still connected. Only one modal is open at a time. Below `breakpoint-tablet` it occupies the full viewport; at and above it is a centered modal. Chromium, Firefox, and WebKit are the supported native dialog targets and each is covered by the browser suite. If a browser lacks the required native dialog behavior, the caller's normal document or route link remains the fallback and no JavaScript-only content is hidden behind the enhancement. The landing preview always has a normal link or route fallback, so the content remains reachable without JavaScript.

Tailwind utilities are emitted in the Tailwind layer. During coexistence, a retained CSS Module is allowed to style only the surrounding feature composition. It must not set the base, variant, focus, hover, disabled, loading, or error declarations of a migrated primitive. A primitive override is expressed through its `className` and `cn`; no `!important` or selector specificity escalation is permitted. Browser verification checks computed styles on each migrated primitive in normal, focus, disabled, loading, and error states so an unlayered CSS Module cannot silently win.

**Security model**:

The UI foundation is not an authorization boundary. The API and feature boundaries remain responsible for authentication, ownership, validation, and safe projections. Primitives render typed text and children, never raw HTML. They do not log secrets, request bodies, passwords, tokens, visitor messages, or field values, and they do not write sensitive data to local storage.

**Configuration required**:

No new environment variables or credentials. Font files and token CSS are checked in assets. `packages/ui/package.json` adds `class-variance-authority`, `clsx`, and `tailwind-merge` only as required by migrated primitives. `packages/ui/components.json` is the single shadcn configuration: it is package local, enables `tsx: true` and `rsc: true`, points the Tailwind stylesheet at `../../apps/web/app/globals.css`, points component output at the `@repo/ui` package source, and maps the component, UI, library, and utility aliases to `@repo/ui`, `@repo/ui`, `@repo/ui/lib`, and `@repo/ui/lib/utils`. The generator is invoked from `packages/ui`; generated source is reviewed and customized rather than regenerated over manual changes. No app local duplicate and no icon library imports are introduced. `apps/web/app/globals.css` records the package source path, semantic aliases, explicit motion and target utilities, and static breakpoint adapters. Existing API origin and authentication configuration remain unchanged.

**Critical test scenarios**:

- Landing page renders its catalog, navigation landmarks, actions, preview, existing metadata, server rendering, and `no-store` catalog behavior through the existing contracts, verifying **AC-1**, **AC-2**, **AC-5**, and **AC-9**.
- Keyboard users tab through controls, see focus in normal and forced colors, operate dialogs with initial focus, Escape, containment, inert background, and focus return, and receive linked field errors, verifying **AC-3** and **AC-4**.
- Loading, empty, error, disabled, recovery, long text, 200 percent zoom, 320 CSS pixel reflow, and narrow viewport cases preserve content and actions, verifying **AC-4**, **AC-5**, and **AC-9**.
- Reduced motion disables spatial animation while content and feedback remain usable, verifying **AC-7**.
- A template specific component remains outside `packages/ui`, and static checks reject data fetching, local storage, analytics, raw HTML, and sensitive logging in primitives, verifying **AC-8** and **AC-10**.
- `cn` resolves class conflicts predictably, typed variants render the expected semantic utilities, and package utilities appear in a production build, verifying **AC-2**, **AC-4**, and **AC-11**.
- Dashboard, editor, admin, and public surfaces each render a shared primitive in compatibility checks without changing their API, route, auth, or rendering boundary. Existing CSS Module consumers remain valid until their migration, verifying **AC-10** and **AC-12**.
- A token sync check compares the static breakpoint adapters and semantic aliases with `packages/ui/src/tokens.css`. Production browser checks verify computed primitive styles, package source inclusion, `cn` conflict precedence, public subpath imports, preserved data attributes, preserved loading status placement, and the absence of primitive state overrides from retained CSS Modules.
- A performance baseline records generated CSS size, client JavaScript size, font request count, and landing page CLS at 390 px and 1440 px before migration. Each migrated surface adds no font request and stays within 10 percent of the baseline CSS and client JavaScript size; landing CLS must not regress by more than 0.02.

## Build plan

1. Capture the CSS, client JavaScript, font request, and CLS baseline. Preserve the canonical token stylesheet and public component exports, add the exact package local `components.json`, add the `cn` helper and only the class utilities required by the first migrated primitive, add the shadcn semantic aliases, explicit `@utility` declarations, static breakpoint adapters, token sync check, and `@source "../../../packages/ui/src"` mapping, satisfying **AC-1**, **AC-2**, and **AC-11**.
2. Convert `Button` first, then migrate the remaining shared primitives one at a time to Tailwind classes and typed shadcn variants. Preserve public subpath imports and exported prop types, accessible DOM contracts, `data-loading`, `data-variant`, the external hidden loading status, loading semantics, native dialog behavior, and existing unit tests. Verify computed styles while retained CSS Modules are present, satisfying **AC-2**, **AC-3**, **AC-4**, and **AC-12**.
3. Use the landing page and catalog actions as the first tracer bullet surface. Replace only shared control styling at first, keep server rendering, `getLandingCatalog`, both catalog paths, schemas, `force-dynamic`, `no-store`, metadata, and safe unavailable and empty states, then verify the production CSS output, satisfying **AC-5**, **AC-9**, and **AC-11**.
4. Migrate shared creator, administration, and application shell surfaces by area. Keep feature behavior, API calls, authentication, URL state, form state, and privacy boundaries unchanged. Leave Secret Letter envelope, flower, paper, waveform, and cinematic template art in their owning CSS and GSAP code unless a generic primitive is a clear fit, satisfying **AC-7**, **AC-8**, **AC-10**, and **AC-12**.
5. Remove obsolete shared CSS only after an import search proves it has no consumers. Run Vitest component tests, lint, type checks, Playwright Chromium, Firefox, and WebKit journeys at 390, 768, 1024, and 1440 px, accessibility checks, forced colors and actual 200 percent zoom checks, reduced motion checks, overflow assertions, computed style and production class checks, token sync checks, performance budget checks, and unchanged catalog route checks, satisfying **AC-3** through **AC-12**.

## Migration plan

**Strategy**: strangler

**Phases**:

1. Record the current primitive imports, public subpath exports, DOM attributes, loading announcements, computed styles, and performance baseline. Add the package local shadcn configuration, `cn` helper, semantic Tailwind aliases, explicit utilities, static breakpoint adapters, token sync check, package source scanning, and required package dependencies while the current CSS Module primitives remain available.
2. Migrate `Button` as the pilot, then migrate the remaining primitives one at a time. Keep each old style file until its last consumer has moved, and keep the existing import paths, exported prop types, DOM attributes, loading announcement placement, and public props stable. A primitive migration is complete only after every current consumer area has passed its browser compatibility checks.
3. Migrate the landing page and catalog actions, then move shared creator, administration, and application shell surfaces by area. Verify each area before starting the next one.
4. Migrate only generic controls in public templates when their behavior and appearance fit. Keep the Secret Letter paper, flower, envelope, waveform, and cinematic animation in template owned code. Remove shared CSS Module rules after the final import check.

**Rollback**: Revert the latest bounded primitive or surface migration commit, including any `components.json`, dependency, Tailwind alias, utility, source scanning, and test changes introduced by that commit. Because no route, API, database, authentication, or persisted data contract changes, rollback is a source change with no data repair. Keep the old CSS Module implementation until the migrated surface passes its browser checks; reverting the commit restores the prior implementation and its styling path.

**Risks**: Missing Tailwind source paths can produce styles that work in development but disappear from a production build. Class conflict mistakes can create inconsistent states. Broad visual migration can damage the custom Secret Letter experience. The phases limit these risks through explicit source scanning, class merge tests, surface checks, and a template exception.

## Consequences

**Positive**:

- New interfaces get consistent accessible behavior and visual tokens.
- Tailwind utilities and shadcn source patterns make the shared styling contract visible in the component code.
- Shared primitives remain portable to future workspaces without importing domain rules.
- Static content stays fast and usable when enhancement features fail.
- The landing proof limits risk before broader migration.

**Negative / tradeoffs**:

- Existing feature CSS will need gradual migration and temporary duplication.
- The team must learn shadcn source ownership, Tailwind class composition, and class conflict rules.
- Tailwind source scanning and semantic aliases become part of the build contract, so incorrect configuration can produce missing production styles.
- Self hosted fonts add asset licensing and font loading maintenance.
- A lightly styled primitive API needs careful review so variants do not become a second domain language.

**Neutral**:

- No database, API, auth, deployment, or environment migration is required.
- shadcn is not added as a runtime dependency, and a new icon library is intentionally not added in this milestone.

## Follow-up

- [ ] After the landing proof, reassess whether a dedicated component workbench is justified by measured maintenance cost.
- [ ] Enroll the Tailwind and shadcn migration as a buildable scope feature before implementation begins, because the original design system scope is already marked done.
- [ ] Remove `packages/ui/src/ui.module.css` only after all shared primitive consumers have moved to Tailwind classes and the compatibility checks pass.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
