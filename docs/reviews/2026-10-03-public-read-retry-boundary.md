# Public read retry dependency boundary

Date: 2026-10-03

## Result

PageService no longer imports the infrastructure database error classifier. Its retry decision uses the plain application TransientPublicReadError contract. Public page and password repositories keep provider error classification and best effort pool recovery in infrastructure, then translate recognized transient failures into that contract with the original cause preserved.

The application retains three attempts and 100/200 millisecond delays. Unrecognized failures propagate unchanged from repositories and are not retried. Failure exhaustion still becomes PublicPageReadUnavailableError. Password protection, not found behavior, public body validation, HTTP contracts, queries, and write behavior are unchanged.

The safe logger unwraps only the translated error's cause to retain original errorName/errorCode metadata. It does not log causes, error messages, cookies, passwords, or content. Error objects and causes remain internal and are not part of the response.

## Dependency review and enforcement

The application import scan also found storage ports in media-cleanup.service.ts, page-audio.service.ts, and page-media.service.ts; the concrete image processor in page-media.service.ts; and unlock-cookie helpers in page-password.service.ts. These remain explicit follow-up work. Removing the database import does not make the entire application layer independent of infrastructure yet.

The existing pages application/domain ESLint restriction now also blocks database infrastructure paths. Six probes verified the classifier, provider, domain database infrastructure, and database package imports are blocked while the local application error and infrastructure recovery imports are allowed. Existing stricter template policy rules remain intact.

## Verification

| Check | Result |
| --- | --- |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 540 passed, API 486, web 33, database 6, UI 15 |
| API integration | 39 passed, 7 skipped, four passing suites and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Boundary probes | Six expected results passed |

Nine new cases cover page/password retry exhaustion and exact delays, safe log metadata, absence of application provider-code interpretation, non transient repository errors, failed reconnect cause preservation, password recovery for code/message/nested-cause classifications, and non transient password failures. Existing transient recovery and successful retry tests now exercise the translated error contract. The shared database classifier and auth/admin recovery behavior were not changed.

## Limits and next work

Verification was performed by the implementing agent, not an independent fresh model reviewer. Repository tests mock connection failures and recovery; they do not establish real database reconnection behavior. HTTP integration suites use mocked application dependencies, and seven database tests remain skipped. Browser tests, provider operations, seeds, migrations, and deployments were not run. Prior browser results remain historical evidence.

The broader migration remains In Progress. Next, move media storage interfaces and tokens out of infrastructure so page application services can depend on an application port. Image processing, unlock cookie transport helpers, draft update assumptions, stored compatibility types, and the known visible no JavaScript fallback issue remain further work.
