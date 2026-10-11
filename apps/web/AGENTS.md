# Web application

## Overview

This workspace is the Next.js App Router web application. It owns page rendering, browser interaction, public page presentation, and same origin calls to the API. Business rules and authorization remain in the API boundary.

## Key files

| File                              | Owns                                          |
| --------------------------------- | --------------------------------------------- |
| `apps/web/package.json`           | Web scripts and Next.js dependencies          |
| `apps/web/app/layout.tsx`         | Root document layout and metadata             |
| `apps/web/app/page.tsx`           | Current home page entry point                 |
| `apps/web/src/features/landing/` | Server landing composition, section components, and feature styles |
| `apps/web/app/sign-in/page.tsx`   | Better Auth social and email sign in route    |
| `apps/web/app/sign-up/page.tsx`   | Better Auth email/password sign up route      |
| `apps/web/app/admin/`              | Protected moderation reports and audit routes |
| `apps/web/app/globals.css`        | Global web styles                             |
| `apps/web/src/features/catalog/server/catalog.ts` | Server readers for the grouped overview, bounded pages, and focused template lookup |
| `apps/web/src/features/catalog/preview/` | Registered template previews, catalog preview dialog/content, and their colocated styles |
| `apps/web/src/lib/auth-client.ts` | Same origin Better Auth browser client        |
| `apps/web/next.config.js`         | Next.js configuration and future API rewrites |

Public boundary files:

- `apps/web/proxy.ts` creates the browser scoped `letterly_browser` cookie for public pages.
- `apps/web/app/p/[slug]/unlock/route.ts` forwards unlock requests with a signed visitor identity.
- `apps/web/app/p/[slug]/report/route.ts` forwards report requests with a signed visitor identity.
- `apps/web/app/p/[slug]/responses/route.ts` forwards visitor submissions with browser and unlock cookies.
- `apps/web/app/p/[slug]/audio/route.ts` forwards private audio playback with range and visitor identity headers.

Administrator boundary files:

- `apps/web/src/features/admin/` contains the protected moderation and audit consoles.
- `apps/web/src/lib/server-admin-auth.ts` probes administrator access on the server before client hydration.

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test:e2e
pnpm --filter web test:e2e:fixtures
pnpm --filter web test
```

## Conventions

- Generic link, hover border, hover outline, and focus defaults live in the Tailwind base layer. Keep invalid control exclusions. Component utility classes can then compose presentation without fighting unlayered defaults; feature CSS Modules retain their explicit styling.

- Use feature based folders as the web surface grows.
- `src/lib/public-page-projection.ts` validates locked or unlocked public contracts and registered identity without server APIs. `public-page.ts` retains no-store fetching, visitor signing, and safe transport handling. Locked state takes precedence over body parsing; malformed or mismatched payloads are unavailable.
- Browser Axios clients, response validation, and safe errors live in `src/lib/api`. Page endpoints and query keys live in `src/features/pages/api`, administrator endpoints in `src/features/admin/api.ts`, and server readers remain separate. Import endpoint owners directly.
- Creator editor dispatch owns one page query and checks registry key, renderer key, and pinned version before loading its registered editor. Journey editing does not initialize Secret Letter form, questions, media, or autosave hooks.
- Catalog preview adapters live in `src/features/catalog/preview`; static dynamic imports load template previews, and dialogs mount samples only while open. Keep the plain template descriptor module separate from component loaders.
- Browser catalog fixtures use `e2e/fixtures/catalog-builder.ts` and the shared provisioning plan to produce one card per active family with ordered active versions. Retired definitions stay available to exact template dispatch. Fixture version entries in one family share its stable template ID and have separate version IDs.
- `e2e/ui-performance.spec.ts` checks initial landing CSS/JavaScript response sizes, font requests/content hashes, and observed layout shift against the measured `e2e/fixtures/landing-ui-baseline.json`. The fixture suite and CI run its 390 px and 1440 px Chromium profiles. Do not refresh the baseline automatically to hide a regression; a later accepted design or performance change needs an explicit new measurement and review.
- Reusable privacy and terms documents live in `src/features/legal`. Policy and authentication routes import them directly; do not import reusable document content from a route's `page.tsx`.
- Unused application Badge and Separator are removed. Tabs and Chart wrappers live with their editor consumers as `features/pages/editor/editor-tabs.tsx` and `editor-chart.tsx`, using the shared class merger. `e2e/fixtures/shared-layout.tsx` renders real shared layout primitives in an isolated Node process so Playwright can inspect their production CSS without its component JSX transform.
- Import Button and Card directly from `@repo/ui/button` and `@repo/ui/card`. Their application copies are removed. The landing hero composes the shared Link directly. Global Tailwind styles explicitly scan `packages/ui/src`; preserve feature CSS Module overrides during later primitive migrations.
- The isolated shared primitive fixture also renders Input, Textarea, and Field for production CSS and accessible relation checks. Keep the global control hover selector from overriding invalid borders.
- The fixture also checks IconButton and Status styles and announcements. The landing catalog loading/empty/error/recovery test lives in design system compatibility so the routine fixture suite runs it.
- Native shared Dialog has a production CSS probe at 390, 768, 769, 1024, and 1440 px. The routine fixture suite includes legal dialog journeys as well as lazy preview dialogs. Preserve their semantic child structure and feature CSS overrides.
- Design system: build all UI to `design.md` (art direction and the product quality bar); token values live in CSS.
- `ui-configuration.test.ts` checks static tablet/desktop/wide adapters against package breakpoint tokens, semantic alias references, shared motion/target utilities, and both workspace generator settings. These tests run in the web unit script; Turbo's dependency transit includes the package token/configuration source.
- Follow the blueprint web structure for new feature code: route entries under `src/app`, feature modules under `src/features`, independent templates under `src/templates`, shared components under `src/components`, and API, query, and auth helpers under `src/lib`.
- The current scaffold keeps `app` at the workspace root. Do not move existing routes as part of an unrelated feature. A move to `src/app` is a separate structure migration and must preserve route behavior and build checks.
- Keep API calls and browser state at the presentation boundary. Do not place authorization rules in client components.
- Keep catalog routes server rendered and uncached. The landing page uses one grouped overview read, browse pages use bounded cursor reads, and preview fallback uses focused lookup. Validate each response with the shared Zod contracts.
- Keep the web app off the legacy `GET /api/v1/templates` array route. Retain that route only for existing clients during the compatibility period.
- Catalog reads retry once after a network failure or HTTP 500, 502, 503, or 504. Permanent errors and invalid payloads still fail; retries never cache catalog responses.
- Keep reusable UI accessible at WCAG AA level and follow the installed React and web design guidance.
- Use `src/components/loading-state.tsx` for route and page loading: `screen` includes branding, `page` fits the workspace shell, and `section` fits existing content. Page-level loaders mark `data-page-loading`; global CSS hides footers until visible loading ends. Keep CSS motion disabled under `prefers-reduced-motion`.
- Use named exports for reusable components. Use default exports only where Next.js requires them for route entry files.
- Public confession pages use the reserved `/p/[slug]` route described by the architecture spec.
- Follow the frontend rules in [the blueprint reference](../../docs/references/letterly-blueprint.md), especially server components for initial public data, TanStack Query with centralized Axios for interactive data, React Hook Form for forms, Zod for template validation, and URL search parameters for route state.
- Do not use `useEffect` for data derivation or request orchestration. Use it only for genuine external subscriptions or client-only library setup with cleanup.
- Keep remote API data in TanStack Query, form state in React Hook Form, template validation in Zod, route state in Next.js, and small local interface state in React state. Use Zustand only for necessary cross-editor interaction state.
- The first release auth surface uses Better Auth email/password sign in and sign up alongside Google and Facebook social sign in. The browser reaches the API through the same origin `/api/auth` rewrite and never handles provider secrets.
- Do not persist sessions, drafts, dashboard data, visitor responses, or unlock proofs in local storage. Use stable query keys and invalidate only affected queries after mutations.
- Keep public unlock and report mutations behind same origin route handlers that forward browser cookies and signed visitor identity headers to the API. The public page proxy creates the HTTP only browser token before visitor submissions.

## Agent skills

- [antislop](../../../.agents/skills/antislop/): `miqdadbadjuber/anti-slop`, core anti-slop interface and implementation filter
- [antislop-code](../../../.agents/skills/antislop-code/): `miqdadbadjuber/anti-slop`, code comment hygiene for changed web code
- [antislop-copywriting](../../../.agents/skills/antislop-copywriting/): `miqdadbadjuber/anti-slop`, concise human interface copy and CTAs
- [antislop-human](../../../.agents/skills/antislop-human/): `miqdadbadjuber/anti-slop`, accessible contrast, focus, and interaction states
- [antislop-layoutmobile](../../../.agents/skills/antislop-layoutmobile/): `miqdadbadjuber/anti-slop`, responsive and mobile layout behavior
- [antislop-ui](../../../.agents/skills/antislop-ui/): `miqdadbadjuber/anti-slop`, UI visual hierarchy, surfaces, and motion guidance
- [gsap-core](../../../.agents/skills/gsap-core/): `greensock/gsap-skills`, core GSAP animation APIs and reduced motion handling
- [gsap-react](../../../.agents/skills/gsap-react/): `greensock/gsap-skills`, React lifecycle scoping and cleanup with `useGSAP`
- [gsap-performance](../../../.agents/skills/gsap-performance/): `greensock/gsap-skills`, transform and opacity animation performance guidance
- [gsap-scrolltrigger](../../../.agents/skills/gsap-scrolltrigger/): `greensock/gsap-skills`, scroll linked section reveals and cleanup
- [gsap-timeline](../../../.agents/skills/gsap-timeline/): `greensock/gsap-skills`, sequenced envelope animation timelines
- Declined: Three.js MCP

## Gotchas

- Web unit tests run through `tsx` with `tsconfig.test.json` for automatic JSX and Node's `--experimental-test-module-mocks` flag. The application keeps its separate Next.js JSX configuration. Composition fixtures replace boundary modules before importing route components; keep native mock isolation and cleanup inside the test process.
- The current package script is named `check-types`; the root command is `pnpm check-types` until tooling standardizes the future `typecheck` name.
- `test:e2e:ui` reuses the isolated fixture runner and verifies native legal/preview dialogs in Chromium, Firefox, and WebKit at 390 and 1440 px. Public legal and preview links keep route navigation when JavaScript or native showModal is unavailable. Loading conventions belong to private dashboard/admin routes so public initial HTML remains readable without JavaScript.
- `test:e2e:fixtures` builds with the isolated catalog origin, then runs eight browser suites on desktop and mobile, including Choose Your Heart graph editing, public traversal/submission adapters, template identity previews, and public Secret Letter/locked fixtures. It starts a catalog fixture on port 3002 and the production web server on port 3100; keep both ports free. These checks mock authenticated browser requests and do not prove real API, database, or provider behavior. The default `test:e2e` retains the real API server configuration.
- Extend `e2e/public-journey-adapter.spec.ts` when adding a public renderer. Check keyboard interaction, a narrow viewport, touch target size where applicable, horizontal overflow, and reduced motion.
- The API workspace owns NestJS endpoints, but the starter page must not invent API or database calls before their contracts and feature slices exist.

## Related specs

- [Stack and architecture](../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
