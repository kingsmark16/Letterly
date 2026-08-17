# Media storage infrastructure

## Overview

This area implements the private Cloudflare R2 adapter behind the media storage interface. Application and domain code depend on the interface, never on the AWS SDK or provider specific object details.

## Key files

| File                 | Owns                                                           |
| -------------------- | -------------------------------------------------------------- |
| `media-storage.ts`   | Provider independent upload, read, write, and delete contracts |
| `r2-storage.ts`      | Signed uploads and private R2 object operations                |
| `r2-storage.spec.ts` | Upload signing, retry, and provider failure coverage           |

## Conventions

- Generate object keys on the server. Never include original file names or expose storage keys in API responses.
- Keep R2 private and use application routes for owner and public media delivery.
- Validate provider configuration at startup. Production requires all R2 values and `PUBLIC_MEDIA_PROXY_SECRET`.
- Keep external deletion retryable through `MediaCleanup`; database deletion and attachment decisions remain in the page media repository transaction.
- Declined: Agent Skill and MCP discovery for Cloudflare R2, Sharp, file-type, and Redis.

## Related specs

- [Secret Letter media](../../../../../docs/specs/0006-secret-letter-media.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
