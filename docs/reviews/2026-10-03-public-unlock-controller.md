# Public unlock controller verification

**Date**: 2026-10-03
**Branch**: `feat/repository-verification-baseline`
**Type**: Implementing agent verification, no independent review

## Change and request flow

Public password unlock now lives in `presentation/public-page-unlock.controller.ts`, with its three existing unit cases beside it. PagesModule registers it once before PublicPagesController. The remaining public controller handles only reading and no longer injects the password service. The existing owner/password factory HTTP suite composes the extracted unlock controller without a PageService fixture.

Contract validation precedes optional service availability and protection lookup. The trusted protection supplies page identity for the visitor unlock limit, whose identity comes from the existing signed identity resolver or transport IP fallback. Password verification follows the limit. The application service retains its independent published record lookup, decryption, comparison, and proof store write. Only a successful result sets the service supplied page scoped cookie. The response remains the validated unlocked shape. Browser cookies and authenticated sessions remain unnecessary for unlock.

Cookie attributes retain HttpOnly, SameSite Lax, root path, one day lifetime, and Secure in production. The existing handler has no explicit success cache decorator; extraction preserves that behavior. Errors keep the shared mapper and global safe envelope/header handling. No password policy, encryption, application service, factory, repository, or proof store implementation changed.

## Evidence

- Exact comparison against pre milestone HEAD confirms unchanged extracted handler/decorators and public read handler, one module registration, and removal of old unlock methods/dependencies.
- Unit tests pass: API 501 in 68 suites, web 33, database 6, UI 15, 555 total. Three cases moved without changing the count.
- Password factory and owner/public HTTP suite passes 40 cases, including 14 new unlock cases. Existing service factory requirements/overrides, encryption, authenticated owner operations, invalid password, unavailable page, missing service, and rate failure coverage remains.
- Full integration tests pass: 546 passed, seven skipped, 23 passing suites and four skipped suites.
- Repository lint, formatting, type checking, build, and whitespace checks pass. API rebuilt; unchanged web/database build tasks used valid cache entries. Documentation is formatted explicitly.

New cases verify signed identity and protection/limit/verification order, invalid signature fallback, absent identity secret and limiter, no browser cookie requirement, complete development/production cookie attributes, unknown input field filtering through trusted page identity, invalid password inputs, the 256 character password and 200 character slug limits, disappearance between lookups, unexpected repository error redaction, and safe proof store failure without a cookie. Environment fixtures restore NODE_ENV after each request.

## Limits and follow-up

The HTTP suite uses the production password service factory and real encryption/password verification with mocked repository, proof store, and limiter. It does not exercise live published availability predicates, Redis proof persistence/limits, browser cookie acceptance, or an independent review. Seven database tests remain skipped.

The parent structure migration remains In Progress; product scope statuses are unchanged. The existing user edit in `skills-lock.json` is excluded. Success cache consistency and the earlier submission contract ambiguity remain separate work.

Next: move and rename the remaining public reading controller into `presentation/`, colocate its public unit cases, remove obsolete root controller files, and preserve both template projections, locked responses, browser cookie issuance, unlock reader scoping, limits, safe errors, and cache/index headers.
