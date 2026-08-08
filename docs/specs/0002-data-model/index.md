# 0002. Flexible template data model

**Date**: 2026-08-08
**Status**: In Progress

## Summary

Letterly will use a relational platform model with validated JSON for content that belongs to each template. Shared records handle ownership, categories, templates, page lifecycle, media, questions, and visitor responses. This lets Secret Letter work now while Birthday, Anniversary, and later templates can use different fields without redesigning the platform database.

## Requirements

**User stories**:

1. As a creator, I want to create and save a page from a template so that I can return to it later.
2. As a creator, I want each template to support its own fields and optional features so that simple and rich pages can coexist.
3. As a creator, I want to publish, unpublish, archive, restore, and delete my pages so that I control their public lifetime.
4. As a visitor, I want to open a published page, optionally unlock it, and submit a private response without creating an account.
5. As a creator, I want to view and manage responses without exposing them to other creators or visitors.

**Acceptance criteria**:

1. **AC-1**: The database supports `Category`, `Template`, `TemplateVersion`, and `Page` records. A page references one immutable template version, and its category is derived through that relationship.
2. **AC-2**: A template version declares its supported capabilities. Images, audio, questions, visitor messages, and other features are optional. The API rejects content that the selected template does not support.
3. **AC-3**: An authenticated creator can create a draft with a server generated UUID, generated slug, template defaults, `DRAFT` status, content version zero, and a private owner reference.
4. **AC-4**: A creator can list, open, explicitly save, reopen, and permanently delete only their own pages. A stale save returns `409 Conflict` and does not overwrite newer content.
5. **AC-5**: Page lifecycle transitions support `DRAFT`, `PUBLISHED`, `UNPUBLISHED`, and `ARCHIVED`. Publishing validates the selected template's publish requirements. For Secret Letter, recipient name and main message are required, while other capabilities remain optional. Archiving is reversible to `DRAFT`.
6. **AC-6**: Slugs are unique without regard to case. Default slugs use eight lowercase letters and numbers. Custom slugs use the defined validation rules. When a published slug changes, the old slug becomes unavailable immediately and does not redirect.
7. **AC-7**: Page content is validated by the selected trusted template schema. Ordered sections have stable IDs and can be reordered. Private settings are never returned in the public projection.
8. **AC-8**: Uploaded media is creator owned, processed asynchronously, and represented by `MediaAsset` and `MediaVariant` records. Images support up to 10 files at 15 MB each, and audio supports one upload up to 30 MB. Only verified `READY` media can be published.
9. **AC-9**: The question model supports `CHOICE` and `PLAIN_MESSAGE` questions. Choice questions have 2 to 10 choices, an optional creator message per choice, and an optional next question. A plain message question has an optional next question that always appears after text submission. A nested question belongs to one branch only.
10. **AC-10**: A visitor can submit one complete response per page and browser token. The submission contains separate answer records and an optional separate visitor message. It must contain at least one answer or a nonempty visitor message.
11. **AC-11**: Editing a question with affected responses requires server confirmation and then deletes answers for that question and all nested questions in the same transaction. Editing non question content preserves existing responses.
12. **AC-12**: Optional page passwords use encrypted reversible storage inside private settings. Visitor unlock proofs are short lived, page scoped, stored through secure cookies and Redis, and invalidated by password changes or unpublishing.
13. **AC-13**: Public page reads return only safe projections. Missing, unpublished, archived, or deleted pages share a safe not found response. Locked pages return a locked state without confession content. Public pages are not indexed by search engines.
14. **AC-14**: Creators can list responses with cursor pagination, open a response, explicitly mark it read, and permanently delete it. Responses remain until the creator deletes them or deletes the page. Unpublishing preserves responses.
15. **AC-15**: Public and creator mutations use the versioned REST API, consistent error envelopes, ownership checks, idempotency keys where needed, and configuration driven Redis rate limits. Storage, database, Redis, worker, and external player failures return safe recoverable states.
16. **AC-16**: The system supports users of any age with minimal visitor data, reporting, creator deletion controls, abuse monitoring, and rate limits. It does not store visitor accounts, names, or raw IP addresses with responses.

## Decision

**Chosen option**: Hybrid relational platform model with template owned validated JSON content and structured response records.

Use relational records for shared platform concepts and relationships. Store template specific content in PostgreSQL JSONB, validated by a trusted template registry in the shared `packages/templates` package. The registry provides defaults, schemas, capabilities, publish requirements, and renderer metadata for each immutable template version. Store questions, choices, media attachments, submissions, answers, visitor messages, and reports as structured records because their ownership, limits, deletion behavior, and queries are load bearing.

The initial catalog is created by an idempotent database seed command. It creates the `confession` category, the `secret-letter` template, and active template version 1. Future categories and templates add seed records and trusted registry entries without adding category specific columns to `Page`.

The category and template catalog is public for the landing page. Creator pages and all mutations are protected by Better Auth sessions and ownership checks. The API is versioned under `/api/v1`, while `/health` remains unversioned.

Media upload uses direct browser to R2 uploads. A BullMQ job in Redis coordinates a separate worker. Sharp processes images and FFmpeg converts audio to MP3. These tools are used without installing new Agent Skills, following the project rules and official tool documentation during implementation.

**Implementation skills**: `prisma-database-setup` (`prisma/skills`, `.agents/skills/prisma-database-setup/`) · `prisma-client-api` (`prisma/skills`, `.agents/skills/prisma-client-api/`) · `better-auth-security-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-security-best-practices/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`)

## Rationale

Reasoning and options are recorded in [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

`User` is the existing Better Auth user record. It is not duplicated as a creator record.

`Category`:

1. Required `id` UUID primary key.
2. Required unique `key`, display `name`, optional `description`.
3. Required `status` with `ACTIVE` and `INACTIVE` values.
4. Required `displayOrder`, `createdAt`, and `updatedAt`.

`Template`:

1. Required `id` UUID primary key and `categoryId` foreign key.
2. Required stable `key`, `name`, optional `description`.
3. Required status and display order fields.
4. Unique `(categoryId, key)`.

`TemplateVersion`:

1. Required `id` UUID primary key and `templateId` foreign key.
2. Required positive `version` and trusted `registryKey`.
3. Required status with `ACTIVE` and `INACTIVE` values, plus timestamps.
4. Unique `(templateId, version)`.
5. The registry entry for the key provides `registryKey`, `version`, `capabilities`, `defaultContent`, `contentSchema`, `settingsSchema`, `publishRequirements`, and renderer metadata.
6. `ACTIVE` versions can create new pages. `INACTIVE` versions cannot create new pages, but existing pages can continue to render and be edited while their registry entry remains available.
7. The API validates every active and referenced registry entry at startup. A missing entry is a deployment configuration error. The database never stores executable JavaScript, React, or arbitrary HTML.

`Page`:

1. Required UUID `id` primary key and `creatorId` foreign key to Better Auth `User`.
2. Required `templateVersionId` foreign key. Category is derived through the template.
3. Required unique normalized current `slug`, with the display slug retained for the URL. Every generated or custom slug also has a permanent `PageSlugReservation` record.
4. Required `status`, `contentVersion`, `content` JSONB, `settings` JSONB, `createdAt`, and `updatedAt`.
5. Nullable `publishedAt`, `unpublishedAt`, and `archivedAt` timestamps.
6. `content` contains the template specific fields and ordered sections. `settings` contains private platform settings, theme, font, animation, music, visitor rules, password encryption data, and the current password key version.
7. Unique slug comparison is case insensitive. A slug is 3 to 48 characters, uses lowercase letters, numbers, and single hyphens, cannot start or end with a hyphen, and cannot be a reserved route. The initial reserved values are `api`, `auth`, `dashboard`, `health`, `login`, `robots.txt`, `settings`, `signup`, `sitemap.xml`, and `_next`. A slug change invalidates the old public lookup and retains its reservation so it cannot be reused.

`PageSlugReservation`:

1. Required UUID `id`, normalized slug, and reservation timestamp.
2. Required unique normalized slug and nullable `pageId` foreign key with delete set null behavior.
3. Required `isCurrent` value.
4. Old reservations remain permanently, even after a page is deleted. A slug change inserts the new reservation, marks the old reservation not current, and updates `Page` in one transaction.

`MediaAsset`:

1. Required UUID `id` primary key and `creatorId` foreign key.
2. Required `type` with `IMAGE` and `AUDIO` values.
3. Required processing status with `UPLOADING`, `PROCESSING`, `READY`, `FAILED`, and `DELETED` values.
4. Required original MIME type, byte size, and storage metadata. The temporary original storage key becomes nullable after cleanup.
5. Uploaded assets are creator owned and may be attached to multiple pages owned by that creator.

`MediaVariant`:

1. Required UUID `id` primary key and `mediaAssetId` foreign key.
2. Required variant type, storage key, MIME type, byte size, and creation time.
3. Nullable width, height, duration, codec, and format metadata when not applicable.
4. Unique `(mediaAssetId, variantType)`.

`PageMedia`:

1. Required UUID `id`, `pageId` foreign key, and `mediaAssetId` foreign key.
2. Required nonempty `description`, stable `sectionId`, display order, and attachment timestamps.
3. Unique `(pageId, mediaAssetId)`.
4. The attachment controls page specific caption, accessibility text, and section placement. Gallery images remain inside the gallery section. Attach, update, reorder, and detach are explicit operations.

`PageQuestion`:

1. Required UUID `id` primary key and `pageId` foreign key.
2. Required stable page local `key`, `type`, `prompt`, and order.
3. Nullable `nextQuestionId` is used by a plain message question. A root question is not targeted by any other question or choice. The order field orders root questions.
4. Optional validated `config` JSONB is reserved for supported template specific question settings.
5. Unique `(pageId, key)`.

`PageChoice`:

1. Required UUID `id` primary key and `questionId` foreign key.
2. Required stable `key`, `label`, and display order.
3. Nullable `creatorMessage` and `nextQuestionId`.
4. Unique `(questionId, key)`.
5. Application rules enforce 2 to 10 choices for a choice question, one inbound parent branch for every nested question, and no cycles.

`PageReport`:

1. Required UUID `id`, `pageId` foreign key, reason, created timestamp, and status.
2. Optional report message is limited to 1,000 characters and is not shown to visitors.
3. The reporter is anonymous. No raw IP, visitor account, or visitor name is stored with the report.
4. Reason values are `INAPPROPRIATE_CONTENT`, `HARASSMENT`, `SPAM`, `PERSONAL_INFORMATION`, and `OTHER`.
5. Status values are `OPEN`, `REVIEWED`, and `DISMISSED`. The initial release stores reports and exposes a rate limited public report operation. Administration UI is a later slice.

`VisitorSubmission`:

1. Required UUID `id` primary key and `pageId` foreign key.
2. Required hashed page scoped browser token, idempotency key, idempotency payload hash, read state, and submitted timestamp.
3. Unique `(pageId, browserTokenHash)` and unique `(pageId, idempotencyKey)`.
4. No visitor account, name, or raw IP field.

`VisitorAnswer`:

1. Required UUID `id`, `submissionId` foreign key, and `questionId` foreign key.
2. Nullable `choiceId` and nullable `textAnswer`, with exactly one answer form valid for the question type.
3. Required prompt snapshot and nullable selected choice label snapshot.
4. Unique `(submissionId, questionId)`.

`VisitorMessage`:

1. Required UUID `id` and unique `submissionId` foreign key.
2. Required prompt snapshot and message text limited to 2,000 characters.
3. The record is optional and independent from `VisitorAnswer`.

No database record is required for QR codes, temporary unlock proofs, music configuration, or audit logs in this phase. Music configuration is validated inside `Page.settings`. An uploaded track references `MediaAsset`; a YouTube source stores a validated video ID. Unlock proofs live in Redis and page specific secure cookies. Browser tokens are random anonymous cookies whose hashes are stored with submissions.

**State transitions**:

Page lifecycle:

```text
DRAFT → PUBLISHED
DRAFT → ARCHIVED
PUBLISHED → UNPUBLISHED
PUBLISHED → ARCHIVED
UNPUBLISHED → PUBLISHED
UNPUBLISHED → ARCHIVED
ARCHIVED → DRAFT
Any state → permanently deleted after confirmation
```

Media lifecycle:

```text
UPLOADING → PROCESSING → READY
PROCESSING → FAILED
FAILED → PROCESSING on an allowed retry
Any media state → DELETED during cleanup
```

Media processing uses a 10 minute presigned upload URL, three worker attempts with delays of 1 second, 2 seconds, and 4 seconds, and cleanup after 24 hours for abandoned uploads. The worker verifies object existence, file type, byte size, and checksum before processing. Images produce WebP variants with maximum widths of 1600 and 400 pixels. Audio produces an MP3 stream variant at 128 kilobits per second. Temporary originals are deleted after successful processing. A duplicate completion request returns the current asset state without creating another job.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/categories` | GET | active filter optional | safe category catalog | Public | 503 unavailable |
| `/api/v1/templates` | GET | category key optional | safe template catalog and capabilities | Public | 404 category, 503 unavailable |
| `/api/v1/pages` | POST | `templateVersionId` required, initial fields optional | draft projection, UUID, slug, defaults | Creator session | 401, 404 template, 422 unsupported content |
| `/api/v1/pages` | GET | cursor, page size, status filter | owner page summaries and next cursor | Creator session | 401, 422 cursor |
| `/api/v1/pages/:pageId` | GET | page ID | owner edit projection | Owner session | 401, 404 |
| `/api/v1/pages/:pageId` | PATCH | content, settings, expected content version | saved page and new version | Owner session | 404, 409 stale version, 422 invalid content |
| `/api/v1/pages/:pageId/publish` | POST | optional custom slug, confirmation of ready content | public URL and published projection | Owner session | 404, 409 invalid state, 422 template requirements or media not ready |
| `/api/v1/pages/:pageId/unpublish` | POST | none | unavailable page state | Owner session | 404, 409 invalid state |
| `/api/v1/pages/:pageId/archive` | POST | none | archived page state | Owner session | 404, 409 invalid state |
| `/api/v1/pages/:pageId/restore` | POST | none | draft page state | Owner session | 404, 409 invalid state |
| `/api/v1/pages/:pageId` | DELETE | explicit confirmation in client flow | deletion confirmation | Owner session | 404, 409 active processing |
| `/api/v1/pages/:pageId/questions` | POST | question type, prompt, choices or next question | question record | Owner session | 404, 409 response impact, 422 invalid branch |
| `/api/v1/pages/:pageId/questions/:questionId` | PATCH | question fields, expected version, `confirmResponseDeletion` when required | updated question | Owner session | 404, 409 response impact or stale version, 422 invalid branch |
| `/api/v1/pages/:pageId/questions/:questionId` | DELETE | expected version, `confirmResponseDeletion` when required | deletion confirmation | Owner session | 404, 409 response impact, 422 invalid branch |
| `/api/v1/media/uploads` | POST | page ID, media type, MIME type, byte size | media ID, presigned R2 URL, expiry | Owner session | 404, 413, 422 capability or file type |
| `/api/v1/media/:mediaId/complete` | POST | upload checksum and metadata | processing state and job ID | Owner session | 404, 409 upload state, 503 storage |
| `/api/v1/media/:mediaId` | GET | media ID | processing state and variants | Owner session | 404 |
| `/api/v1/pages/:pageId/media` | POST | ready media ID, section ID, description, display order | page media attachment | Owner session | 404, 409 media not ready, 422 capability or description |
| `/api/v1/pages/:pageId/media/:pageMediaId` | PATCH | description, section ID, display order | updated attachment | Owner session | 404, 422 invalid placement |
| `/api/v1/pages/:pageId/media/:pageMediaId` | DELETE | none | detached attachment | Owner session | 404 |
| `/api/v1/public/pages/:slug` | GET | slug and unlock cookie optional | safe page projection or locked state | Public | 404 unavailable, 503 unavailable |
| `/api/v1/public/pages/:slug/unlock` | POST | password | success and page scoped secure cookie | Public | 404, 401 invalid password, 429, 503 |
| `/api/v1/public/pages/:slug/submissions` | POST | answers, separate visitor message, idempotency key | confirmation only | Public, unlock proof when needed | 404, 401, 409 duplicate, 422 invalid branch, 429 |
| `/api/v1/public/pages/:slug/reports` | POST | reason and optional report message | report receipt | Public | 404, 422 invalid report, 429 |
| `/api/v1/pages/:pageId/submissions` | GET | cursor, size, `all` or `unread` filter | response summaries and next cursor | Owner session | 404, 422 cursor |
| `/api/v1/pages/:pageId/submissions/:submissionId` | GET | page and submission ID | response detail with snapshots | Owner session | 404 |
| `/api/v1/pages/:pageId/submissions/:submissionId/read` | POST | none | read state | Owner session | 404 |
| `/api/v1/pages/:pageId/submissions/:submissionId` | DELETE | explicit confirmation in client flow | deletion confirmation | Owner session | 404, 409 |

Every API error uses `statusCode`, stable `code`, safe `message`, `requestId`, and optional `details`. The initial stable codes include `STALE_VERSION`, `INVALID_STATE`, `TEMPLATE_REQUIREMENT_FAILED`, `UNSUPPORTED_CAPABILITY`, `PAGE_LOCKED`, `COOKIE_REQUIRED`, `DUPLICATE_SUBMISSION`, `IDEMPOTENCY_CONFLICT`, `MEDIA_NOT_READY`, `UPLOAD_EXPIRED`, `STORAGE_UNAVAILABLE`, `CONFIGURATION_INVALID`, and `RATE_LIMITED`. Non owned creator resources return the same safe `404` as missing resources. Public endpoint responses never include creator identity, password data, private storage keys, or visitor responses.

Creator list endpoints use an opaque base64 URL cursor containing the last timestamp and record ID. Records sort newest first by timestamp and ID. The default page size is 20 and the maximum is 50. Deleted records disappear, and new records do not invalidate an existing cursor.

Database transactions wrap page saves, page lifecycle changes, slug reservation changes, question edits and deletions, visitor submissions, and response deletions. R2 uploads and deletes happen outside database transactions. An upload is not marked ready until the object, checksum, type, size, and processed variants are verified. If an external operation fails, the database keeps a non ready state and a cleanup job reconciles abandoned objects. A page deletion removes database attachments and schedules external media cleanup; an asset shared by another page is retained.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Create draft | page UUID | PostgreSQL generated UUID |
| Create draft | default slug | server random generator, then `PageSlugReservation` uniqueness check |
| Create draft | initial content | trusted `TemplateVersion.registryKey` defaults from `packages/templates` |
| Catalog read | category and template records | idempotent seed data with stable keys and display order |
| Template validation | capabilities, content rules, settings rules, publish requirements | resolved registry entry matching `TemplateVersion.registryKey` and version |
| Save page | new content version | current `Page.contentVersion` plus one inside an optimistic concurrency transaction |
| List creator pages | ownership scope | Better Auth session user ID as `Page.creatorId` |
| Publish page | recipient and main message validity | selected template schema and `Page.content` |
| Publish page | public URL | `APP_ORIGIN` plus current `Page.slug` |
| Public page read | available, locked, or unavailable state | `Page.status`, private password settings, slug lookup, and unlock cookie |
| Public page read | rendered sections | validated `Page.content`, `PageMedia`, and ready media variants |
| Unlock | password decision | encrypted password in private `Page.settings`, submitted password, and page scoped Redis proof |
| Submit response | allowed question path | `PageQuestion`, `PageChoice`, selected template version, and page required answer setting |
| Submit response | browser uniqueness | `letterly_browser` random one year HTTP only cookie and hashed token stored in `VisitorSubmission` |
| Submit response | prompt and choice snapshots | question and choice text shown by the published page |
| Response list | page summaries | owner session, `Page.id`, `VisitorSubmission`, cursor, and read state |
| Media upload | file and capability limits | selected template capability plus platform hard limits |
| Media processing | variants and readiness | validated object metadata, media worker configuration, Sharp, and FFmpeg |
| Media attachment | description, section, and order | creator request, page layout, and `PageMedia` constraints |
| Media public display | correct variant | `MediaVariant` metadata, rendered slot dimensions, and template section placement |
| Public report | reason and status | visitor request, report reason catalog, rate limit, and `PageReport` lifecycle |

**Key invariants**:

1. A page has exactly one owner and one immutable template version.
2. A page cannot use a template capability that its template version does not declare.
3. Only `READY` media can be attached to published content.
4. Every page image has a nonempty description.
5. Each template owns its publish requirements. A Secret Letter requires recipient name and main message. A choice question has 2 to 10 choices. A plain message question has no choices.
6. A nested question has one branch parent and cannot point to itself or create a cycle.
7. A page has at most one music source and it is either an uploaded asset or a validated YouTube video ID.
8. A visitor answer uses a choice or text according to the question type, never both.
9. A browser token can create at most one submission per page.
10. An idempotency key cannot create more than one submission for a page.
11. Question edits that affect existing answers first return `409` with the affected response count. The confirmed retry includes `confirmResponseDeletion: true` and the expected content version. The server deletes the affected answer set and nested branch answers in the same transaction.
12. Ordinary content edits do not delete visitor responses.
13. Page deletion removes page content, responses, reports, attachments, and owned media after safe cleanup. A shared media asset is deleted only when no page references it. Unpublishing and archiving preserve page data, reports, and responses.
14. Password ciphertext, encryption keys, unlock proofs, browser tokens, and raw IP addresses never appear in public responses or logs. Passwords, tokens, visitor messages, and request bodies are redacted from framework logs.
15. Slugs are case insensitive, follow the defined validation rules, and old slugs remain permanently reserved after a change.
16. A visitor follows only the selected question branch. Required mode requires every displayed question to be answered. Optional mode allows the visitor to finish without answering every displayed question. A submission with no remaining answer and no visitor message is deleted after a destructive question edit.
17. A response submission is created in one database transaction. Its idempotency key returns the original result on an identical payload retry and returns `IDEMPOTENCY_CONFLICT` for a different payload.

**Security model**:

Better Auth sessions are the only creator identity. Google and Facebook are the first login providers. The API checks the session and ownership on every creator route. A browser control is never treated as authorization.

Visitors are anonymous. They can read only safe projections of published pages. A password protected page requires a correct password before content or submissions are available. The encrypted password is in private settings, the encryption key is outside the database, and the dashboard masks the password by default while allowing the owner to reveal it. Password encryption uses AES 256 GCM with a random initialization value, authentication tag, and stored key version. Key rotation reads the old version and rewrites the ciphertext with the current version. Missing or corrupted key material fails safely without revealing content.

Public endpoints use Redis rate limits. Unlocks, submissions, uploads, creator writes, reads, and reports use separate limits. Unlock proofs use a random page specific token in an HTTP only secure cookie named `letterly_unlock_<pageId>`, with `SameSite=Lax`, secure transport in production, and a 24 hour expiry. Only its hash is stored in Redis under `unlock:{pageId}:{proofHash}` with the page password version. Password changes and unpublishing invalidate the proof. A random one year browser token is stored in an HTTP only secure cookie named `letterly_browser`, with `SameSite=Lax` and secure transport in production. If cookies are blocked, response submission returns a clear cookie required error.

Visitor responses are visible only to the page owner. The system stores no visitor account, name, or raw IP with responses. Reports store a reason and optional message, but no raw IP or visitor identity. Reporting, creator deletion, abuse monitoring, and rate limits are required for users of any age. Automated moderation and audit records are deferred. Public pages use `Cache-Control: no-store` and send `X-Robots-Tag: noindex, nofollow, noarchive`.

The shared Redis rate limit policy is:

| Operation | Limit | Key |
|---|---|---|
| Password unlock | 10 per 15 minutes | page and IP |
| Visitor submission | 3 per 10 minutes | page and browser token |
| Public page read | 120 per minute | IP |
| Upload authorization | 20 per 10 minutes | creator |
| Creator write | 60 per minute | creator |
| Public report | 5 per 10 minutes | page and browser token or IP |

Protected operations fail closed with a safe `503` when Redis is unavailable. Redis rate limit keys use a short lived server derived IP value or creator and page identifiers. The raw IP is not stored with responses, reports, or application logs.

**Configuration required**:

1. `APP_ORIGIN`: canonical browser origin and public URL base.
2. `DATABASE_URL`: pooled PostgreSQL runtime connection.
3. `DIRECT_URL`: direct PostgreSQL migration connection.
4. `REDIS_URL`: shared rate limit, unlock, and BullMQ connection.
5. `BETTER_AUTH_SECRET`: Better Auth session secret.
6. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google login.
7. `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET`: Facebook login.
8. `PAGE_PASSWORD_ENCRYPTION_KEY`: external key for reversible page password encryption.
9. `PAGE_PASSWORD_ENCRYPTION_KEY_VERSION`: key version for future rotation.
10. `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`: private media storage.
11. `R2_PUBLIC_BASE_URL`: public ready media delivery base URL.
12. `SENTRY_DSN`: optional production error reporting endpoint after local proof is stable.
13. Rate limit configuration in `packages/config`, with the confirmed defaults for unlocks, submissions, public reads, upload authorization, creator writes, and reports. Environment overrides are validated.
14. `MEDIA_UPLOAD_URL_TTL_SECONDS`: defaults to 600.
15. `MEDIA_WORKER_CONCURRENCY`: worker concurrency, defaulting to 2 and adjustable per deployment.
16. `MEDIA_RETRY_ATTEMPTS`: defaults to 3.
17. `MEDIA_ABANDONED_UPLOAD_HOURS`: defaults to 24.
18. `MEDIA_KEEP_ORIGINALS`: defaults to false after successful processing.
19. `PAGE_PASSWORD_ENCRYPTION_ALGORITHM`: fixed to AES 256 GCM by the implementation package, not user supplied.
20. Worker configuration for temporary original retention and processing output metadata, validated with the same startup configuration package.

**Critical test scenarios**:

1. Happy path: authenticated creator creates, saves, reopens, publishes, and unpublishes a Secret Letter draft, verifying **AC-3**, **AC-4**, and **AC-5**.
2. Template capability: a template without images, audio, questions, or answers rejects those fields and creates no unsupported records, verifying **AC-2**.
3. Concurrency: two tabs save the same page and the stale tab receives `409 Conflict`, verifying **AC-4**.
4. Slug safety: concurrent slug changes allow only one reservation, changing a published slug makes the old slug permanently unavailable, and the new slug works, verifying **AC-6**.
5. Media failure: an expired upload, missing object, MIME spoof, checksum mismatch, duplicate completion, and failed worker retry never become ready or publishable. A successful retry creates the expected WebP or MP3 variants, verifying **AC-8** and **AC-15**.
6. Question deletion warning: editing a question with nested answers first returns a confirmation requirement and count, then deletes only the affected response tree in one transaction. Cycles and multiple inbound parents are rejected, verifying **AC-9** and **AC-11**.
7. Anonymous response: a visitor submits one choice or plain message flow and a separate optional visitor message, verifying **AC-10**.
8. Duplicate response: a lost network response is retried with the same idempotency key and does not create a second submission, verifying **AC-10** and **AC-15**.
9. Password privacy: an incorrect password reveals no content, a correct password unlocks only the page for 24 hours, and a password change invalidates the old proof, verifying **AC-12** and **AC-13**.
10. Permission: another authenticated creator receives the same safe `404` for page, media, question, and response access, verifying **AC-4**, **AC-13**, and **AC-14**.
11. Data minimization: response and report records contain no visitor name or raw IP, public projections contain no private settings, and logs redact passwords, tokens, messages, and request bodies, verifying **AC-13** and **AC-16**.
12. Infrastructure failure: Redis, PostgreSQL, or R2 outage returns a safe `503` and creates no partial mutation. A corrupted password key fails closed, and a password key rotation preserves access, verifying **AC-12** and **AC-15**.
13. Public privacy: public pages send `no-store` and no index headers. Unpublishing, password changes, slug changes, archiving, and deletion never leave stale public content available, verifying **AC-5**, **AC-6**, and **AC-13**.
14. Anonymous controls: a blocked cookie cannot submit, an identical idempotency retry returns the original result, a different payload with the same key conflicts, and reports are rate limited, verifying **AC-10**, **AC-15**, and **AC-16**.

## Build plan

The project uses a Tracer Bullet approach. The target model is designed as a whole, but implementation is sliced through real creator and visitor paths so each migration is exercised before broader capabilities are added.

1. Wire Better Auth user ownership and the shared Prisma 7 client lifecycle, then add the initial category, template, template version, page, and slug reservation migration. Add the idempotent seed for Secret Letter defaults and validate the shared template registry. Satisfies **AC-1**, **AC-3**, **AC-4**, and **AC-6**.
2. Add category and template catalog contracts and public read endpoints for the landing page. Satisfies **AC-1** and **AC-2**.
3. Add authenticated page creation, listing, loading, explicit save, optimistic concurrency, slug generation, permanent slug reservation, and permanent deletion. Satisfies **AC-3**, **AC-4**, and **AC-6**.
4. Add page lifecycle commands, server publish validation, public safe projection, no index metadata, and cache invalidation boundaries. Satisfies **AC-5**, **AC-6**, **AC-7**, and **AC-13**.
5. Add image media records, explicit attachment operations, direct R2 upload authorization, BullMQ jobs, Sharp processing, retry states, variants, and cleanup. Then add the optional audio path with FFmpeg conversion. Satisfies **AC-2**, **AC-8**, and **AC-15**.
6. Add page question and choice records, root and branch validation, plain message follow ups, response impact checks, explicit confirmation retries, and transactional question deletion. Satisfies **AC-9** and **AC-11**.
7. Add visitor submissions, answer snapshots, separate visitor messages, browser token uniqueness, idempotency, response pagination, read actions, and deletion. Satisfies **AC-10**, **AC-11**, and **AC-14**.
8. Add encrypted page passwords, Redis unlock proofs, browser cookie requirements, rate limits, password version invalidation, safe locked projections, and `no-store` public responses. Satisfies **AC-12**, **AC-13**, and **AC-15**.
9. Add public reports, creator deletion controls, abuse monitoring, privacy safe observability, and any age safety review before public beta. Satisfies **AC-15** and **AC-16**.
10. Run migration review, API integration tests, worker failure tests, ownership tests, and Playwright journeys against the real local stack before advancing the scope feature. Satisfies **AC-1** through **AC-16**.

## Consequences

**Positive**:

1. Future categories and templates can introduce different fields without a universal table redesign.
2. Ownership, lifecycle, response deletion, and pagination remain strongly queryable and enforceable.
3. Template content stays validated by trusted code instead of executing database content.
4. The first real journey can be built with a small core while the model remains ready for media and responses.
5. Direct uploads keep large files out of the API request path.

**Negative / tradeoffs**:

1. The system has both JSON validation and relational rules, so the API must keep them consistent.
2. BullMQ, a worker container, Sharp, FFmpeg, and R2 create operational work before the media slice is complete.
3. Reversible password storage is weaker than a one way hash if the encryption key is exposed, so key protection and rotation are mandatory.
4. Question edits are deliberately destructive to affected responses and require careful user warnings.
5. The any age decision requires safety, privacy, reporting, and legal review before launch.

**Neutral**:

1. QR codes remain derived values and do not require a table.
2. Music configuration remains page settings because each page allows at most one source.
3. The data model does not add audit records, email notifications, payments, custom domains, or search indexing.

## Follow-up

1. Reconcile `docs/scope/scope.md`, which still says adults only, with the confirmed any age requirement. Add child safety, privacy, moderation, and legal review before launch.
2. Define and implement the Better Auth database schema before applying the page ownership migration. Google and Facebook remain the only first release providers.
3. Create the R2 buckets, OAuth applications, encryption key storage, Redis environments, and worker container configuration before the related build slices.
4. The registry search found BullMQ, Sharp, FFmpeg, Redis, Cloudflare R2, and NestJS skills, but the engineer chose not to install new skills. Use official documentation and existing project guidance.
5. Design audit records, administrator actions, and stronger moderation in the launch hardening feature.
6. Define the hosting provider and production worker deployment before private beta.
