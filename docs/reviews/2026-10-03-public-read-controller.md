# Public reading controller verification

**Date**: 2026-10-03
**Branch**: `feat/repository-verification-baseline`
**Type**: Implementing agent verification, no independent review

## Change and request flow

The remaining public reading controller moved to `presentation/public-page-read.controller.ts` as PublicPageReadController. Its two public behavior cases now live beside it, with the public dependency metadata assertion in a separate case. The remaining owner CRUD/list/lifecycle suite moved beside OwnerPagesController. Root `pages.controller.ts` and `pages.controller.spec.ts` were removed without forwarding exports. Module registration and maintained pages context use the new ownership name/path.

Contract validation precedes the handler. Reading sets no store/no index headers and issues a browser cookie only when the existing token is unusable or absent. This retains cookie issuance before public limits and page reads. The identity resolver supplies signed identity or transport IP; the optional limiter runs before required PageService. The service receives a reader that decodes only the requested trusted page's unlock cookie. Locked projections return directly. Choose Your Heart uses its shared projection schema. Secret Letter with response capabilities uses its shared schema; legacy omission remains unchanged. Error mapping and global safe responses remain unchanged.

No services, module factories, repositories, web routes, contracts, or template adapters changed. Specific public controllers remain registered before the reading controller.

## Evidence

- Exact comparison against pre milestone HEAD confirms the read handler and decorators are unchanged. Module registration occurs once; obsolete root files and old source references are absent.
- The new HTTP suite passes 22 cases for both template projections, locked metadata without content, legacy response omission, unknown field filtering, scoped decoded unlock proof, browser cookie attributes in development/production, valid and invalid existing cookies, signed identity, optional limiter/secret, rate failures before reads, safe read errors, and overlong slug rejection before cookie/limit/read work.
- The owner test move preserves existing behavior assertions. Public dependency metadata is now a separate case, adding one unit test without duplicating its assertion in the owner suite.
- Repository unit tests pass: API 502 in 69 suites, web 33, database 6, UI 15, 556 total. Full integration tests pass: 568 passed, seven skipped, 24 passing suites and four skipped suites.
- Repository lint, formatting, type checking, tests, build, and whitespace checks pass. Documentation was formatted explicitly; unchanged web/database build tasks use valid cache entries.

Type checking caught an excess property in the extra field projection fixture. Naming that fixture object allows the test to represent extra runtime fields without weakening the service type or changing production code.

## Limits and follow-up

The new HTTP suite uses a mocked PageService and limiter. It proves routing, transport projection behavior, cookie handling, callback forwarding, ordering, and safe failures; it does not prove live password verification, published availability, database reads, or browser cookie acceptance. Existing application/repository and full module suites retain their checks. Seven database tests remain skipped. No independent review or live provider/browser verification ran.

The parent structure migration remains In Progress and product scope statuses are unchanged. Historical reports/specs retain their original names and paths as evidence; maintained source and pages context use current ownership. The user edit in `skills-lock.json` is excluded. Existing success cache consistency and submission union ambiguity remain separate work.

Next: review the remaining category/template registration steps and define a bounded scaffold generator under the parent extensibility contract. Keep registry activation explicit and preserve pinned template versions.
