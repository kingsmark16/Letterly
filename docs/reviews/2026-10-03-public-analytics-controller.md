# Public analytics controller verification

**Date**: 2026-10-03
**Branch**: `feat/repository-verification-baseline`
**Type**: Implementing agent verification, no independent review

## Change and request flow

Public visit, duration, and journey metric routes now live in `presentation/public-page-analytics.controller.ts`. Two existing journey metric unit cases moved beside it. PagesModule registers the new controller once before PublicPagesController; the latter no longer injects analytics/metrics. The existing analytics composition suite now uses the extracted public controller alongside the owner analytics controller, retaining its fixed UTC date and production service factory checks.

Visits and durations require the optional analytics service, identity secret, and browser cookie before limiting or page reads. Visitor identity feeds the existing public limit. PageService receives a request supplied reader that resolves only the trusted page's unlock cookie. Locked projections and unavailable pages reject recording. The analytics service resolves public scope, hashes the browser token with page identity, records a UTC date, and forwards validated duration. Journey metrics keeps its independent recorder, optional identity secret, public availability check, and published Choose Your Heart event policy. It does not gain a browser cookie requirement.

Visits/durations retain their no store decorators. Journey metrics retains its existing lack of an explicit cache decorator. Error handling branches move exactly, preserving their current differences. No services, factories, repositories, template adapters, metrics recorder, or database schema change.

## Evidence

- Exact source comparison against pre milestone HEAD confirms unchanged three extracted handlers/decorators, unchanged remaining public handler bodies, removal of old analytics handlers, and one new module registration.
- Repository unit tests pass: API 501 tests in 68 suites, web 33, database 6, UI 15, 555 total. Two cases moved; no unit test count increase.
- Full integration run passes: 473 tests, seven skipped, 22 passing suites and four skipped suites. Includes 48 new HTTP cases through the production analytics service factory.
- Repository build passes. API rebuilt; unchanged web/database tasks used valid cache entries.
- Repository lint, type checking, formatting, and `git diff --check` pass. The final focused HTTP run passes all 48 cases after fixture corrections. Documentation was formatted explicitly.

New HTTP cases prove visit/duration success, anonymous behavior, page scoped hashes, UTC midnight, empty 204 duration responses, both allowed metric events, stripped extra fields, trusted page token reader scoping, signed visitor identity, cookie/service/secret requirements, metrics independent optional behavior, locked/unavailable/transient page rejection, rate limit ordering and retry details, optional limiter behavior, duration bounds/UUIDs, unsupported events/outcome categories/template identity, missing analytics scope, and private persistence failure redaction. Existing composition tests retain exact normalized slug and fixed UTC day checks.

Type checking caught incomplete new projection fixtures. The Choose Your Heart fixture now uses its shared projection schema, and the Secret Letter mismatch fixture includes required image data. Lint also caught an unused import and redundant assertion in relocated unit cases. These test corrections did not change production behavior.

## Limits and follow-up

Page availability, password proof, repository, limiter, and metric sink are fixtures. Reader forwarding and locked projection rejection do not prove live password verification or database predicates. No live Redis, published database transaction, browser analytics journey, or independent review was exercised. Seven database tests remain skipped. Existing PageService, password, repository, and monitoring suites retain their checks.

The parent structure migration remains In Progress and product scope statuses are unchanged. Public page reads/unlock, submissions, and reports still share PublicPagesController. Existing cache consistency, assumed draft decisions, compatibility types, future template scaffolding, and visible no JavaScript fallback remain parent work.

Next: extract public visitor response submission into a focused controller, preserving browser cookies, both template paths, idempotency headers/payloads, password state checks, visitor limits, safe errors, response validation, and no store headers.
