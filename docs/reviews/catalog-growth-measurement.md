# Catalog growth fixture measurements

**Date**: 2026-10-04

The isolated browser fixture contains 100 synthetic template families across two categories. Ten families have two active versions. The fixture does not add or activate production catalog records.

Chromium traversed the first, middle, and final pages in desktop (1440 by 900) and mobile (390 by 844) viewports. Every page returned 20 items. The first page had no previous link and did have a next link. The middle page had both links. The final page had a previous link and no next link. The item IDs did not repeat between the measured pages.

| Page | Items | Serialized JSON bytes | First display order | Last display order | Previous | Next |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| First | 20 | 6,401 | 1 | 20 | No | Yes |
| Middle | 20 | 6,727 | 41 | 60 | Yes | Yes |
| Final | 20 | 6,502 | 81 | 100 | Yes | No |

The browser UI rendered those pages successfully in both viewports. The measurements count the local fixture server's uncompressed JSON response bytes, not compressed network transfer or a production database response. The `web-template-registration.spec.ts` browser test retains the same first, middle, and final navigation assertions and attaches measurements when the Playwright fixture runner completes normally.

The optimized Next.js build, API and web type checks, catalog unit and integration tests, web unit tests, lint checks, and Prisma schema validation passed. The filtered Playwright test runner reached the final browser checks but did not finish its worker shutdown in this Windows environment. A standalone Chromium run completed and measured the same journey. No isolated PostgreSQL instance was available, so this report makes no physical query plan claim. Prisma query argument tests and schema validation cover the query shape and indexes; they do not replace `EXPLAIN ANALYZE` against an isolated database.
