# Public template bundle isolation measurement

Date: 2026-10-04

## Result

The public route originally requested the same 12 JavaScript chunks for Secret Letter and Choose Your Heart. Each route received 1,063,953 uncompressed JavaScript response bytes, and both renderer markers were present on both routes.

The public presentation now resolves the saved registry key and version on the server, prepares a small template specific payload, and renders a client boundary whose literal `next/dynamic` imports are keyed by that same registration identity. The default server rendering stays enabled. The shared locked page also lazy loads the Secret Letter renderer, since `/p/[slug]` serves every public template.

The local production mode browser capture now shows:

| Public route | JavaScript files | Response body bytes | Selected renderer | Other renderer |
| --- | ---: | ---: | --- | --- |
| Secret Letter | 15 | 1,087,584 | present | absent |
| Choose Your Heart | 11 | 873,716 | present | absent |

Choose Your Heart now requests 190,237 fewer uncompressed JavaScript bytes than the initial capture, a reduction of 17.9 percent. Secret Letter requests 23,631 more bytes than its initial capture because its code now loads through a separate renderer chunk. The important growth property is that neither public route downloads the other template's unique renderer code.

The browser test captured JavaScript response bodies and unique chunk paths after each route reached its initial interaction state. These are local production build response body sizes, not compressed transfer sizes. The fixture uses mocked API responses and does not represent a live production deployment.

## Verification

The browser assertion for renderer isolation passed. The public keyboard, mobile viewport, and reduced motion cases passed in both desktop and mobile Chromium projects. The protected Secret Letter browser flow also passed, including its opening interaction and unlock form after the renderer became lazy.

The web unit suite passed 104 tests. The root commit gate, all workspace unit tests, and the full production build passed. The existing test suite still verifies that public content remains readable in the server rendered output and that the selected presentation retains the page's pinned version.

The fixture runner then reported a 30 or 60 second plugin setup teardown timeout after the passing browser assertions, so its commands exited nonzero for teardown rather than a failed browser assertion.

Database pagination and query plan evidence remain open. The local database service is unavailable in this environment, so this report makes no claim about PostgreSQL query plans or production database capacity.

The later [physical catalog query baseline](2026-10-04-catalog-query-plan-baseline.md) uses a disposable local PostgreSQL instance and records actual SQL plans. It exposes relation overfetching and deep cursor filtering that must be corrected. The local database limitation above describes the original bundle measurement session, not the current availability of isolated database verification.
