# Letterly web

The Next.js App Router application owns routes, server rendering, creator interfaces, template previews, and public presentation. NestJS owns authorization and business rules. Browser API calls use the same origin and are forwarded to the server only `API_ORIGIN`.

Start with the [root setup](../../README.md#local-setup) and [web context](AGENTS.md). Use Node 24 and pnpm 11.20.0.

## Development

Copy `.env.example` to `.env` and configure the web and API origins. From the repository root:

```bash
pnpm dev
# Or start the API separately, then:
pnpm --filter web dev
```

The dev script waits up to 60 seconds for `API_ORIGIN/health` before starting Next.js on port 3000. If it times out, check API configuration and logs first. Keep application origins aligned. Only deliberately public values belong in `NEXT_PUBLIC_*` variables.

## Source ownership

| Location                                   | Responsibility                                                        |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `app/`                                     | Route entry points, metadata, server composition, and handlers        |
| `src/features/landing/`                    | Server landing shell, section components, and feature styles          |
| `src/features/catalog/`                    | Catalog reads, draft creation, and sample previews                    |
| `src/features/pages/`                      | Dashboard, editor, media, responses, and public page adapters         |
| `src/features/auth/`, `admin/`, `legal/`   | Authentication interfaces, moderation, and policy documents           |
| `src/templates/`                           | Independent renderers, assets, motion, and exact version registration |
| `src/lib/api/`                             | Transport, cancellation, safe errors, and response parsing            |
| `src/components/`                          | Reusable web composition without another feature owner                |
| [packages/ui](../../packages/ui/README.md) | Canonical controls, tokens, and class composition                     |

Public server rendering uses validated projections. Authenticated interactive reads use TanStack Query. Keep heavy template implementations behind explicit lazy loaders. Follow the [registration guide](../../docs/references/template-registration.md) for immutable template identities and the [contributor guide](../../CONTRIBUTING.md) for dependency boundaries.

## Testing

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web build
```

The unit command runs the explicit source test selection in [package.json](package.json); it does not run browser journeys.

Browser suites are grouped by journey. `public-secret-letter.spec.ts` owns public viewing and no script cases; `secret-letter-editor-media.spec.ts` and `secret-letter-editor-questions.spec.ts` own creator interactions; `owner-page-sharing.spec.ts` owns protected links and QR; `choose-your-heart-journeys.spec.ts` owns authoring and public journeys. Live published cases retain their explicit slug environment gates. See [test ownership evidence](../../docs/reviews/2026-10-05-browser-test-ownership.md) for fixture and discovery limits.

```bash
pnpm --filter web exec playwright install chromium firefox webkit
pnpm --filter web test:e2e:fixtures
pnpm --filter web test:e2e:ui
```

Fixture scripts own a production web server on port 3100 and fixture API on port 3002. The fixture suite checks Chromium desktop/touch behavior and performance budgets. The UI suite checks Chromium, Firefox, and WebKit behavior, including native dialogs, focus, and responsive controls. Linux CI installs browser system dependencies with `--with-deps`.

Controlled API fixtures do not prove live OAuth, R2, or database behavior. `pnpm --filter web test:e2e` uses the base [Playwright configuration](playwright.config.ts) and needs the actual application/API/database setup required by its selected journeys. [CI](../../.github/workflows/ci.yml) runs the authenticated draft smoke selection separately.

After the final fixture run, restore the normal environment build and route types sequentially:

```bash
pnpm build
pnpm check-types
```

Build and type generation both write `.next`; do not run them concurrently. Preserve the original performance baseline when comparing assets and layout shifts.

## Production and current limits

Production requires the server API origin and matching signing secrets. Use `pnpm --filter web build` and `pnpm --filter web start` through the deliberate release procedure in the [launch runbook](../../docs/runbooks/launch-hardening-checklist.md).

Route entry points currently live in root `app/`. Moving them into `src/app/` requires a separate migration decision. Repository restructuring and the wider accessibility acceptance audit remain in progress.
