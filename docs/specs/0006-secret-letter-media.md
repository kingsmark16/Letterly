# 0006. Secret Letter image media

**Date**: 2026-08-11
**Status**: Accepted

## Summary

This feature lets a creator add up to ten images to a Secret Letter and show them inline after the message. The browser uploads directly to private Cloudflare R2 storage, while the API verifies, sanitizes, and controls every image. The first media slice supports images only, uses optional captions, and keeps the letter readable when an image or storage service fails.

## Context

Creators can currently save, preview, publish, and share a Secret Letter, but the letter has no safe path for creator owned images. Image bytes are too large and sensitive to send through ordinary page save requests. A public image URL must also stop working when a page is unpublished or deleted.

The feature is for the existing Next.js and NestJS application, with PostgreSQL on Neon, Prisma 7, Better Auth, and private Cloudflare R2 storage. The project uses a Tracer Bullet approach, so the first implementation must prove one complete upload, save, private preview, publish, and public read path before adding audio, a reusable media library, or asynchronous processing workers.

> ⚠️ Premise note: Spec 0002 describes a future reusable `MediaAsset`, `MediaVariant`, and asynchronous worker model. This feature deliberately narrows the first media slice to one page owned `PageImage` records and synchronous image sanitization. The broader reusable media architecture remains a follow up decision and must not be mixed into this implementation.

## Requirements

**User stories**:

1. As a creator, I want to add images to my Secret Letter so that important memories can appear with the message.
2. As a creator, I want image uploads to be verified and sanitized so that unsafe or misleading files never become public.
3. As a creator, I want to reorder, caption, replace, and remove images through the existing Save flow so that my private preview and public letter stay consistent.
4. As a visitor, I want one public page to load all of its images inline so that I can read the complete letter without gallery navigation.
5. As a system operator, I want abandoned uploads and failed storage cleanup to be recoverable so that temporary objects do not accumulate.

**Acceptance criteria** (the contract):

- **AC-1**: An authenticated page owner can choose JPEG, PNG, or WebP files through a file picker or drag and drop. A letter accepts at most 10 attached images and at most 100 MiB (104,857,600 bytes) of reserved source bytes. Each source is at most 10 MiB (10,485,760 bytes). Prepare validates type, byte size, count, and total bytes atomically; dimension validation occurs during Complete because dimensions are not available in the Prepare request. Invalid requests return a safe validation error without creating a usable image.
- **AC-2**: The API exposes owner-only upload preparation at `POST /api/v1/pages/:pageId/images/uploads`. The request contains `contentType`, `byteSize`, and `sha256`, where `sha256` is standard padded Base64 of the SHA-256 digest. An optional `replaceImageId` identifies the currently attached image that must remain until the replacement is ready and saved. The response contains an image ID, a server-generated signed R2 upload URL, the required `Content-Type` and `x-amz-checksum-sha256` headers, a one-hour `uploadExpiresAt`, and an upload state. The object key contains no original file name.
- **AC-3**: The API exposes owner-only completion at `POST /api/v1/pages/:pageId/images/:imageId/complete` with no request body. It claims the record with a compare-and-set transition, reads the exact private object, hashes and counts the actual bytes, verifies the detected magic type and expected MIME, rejects images over 8,000 pixels on the longest side or 40 megapixels, rejects animated or multi-page inputs, removes EXIF metadata, normalizes orientation, converts the image to WebP with the specified policy, verifies the output checksum and limits, deletes the original source object, and marks the image `READY` only after all steps succeed. A completion may succeed after the one-hour upload URL expires if the unexpired source record and exact object are still present; URL expiry only prevents further upload authorization.
- **AC-4**: A ready image is an unsaved editor change until the existing page Save action includes it. Save accepts ordered ready image IDs with optional captions and the existing expected content version. The transaction enforces ownership, unique order from 0 through 9, the 10 image limit, the 100 MiB effective source-byte limit, and the 60 MiB attached-output limit. A replacement pending record does not consume an additional image slot: its `replaceImageId` target is excluded from the effective quota until the replacement is saved or removed. A stale save returns the existing `409 STALE_VERSION` response without changing the gallery.
- **AC-5**: Captions are optional and limited to 500 characters. Images have no separate description field. For this slice, every image is intentionally treated as decorative with empty alternative text, and captions are visible copy only; this is an explicit accessibility tradeoff because the letter message remains the semantic content. The creator can move an image earlier or later with keyboard-friendly controls, drag and drop, replace it, remove it, and save other page fields while an image is pending. `DELETE /api/v1/pages/:pageId/images/:imageId` removes only an unready or ready-but-unattached image; removal of an attached image occurs through page Save.
- **AC-6**: A saved image can be changed after publication through the same explicit Save action. An old image remains attached and rendered until its replacement is ready and saved. Removing or replacing an image removes the old database record first in the Save transaction and schedules retryable R2 cleanup for every final and source object associated with it.
- **AC-7**: The owner page projection includes every non-expired page-owned image needed to recover the editor after reload, including `imageId`, `state`, `attached`, optional `sortOrder`, optional `mediaUrl` when a verified WebP exists, optional `caption`, optional safe `failureCode`, and `expiresAt`. `GET /api/v1/pages/:pageId/images/:imageId` streams a verified WebP for any page-owned `READY` image, including an unattached image, and never exposes a storage key.
- **AC-8**: The public page projection always contains an ordered `images` array with at most 10 entries. Each entry contains only `imageId`, a same origin media path, and an optional caption. The public `/p/[slug]` page loads every image inline after the main message, with no pagination, next or previous controls, lightbox, or navigation to another page.
- **AC-9**: The public Next.js route `/p/[slug]/media/[imageId]` forwards a signed visitor identity to `GET /api/v1/public/pages/:slug/images/:imageId`. The API streams a WebP image only when the slug is current, the page is `PUBLISHED`, and the image is `READY` and attached. The response uses `Cache-Control: no-store` and unavailable, old, unpublished, deleted, or non owned image requests return the same generic `PAGE_NOT_FOUND` response with no image bytes.
- **AC-10**: Public image reads use a `publicMediaReads` limit of 600 requests per minute per visitor. Owner upload preparation uses a `creatorImageUploads` limit of 30 requests per minute per creator, and completion uses a two-active-completions-per-creator limit plus an eight-active-completions-per-API-instance safety cap. Rate limit failures and storage failures return safe `429` or `503` responses with request IDs and no partial attachment.
- **AC-11**: Upload completion is idempotent for the same image, object, and metadata. A repeated matching completion returns the current safe state; a completion observing an active claim returns `409 IMAGE_PROCESSING`. A mismatch, missing object, checksum mismatch, MIME spoof, failed sanitization, or conversion failure marks the image failed or expired, keeps it private, and offers Retry or Remove without making it publishable. A processing lease of 180 seconds allows Retry to recover a record whose API process crashed.
- **AC-12**: `POST /api/v1/pages/:pageId/images/:imageId/retry` reuses the same unready image record, schedules cleanup for the previous source key, and issues a fresh signed upload URL with a fresh random source key. `DELETE /api/v1/pages/:pageId/images/:imageId` removes an unready or ready-but-unattached record. Unready and ready-but-unattached records expire 24 hours after creation or the latest retry; attaching a ready image clears its expiry. A scheduled NestJS cleanup task runs every 15 minutes, removes expired database records first, and retries R2 deletion through `MediaCleanup` records with exponential backoff for five attempts. Cleanup uses a database claim lease so multiple API instances cannot process the same task concurrently; a fifth failure moves the task to `REVIEW` with no next retry.
- **AC-13**: A private image remains private in R2. Only the authenticated owner may prepare, complete, save, read, replace, or remove an image. Missing and non owned resources return the same safe `404`. Public media routes never reveal creator identity, page IDs in response bodies, storage keys, original file names, EXIF data, or private settings.
- **AC-14**: If PostgreSQL, R2, or image sanitization is unavailable, the API returns a safe recoverable `503` or processing error and makes no partial gallery attachment. Completion may run for up to three minutes per image. Sharp enforces the 40-megapixel input limit, the API caps active processing as specified in AC-10, and the sanitized output is at most 8 MiB per image and 60 MiB for the complete page. The letter remains readable when an individual browser image load fails by showing a neutral placeholder and its caption when available. If a stream fails after response headers or image bytes have started, the connection may terminate; JSON error replacement is guaranteed only before streaming begins.
- **AC-15**: The private preview and public renderer use the same image render model. The server rendered public document contains the image elements and captions without requiring JavaScript. The layout is mobile first, loads all images on one page, keeps the primary letter readable, and follows the existing focus, touch target, reduced motion, and no content bearing analytics rules.

## Options considered

### Option 1: Direct private R2 upload with page owned images

The API issues signed upload URLs, verifies each object, sanitizes it synchronously to WebP, and stores a page owned `PageImage`. Public image requests pass through application routes that recheck page publication.

**Pros**:

- Large request bodies bypass the API upload path.
- Unpublish and deletion can stop image delivery immediately.
- The first slice has one clear ownership model and no reusable media library.

**Cons**:

- The API must operate R2 signing, verification, and streaming adapters.
- Synchronous three minute processing can occupy API workers for unusually difficult files.

### Option 2: Reusable media assets with an asynchronous worker

Create independent media assets, page attachment records, variants, and a Redis backed worker before the first image is usable.

**Pros**:

- Better fit for future reuse, multiple variants, audio, and large processing workloads.
- Worker retries isolate image processing from request latency.

**Cons**:

- Adds a worker, queue, variant lifecycle, and cross page ownership rules to the first media path.
- Requires more operational setup before the creator can add one image.

### Option 3: Multipart image upload through the API

The browser sends image bytes to NestJS, and the API stores and processes them.

**Pros**:

- One request boundary is easy to reason about locally.
- The browser does not need R2 CORS or a signed storage URL.

**Cons**:

- The API carries up to 100 MiB per letter through its request workers.
- Slow or concurrent uploads compete with authentication and page requests.

## Decision

**Chosen option**: Option 1, direct private R2 upload with page owned images.

Use AWS SDK v3 S3 signing against Cloudflare R2, `file-type` magic byte inspection, and Sharp for synchronous EXIF removal, orientation normalization, and WebP conversion. Keep source objects private and temporary. Serve the final WebP only through owner or published page routes. The application owns publication checks, ownership checks, safe errors, rate limits, and cleanup state.

**Implementation skills**: `prisma-client-api` (`prisma/skills`, `.agents/skills/prisma-client-api/`) · `prisma-cli` (`prisma/skills`, `.agents/skills/prisma-cli/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

The chosen path matches the existing Tracer Bullet approach and keeps large image bytes out of NestJS upload requests. Private R2 objects plus application media routes preserve the public publishing guarantee that an unpublished or deleted page has no usable public content. Server side verification and sanitization are necessary because browser MIME values and EXIF metadata cannot be trusted.

The engineer chose a one page owned image model, a 100 MiB letter limit, synchronous three-minute processing, and no media navigation. Those choices reduce the first feature’s operational surface and make the public experience easy to understand. They also accept higher API worker occupancy and prevent asset reuse until a later media architecture decision.

## Feature design

**Data model sketch**:

`PageImage` is a new record owned by exactly one existing `Page`.

- `id`: required UUID primary key.
- `pageId`: required UUID foreign key to `Page`, with page deletion removing the record before external cleanup.
- `state`: required enum `UPLOADING`, `VERIFYING`, `SANITIZING`, `READY`, `FAILED`, or `EXPIRED`.
- `attachedAt`: nullable timestamp. It is set only by a successful page Save.
- `storageKey`: nullable final sanitized WebP key. It is populated only after output verification.
- `sourceStorageKey`: nullable temporary source key. It is cleared after the source object is deleted.
- `sourceMimeType`: required input type, limited to JPEG, PNG, or WebP.
- `sourceByteSize`: required input size, from 1 byte through 10 MiB (10,485,760 bytes).
- `sourceSha256`: required standard padded Base64 SHA-256 checksum supplied at Prepare and verified against the actual object bytes at Complete.
- `outputByteSize` and `outputSha256`: nullable until sanitized WebP output is verified.
- `width` and `height`: nullable until sanitized output is verified.
- `sortOrder`: nullable until attachment, then an integer from 0 through 9.
- `caption`: nullable text with a maximum of 500 characters.
- `replaceImageId`: nullable page-local image ID. It is set only for a pending replacement and points to the attached image that remains visible until the replacement is saved; it is not a required foreign key so the old row can be deleted atomically during Save.
- `failureCode`: nullable allowlisted safe code, never raw provider text.
- `processingLeaseExpiresAt`: nullable timestamp set when Complete claims the record and used to recover a crashed verification or sanitization attempt.
- `uploadExpiresAt`: required timestamp for the current signed source URL.
- `expiresAt`: nullable timestamp for unready or unattached records; it is reset on Retry and cleared when attached.
- `createdAt` and `updatedAt`: required timestamps.

`MediaCleanup` is a durable cleanup task without a required foreign key to `PageImage`, because the image record is removed before object deletion.

- `id`: required UUID primary key.
- `objectKey`: required private R2 object key.
- `status`: required enum `PENDING` or `REVIEW`.
- `attempts`: required nonnegative integer.
- `nextRetryAt`: nullable timestamp; it is null after the task reaches `REVIEW`.
- `lastFailureCode`: nullable safe cleanup code.
- `leaseOwner`: nullable random worker identifier.
- `leaseExpiresAt`: nullable timestamp used to claim work across API instances.
- `createdAt`: required timestamp.

Successful cleanup removes the `MediaCleanup` row. A partial unique index enforces unique `sortOrder` for attached images on a page. A page transaction locks the page before counting pending and attached records. The effective reservation is at most 10 final image slots and 100 MiB of source bytes; a pending replacement excludes its `replaceImageId` target from both counts. A separate page-owned record is never reused by another page.

**State transitions**:

```text
UPLOADING → VERIFYING → SANITIZING → READY
VERIFYING → FAILED
SANITIZING → FAILED
FAILED, EXPIRED → UPLOADING on owner retry
UPLOADING, VERIFYING, SANITIZING → EXPIRED after 24 hours
READY and unattached → EXPIRED after 24 hours
READY and attached → removed by a successful page Save or page deletion
```

`Complete` first claims `UPLOADING` with a conditional database update and a 180-second processing lease. A record in `VERIFYING` or `SANITIZING` is not claimed again until its lease expires. A successful Retry generates a new source key; the previous source key is placed in `MediaCleanup` with `nextRetryAt` no earlier than its signed URL expiry so a stale signed URL cannot recreate an orphan after cleanup.

R2 source deletion and final object cleanup happen outside the database transaction. The database records every cleanup task before external deletion is attempted. Removing a `PageImage` is therefore a transaction that inserts cleanup rows and then deletes the image row; the external delete is never the only record of cleanup work.

**API surface**:

| Endpoint                                         | Method | Key inputs                                                                                                  | Key outputs                                                                                          | Auth                     | Key errors                                                                                                            |
| ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/pages/:pageId/images/uploads`           | POST   | `contentType:string` required, `byteSize:int` required, `sha256:string` required, optional `replaceImageId` | `imageId`, signed `uploadUrl`, required headers, `uploadExpiresAt`, `state`                          | Authenticated page owner | `404`, `413`, `422 INVALID_IMAGE`, `422 IMAGE_LIMIT_REACHED`, `503 STORAGE_UNAVAILABLE`, `429`                        |
| `/api/v1/pages/:pageId/images`                   | GET    | Page ID                                                                                                     | All non-expired owner image records needed to recover the editor, with safe state and media metadata | Authenticated page owner | `404`                                                                                                                 |
| `/api/v1/pages/:pageId/images/:imageId/complete` | POST   | No body                                                                                                     | `imageId`, `state`, safe output metadata when `READY`                                                | Authenticated page owner | `404`, `409 IMAGE_PROCESSING`, `409 IMAGE_NOT_READY`, `422 IMAGE_PROCESSING_FAILED`, `503 STORAGE_UNAVAILABLE`, `429` |
| `/api/v1/pages/:pageId/images/:imageId/retry`    | POST   | No body                                                                                                     | `imageId`, fresh signed `uploadUrl`, required headers, `uploadExpiresAt`, `state`                    | Authenticated page owner | `404`, `409 IMAGE_ATTACHED`, `409 IMAGE_PROCESSING`, `422 IMAGE_RETRY_UNAVAILABLE`, `503 STORAGE_UNAVAILABLE`, `429`  |
| `/api/v1/pages/:pageId/images/:imageId`          | DELETE | Page ID and image ID                                                                                        | Empty success response                                                                               | Authenticated page owner | `404`, `409 IMAGE_ATTACHED`, `409 IMAGE_PROCESSING`, `503 STORAGE_UNAVAILABLE`                                        |
| `/api/v1/pages/:pageId`                          | PATCH  | Existing page fields, `expectedContentVersion`, `images:[{imageId,sortOrder,caption?}]`                     | Owner page projection, updated content version, ordered images                                       | Authenticated page owner | `404`, `409 STALE_VERSION`, `409 IMAGE_NOT_READY`, `422 INVALID_IMAGE`, `422 IMAGE_LIMIT_REACHED`                     |
| `/api/v1/pages/:pageId`                          | GET    | Page ID                                                                                                     | Owner projection with safe image metadata and relative owner media paths                             | Authenticated page owner | `404`                                                                                                                 |
| `/api/v1/pages/:pageId/images/:imageId`          | GET    | Page ID and image ID                                                                                        | Sanitized WebP bytes, `Content-Type: image/webp`                                                     | Authenticated page owner | `404`, `503 STORAGE_UNAVAILABLE`                                                                                      |
| `/api/v1/public/pages/:slug`                     | GET    | Current slug                                                                                                | Existing safe projection plus ordered `images` array                                                 | Anonymous                | `404 PAGE_NOT_FOUND`, `429`, `503`                                                                                    |
| `/api/v1/public/pages/:slug/images/:imageId`     | GET    | Current slug and image ID                                                                                   | Sanitized WebP bytes, `Content-Type: image/webp`, `Cache-Control: no-store`                          | Anonymous                | `404 PAGE_NOT_FOUND`, `429`, `503`                                                                                    |
| `/p/[slug]/media/[imageId]`                      | GET    | Slug and image ID                                                                                           | Same origin streamed image response from the API                                                     | Anonymous browser route  | Generic unavailable response, `503`                                                                                   |

The Next.js media route signs the visitor identity using `PUBLIC_MEDIA_PROXY_SECRET` and an HMAC-SHA256 token containing the canonical visitor key and a five-minute expiry before calling the API. The canonical visitor key comes from the first address in `x-forwarded-for` only when the request comes through the configured trusted proxy; local development uses the socket address. The API accepts the internal visitor header only when the signature and expiry validate. It does not expose provider credentials or storage keys. The existing page Save remains the only attached-image and caption mutation surface.

**Value sourcing**:

| Action                  | Value produced or displayed                       | Source                                                                                                                                          |
| ----------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Prepare upload          | page owner                                        | Better Auth session user ID matched with `Page.creatorId`                                                                                       |
| Prepare upload          | input type, size, and source checksum             | validated request body                                                                                                                          |
| Prepare upload          | image ID and random source key                    | database UUID and server random key generator                                                                                                   |
| Prepare upload          | upload URL and required headers                   | AWS SDK v3 presigner, R2 configuration, one-hour policy, `Content-Type`, and `x-amz-checksum-sha256`                                            |
| Prepare upload          | reserved image and byte quota                     | page row lock, current `PageImage` states, and request byte size                                                                                |
| Complete upload         | source object                                     | `PageImage.sourceStorageKey`                                                                                                                    |
| Complete upload         | verified input metadata                           | actual R2 object bytes, server byte count, server SHA-256 digest, and `file-type` magic bytes; browser and R2 metadata are only expected values |
| Complete upload         | WebP bytes, checksum, dimensions, and output size | Sharp sanitized output, fixed WebP policy, and a server checksum of those bytes                                                                 |
| Save page               | attached image set and order                      | request `images` array, ready `PageImage` records, and expected page content version                                                            |
| Save page               | caption                                           | trimmed optional `caption` field in the Save request                                                                                            |
| Save page               | replacement reservation                           | `replaceImageId`, ownership-scoped attached target, and effective quota calculation that excludes that target                                   |
| Owner preview           | image URL                                         | `pageId` and `imageId`, derived into the relative owner media path                                                                              |
| Owner recovery          | processing state and retry/remove controls        | non-expired `PageImage` state, `failureCode`, `expiresAt`, and optional ready media path                                                        |
| Public page read        | image list and order                              | current published `Page`, attached `PageImage` rows, `sortOrder`, and `caption`                                                                 |
| Public media read       | image availability                                | current slug, `Page.status`, `PageImage.attachedAt`, and `PageImage.state`                                                                      |
| Public media URL        | browser route                                     | public slug and image ID derived into `/p/[slug]/media/[imageId]`                                                                               |
| Public image rate limit | visitor key                                       | HMAC-validated visitor identity from the Next.js route and the configured trusted proxy address                                                 |
| Cleanup retry           | object key and retry time                         | `MediaCleanup.objectKey`, `attempts`, and `nextRetryAt`                                                                                         |

**Key invariants**:

1. Only an authenticated owner can mutate or read owner media.
2. Every source object key is random, private, and independent of the original file name.
3. The source MIME type, byte size, checksum, and magic bytes must all match before sanitization.
4. Only sanitized WebP output can reach `READY`.
5. Only `READY` images with a nonnull `attachedAt` appear in the public projection; the owner projection may also contain non-expired pending, failed, and ready-but-unattached records needed by the editor.
6. An attached image belongs to one page and has one unique order from 0 through 9.
7. A page has at most 10 effective final image slots and at most 100 MiB (104,857,600 bytes) of effective reserved source bytes. A pending replacement excludes its attached target from both calculations, so a full gallery can replace an image without first deleting it.
8. The page Save transaction owns attachment, replacement, removal, order, and caption changes and uses the existing expected content version.
9. A replacement never removes the old attached image until the new image is ready and successfully saved.
10. Public media lookup requires the current slug, `PUBLISHED` status, an attached ready image, and the matching page image ID.
11. Public and owner image streams never expose R2 keys, source files, EXIF metadata, captions in headers, or request bodies in logs.
12. A failed storage or processing action never attaches an image and can be retried safely. A completion claim is conditional, and a 180-second lease recovers process crashes without allowing two active processors for one image.
13. Database deletion precedes R2 deletion, and every external deletion has a `MediaCleanup` record until it succeeds or reaches explicit `REVIEW` status.
14. Public image responses use `Cache-Control: no-store` and carry no content bearing analytics event.
15. The final sanitized output is at most 8 MiB per image and the attached page is at most 60 MiB of final image bytes.
16. Public authorization and availability checks complete before response streaming starts. A failure after streaming begins may terminate the response but never exposes a replacement JSON body as image content.

**Security model**:

Better Auth sessions authorize all owner operations. Every owner query and mutation scopes by both page ID and session user ID. Missing and non owned pages and images return the same safe `404`. Signed upload URLs are bound to one server generated object key, declared input MIME type, byte size, and SHA 256 checksum. The API verifies all values and inspects magic bytes before processing.

R2 remains private. Public visitors receive only safe image projection fields and use the current slug media route. The API checks current publication state for every image stream, so unpublish and deletion stop delivery immediately. The original upload is deleted after WebP verification, and EXIF metadata is not served. Captions are public creator content, but are never written to logs or image headers. This feature does not introduce a regulated compliance workflow, but it handles personal and potentially sensitive image data under the existing privacy rules.

**Configuration required**:

- `R2_ENDPOINT`: private R2 S3 compatible endpoint for the development or production bucket.
- `R2_BUCKET`: dedicated Letterly image bucket name.
- `R2_ACCESS_KEY_ID`: server side R2 access key for signing and private object operations.
- `R2_SECRET_ACCESS_KEY`: server side R2 secret for signing and private object operations.

Additional configuration:

- `PUBLIC_MEDIA_PROXY_SECRET`: server-only secret used for the five-minute HMAC-SHA256 visitor token between the Next.js media route and the API.
- `TRUSTED_PROXY_COUNT`: validated count of proxy hops allowed to supply the client address used for public media rate limiting.

`R2_PUBLIC_BASE_URL` is not required for this feature because all image delivery uses application routes. Media policy values are validated application configuration with these defaults: one hour upload URL lifetime, 10 MiB (10,485,760 bytes) per source image, 10 images per page, 100 MiB (104,857,600 bytes) per page, 8 MiB (8,388,608 bytes) per sanitized output image, 60 MiB (62,914,560 bytes) of attached output, 180-second completion timeout and processing lease, 24-hour abandoned record expiry, 15-minute cleanup interval, five cleanup attempts before `REVIEW`, two active completions per creator, eight active completions per API instance, 30 owner upload preparations per minute, and 600 public image reads per minute.

The browser computes the SHA-256 digest with Web Crypto and sends standard padded Base64. The presigned PUT requires the same value in `x-amz-checksum-sha256`; Complete independently hashes the downloaded object and never trusts browser-supplied MIME, size, or checksum metadata. Sharp uses `rotate()`, rejects animated and multi-page inputs, and writes non-lossless WebP with quality `82` and effort `4`. `sharp.limitInputPixels(40_000_000)` is configured at process startup.

The R2 development bucket must allow CORS only for configured Letterly web origins, signed upload methods, and required signed headers. No provider credential may reach the browser.

**Critical test scenarios**:

- Happy path: prepare an owner upload, upload a valid image to R2, complete sanitization, save it, reopen the private preview, publish the page, and load the inline public WebP through the Next.js media route, verifying **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-7**, **AC-8**, and **AC-9**.
- Validation and privacy: reject unsupported MIME, spoofed magic bytes, checksum mismatch, oversized files, excessive dimensions, the eleventh image, and a page over 100 MiB. Confirm no usable record or public object exists, verifying **AC-1**, **AC-3**, and **AC-11**.
- Recovery and replacement: reload the owner editor with uploading, failed, ready-unattached, and attached records; retry a failed upload; remove an unready record; and replace the tenth attached image without exceeding the effective 10-slot or 100 MiB quota, verifying **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-11**, and **AC-12**.
- Lifecycle failure: unpublish or delete the page and confirm both public page and old image routes return the same generic not found response without bytes, verifying **AC-6**, **AC-9**, and **AC-13**.
- Concurrency: race two Prepare calls against the 10 image or 100 MiB limit, race two Saves against the page version, race two Complete calls for one image, and run cleanup from two API instances. Confirm one reservation, save, completion claim, or cleanup lease wins and the other receives a safe conflict or skips the claimed task, verifying **AC-4**, **AC-10**, **AC-11**, and **AC-12**.
- Processing and cleanup: expire unready and unattached records, recover a crashed processing lease, simulate malformed, animated, multi-page, oversized-output, and R2 deletion failures, and confirm five backoff attempts followed by `REVIEW` through `MediaCleanup`, verifying **AC-3**, **AC-11**, **AC-12**, and **AC-14**.
- Auth and rate limits: a different creator receives the same safe `404`, an anonymous owner route is rejected, and upload and public media rate limits return safe `429` responses, verifying **AC-10** and **AC-13**.
- Rendering resilience: load the public page with JavaScript disabled, with a failed image response, and on mobile. Confirm all images stay on one page, the letter remains readable, captions are visible, and no navigation controls are rendered, verifying **AC-5**, **AC-8**, **AC-14**, and **AC-15**.

## Build plan

The project uses a Tracer Bullet approach. The first slice should prove one image from R2 upload through the existing page Save and public render. The later tasks thicken that path with quotas, failure recovery, cleanup, and complete browser coverage.

1. Add the Prisma migration for `PageImage` and `MediaCleanup`, including page relations, state values, replacement metadata, processing leases, cleanup claim leases, partial order uniqueness, expiry indexes, and safe deletion behavior. Generate the Prisma client and add the trusted Secret Letter image capability contract. Satisfies **AC-1**, **AC-4**, **AC-6**, **AC-7**, **AC-12**, and **AC-13**.
2. Add validated media policy constants and R2 configuration requirements. Implement the AWS SDK v3 storage adapter, server random object keys, signed PUT URLs with the exact checksum header, strict CORS documentation, effective replacement quota calculation, and owner-scoped Prepare, List, Retry, and Remove actions. Satisfies **AC-1**, **AC-2**, **AC-5**, **AC-10**, **AC-12**, and **AC-13**.
3. Implement Complete with conditional claims and processing leases, exact object lookup, actual-byte hashing, `file-type` magic byte inspection, checksum and dimension validation, animated and multi-page rejection, Sharp EXIF removal and WebP conversion, output limits, source cleanup, idempotent behavior, and safe processing failures. Satisfies **AC-3**, **AC-11**, and **AC-14**.
4. Extend the existing page Save transaction and owner projection with ready image attachment, replacement, removal, ordering, captions, effective quota checks, stale version handling, recovery metadata, and owner media streaming. Satisfies **AC-4**, **AC-5**, **AC-6**, and **AC-7**.
5. Extend shared contracts and the public page mapper with the ordered safe `images` array. Add the API public media stream, publication checks, public media rate limit, no store headers, and safe not found behavior. Satisfies **AC-8**, **AC-9**, **AC-10**, and **AC-13**.
6. Add the Next.js public media route and update the shared Secret Letter render model. Add the creator upload area with picker, drag and drop, local preview, processing states, Retry and Remove, captions, keyboard reorder controls, replacement behavior, and Save integration. Satisfies **AC-4**, **AC-5**, **AC-7**, **AC-8**, and **AC-15**.
7. Update the public Secret Letter renderer to load all ready images after the message on one page, use decorative empty alternative text, render optional captions, show a neutral failed image placeholder, and preserve the server rendered fallback. Satisfies **AC-8**, **AC-9**, **AC-14**, and **AC-15**.
8. Add the scheduled 15-minute cleanup task, `MediaCleanup` retry and `REVIEW` state, row claim leases, expired record handling, stale source-key grace period, page deletion integration, and startup shutdown behavior. Satisfies **AC-6**, **AC-12**, and **AC-14**.
9. Add unit tests, API integration tests against a dedicated R2 development bucket, Prisma transaction tests, safe error and rate limit tests, and Playwright journeys for upload, Save, preview, publish, unpublish, public image reads, no JavaScript, mobile layout, failed images, stale saves, and cleanup. Satisfies **AC-1** through **AC-15**.
10. Run Prisma validation and migration review, API unit and end to end tests, web lint and type checks, both builds, and the complete browser journey with real development R2 configuration. Satisfies **AC-1** through **AC-15**.

## Consequences

**Positive**:

- Large uploads bypass the API request body while the API remains the authorization boundary.
- Unpublishing or deleting a page immediately prevents image delivery, even when an old URL is used.
- EXIF data, original names, source files, and storage keys stay private.
- The creator gets a single page editor and a single inline visitor experience without gallery navigation.
- Safe retry and cleanup states make provider failures recoverable.

**Negative / tradeoffs**:

- Synchronous three minute WebP conversion can occupy API workers and may need a worker migration as usage grows.
- A dedicated `PageImage` cannot be reused on another page, so later media reuse will require a new decision and migration.
- Streaming through Next.js and the API adds network hops and prevents shared image caching.
- Treating all images as decorative because there is no description field limits accessibility when an image carries meaning beyond the letter text.
- R2 CORS, credentials, a development bucket, and real storage integration are required before the feature can be exercised end to end.

**Neutral**:

- Audio, image lightboxes, image pagination, public R2 delivery URLs, and asynchronous media workers remain outside this feature.
- The broader media model in spec 0002 remains a future design input, not an implementation dependency for this slice.

## Follow-up

- [ ] Reconcile the broader asynchronous reusable media model in spec 0002 after this first image slice proves the real path.
- [ ] Provision separate development and production R2 buckets, credentials, and the restricted CORS policy before implementation.
- [ ] Revisit synchronous three minute processing and introduce a worker only after measured API worker pressure or larger media requirements.
- [ ] Revisit image accessibility before adding meaningful image content, captions that must serve as alternative text, or image descriptions.
- [ ] The engineer declined Agent Skill and MCP discovery for the AWS SDK, `file-type`, Sharp, and scheduling tools. Use official documentation and existing repository conventions unless this decision is reopened.
