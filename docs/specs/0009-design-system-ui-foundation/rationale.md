# Design system and UI foundation rationale

## Context

> ⚠️ Premise note: This request spans a shared styling decision and the migration of several existing screens. A broad rewrite would risk working routes and the custom Secret Letter experience. The right framing is a source owned component standard with an incremental migration, while each screen redesign remains a separate implementation slice.

Letterly already has an internal visual source in `apps/web/design.md`, global CSS tokens in `apps/web/app/globals.css`, feature CSS Modules, and a shared `packages/ui` package. Tailwind v4 is active in the web workspace. The shared package currently exports React primitives styled through `ui.module.css`, while several newer application surfaces already use Tailwind utility strings directly. There is no shadcn configuration or shared class merge helper, so the repository does not yet have one clear way to compose variants or resolve utility conflicts.

The product has two different presentation modes. Creator tools and administration screens need calm, efficient controls. Public templates may be expressive, animated, and highly specific to a letter. Both still need the same typography, focus behavior, responsive rules, privacy boundaries, and reduced motion behavior. A styling revision must preserve the feature and template boundaries rather than turning public art direction into generic application components.

The landing page has a narrow, server rendered catalog path. `getLandingCatalog` fetches `/api/v1/categories` and `/api/v1/templates?categoryKey=confession` with `cache: "no-store"`, validates both payloads with the shared catalog schemas, and is called from a page marked `dynamic = "force-dynamic"`. Existing Secret Letter routes also contain custom CSS for the envelope, paper, flowers, message layout, and audio waveform. These behaviors are already exercised by browser journeys and must remain stable while the shared component styling changes.

## Options considered

### Option 1: Keep CSS Modules and add utility classes only where needed

Keep the current `packages/ui` primitives and CSS Module implementation, then add Tailwind classes to individual feature screens for new visual revisions.

**Pros**:

- Smallest immediate change.
- No generator or class utility setup.

**Cons**:

- Shared primitives continue to have a separate styling model from the rest of the app.
- Repeated variants and class conflicts remain easy to implement differently.
- This does not deliver the requested shadcn source pattern.

### Option 2: Tailwind and shadcn source components in the existing shared package

Keep `packages/ui` as the public component boundary, but replace its shared primitive styles with source owned shadcn patterns. Tailwind v4 supplies the utilities, `cn` merges classes, and typed variant definitions keep states explicit.

**Pros**:

- Uses the requested Tailwind and shadcn approach without creating a second component library.
- Preserves existing `@repo/ui` import paths and future workspace reuse.
- Keeps token ownership, accessibility behavior, and feature boundaries in one place.

**Cons**:

- Requires a small package dependency and Tailwind source scanning setup.
- Shared primitives need careful class review during the migration.

### Option 3: App local shadcn components

Generate components under `apps/web/src/components/ui` and leave `packages/ui` as a separate primitive system.

**Pros**:

- Follows the common single app shadcn layout.
- Lets web screens move quickly without changing the package at first.

**Cons**:

- Creates two shared UI boundaries with overlapping buttons, fields, cards, and dialogs.
- Future workspaces cannot reuse the web components without another migration.
- Existing imports and tests would split across incompatible implementations.

### Option 4: Directly replace all existing styles

Convert the landing page, creator tools, administration screens, and public templates to Tailwind and shadcn in one migration.

**Pros**:

- Produces one visible styling approach quickly.
- Removes temporary coexistence sooner.

**Cons**:

- Large change surface makes visual regressions and mobile failures harder to localize.
- The custom Secret Letter animation and layout would be forced through a generic migration.
- Rollback would be broad and could require restoring many unrelated files.

### Dialog choice

The design keeps the native HTML `dialog` element with a defined Chromium, Firefox, and WebKit policy and a tested progressive enhancement fallback. The supported browsers use the native modal behavior, while a browser without the required capability keeps the normal document or route link reachable rather than receiving a second JavaScript modal implementation. This keeps dialog behavior dependency free even though shared primitives use the shadcn source pattern. A custom focus trap or external dialog package would add behavior and dependency surface before the landing proof demonstrates that it is needed.

## Rationale

The requested Tailwind and shadcn direction is best implemented inside the existing `packages/ui` boundary. This avoids the two library problem created by app local components, keeps the existing public imports stable, and lets the package continue to serve future workspaces. The source owned nature of shadcn fits the need to preserve Letterly's restrained colors, typography, focus treatment, and state rules rather than accepting an external visual system.

The existing token source and design document remain authoritative for different purposes. The checked in values in `packages/ui/src/tokens.css` are frozen as the implementation contract for this migration, while `apps/web/design.md` remains the visual intent and the source for a later retuning decision. Tailwind receives semantic aliases that point back to those variables, so shadcn conventions do not create a second palette or spacing scale. The `cn` helper and typed variants make class composition explicit and predictable. The user's preference for shadcn is accepted, with the tradeoff that the repository now owns generator output, dependency updates, static breakpoint synchronization, and production source scanning.

The migration follows the strangler pattern. The landing page remains the first proof, then shared creator, administration, and application shell surfaces move by area. Existing CSS Modules stay in place until their consumers have migrated, and they are restricted to surrounding composition once a primitive has moved. Computed style checks prevent unlayered feature CSS from silently overriding migrated primitive states. The public Secret Letter's paper, flowers, envelope, waveform, and cinematic effects remain template owned because their visual behavior is not a generic shared primitive. This keeps the change reversible and protects the working server, API, database, authentication, privacy, and motion contracts.

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
- Source owned component generation and composition through shadcn/ui
- Incremental migration instead of a big bang rewrite
- Native dialog behavior with a progressive enhancement fallback
- Local font loading with `display: "swap"` and explicit license records
