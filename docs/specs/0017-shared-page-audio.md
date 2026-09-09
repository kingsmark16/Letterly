# Shared page audio

**Date**: 2026-09-09
**Status**: In Progress

## Summary

Letterly will let a creator attach one private audio track to a page. Secret Letter is the first template to use it, while every current and future category and template can use the same capability. The first release accepts creator owned or properly licensed MP3 and M4A files, preserves their quality, and plays them only after a visitor chooses Play.

## Context

The existing Secret Letter settings reserve a future uploaded music source, but no audio upload, storage, delivery, or player exists. The existing media slice deliberately supports images only and keeps every object in private R2 storage. This decision adds the missing audio foundation without changing image behaviour or adding a general media library.

> Premise note: Client side audio conversion would make the upload flow heavy and unreliable across browsers. The first release validates and previews the selected file in the browser, then stores its original MP3 or M4A bytes. This meets the performance goal without changing the creator's audio quality.

This is an enhancement across the API, contracts, database, storage boundary, creator editor, and public renderer. It assumes the existing Better Auth owner session, page lifecycle, private R2 storage, password unlock proof, rate limits, and durable media cleanup worker. The repository is on `refine/secret-letter-editor-redesign` and is current with `main` on 2026-09-08.

## Requirements

AC-1. A creator can attach one audio track to a page in any category or template that chooses to expose audio.

AC-2. Secret Letter provides the first creator interface and public player, using the existing Secret Letter visual language and the label `Play a song`.

AC-3. The accepted input is one MP3 or M4A file of 25 MiB or less. The creator must confirm that they own the file or have permission to share it before the server prepares an upload.

AC-4. The browser validates the selected file type and size, calculates its SHA 256 checksum, reads duration for creator feedback, and uploads the original bytes directly to private storage. It does not convert, compress, or otherwise re encode the audio.

AC-5. The API verifies the uploaded object before marking it ready. It rejects a content type, byte size, checksum, or binary signature that does not match the prepared upload.

AC-6. A creator can listen to a ready track in the editor and preview. They can replace it, remove it, or retry a failed or expired upload without losing the page draft. A retry requires selecting the source file again and never depends on browser retained bytes or a public copy of the old object.

AC-7. A public visitor can play a ready track only after choosing Play. Playback never starts automatically.

AC-8. A password protected page exposes no audio projection or bytes until its valid page scoped unlock proof is present. Direct requests before unlock receive the same safe unavailable result as other locked page media.

AC-9. Owner delivery requires page ownership. Public delivery requires a current published and available page. Both routes stream through the application and never disclose an R2 URL, storage key, original filename, or creator rights confirmation.

AC-10. Audio delivery supports HTTP byte ranges so browsers can seek and resume playback. It uses private no store cache headers so an unpublish, disable, or password change removes eligibility promptly.

AC-11. Replacing or removing a track detaches it atomically and schedules old objects for the existing durable cleanup process. Failed uploads and expired prepared uploads are also cleaned up.

AC-12. Future template definitions can opt into the common audio capability, and can require a ready track for publication, without another storage or delivery system.

AC-13. Upload, verification, ownership, protected access, replacement, removal, cleanup, range delivery, upload progress, failure recovery, keyboard player controls, mute, playback errors, and reduced motion behaviour have focused automated coverage.

## Options considered

### Option 1: Extend the private page media boundary

Reuse page scoped ownership, private R2 storage, application routes, and durable cleanup. Add audio as a shared page capability beside images.

**Pros**:
- Reuses proven privacy, ownership, and cleanup boundaries.
- Keeps one implementation available to every category and template.

**Cons**:
- Adds another media lifecycle to the existing page module.

### Option 2: Create a general reusable media asset library

Store audio as independently reusable assets and attach references to pages.

**Pros**:
- Future reuse across pages would be easier.

**Cons**:
- Introduces sharing, ownership, retention, and authorization rules that the first release does not need.

### Option 3: Use an external audio or YouTube player

Delegate playback and storage to an external provider.

**Pros**:
- Reduces application storage and streaming code.

**Cons**:
- Weakens privacy and password boundaries, adds provider dependency, and does not support the required private upload flow.

## Decision

**Chosen option**: Option 1: Extend the private page media boundary

Create a shared `PageAudio` capability. It belongs to a page rather than to Secret Letter, is private by default, and has a single attached ready track per page. Secret Letter reads that capability and renders the first player. New templates decide through trusted template metadata whether audio is hidden, optional, or required.

**Implementation skills**: `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `prisma-client-api` (`prisma/skills`, `.agents/skills/prisma-client-api/`) · `turborepo` (`vercel/turborepo`, `.agents/skills/turborepo/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

The system uses the existing direct private R2 upload and application proxy pattern. It keeps original MP3 or M4A bytes rather than introducing a browser encoder, a server transcoding service, or YouTube playback. The runner up was a general reusable media asset library. It is not selected because reuse across pages is out of scope and would introduce ownership and sharing rules the product does not need yet.

## Feature design

### Data model

Add a `PageAudio` model with a generated UUID primary key and a required `pageId`. It records `state`, `sourceStorageKey`, `sourceMimeType`, `sourceByteSize`, `sourceSha256`, `durationMilliseconds`, `rightsConfirmedAt`, `rightsStatementVersion`, `failureCode`, `uploadExpiresAt`, `processingLeaseExpiresAt`, `expiresAt`, `createdAt`, and `updatedAt`.

`PageAudio.state` is `UPLOADING`, `VERIFYING`, `READY`, `FAILED`, or `EXPIRED`. `VERIFYING` is the processing state while the server checks the uploaded object. `EXPIRED` is a terminal cleanup state for detached, removed, or expired records and is never eligible for public playback. The database uses the page's nullable `currentAudioId` relation to identify its only attached ready track. A page can therefore keep its current track while a replacement is uploading. In one page locked transaction, a ready replacement becomes current, the former record is detached, and its private object is queued for cleanup.

### State transitions

`UPLOADING` moves to `VERIFYING` when completion claims the upload. Successful verification moves it to `READY`. A verification failure moves it to `FAILED`. An expired, removed, detached, or replaced record moves to `EXPIRED` and is queued for cleanup. A retry of a `FAILED` or `EXPIRED` record creates a new `UPLOADING` record with a new storage key. Only `READY` can be attached as the page's current audio, and a replacement does not detach the current track until the replacement is ready.

`PageAudio.pageId` is the named ownership relation and is indexed for owner operations and cleanup. `Page.currentAudioId` is the separately named current track relation and is unique. Deleting a current audio record clears `currentAudioId` to null. Deleting a page cascades to every owned audio record, then creates cleanup tasks for every corresponding object key. The database never stores a browser supplied original file name.

The rights confirmation uses a versioned fixed statement in the browser. The server records the accepted statement version and timestamp, never the browser supplied statement text. This preserves a meaningful confirmation when the wording changes in the future.

Secret Letter settings no longer own an audio asset identifier. `autoPlayMusic` remains a read only compatibility field and is always ignored. The shared public and owner projections derive ready audio availability from `Page.currentAudioId`. This prevents a stale template JSON field from pointing to an inaccessible file.

### Browser upload and quality preservation

The creator selects a local file in an accessible audio editor section. Before any request, the browser checks the declared type and extension, accepts `.mp3` and `.m4a` when a browser reports an empty MIME type, rejects files above 25 MiB, hashes the file with Web Crypto, and loads metadata from an object URL to show duration. Duration is informational only and does not determine authorization or server acceptance. The editor uses a separate creator supplied display title, starting with the neutral suggestion `Our song`; the original filename is never used as the public title.

The browser sends a prepare request containing the claimed content type, byte size, checksum, and a required rights confirmation. The server returns a short lived signed private upload URL and required headers. The browser sends the unchanged file bytes directly to R2, then calls completion. Upload progress is shown with a progress element and clear text state.

The browser never loads a WebAssembly encoder and never converts MP3 to M4A or the reverse. It releases object URLs after preview or replacement, lazy loads the audio element only when needed, and does not preload public audio before a visitor selects Play.

### Verification and lifecycle

On completion, the API claims the pending record with a bounded processing lease. It reads the private object, confirms its length and checksum, and verifies its binary signature as an accepted MP3 or MP4 audio container. The verified storage MIME type becomes the canonical type. A verification failure marks the record failed, records a bounded safe failure code, and queues the object for cleanup.

The creator can retry only a failed or expired record by selecting the source file again. The retry flow creates a fresh storage key, checksum, signed URL, and expiry. A new upload never replaces the active track until it has completed verification. Removal immediately clears `currentAudioId`, making the player unavailable, then queues the object. Every cleanup failure uses the existing lease, retry, and review path.

### API surface

The owner API provides these authenticated page scoped operations.

1. `POST /v1/pages/:pageId/audio/uploads` prepares one upload and accepts content type, byte size, checksum, and rights confirmation. It returns the audio ID, signed URL, required headers, expiry, and upload state.

2. `POST /v1/pages/:pageId/audio/:audioId/complete` verifies a successfully uploaded object and returns its ready or failed state.

3. `POST /v1/pages/:pageId/audio/:audioId/retry` prepares a replacement upload only for a retry eligible failed or expired record. It accepts the selected file metadata, checksum, display title, duration, and rights confirmation, then returns a fresh audio ID, private upload URL, required headers, expiry, and `UPLOADING` state.

4. `DELETE /v1/pages/:pageId/audio` removes the attached track.

5. `GET /v1/pages/:pageId/audio` returns owner only audio metadata and streams the attached bytes. Without a `Range` header it returns the complete object. With a valid range it returns `206 Partial Content` and the requested inclusive byte range.

The public API exposes `GET /v1/public/pages/:slug/audio`. The web application mirrors it through `GET /p/[slug]/audio`. Both accept an optional single `Range` header in the form `bytes=start-end`, where the end may be omitted. They return either full content or `206 Partial Content`, and forward `Content Type`, `Content Length`, `Accept Ranges`, and `Content Range` headers. Suffix ranges and multiple ranges are unsupported and return `416 Range Not Satisfiable`, as do ranges outside the object. Locked, missing, unpublished, unavailable, disabled, expired, detached, and unready audio returns the existing safe unavailable result without confirming why.

Add a provider independent range read operation to `MediaStorage`. It returns a readable byte stream and verified object metadata for a requested inclusive byte range. `R2Storage` passes that range to the object request and the controller pipes the stream to the response without buffering the track. Completion verification may read the complete object because the server already enforces the 25 MiB maximum.

The public page projection includes an internal same origin audio URL only when a ready attached track is eligible for that visitor. The locked projection contains no audio data. The owner projection includes only safe status, duration, MIME type, byte size, and same origin owner URL.

### Value sourcing

| Action | Value produced or displayed | Source |
|---|---|---|
| Prepare upload | Audio ID and private object key | Server generated UUID and page ID |
| Prepare upload | Upload expiry and record expiry | Server clock and fixed lifecycle limits |
| Prepare upload | Rights statement version and timestamp | Server constant and server clock |
| Browser editor | Display title and duration | Creator entered display title, neutral `Our song` default, and browser audio metadata |
| Completion | `READY`, `FAILED`, or `VERIFYING` state | Server verification result and `PageAudio.state` |
| Owner projection | Status, title, duration, MIME type, byte size, and owner URL | Owned `PageAudio` columns and the page ID route |
| Public projection | Safe title, duration, and public URL | Ready attached `PageAudio`, published page availability, and slug route |
| Audio stream | Byte range and response length | HTTP `Range` header and storage provider metadata |
| Protected playback | Audio eligibility | Page scoped password unlock proof and public availability predicate |

### Authorization and privacy

Repository queries enforce ownership for every creator mutation and owner stream. Public delivery reuses the published availability predicate and the page scoped password unlock proof. The Next route forwards the browser cookies and signed visitor identity only to the API, just as unlock and response routes do.

All R2 objects remain private. Application routes add `Cache Control: private, no store`, `X Content Type Options: nosniff`, and content disposition suitable for inline audio playback. Logs and metric events use only audio ID, page ID, MIME type, byte size, state, and safe error code. They never include a storage key, signed URL, filename, rights confirmation value, or audio bytes.

### Secret Letter experience

The editor presents an audio section consistent with the current Secret Letter editor. It contains a file chooser, editable display title, rights confirmation, validation errors, upload progress, a compact owner preview player, replace action, remove action, and retry action. Retry asks the creator to select the source file again. The player has an accessible name, keyboard usable Play and Pause control, current time, duration, seek control, mute control, visible focus state, and a reduced motion safe appearance.

The public Secret Letter shows the existing styled `Play a song` control when its projection carries ready audio. Pressing it creates or activates the audio element. The control changes to Pause while playing and exposes the same keyboard and screen reader state. The safe display title may be shown in the player. The original filename, storage key, rights confirmation, and signed upload URL are never shown. The opening scene and locked view do not request or preload the file.

### Template capability

Add a trusted template capability with three values, `hidden`, `optional`, and `required`. Current templates default to `hidden` except Secret Letter, which is `optional`. A future template can set `required`, and the existing publish readiness check must then require `Page.currentAudioId` to reference a ready audio record. Category membership does not change storage or authorization behaviour.

### Failure handling and limits

The API validates input before signing, enforces one active prepared upload per page, and uses bounded per creator processing concurrency. It returns stable errors for invalid type, invalid size, missing rights confirmation, page not found, upload expired, processing in progress, checksum mismatch, verification failure, storage unavailable, and unavailable public audio.

The UI keeps the last ready track playable while replacement fails. A failed, expired, or removed candidate never appears in the public projection. Browser validation provides immediate feedback but the server verification is authoritative. The feature introduces no autoplay, no YouTube source, no playlists, no cross page reuse, no public audio search, no audio transcoding, and no general commercial music catalog.

## Build plan

1. Add the shared `PageAudio` schema, page relation, state enum, indexes, migration, cleanup integration, and repository interfaces. Keep the existing image records and cleanup lifecycle unchanged.

2. Build the thin server path from owner upload preparation through private R2 upload, completion verification, atomic attachment, owner stream, public stream, and byte range support. Enforce owner, published availability, and password unlock boundaries before creating the Secret Letter interface.

3. Extend shared contracts and trusted template metadata. Derive owner and eligible public audio projections from the page relation, preserve backward compatible Secret Letter stored settings, and make Secret Letter optional for audio readiness.

4. Build the browser quality preserving upload component and page editor integration. Add client validation with extension fallback, hashing, local metadata preview, an editable display title with a neutral default, rights confirmation, upload progress, recovery states, retry for failed or expired records after file reselection, replacement, and removal.

5. Replace the disabled Secret Letter music placeholder with the accessible custom player. Keep playback manual, lazy, styled with the existing letter, and unavailable until protected content has been unlocked. Include keyboard accessible mute control and an accessible playback error state.

6. Add migration, service, repository, storage adapter, controller, contract, component, and browser journey coverage. Verify range responses, page state changes, cleanup retries, password gating, no storage key exposure, keyboard interaction, and reduced motion.

## Migration plan

**Strategy**: no migration needed for this correction
**Phases**:
1. Keep the deployed `PageAudio` schema and its `VERIFYING` and `EXPIRED` states as the source of truth.
2. Add the retry operation, editable display title, upload progress, mute control, and their focused coverage in the next `/develop` slice without changing the current attachment rule.
**Rollback**: revert the retry application, API, and editor changes without changing existing audio rows.
**Risks**: retry work must preserve the active ready track and must continue to queue failed or expired source objects for cleanup.

## Consequences

The first end to end slice adds database and storage complexity but avoids a new media provider or audio processing fleet. Keeping a single page scoped source means later templates can reuse a proven authorization and delivery boundary without receiving cross page audio sharing by accident.

MP3 and M4A keep the upload surface compatible with the native HTML audio element. A 25 MiB cap limits bandwidth and storage while preserving practical letter music. Creators who need a smaller file should export it before upload. If measured usage later shows a need, server side transcoding can be designed as a separate decision with explicit quality, cost, and retention rules.

## Follow up

1. Implement the owner retry operation and editor retry action for failed or expired uploads after the creator selects the source file again. Add the separate display title field and keep the original filename private.

2. Complete AC-13 coverage and run `/check verify shared page audio`, including protected public playback, range responses, upload progress, keyboard controls, mute, playback errors, and reduced motion behaviour.

3. Consider a future audio enhancement only after usage data exists. It may decide whether server side transcoding, accessibility captions, song titles, multi track playlists, or third party licensed music deserve their own product and legal design.

## Rationale

The image media slice establishes the correct trust boundary, private R2 objects, server generated keys, owner scoped operations, safe public delivery, and durable cleanup. Reusing that structure gives audio its needed privacy guarantees while keeping it independent of one template.

One direct upload is simpler than a reusable library. It gives creators exactly the requested one track per letter experience and keeps future template support as a capability choice rather than a second implementation. Preserving the selected file avoids the compatibility, download, memory, device performance, and quality issues of client side encoding.
