# Public reports controller verification

**Date**: 2026-10-03
**Branch**: `feat/repository-verification-baseline`
**Type**: Implementing agent verification, no independent review

## Change and request flow

The anonymous report route now lives in `presentation/public-page-reports.controller.ts`, with its existing unit case beside it. PagesModule registers PublicPageReportsController once before PublicPagesController. The latter now retains only public reading and unlock, with no report service dependency. The existing report factory HTTP suite composes the new controller without a PageService fixture.

The shared contract pipe validates slug length, reason, and optional trimmed message before the handler. The optional report service must exist before public scope lookup. PageReportsService normalizes the slug and resolves current published availability. The controller then prefers a decoded browser token hashed with trusted page scope and the injected secret. Without both token and secret, the existing resolver verifies signed visitor identity or uses transport IP. Reports retain their ability to work without browser cookies or password proof.

The report limit runs after availability and before creation. The service normalizes the create input, while the repository retains its independent availability recheck. Only validated acceptance and UUID receipt data reach the response. The existing submission error mapper, created status, no store, and no index headers remain unchanged. No application service, factory, repository, shared contract, or database schema changed.

## Evidence

- Exact source comparison against pre milestone HEAD confirms unchanged report handler/decorators and remaining read/unlock handlers, removal of the old report method, and one new controller registration.
- Repository unit tests pass: API 501 in 68 suites, web 33, database 6, UI 15, 555 total. One unit case moved without changing the count.
- Focused production factory HTTP suite passes all 33 cases, including 25 additional cases. Existing singleton/repository override checks, unavailable scope, disappearance during creation, and safe repository failure checks remain.
- Full integration tests pass: 532 passed, seven skipped, 23 passing suites and four skipped suites.
- Repository lint, formatting, type checking, build, and whitespace checks pass. The API rebuilt; unchanged web/database build tasks used valid cache entries. Documentation was formatted explicitly.

Additional cases cover exact page scoped hash and precedence over signed identity; cookie decoding and unusable cookies; verified signed identity; invalid signature fallback; absent secret, limiter, and service; rate exceeded/unavailable failures and retry headers; all five reasons; trimmed messages at the 1000 character bound; missing/unknown reason and invalid messages; overlong slug; invalid receipt rejection; and unexpected limiter failure redaction. Existing unknown request fields are excluded from repository input.

An initial test incorrectly assumed the public slug schema rejects punctuation. The current schema bounds string length only, so the test now verifies the actual 200 character boundary. Production validation was preserved.

## Limits and follow-up

HTTP checks use the production report service factory with a mocked repository and limiter. They prove transport composition, identity derivation, ordering, validation, and safe failure mapping, not live publication predicates, report persistence, Redis limiting, browser flows, or an independent review. Seven database tests remain skipped.

The parent structure migration remains In Progress; product scope statuses are unchanged. The user edit in `skills-lock.json` is excluded. The earlier submission union ambiguity remains separate contract work.

Next: extract public password unlock into a focused controller, preserving protection lookup, visitor identity, unlock limits, page scoped cookies, password error mapping, response validation, and current headers. Then consolidate public reading under its presentation owner.
