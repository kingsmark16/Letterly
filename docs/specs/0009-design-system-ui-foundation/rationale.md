# Design system and UI foundation rationale

## Context

Letterly already has an internal visual source in `apps/web/design.md`, global CSS tokens in `apps/web/app/globals.css`, feature CSS Modules, and a starter `packages/ui` package. The package currently exports only TSX files, and its starter components are not product primitives. These pieces are useful but do not yet define one enforceable ownership, CSS export, font loading, or component contract for future pages.

The product has two different presentation modes. Creator tools must be calm and efficient, while public templates may be expressive. Both still need the same typography, controls, focus behavior, responsive rules, privacy boundaries, and reduced motion behavior. The foundation must also preserve the existing Next.js, Tailwind, React, and feature folder boundaries.

The landing page already has a narrow, server rendered catalog path. `getLandingCatalog` fetches `/api/v1/categories` and `/api/v1/templates?categoryKey=confession` with `cache: "no-store"`, validates both payloads with the shared catalog schemas, and is called from a page marked `dynamic = "force-dynamic"`. The foundation must preserve this behavior and add only feature owned recovery copy and actions.

## Options considered

### Option 1: Shared tokens and accessible primitives

Tokens live in `packages/ui`, web globals map them into the existing Tailwind theme, and web features compose the primitives.

**Pros**:

- One source of truth for reusable behavior and values.
- No new styling or component dependency.
- Template independence remains explicit.

**Cons**:

- Existing feature styles need gradual migration.
- The package must avoid becoming a domain component dump.

### Option 2: Web only design tokens

Keep all tokens and components in `apps/web`, with no shared package contract.

**Pros**:

- Smallest immediate change.
- No package boundary work.

**Cons**:

- Future workspaces would duplicate primitives.
- Accessibility and state behavior can drift between features.

### Option 3: Utility only styling

Use Tailwind utilities directly in each feature and avoid shared styled primitives.

**Pros**:

- Fast local composition.
- Few component files.

**Cons**:

- Repeated accessibility and state behavior.
- Token and responsive rules become difficult to audit.

### Option 4: External component and icon system

Adopt a component library, icon package, and possibly Storybook as a new UI platform.

**Pros**:

- More ready made components and documentation.

**Cons**:

- New dependency and styling assumptions.
- Harder to preserve Letterly's restrained visual language and small initial scope.

### Dialog choice

The design uses the native HTML `dialog` element with a documented modern browser policy and a tested progressive enhancement fallback. This keeps the foundation dependency free. A custom focus trap or external dialog package would add behavior and dependency surface before the landing proof demonstrates that it is needed.

## Rationale

Option 1 fits the existing code and the tracer bullet delivery rule. It gives the team a stable contract for the controls that already repeat, without forcing a rewrite or a new platform. Keeping template compositions in web features preserves the product rule that templates own their schema, renderer, and visitor experience.

The design source already supplies most visual values, responsive targets, accessibility baseline, and motion constraints. The spec makes the missing breakpoint, backdrop, focus, target, and reduced motion values explicit, then centralizes them in the shared package so drift is visible. The app owns font files because `next/font/local` is app specific, while the package consumes the resulting variables. CSS Modules and CSS motion keep runtime and bundle costs predictable. The landing page proves the system before the larger dashboard, editor, and public surfaces move, and compatibility checks show that later adoption does not require a route or API redesign.

The state matrix prevents layout primitives from carrying irrelevant feature states. The native dialog contract settles initial focus, containment, inert background, Escape, restoration, responsive behavior, and no JavaScript fallback before implementation. The test plan uses package tests, browser journeys, accessibility checks, overflow assertions, and import boundary enforcement so the acceptance criteria are measurable rather than aspirational.

## References

**Project sources**:

- `apps/web/design.md`, the internal visual and interaction source
- `apps/web/AGENTS.md`, Next.js and UI boundary rules
- `packages/ui/AGENTS.md`, shared primitive ownership and accessibility rules
- `docs/references/letterly-blueprint.md`, frontend, privacy, performance, and testing rules
- `docs/scope/scope.md`, the Tracer Bullet approach and foundation intent

**Practices and standards**:

- WCAG AA accessibility and keyboard operability
- Progressive enhancement for motion, media, and JavaScript
- Single source of truth for design tokens
- Incremental migration instead of a big bang rewrite
- Native dialog behavior with a progressive enhancement fallback
- Local font loading with `display: "swap"` and explicit license records
