# Pages module

## Overview

This module owns authenticated page operations, page lifecycle commands, owner projections, and anonymous public Secret Letter reads. Authorization remains at the API boundary, while use cases and repository interfaces stay independent of NestJS and Prisma.

## Key files

| File                                             | Owns                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `application/page.service.ts`                    | Page use cases, trusted template checks, lifecycle rules, and safe errors      |
| `application/pages.repository.ts`                | Persistence interfaces for owner pages, lifecycle mutations, and public reads  |
| `application/page-media.service.ts`              | Owner upload, completion, retry, removal, and media recovery use cases         |
| `application/media-cleanup.service.ts`           | Scheduled expired media and retryable object cleanup                           |
| `application/page-questions.service.ts`          | Owner question graph mutations and response impact confirmation                |
| `application/page-submissions.service.ts`        | Public submission validation and owner response lifecycle                       |
| `application/page-password.service.ts`           | Page scoped password protection and unlock state                                |
| `infrastructure/prisma-pages.repository.ts`      | Prisma queries, transactions, ownership predicates, and slug reservations      |
| `infrastructure/prisma-page-media.repository.ts` | Media persistence, expiry, claims, cleanup leases, and owner/public predicates |
| `infrastructure/prisma-page-submissions.repository.ts` | Locked public submission writes and owner response queries                 |
| `infrastructure/image-processor.ts`              | Image type, dimension, animation, metadata, and sanitized WebP checks          |
| `pages.controller.ts`                            | HTTP validation, session context, rate limit policies, and response mapping    |
| `pages.media.controller.ts`                      | Owner and public media upload and streaming endpoints                          |
| `presentation/page-response.mapper.ts`           | Safe owner response projections                                                |

## Conventions

- Keep page ownership predicates in repository queries and never trust browser supplied creator identifiers.
- Keep lifecycle and slug reservation writes transactional, conditional, and mapped to stable safe error results.
- Keep published slugs immutable after first publication, including when an archived page is restored, so canonical links remain stable.
- Keep public reads limited to the validated public projection and apply no store and no index response headers.
- Keep authenticated owner reads private with `Cache-Control: private, no-store` so draft data, questions, and images cannot enter shared caches.
- Keep template readiness and public rendering driven by the trusted shared template registry.
- Keep media ownership, expiry, completion claims, attachment, and cleanup decisions in repository transactions. Public image reads require a current published page and an attached ready image.
- Serialize question graph mutations and visitor submissions with a lock on the page row. Destructive edits calculate affected questions from the final and previous graphs, remove affected answers, and delete submissions left without answers or messages in the same transaction.
- Resolve the trusted template definition before question or submission writes. Enforce its question capability, visitor message capability, and required answer rule instead of trusting page supplied settings.
- Preserve the complete private settings shape when changing response availability, including encrypted password protection records.

## Related specs

- [Authenticated Secret Letter draft loop](../../../../../docs/specs/0003-authenticated-secret-letter-draft-loop.md)
- [Public Secret Letter publishing](../../../../../docs/specs/0005-public-secret-letter-publishing.md)
- [Protected links and QR sharing](../../../../../docs/specs/0007-protected-links-and-qr-sharing.md)
- [Visitor responses and creator dashboard](../../../../../docs/specs/0008-visitor-responses-and-creator-dashboard.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
