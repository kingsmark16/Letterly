# Route tree migration runtime comparison

Date: 2026-10-09
Baseline: `HEAD` 65ab61d (`fix(tooling): exclude browser fixture builds from lint`), route tree at `apps/web/app`, proxy at `apps/web/proxy.ts`.
Migrated: the working tree, route tree at `apps/web/src/app`, proxy at `apps/web/src/proxy.ts`.

## Method

- The baseline was a detached git worktree of `HEAD` with `pnpm install --offline --frozen-lockfile`. The ignored `apps/web/.env` was copied into it so both builds read the same local configuration. Secret values are not recorded here.
- Both trees ran `next build` and `next start` with `API_ORIGIN=http://127.0.0.1:3002`, `LETTERLY_UI_TEST_FIXTURES=1`, and `NODE_ENV=production`. Baseline served on port 3101, migrated on port 3102.
- One shared fixture API (`apps/web/scripts/browser-catalog-fixture.ts`, port 3002) served both. It serves the catalog, public letters, and administrator fixtures from the working tree.
- A single script issued 23 plain `GET` requests with `redirect: "manual"` to each server. Each server was probed twice. Locations were compared after replacing the port.
- The first baseline attempt lacked the ignored `.env` and returned 500 for `/p/*` because `BETTER_AUTH_SECRET` and `PUBLIC_MEDIA_PROXY_SECRET` were missing. That run was discarded and the baseline was rebuilt with the `.env` copied. The remaining results come from the rebuilt baseline only.

## Result

Cross version differences: 0 of 23 requests (status, the six recorded headers, `Set-Cookie` shape, title, first `h1`, visible text length, stylesheet link count, canonical link, font preload).
Same version rerun differences: 0 for both trees.
The landing page (`/`) picks decorative headline words at random per request, so its `h1` and text sample were excluded from the comparison. Its status, title, text length (24282 characters), and stylesheet count (3) matched.

| Request | Status | Location | Cache-Control | X-Robots-Tag | Referrer-Policy | Title | First h1 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /` | 200 | | `private, no-cache, no-store, max-age=0, must-revalidate` | | | Letterly | Say what your heart has been holding. |
| `GET /templates` | 200 | | same as `/` | | | Templates \| Letterly | Browse templates |
| `GET /templates/confession` | 200 | | same as `/` | | | Category templates \| Letterly | Confession designs |
| `GET /preview/secret-letter` | 200 | | same as `/` | | | Design preview \| Letterly | Secret Letter |
| `GET /preview/choose-your-heart` | 200 | | same as `/` | | | Design preview \| Letterly | Choose Your Heart |
| `GET /sign-in` | 200 | | same as `/` | | | Sign in \| Letterly | Checking your session |
| `GET /sign-up` | 200 | | same as `/` | | | Create an account \| Letterly | Checking your session |
| `GET /forgot-password` | 200 | | `no-store` | `noindex, nofollow, noarchive` | `no-referrer` | Account recovery \| Letterly | Find your way back in. |
| `GET /privacy` | 200 | | `s-maxage=31536000` | | | Privacy Policy \| Letterly | Privacy Policy |
| `GET /terms` | 200 | | `s-maxage=31536000` | | | Terms and Conditions \| Letterly | Terms and Conditions |
| `GET /verify-email` | 200 | | `no-store` | `noindex, nofollow, noarchive` | `no-referrer` | Verify email \| Letterly | Your email, confirmed. |
| `GET /reset-password` | 200 | | `no-store` | `noindex, nofollow, noarchive` | `no-referrer` | Reset password \| Letterly | Set a password you can trust. |
| `GET /reset-password?token=abc123` | 307 | `/reset-password#token=abc123` | `no-store` | `noindex, nofollow, noarchive` | `no-referrer` | | |
| `GET /reset-password?token=abc123&error=x` | 307 | `/reset-password#token=abc123` | `no-store` | `noindex, nofollow, noarchive` | `no-referrer` | | |
| `GET /p/fixture-letter` | 200 | | `no-store` | `noindex, nofollow, noarchive` | | A Secret Letter on Letterly | To Fixture Reader |
| `GET /p/fixture-letter-locked` | 200 | | `no-store` | `noindex, nofollow, noarchive` | | A Secret Letter on Letterly | This letter is protected. |
| `GET /p/does-not-exist` | 500 | | `no-store` | `noindex, nofollow, noarchive` | | Letter unavailable \| Letterly | |
| `GET /dashboard` | 307 | `/templates` | | | | | |
| `GET /dashboard/pages` | 200 | | same as `/` | | | Pages \| Letterly | Opening your workspace |
| `GET /admin/moderation/reports` | 200 | | same as `/` | | | Moderation reports \| Letterly | Loading Letterly |
| `GET /create` | 404 | | same as `/` | | | Letterly | |
| `GET /no-such-route` | 404 | | same as `/` | | | Letterly | 404 |
| `GET /robots.txt` | 404 | | same as `/` | | | Letterly | 404 |

Reset password token redirect, both trees: `GET /reset-password?token=abc123` returns 307 with `Location: /reset-password#token=abc123`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and `X-Robots-Tag: noindex, nofollow, noarchive`. The token is removed from the query string. This proves `src/proxy.ts` is still picked up and its matcher still applies.

Public page proxy, both trees: `GET /p/fixture-letter` sets `letterly_browser=<uuid>; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=lax`, has a canonical link and font preloads, and links 4 stylesheets. The rendered text starts `Skip to letter FOR YOU, Fixture Reader ... Tap to open To Fixture Reader For you, always`.

## Limits

- Only `GET` requests were issued. The `/p/[slug]/unlock`, `report`, `responses`, `audio`, `media`, and `visit` handlers were verified by the production route manifest and by the browser fixture run below, not by these probes.
- The 500 for `/p/does-not-exist` appears in both trees. It comes from the fixture API, which has no matching record, so it is a shared fixture behavior and not a migration difference. It is not a claim about the real API.
- `/sign-in`, `/sign-up`, `/dashboard/pages`, and `/admin/moderation/reports` only show their server rendered loading shell without JavaScript. Authenticated rendering needs the browser fixtures or a real session.
- The shared fixture API is not a real API, database, or provider. No real Better Auth, Neon, Redis, or R2 behavior was exercised.
- Static asset file names were not compared byte for byte. Equal stylesheet counts and font preload presence are the evidence for asset resolution.


## Browser fixture run on the migrated tree

`pnpm --filter web test:e2e:fixtures` (production build of the working tree, isolated fixture API on port 3002, web on port 3100, desktop and mobile projects): 304 cases, 292 passed, 12 skipped, 0 failed, 3.5 minutes. The 12 skips match the intentional skips recorded in the earlier shared UI audit. The run was not repeated on the baseline, so it is evidence for the migrated tree only. It mocks authenticated browser requests and does not prove real API, database, or provider behavior.

