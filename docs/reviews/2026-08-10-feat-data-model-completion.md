# Review, feat/data-model-completion, 2026-08-10

**Reviewed by**: GPT-5, inline review because no separate review model is available
**Scope**: 78 files, branch vs base `2ce0f2e60470902b8e1a68409ab5f1684d611056`
**Verdict**: Changes requested

## Summary

The previous lifecycle predicate, transaction rollback, shared Redis, API routing, and `Retry-After` issues are materially fixed. Four production concerns remain: publish readiness is outside the lifecycle transaction, deletion can deadlock with slug reservation changes, server rendered reads do not carry a visitor rate limit identity, and `API_ORIGIN` can silently fall back to localhost. The current tests do not exercise the real database, Redis, or complete browser journey needed to prove these paths.

## Major

### 🟠 Publish can use a stale readiness check, `apps/api/src/modules/pages/application/page.service.ts:295`

**Problem**: The service reads and validates recipient and message content before `publishPage` starts its database transaction. The repository transaction checks status and slug, but it does not read or condition on the content version that passed readiness validation.
**Why it matters**: A concurrent save can commit blank content after the service check and before the publish transaction, allowing a page to become public without satisfying AC 1. This also conflicts with the spec statement that Publish evaluates the latest saved content at the start of its transaction.
**Suggested fix**: Make readiness validation part of the same transaction that publishes the page, or condition the publish write on the exact content version that was validated and return a safe conflict when it changed. Add a real concurrent save and publish test.

### 🟠 Delete and slug updates acquire locks in opposite order, `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts:408`

**Problem**: Deletion updates slug reservations before deleting the page. Custom publish and live slug change update the page before updating reservations.
**Why it matters**: A delete racing a custom publish or slug change can hold a reservation lock while waiting for the page lock, while the other transaction holds the page lock and waits for the reservation. PostgreSQL can abort one transaction as a deadlock, which currently becomes an internal error instead of the safe lifecycle conflict required by the spec.
**Suggested fix**: Use one lock order for every lifecycle transaction, normally page first and reservations second. Map retryable transaction conflicts to the documented safe result, and cover delete races against custom publish and live slug change with the real database.

### 🟠 Public visitors share the web server rate limit identity, `apps/web/src/lib/public-page.ts:20`

**Problem**: The public page is loaded by a Next.js server fetch. The API then keys `publicPageReads` from `request.ip`, which identifies the Next.js server or proxy, not the visitor whose page request caused the fetch.
**Why it matters**: Anonymous visitors can share one 120 request bucket. Normal traffic can therefore rate limit every public letter behind the same web instance, while the policy is not actually enforced per visitor as AC 14 requires.
**Suggested fix**: Define a trusted request path that carries a server derived visitor identity from Next.js to the API, or apply the visitor limit at a trusted edge. Do not forward a browser supplied IP header without a configured trust boundary.

### 🟠 Production can silently route the web application to localhost, `apps/web/next.config.js:22`

**Problem**: Both the rewrite and the server fetch default `API_ORIGIN` to `http://localhost:3001` in every environment. The value is not validated or documented in an environment example, and the Playwright configuration still sets `APP_ORIGIN` instead of `API_ORIGIN`. Spec 0005 also says this feature introduces no new environment variable.
**Why it matters**: A missing production value builds successfully but breaks public rendering and all same origin API rewrites after deployment. The current browser setup does not prove the corrected deployment contract.
**Suggested fix**: Reconcile the configuration decision with the spec, require and validate the API origin outside local development, document it, and update Playwright to set the same variable used by production.

### 🟠 Transaction and shared store behavior lacks integration coverage, `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.spec.ts:525`

**Problem**: The concurrency tests only mock `updateMany` returning zero. They do not run competing PostgreSQL transactions or prove rollback after a reservation failure. The Redis test mocks `eval`, the API end to end suite only checks `GET /`, and published Playwright journeys skip unless an external slug is supplied.
**Why it matters**: The highest risk fixes depend on real database locking, unique constraints, transaction rollback, Redis scripting, module configuration, and complete HTTP behavior. The passing unit count cannot detect failures in those boundaries.
**Suggested fix**: Add the critical integration cases from spec 0005 for lifecycle races, slug collisions, rollback, deletion, production store configuration, public privacy headers, and the complete publish, read, unpublish, and republish journey.

## Strengths

1. Publish, unpublish, and slug writes now use conditional page predicates, and reservation failures throw so Prisma can roll back the transaction.
2. Production rate limit configuration now selects Redis and fails startup when `REDIS_URL` is missing. Redis consumption is atomic, shutdown is wired, and the shared error writer emits `Retry-After`.
3. Public reads still return a narrow validated projection with no creator identity, page ID, settings, content version, or private account data.

## Test coverage

The supplied API signal is green: lint, type checks, build, 14 Jest suites with 77 tests, and the existing end to end command pass. Web lint and `check-types` pass. Web build and browser execution remain blocked by the stated environment limits. Coverage is not yet adequate for merge because the critical database, Redis, production origin, public identity, and complete Playwright paths above are not exercised.

Scope: ticked `Review it` for public Secret Letter publishing.
