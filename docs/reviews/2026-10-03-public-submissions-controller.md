# Public submissions controller verification

**Date**: 2026-10-03
**Branch**: `feat/repository-verification-baseline`
**Type**: Implementing agent verification, no independent review

## Change and request flow

The shared public visitor submission route now lives in `presentation/public-page-submissions.controller.ts`. Its four unit cases moved beside it. PagesModule registers PublicPageSubmissionsController once before PublicPagesController, which no longer injects either submission service. Password and report unit constructors now match the smaller remaining controller, with assertions unchanged.

Contract validation runs before the handler. Submission service availability and identity secret precede browser cookie validation. The normalized slug selects the existing letter or journey scope lookup. Letters retain the body idempotency key; journeys require the header key, including when the body has a different key. The password service reads current protection and verifies only that page's decoded unlock cookie before visitor submission limiting. The observed password version is forwarded to the selected service to retain the existing persistence protection. With the optional password service absent, the version remains undefined; with no protection it is null.

The trusted page scope, browser cookie, and secret supply the existing page specific hash. Letters wrap their visitor message in its existing object shape; journeys keep the plain message and graph version/outcome inputs. The shared response schema restricts output to acceptance. The existing mapper, status, and no store decorator remain unchanged. Controllers do not create database clients, call storage providers, or implement submission transactions.

## Evidence

- Exact comparison against pre milestone HEAD confirms that the extracted handler/decorators and remaining read, unlock, and report handlers are unchanged. The old submission handler is absent and the new controller is registered once.
- Repository unit tests pass: API 501 in 68 suites, web 33, database 6, UI 15, 555 total. Four unit cases moved without increasing the count.
- Full integration tests pass: 507 passed, seven skipped, 23 passing suites and four skipped suites. Includes 34 new focused HTTP cases and the existing full PagesModule submission suite.
- Repository build passes. The API rebuilt; unchanged web/database tasks used valid cache entries.
- Repository lint, type checking, formatting, and whitespace checks pass. Milestone documentation is formatted explicitly.

New HTTP cases cover both template inputs, header/body key precedence, exact hashes and call ordering, response headers, missing cookies and providers, optional password/limiter composition, unavailable scope, locked protection, decoded page scoped proof, observed versions, all journey errors, rate failure and retry timing, password configuration, bounded request validation, unknown input/output fields, invalid response rejection, and unexpected persistence failure redaction.

Initial test assumptions were corrected to match the existing response envelope and request union behavior. Type checking caught the scope fixture's incorrect null return (the service rejects unavailable scope) and an overly broad Supertest body type. Lint caught unsafe direct access to Supertest response bodies; error assertions now parse the shared envelope. These corrections did not change production behavior.

## Limits and follow-up

The focused HTTP suite uses mocked application services, password verification, and limiter. It proves transport composition and forwarding, not live database transactions, Redis limits, password encryption, or durable idempotent replay. Existing factory, service, and repository suites retain those fixture checks. Seven database tests remain skipped. No live provider, browser journey, or independent review ran.

The current request union permits a payload with journey fields, empty answers, and a body key to validate as a letter submission after extra fields are stripped. A new HTTP case records this existing behavior. A future contract milestone should evaluate explicit discrimination and compatible rejection of ambiguous inputs; changing that behavior is outside this extraction.

The parent structure migration remains In Progress and product scope statuses are unchanged. Public reading, unlock, and reporting still share PublicPagesController. The existing user change in `skills-lock.json` is excluded.

Next: extract public reporting into its own presentation controller, preserving page availability, browser hash or visitor identity fallback, report rate limits, validation, safe errors, response projection, and cache/index headers.
