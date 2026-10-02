# Pages module

## Overview

This module owns authenticated page operations, page lifecycle commands, owner projections, anonymous public reads, and the independent Choose Your Heart journey flow. Authorization remains at the API boundary, while use cases and repository interfaces stay independent of NestJS and Prisma.

## Key files

| File                                             | Owns                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `application/page.service.ts`                    | Page use cases, trusted template checks, lifecycle rules, and safe errors      |
| `application/pages.repository.ts`                | Persistence interfaces for owner pages, lifecycle mutations, and public reads  |
| `application/page-media.service.ts`              | Owner upload, completion, retry, removal, and media recovery use cases         |
| `application/page-audio.repository.ts`            | Page-scoped audio lifecycle and range-delivery repository contracts             |
| `application/page-audio.service.ts`              | Audio upload verification, attachment, removal, and private streaming use cases |
| `application/media-cleanup.service.ts`           | Scheduled expired media and retryable object cleanup                           |
| `application/page-questions.service.ts`          | Owner question list mutations and response impact confirmation                |
| `application/page-submissions.service.ts`        | Public submission validation and owner response lifecycle                       |
| `application/page-journeys.service.ts`           | Choose Your Heart graph validation, owner saves, and immutable revision state   |
| `application/page-journey-submissions.service.ts`| Published journey path validation and private response orchestration            |
| `application/page-password.service.ts`           | Page scoped password protection and unlock state                                |
| `infrastructure/prisma-pages.repository.ts`      | Prisma queries, transactions, ownership predicates, and slug reservations      |
| `infrastructure/prisma-page-media.repository.ts` | Media persistence, expiry, claims, cleanup leases, and owner/public predicates |
| `infrastructure/prisma-page-audio.repository.ts` | Audio ownership, page-lock transactions, attachment, and cleanup persistence    |
| `infrastructure/prisma-page-submissions.repository.ts` | Locked public submission writes and owner response queries                 |
| `infrastructure/prisma-page-journeys.repository.ts` | Immutable journey revisions, ownership predicates, and page version locks      |
| `infrastructure/prisma-page-journey-submissions.repository.ts` | Published path checks and private journey snapshots                  |
| `infrastructure/image-processor.ts`              | Image type, dimension, animation, metadata, and sanitized WebP checks          |
| `pages.controller.ts`                            | Remaining owner feature endpoints and anonymous public HTTP operations         |
| `presentation/owner-pages.controller.ts`           | Authenticated owner CRUD, listing, and page lifecycle HTTP operations             |
| `application/list-owner-pages.ts`                  | Plain owner listing use case and trusted template identity validation             |
| `pages.media.controller.ts`                      | Owner and public media upload and streaming endpoints                          |
| `presentation/page-response.mapper.ts`           | Safe owner response projections                                                |

## Conventions

- `infrastructure/public-availability.ts` owns the Prisma predicate shared by anonymous public repository operations. Preserve publication, page and creator moderation, expiry, and current slug reservation checks together. Password proof remains a separate guard. API ESLint blocks direct database package and Prisma client imports, including type imports, in production pages application and domain files.

- `infrastructure/templates/draft-persistence-adapters.ts` registers exact template versions for content/settings preparation and transactional draft initialization. PageService supplies trusted identity through CreateDraftInput. The repository owns page creation, slug reservation, five unique collision attempts, and stored identity verification inside the transaction. Journey adapters defer constraints before page creation and create revision rows after it using the supplied transaction only. Missing or incompatible journey payloads fail before writes.

- `infrastructure/templates/owner-projection-adapters.ts` registers exact template versions for safe owner content/settings and dashboard previews. Validate stored registry, renderer, and version together before dispatch. The repository retains password indicators, media filtering, ownership queries, dates, and pagination. Journey previews use draft revision root questions and explicitly project choice key/label. Production adapter imports are limited to shared templates, plain page types, repository port types, and local mapping files.

- `application/projections/public-projection-adapters.ts` registers template-owned API body mapping and transport schema validation after password guards. PageService owns canonical identity and URL construction, retries, locked metadata, and safe validation errors. Legacy Secret Letter response omission follows validation, never bypasses it. API ESLint permits only contracts, shared templates, plain page types, and local mapping imports in production adapters.

- `infrastructure/templates/public-projection-adapters.ts` registers template-owned public record mappings by exact identity/version. The shared mapper validates stored registry/renderer identity and prepares safe media once; adapters own content/settings validation, response rules, and published body allowlists without database calls. Map every journey outcome field explicitly.

- `infrastructure/templates/publication-adapters.ts` registers exact template versions for transaction preparation and revision promotion. Acquire the owner Page lock before preparing template work, and commit its prepared operation only after the conditional Page update succeeds. The operation retains the supplied transaction and must propagate failures for rollback.

- `application/templates/` owns plain draft initialization and publication policies with exact registry key and version resolution. PageService retains active version lookup, validation metrics, safe errors, and repository writes. The journey compatibility content envelope remains explicit until a separate persistence migration.

- `application/templates/publish-policies.ts` registers content readiness and owned journey requirements. PageService keeps generic audio checks, slug validation, expected version writes, journey lookup, and bounded metrics. Publication transactions retain their independent locked checks. API ESLint limits production policy imports to shared template definitions and local policy files; tests may exercise the service boundary.

- Construct `ListOwnerPages` with the existing repository token through the module factory. Keep this use case free of NestJS, Prisma, and infrastructure imports.
- Register remaining feature controllers before the owner controller so specific owner paths keep precedence over `GET :pageId`. Preserve session guards, contract pipes, private cache headers, and lifecycle rate limits when splitting additional controllers.

- Keep page ownership predicates in repository queries and never trust browser supplied creator identifiers.
- Keep lifecycle and slug reservation writes transactional, conditional, and mapped to stable safe error results.
- Keep published slugs immutable after first publication, including when an archived page is restored, so canonical links remain stable.
- Public repository mappings carry trusted registry identity, renderer key, and pinned version. PageService validates supplied identity before returning locked or unlocked data and emits the canonical registry key. Legacy omission is accepted only for a unique renderer/version match.
- Keep public reads limited to the validated public projection and apply no store and no index response headers.
- Keep authenticated owner reads private with `Cache-Control: private, no-store` so draft data, questions, and images cannot enter shared caches.
- Keep template readiness and public rendering driven by the trusted shared template registry. Use its `resolveTemplate` helper with the existing identity constraints; public mappings that check registry and renderer keys must retain both.
- Keep media ownership, expiry, completion claims, attachment, and cleanup decisions in repository transactions. Public image reads require a current published page and an attached ready image.
- Keep page audio preparation, replacement, and removal in page-row-locked transactions; enqueue detached source keys for `MediaCleanup` in the same transaction.
- Keep page audio and media cleanup interactive transactions bounded with a 30 second `maxWait` and `timeout` to tolerate Neon cold starts without unbounded requests.
- Preserve byte-range parameters from the owner and public controllers through the audio service and storage adapter, including safe `416` mapping for unsatisfiable ranges.
- Serialize question mutations and visitor submissions with a lock on the page row. Destructive edits calculate affected questions from the final and previous content, remove affected answers, and delete submissions left without answers or messages in the same transaction.
- Give journey submission transactions a bounded timeout that covers expected page lock contention, and keep idempotency handling around any transaction timeout so a retry can recover the original result.
- Resolve the trusted template definition before question or submission writes. Enforce its question capability, visitor message capability, and required answer rule instead of trusting page supplied settings.
- Preserve the complete private settings shape when changing response availability, including encrypted password protection records.
- Keep Choose Your Heart revisions immutable after creation, validate graph reachability before publish, and acquire Page before PageJourney for saves, publishes, and submissions.
- Keep journey submission snapshots private and independent of live graph rows so later edits cannot rewrite historical responses.

## Related specs

- [Authenticated Secret Letter draft loop](../../../../../docs/specs/0003-authenticated-secret-letter-draft-loop.md)
- [Public Secret Letter publishing](../../../../../docs/specs/0005-public-secret-letter-publishing.md)
- [Protected links and QR sharing](../../../../../docs/specs/0007-protected-links-and-qr-sharing.md)
- [Visitor responses and creator dashboard](../../../../../docs/specs/0008-visitor-responses-and-creator-dashboard.md)
- [Choose Your Heart template](../../../../../docs/specs/0010-choose-your-heart-template/index.md)
- [Shared page audio](../../../../../docs/specs/0017-shared-page-audio.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
