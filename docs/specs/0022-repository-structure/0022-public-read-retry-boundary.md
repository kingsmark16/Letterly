# 0022. Public read retry dependency boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

* AC-1: PageService imports no database infrastructure classifier. Its public read retry loop recognizes only a plain TransientPublicReadError owned by application. Preserve three attempts with 100 and 200 millisecond delays, not found behavior, password guards, and final safe unavailable errors.
* AC-2: Page and password repositories retain the existing infrastructure classifier and best effort Prisma recovery. Recognized failures become TransientPublicReadError with the original cause. Other failures propagate unchanged and are not retried by the application. Do not change the database classifier's code/message lists or other features' recovery behavior.
* AC-3: Preserve bounded log metadata from the original cause, never log raw errors, messages, cookies, or content. Keep wrapping at the public repository boundary only.
* AC-4: Enforce the removed dependency with ESLint without changing existing policy and database restrictions. Verify transient retries, exhaustion, non transient failures, password reads, recovery failure handling, cause preservation, and delay bounds. Pass repository gates, integration checks, and production builds.

## Decision and sources

The existing PageService retry loop supplies the attempt count and delays. The existing infrastructure classifier supplies the transient database decision. Both existing public repository catch blocks already own pool recovery, making them the correct translation boundary. Repository ports communicate the decision through a plain application error, rather than injecting a database classifier into the service or exposing provider codes as application behavior.

The original cause remains internal for bounded error name/code diagnostics. Application logging unwraps this error only to extract the same metadata fields it previously logged. No HTTP contract, query, provider, new retry scope, write retry, or client construction changes. Storage, image processor, and unlock cookie dependencies found in the application audit remain separate work.
