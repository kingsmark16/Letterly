# Web application

## Overview

This workspace is the Next.js App Router web application. It owns page rendering, browser interaction, public page presentation, and same origin calls to the API. Business rules and authorization remain in the API boundary.

## Key files

| File | Owns |
|---|---|
| `apps/web/package.json` | Web scripts and Next.js dependencies |
| `apps/web/app/layout.tsx` | Root document layout and metadata |
| `apps/web/app/page.tsx` | Current home page entry point |
| `apps/web/app/sign-in/page.tsx` | Google and Facebook sign in route |
| `apps/web/app/globals.css` | Global web styles |
| `apps/web/src/lib/auth-client.ts` | Same origin Better Auth browser client |
| `apps/web/next.config.js` | Next.js configuration and future API rewrites |

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web check-types
```

## Conventions

- Use feature based folders as the web surface grows.
- Design system: build all UI to `design.md` (art direction and the product quality bar); token values live in CSS.
- Follow the blueprint web structure for new feature code: route entries under `src/app`, feature modules under `src/features`, independent templates under `src/templates`, shared components under `src/components`, and API, query, and auth helpers under `src/lib`.
- The current scaffold keeps `app` at the workspace root. Do not move existing routes as part of an unrelated feature. A move to `src/app` is a separate structure migration and must preserve route behavior and build checks.
- Keep API calls and browser state at the presentation boundary. Do not place authorization rules in client components.
- Keep reusable UI accessible at WCAG AA level and follow the installed React and web design guidance.
- Use named exports for reusable components. Use default exports only where Next.js requires them for route entry files.
- Public confession pages use the reserved `/p/[slug]` route described by the architecture spec.
- Follow the frontend rules in [the blueprint reference](../../docs/references/letterly-blueprint.md), especially server components for initial public data, TanStack Query with centralized Axios for interactive data, React Hook Form for forms, Zod for template validation, and URL search parameters for route state.
- Do not use `useEffect` for data derivation or request orchestration. Use it only for genuine external subscriptions or client-only library setup with cleanup.
- Keep remote API data in TanStack Query, form state in React Hook Form, template validation in Zod, route state in Next.js, and small local interface state in React state. Use Zustand only for necessary cross-editor interaction state.
- The first release sign in surface uses Better Auth social sign in for Google and Facebook only. The browser reaches the API through the same origin `/api/auth` rewrite and never handles provider secrets.
- Do not persist sessions, drafts, dashboard data, visitor responses, or unlock proofs in local storage. Use stable query keys and invalidate only affected queries after mutations.

## Gotchas

- The current package script is named `check-types`; the root command is `pnpm check-types` until tooling standardizes the future `typecheck` name.
- The API workspace owns NestJS endpoints, but the starter page must not invent API or database calls before their contracts and feature slices exist.

## Related specs

- [Stack and architecture](../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
