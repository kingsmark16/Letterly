# Unlock token application boundary

Date: 2026-10-03

## Result and request flow

PublicPagesController now owns extraction of the page scoped cookie through the existing HTTP parser. PagePasswordService.verifyUnlockToken receives only a plain token, page ID, and password version. Token creation and hashing moved unchanged into the feature owned application/unlock-token.ts helper. No compatibility forwarding export remains in HTTP infrastructure.

For public page reads, analytics, and QR access, the controller passes an UnlockTokenReader function to PageService. The service selects the protected page ID from its existing protection lookup and calls that reader before verifying the proof. This retains page selection and query order without adding a database read. Submission, audio, and image guards already have the protection record and pass the parsed token directly. Every known production caller and both affected HTTP test suites were updated.

Cookie names, first matching cookie behavior, decoding, encoded value bounds, flags, and duration are unchanged. Proof keys still include page ID and SHA256 token hash. Password version comparisons, revocation comparisons, one day proof store TTL, encrypted password format, safe errors, rate limits, and private response headers are unchanged. An absent proof still denies access; the store continues to enforce expiry rather than adding a new timestamp rule.

## Verification

The focused three suites passed 67 cases. Twelve additional unit cases cover absent/malformed/oversized/duplicate cookies, page selection and decoding, missing tokens without store reads, cross page proof rejection, expired store entries, password version mismatch, post revocation acceptance, and safe store failure. The existing PageService test now checks that the reader receives exactly the trusted page ID once. A new Supertest case confirms the submission controller passes only the decoded token for the protected page, ignoring another page's cookie. Existing locked read and submission tests confirm missing cookies yield a null token and do not expose content.

The first broad run found an outdated raw header assertion and an unbound mock method assertion. Both were corrected; final gates below passed. Production implementation was reviewed against its diff and existing cookie/proof logic. The cookie parser and token algorithms were retained exactly.

| Check | Result |
| --- | --- |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 552 passed, API 498 across 61 suites, web 33, database 6, UI 15 |
| API integration | 40 passed, 7 skipped, four passing and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Boundary probes | Four expected results, blocked direct and type HTTP imports, allowed local token and repository imports |

ESLint now prohibits HTTP infrastructure imports in production pages application/domain files alongside existing database, storage, image, and policy restrictions. A production application import scan found no remaining direct infrastructure imports. NestJS decorators, Node runtime dependencies, and other framework coupling remain; this scan does not establish full application independence.

## Limits and next work

The implementing agent performed verification. No independent fresh model review ran. HTTP integration dependencies are mocked; expired proof testing simulates a missing store entry and does not validate a live Redis TTL. Seven database tests remain skipped. Live database, provider, and browser journeys were not run for this API boundary change. No seeds, migrations, deployments, or remote publication were performed.

The next bounded application isolation step is to construct PagePasswordService through a PagesModule factory and move its Nest injection decorators out of application code while preserving provider defaults and overrides. The broader structure migration remains In Progress. Stored compatibility types, draft update assumptions, remaining large controllers, and the known visible no JavaScript fallback issue remain unresolved.
