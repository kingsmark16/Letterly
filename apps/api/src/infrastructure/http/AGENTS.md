# API HTTP infrastructure

## Overview

This area owns transport concerns shared by the NestJS API, including stable error envelopes, request context, validation, timing, browser tokens, visitor identity, unlock cookies, and rate limits. Feature use cases remain responsible for authorization and business rules.

## Key files

| File | Owns |
| --- | --- |
| `api-exception.filter.ts` and `api-error-writer.ts` | Safe error responses with request IDs and retry information |
| `request-context.ts` and `request-timing.interceptor.ts` | Request identifiers and bounded timing metadata |
| `visitor-identity.ts` | Verification of signed internal visitor identity headers |
| `browser-token.ts` and `unlock-cookie.ts` | Anonymous browser and page scoped unlock cookie contracts |
| `rate-limit.service.ts` | Configuration driven Redis or Valkey rate limit windows |

## Conventions

- Keep error codes and messages safe and stable. Never include secrets, cookies, raw IP addresses, credentials, or confession content in responses or logs.
- Accept signed visitor identity headers only after validating their HMAC and expiry. Unsigned or invalid identity input falls back to the API boundary policy.
- Use the configured policy duration when deriving rate limit windows. Protected operations fail closed when the shared Redis or Valkey store is unavailable.
- Keep browser token creation at a browser facing boundary and store only hashes in visitor records.

## Related specs

- [API error envelopes and request context](../../../../../docs/specs/0004-api-errors-request-context.md)
- [Flexible template data model](../../../../../docs/specs/0002-data-model/index.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
