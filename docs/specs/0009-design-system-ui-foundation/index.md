# 0009. Letterly design system and UI foundation

**Date**: 2026-08-22
**Status**: Accepted

## Summary

Letterly will use one shared visual and interaction foundation across the landing page, creator tools, and public templates. Token definitions will live with the reusable UI package, while Letterly compositions stay in the web application and feature folders. The landing page will prove the foundation first, then the other surfaces will adopt it incrementally.

## Requirements

**User stories**:

- As a creator or visitor, I want Letterly interfaces to feel consistent and calm so that I can focus on the message.
- As a keyboard or mobile user, I want every important control to remain accessible so that I can complete the same tasks without a mouse or animation.
- As a web developer, I want reusable primitives with clear contracts so that new pages do not invent incompatible controls.

**Acceptance criteria**:

- **AC-1**: Canonical color, typography, spacing, shape, elevation, motion, focus, target size, backdrop, and breakpoint tokens are defined once in `packages/ui` and imported by the web global stylesheet. Tailwind v4 maps only to those variables through `@theme inline`, with no duplicated literal values.
- **AC-2**: `packages/ui` exports accessible, lightly styled `Button`, `Link`, `Field`, `Input`, `Textarea`, `Card`, `Dialog`, `Status`, `IconButton`, `Container`, and `Stack` primitives with named exports, typed props, and documented composition rules.
- **AC-3**: Shared primitives meet the WCAG AA baseline, including semantic markup, visible focus, keyboard operation, labels, error descriptions, status announcements where needed, and touch targets of at least 44 px.
- **AC-4**: Shared primitives expose only the states that make sense for their role through typed state slots. Feature code supplies messages and recovery actions, and primitives never invent feature copy or domain rules.
- **AC-5**: The foundation is verified at 1440 px and 390 px and checked at 768 px and 1024 px against the responsive behavior table in this spec. Layouts wrap and expand safely, preserve meaningful text, have no horizontal overflow, and remain complete on mobile.
- **AC-6**: Licensed Fraunces and Manrope WOFF2 assets are checked in under `apps/web/assets/fonts`, with `Fraunces-500.woff2`, `Fraunces-600.woff2`, `Fraunces-650.woff2`, `Manrope-400.woff2`, `Manrope-500.woff2`, `Manrope-600.woff2`, and `Manrope-700.woff2` plus `LICENSE-Fraunces.txt` and `LICENSE-Manrope.txt`. `apps/web/app/layout.tsx` loads them through `next/font/local` with `display: "swap"`, `preload: true`, explicit system fallbacks, and the documented Letterly type scale without blocking initial content.
- **AC-7**: Shared interaction feedback uses CSS transitions and keyframes with reduced motion behavior. GSAP remains limited to template specific cinematic sequences.
- **AC-8**: Shared primitives render typed text and children only. They do not render raw HTML, fetch data, authorize users, log field values, emit analytics, or persist sensitive state locally. Template specific components remain outside `packages/ui`.
- **AC-9**: The landing page is the first tracer bullet surface using the foundation. It preserves server rendering, `dynamic = "force-dynamic"`, the `getLandingCatalog` calls to `/api/v1/categories` and `/api/v1/templates?categoryKey=confession`, `cache: "no-store"`, the catalog schemas, existing metadata, and safe unavailable and empty states. It has tested normal, loading, empty, error, disabled, focus, hover, recovery, and reduced motion states.
- **AC-10**: This milestone migrates the landing page only. Dashboard, editor, and public template chrome each receive a compatibility proof showing that the shared package can be imported without route, API, database, auth, or rendering boundary changes. Their full visual migration remains a later scope feature.

## Decision

**Chosen option**: Shared CSS tokens and accessible primitives in `packages/ui`, with Letterly compositions in `apps/web`, CSS Modules for component styles, and the existing Tailwind v4 theme mapping for utility access. The package exports `./tokens.css` explicitly and keeps token values there. Fonts remain app owned because `next/font/local` is a Next.js app concern, while the shared token layer consumes the app supplied font variables.

The design source remains [apps/web/design.md](../../../apps/web/design.md). The foundation uses self hosted fonts, named inline SVG icons, CSS motion for shared controls, and feature supplied copy and recovery actions.

## Standard definition

### Token contract

The package token stylesheet is `packages/ui/src/tokens.css` and is exported as `@repo/ui/tokens.css`. It is the only file allowed to define design values. `apps/web/app/globals.css` imports it before `@import "tailwindcss"` and contains only resets, global behavior, and `@theme inline` aliases. The aliases reference variables such as `var(--letterly-color-canvas)` and never repeat a literal color, size, shadow, or timing value. `apps/web/next.config.js` adds `transpilePackages: ["@repo/ui"]` so workspace TSX and CSS Modules are processed by the same Next.js pipeline.

The token schema contains these groups and values:

| Group | Required tokens |
|---|---|
| Color | `--letterly-color-canvas: #FAF6F0`, `--letterly-color-surface: #FFFDFC`, `--letterly-color-surface-muted: #F2E9DF`, `--letterly-color-ink: #2B211D`, `--letterly-color-ink-muted: #6E5D54`, `--letterly-color-wine: #7A2E3A`, `--letterly-color-wine-hover: #642631`, `--letterly-color-rose: #C97D77`, `--letterly-color-sand: #D9B89C`, `--letterly-color-olive: #6B6A45`, `--letterly-color-border: #D8CCC0`, `--letterly-color-error: #9B3F35`, `--letterly-color-warning: #9A642A`, `--letterly-color-focus: #7A2E3A`, `--letterly-color-backdrop: rgba(43, 33, 29, 0.38)` |
| Type | The desktop and mobile sizes and line heights from `apps/web/design.md` for `display`, `h1`, `h2`, `h3`, `body-large`, `body`, `small`, and `label` |
| Spacing | `space-1` through `space-9`, from 4 px through 96 px, on the 4 px base unit |
| Shape and depth | `radius-small: 8px`, `radius-medium: 12px`, `radius-large: 16px`, `radius-round: 999px`, `shadow-low`, and `shadow-medium` from the design source |
| Motion | `motion-fast: 120ms`, `motion-standard: 220ms`, `motion-slow: 420ms`, `ease-standard`, `ease-gentle`, and `motion-reduced: 1ms` |
| Accessibility | `focus-width: 2px`, `focus-offset: 2px`, `target-min: 44px`, and `backdrop` as the color token above |
| Breakpoints | `breakpoint-tablet: 48rem`, `breakpoint-desktop: 64rem`, and `breakpoint-wide: 90rem` |

Responsive type uses the design source desktop and mobile values with a switch at `breakpoint-tablet`. Page padding is 20 to 24 px below tablet, 32 to 48 px from tablet through desktop, and 64 to 80 px at wide desktop. The container max width is 75rem (1200 px), with long letter text capped at 45rem (720 px). Components use CSS Modules and may consume these variables without importing a global component stylesheet. The package must remain compatible with Next.js CSS Module processing when imported from a workspace package.

### Primitive contracts

All primitives are named exports from `@repo/ui`. They render semantic elements, accept `className`, use CSS Modules owned by the package, and remain server compatible unless a row explicitly says client behavior is required.

| Primitive | Required contract |
|---|---|
| `Button` | Renders `button` by default, supports `primary`, `secondary`, and `tertiary` variants, `loading`, `disabled`, and an optional `state` slot. Loading disables activation, sets `aria-busy`, preserves the accessible name, and shows a feature supplied busy label through `aria-label` or visible content. |
| `Link` | Renders a real `a` element for internal and external navigation. External links may set `target` only with `rel="noopener noreferrer"`. It has no disabled prop; callers remove the action or render a disabled `Button` when navigation is unavailable. |
| `Field` | Provides a stable `id`, visible label, optional description, error text, required marker, and the `aria-describedby` and `aria-invalid` wiring for its child control. Error text takes precedence over description in the announced relation while both remain visible when useful. |
| `Input` | Renders a native input, forwards its ref and standard input props, supports `invalid`, `disabled`, and `loading` presentation, and never uses a placeholder as its label. |
| `Textarea` | Renders a native textarea, forwards its ref and standard textarea props, supports `invalid`, `disabled`, `loading`, and an optional feature supplied character count. |
| `Card` | Renders a noninteractive `article` or `section` by default. An actionable card is an explicit `Link` composition, never a nested button or nested link. It has an optional state region but no domain status mapping. |
| `Dialog` | Is the only client primitive and uses native `dialog` with a tested modern browser policy. It supports controlled `open`, `onClose`, accessible `title`, optional description, a visible close button, optional overlay close, and an initial focus ref. It contains focus, makes the background inert, closes on Escape, restores scroll and focus to the trigger, rejects nested modal dialogs, becomes a full screen dialog below `breakpoint-tablet`, and provides a real route or link fallback when JavaScript is unavailable. |
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
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`ui-button ui-button-${variant} ${className ?? ""}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span aria-hidden="true">Working…</span> : null}
      {children}
    </button>
  );
}
```

The implementation must use the token variables, preserve the caller supplied accessible name, expose a visible focus ring, and keep feature messages outside the primitive. The actual component API may use a class utility instead of the illustrative string interpolation.

**Replaces**:

- One off button, input, card, dialog, and status styling repeated in feature CSS.
- Token values duplicated between web files and shared components.
- Template components placed in the shared UI package.
- JavaScript animation used for ordinary hover, focus, loading, or error feedback.

**Enforcement**:

TypeScript named exports and explicit package exports (`./*` for components and `./tokens.css` for the token stylesheet) define the primitive boundary. CSS custom properties in the package token stylesheet are the only token source. `packages/ui` adds a `test` script using Vitest with jsdom and React Testing Library, with tests under `packages/ui/src/**/*.test.tsx`. Package lint and type checks, web lint and type checks, component tests, and Playwright journeys enforce the contract. A lint rule or import boundary check rejects network clients, browser storage, analytics clients, `dangerouslySetInnerHTML`, and new feature specific components in `packages/ui`. Code review rejects raw HTML rendering and sensitive persistence.

**Rollout**:

Add the token layer and primitives first, migrate the landing page as the only visual proof in this milestone, and add import compatibility checks for the dashboard, editor, and public template chrome. New shared controls use the standard immediately. Their full visual migrations are separate scope work, and existing feature styles are migrated gradually.

**Exceptions**:

Template specific presentation, cinematic GSAP sequences, and route entry files may remain in their owning web feature or template. No other exceptions apply to token ownership, accessibility, or privacy boundaries.

## Feature design

**Data model sketch**:

No database or persistence changes. Tokens are checked in CSS. Component state is ephemeral React state or form state owned by the consuming feature. No session, draft, response, password, or visitor data is stored by the foundation.

**State transitions**:

Shared controls expose state values such as idle, hover, focus, pressed, loading, disabled, error, and recovery according to the state matrix above. A feature owns the transition, message, and recovery action. Dialogs additionally open, close, Escape close, initial focus, focus containment, inert background, scroll restoration, and focus return to the trigger. A nested modal dialog is not supported. The landing preview uses a real preview link or route as its non JavaScript fallback.

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Existing catalog route | Existing GET | Existing catalog query | Existing category and template contract | Public | Existing safe unavailable response |
| Shared UI primitives | React render | Typed props, children, and state slots | Accessible DOM and CSS classes | None | Invalid props rejected by TypeScript where practical |

No new REST route, database contract, auth boundary, or browser storage contract is introduced.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Render tokens | Color, type, spacing, radius, shadow, motion, focus, target, backdrop, and breakpoint values | `apps/web/design.md`, copied once into `packages/ui/src/tokens.css` |
| Map Tailwind values | Utility names for colors, type, spacing, radius, shadow, and motion | `apps/web/app/globals.css` `@theme inline` aliases that reference package variables only |
| Load typography | Fraunces and Manrope font faces, weights, and fallback metrics | The named licensed WOFF2 files and license records in `apps/web/assets/fonts`, plus `next/font/local` in `apps/web/app/layout.tsx` with `display: "swap"`, `preload: true`, Fraunces weights 500, 600, and 650, Manrope weights 400, 500, 600, and 700, and fallbacks `Georgia, serif` and `Arial, sans-serif` |
| Render landing catalog | Category, template name, version, and capabilities | `getLandingCatalog`, `/api/v1/categories`, `/api/v1/templates?categoryKey=confession`, `categoryCatalogResponseSchema`, and `templateCatalogResponseSchema` |
| Fetch landing catalog | Server side request and cache behavior | `apps/web/lib/catalog.ts`, `cache: "no-store"`, and `dynamic = "force-dynamic"` in `apps/web/app/page.tsx` |
| Render catalog failure | Safe unavailable text and retry or reload action | The landing feature owns the copy and an explicit reload link or button; the `Status` primitive only renders the supplied slot |
| Render catalog empty state | Useful empty explanation and next action when the response is valid but has no templates | The landing feature and catalog response length |
| Render feature states | Loading, empty, error, disabled, and recovery copy | The consuming feature, never the primitive |
| Render public or creator content | User supplied text and safe projections | Existing template contracts and API mappers |
| Choose layout | Viewport, token breakpoints, and CSS media queries | The responsive behavior table and the 1440 px, 390 px, 768 px, and 1024 px checks |

**Key invariants**:

- There is one canonical token source and no duplicated token values.
- Generic primitives contain no Letterly domain rules, authorization, data fetching, raw HTML rendering, analytics, or sensitive persistence.
- Every interactive primitive has a keyboard path, visible focus, and a minimum 44 px target.
- Meaningful text wraps instead of being silently clipped or truncated.
- Reduced motion removes spatial movement and decorative effects while preserving feedback.
- Shared CSS motion does not require client hydration for static content.
- Optional template content disappears cleanly, and template specific behavior stays outside the shared package.

### Responsive behavior

| Viewport | Navigation and layout | Type and spacing | Overflow and interaction |
|---|---|---|---|
| 390 px | One column hero and template list, navigation wraps into a second row, actions stack to full width, preview dialog is full screen | Mobile type values, 20 to 24 px page padding, token gaps | No horizontal scrollbar, no clipped heading or action label, all targets at least 44 px |
| 768 px | Two column template grid and two column hero where content permits, navigation may remain wrapped | Tablet type transition, 32 to 48 px page padding | Long headings and capability lists wrap, dialog remains usable without horizontal scrolling |
| 1024 px | Desktop navigation on one row, two column hero, two column template grid | Desktop type values, 48 px page padding | Dialog is a side drawer or centered modal, with focus containment and visible close action |
| 1440 px | Content remains centered in a 1200 px maximum container, two column hero and template grid | Desktop type values, 64 to 80 px outer page padding | No layout shift from fonts, no overflow, and no clipped actionable text |

The landing proof includes fixtures for a long heading, long body copy, long capability labels, multi line error and recovery text, an empty catalog, and an unbroken long token. Assertions require `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at every viewport and require all actionable text to remain visible. Zoom at 200 percent and forced colors are included in the accessibility pass. A component that cannot reflow at 320 CSS pixels is a failure even though the primary mobile proof is 390 px.

### Accessibility and progressive enhancement rules

Every control has a programmatic accessible name. Links navigate, buttons act, and icon only controls require a visible or `aria-label` name. `Field` owns label, description, error, `aria-invalid`, and `aria-describedby` relationships. Status text includes a noncolor cue and announces only when content changes. `role="status"` is polite, while `role="alert"` is reserved for actionable errors. Focus remains visible in normal and forced color modes. Keyboard operation includes Tab, Shift Tab, Enter, Space, Escape, and dialog focus movement. Shared motion honors `prefers-reduced-motion` by removing spatial movement and decorative effects. The template owned visitor motion control and page menu remain outside `packages/ui`.

The native `Dialog` opens with an initial focus target, uses the browser modal behavior to inert the background, closes from Escape and the visible close button, optionally closes from the overlay only when the caller opts in, restores the previous scroll position, and returns focus to the trigger when still connected. Only one modal is open at a time. On small screens it occupies the full viewport. The landing preview always has a normal link or route fallback, so the content remains reachable without JavaScript.

**Security model**:

The UI foundation is not an authorization boundary. The API and feature boundaries remain responsible for authentication, ownership, validation, and safe projections. Primitives render typed text and children, never raw HTML. They do not log secrets, request bodies, passwords, tokens, visitor messages, or field values, and they do not write sensitive data to local storage.

**Configuration required**:

No new environment variables or credentials. Font files and token CSS are checked in assets. Existing API origin and authentication configuration remain unchanged.

**Critical test scenarios**:

- Landing page renders its catalog, navigation landmarks, actions, preview, existing metadata, server rendering, and `no-store` catalog behavior through the existing contracts, verifying **AC-1**, **AC-2**, **AC-5**, and **AC-9**.
- Keyboard users tab through controls, see focus in normal and forced colors, operate dialogs with initial focus, Escape, containment, inert background, and focus return, and receive linked field errors, verifying **AC-3** and **AC-4**.
- Loading, empty, error, disabled, recovery, long text, 200 percent zoom, 320 CSS pixel reflow, and narrow viewport cases preserve content and actions, verifying **AC-4**, **AC-5**, and **AC-9**.
- Reduced motion disables spatial animation while content and feedback remain usable, verifying **AC-7**.
- A template specific component remains outside `packages/ui`, and static checks reject data fetching, local storage, analytics, raw HTML, and sensitive logging in primitives, verifying **AC-8** and **AC-10**.
- Dashboard, editor, and public surfaces each import one shared primitive in a compatibility check without changing their API, route, auth, or rendering boundary, verifying **AC-10**.

## Build plan

1. Add the licensed font assets and records, create the canonical token stylesheet in `packages/ui`, add the explicit `./tokens.css` export, import it from web globals, and map Tailwind aliases to variables only. Load the app owned fonts with `next/font/local`, satisfying **AC-1** and **AC-6**.
2. Replace starter UI primitives with typed, accessible `Button`, `Link`, `Field`, `Input`, `Textarea`, `Card`, `Dialog`, `Status`, `IconButton`, `Container`, and `Stack` components. Implement the state matrix, native dialog contract, CSS Module compatibility, and unit and type tests, satisfying **AC-2**, **AC-3**, and **AC-4**.
3. Migrate the landing page to the primitives and token classes. Preserve `getLandingCatalog`, both catalog paths, schemas, server rendering, `force-dynamic`, `no-store`, metadata, and safe unavailable and empty states. Add a feature supplied retry or reload action and the non JavaScript preview link, satisfying **AC-5** and **AC-9**.
4. Prove compatibility by importing one shared primitive in the dashboard, editor, and public template chrome without visually migrating those surfaces or moving routes and changing API, database, auth, or rendering contracts. Keep template specific content and cinematic animation in their owning features, satisfying **AC-7**, **AC-8**, and **AC-10**.
5. Run Vitest component tests, lint, type checks, Playwright desktop and mobile journeys at 390, 768, 1024, and 1440 px, accessibility checks, forced colors and 200 percent zoom checks, reduced motion checks, overflow assertions, and unchanged catalog route checks, satisfying **AC-3** through **AC-10**.

## Consequences

**Positive**:

- New interfaces get consistent accessible behavior and visual tokens.
- Shared primitives remain portable to future workspaces without importing domain rules.
- Static content stays fast and usable when enhancement features fail.
- The landing proof limits risk before broader migration.

**Negative / tradeoffs**:

- Existing feature CSS will need gradual migration and temporary duplication.
- Self hosted fonts add asset licensing and font loading maintenance.
- A lightly styled primitive API needs careful review so variants do not become a second domain language.

**Neutral**:

- No database, API, auth, deployment, or environment migration is required.
- Storybook and a new icon library are intentionally not added in this milestone.

## Follow-up

- [ ] After the landing proof, reassess whether a dedicated component workbench is justified by measured maintenance cost.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
