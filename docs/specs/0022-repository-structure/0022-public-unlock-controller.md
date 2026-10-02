# 0022. Public unlock controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Extract public password unlock into `presentation/public-page-unlock.controller.ts` with its three existing unit cases colocated. Preserve the exact handler/decorators, route, contract pipes, OK status, response validation, and shared password error mapper.
- AC-2: Preserve optional password service, limiter, and identity secret; trusted protection lookup before visitor unlock limits; signed identity or transport IP fallback; service supplied page identity/token; HttpOnly, SameSite Lax, root path, one day cookie lifetime, and production Secure flag. Preserve current headers, including the lack of an explicit success cache decorator.
- AC-3: Register PublicPageUnlockController once before PublicPagesController. Remove old unlock dependencies and handler. Compose the existing owner/password factory HTTP suite with the extracted controller, without a PageService fixture. Preserve public reading, application services, factories, repositories, encryption, and proof storage.
- AC-4: Verify identity, call ordering, optional providers, cookie attributes in development and production, bounded inputs, page disappearance, and safe provider failures. Pass repository gates and leave the parent structure migration In Progress.

## Decision and rationale

This records the extraction authorized by the user's next instruction under the existing ownership decision. Public unlock is a focused presentation responsibility. The password service remains responsible for public protection, decryption, password comparison, and proof generation/storage. The validated slug/password supply inputs; protection supplies the limit page identity; the identity resolver supplies visitor identity; unlock supplies the cookie page identity/token; the existing cookie helper supplies attributes; the response schema supplies the acceptance shape.

No new cookie requirement, provider, guard, cache policy, password policy, or database migration is introduced. Existing success header consistency remains separate work. PublicPagesController now owns only public reading and retains its original name/path until the next presentation ownership milestone.

## Verification

See [the public unlock controller report](../../reviews/2026-10-03-public-unlock-controller.md). Exact source comparison confirms unchanged unlock and read handlers. Three unit cases moved; the password factory and HTTP suite passes 40 cases, including 14 additional unlock cases.
