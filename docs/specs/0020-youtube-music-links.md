# 0020. YouTube music links

**Date**: 2026-09-27
**Status**: In Progress

## Summary

Creators can choose an uploaded song or a YouTube link for the same Music slot. YouTube titles are fetched automatically, and the existing vinyl design controls a visible YouTube player. Uploaded files keep their current storage and delivery flow. This adds YouTube support without downloading its audio or hiding its player.

## Context

The Music editor currently accepts MP3 and M4A uploads. Creators also want to paste a YouTube link, use the familiar vinyl controls, and keep the editor compact on phones. The current player controls a native audio element, and the upload record requires file information that a video link cannot supply.

The feature crosses the existing Next.js interface, NestJS pages feature, shared contracts, PostgreSQL model, and template preview boundary. Owner sessions, password unlock proofs, public availability checks, private R2 storage, and cleanup are already implemented. YouTube adds an external playback dependency, metadata quota, and provider presentation requirements.

This is an additive enhancement to spec 0017. When this feature ships, this spec overrides its exclusion of YouTube and its permission to replace an attached song directly. Its file validation, rights confirmation, storage, streaming, and cleanup rules continue to apply. No application performance problem is being claimed; the metadata cache limits provider calls and bounds retained provider data.

## Requirements

**User stories**:

- As a creator, I can upload a song or paste a YouTube link without learning a different music interface.
- As a recipient, I can choose to hear the attached song while reading the letter.
- As a creator, I can retry a failed link check without losing the link or my draft.

**Acceptance criteria**:

- **AC-1**: Music shows `Music (optional)` and an `Upload` or `Link` choice when the slot is empty. Upload accepts the existing MP3 and M4A flow; Link supports YouTube only.
- **AC-2**: A page has at most one attached music source. A creator must remove the current song before adding another upload or link. The API enforces the same rule, including concurrent requests and pending uploads.
- **AC-3**: A valid YouTube link is saved as a separate link record. Its title is fetched automatically and its availability and embed permission are checked before attachment. Provider metadata expires from the cache after 24 hours.
- **AC-4**: A failed title or embed check leaves the link unsaved, preserves the pasted value, and offers Retry. Invalid or unavailable videos produce a useful inline error; no player or saved source is fabricated.
- **AC-5**: YouTube playback uses the existing vinyl design and custom Play, Pause, seek, and mute controls together with a visible official YouTube embed. It never extracts YouTube audio, obscures the embed, or plays through a hidden YouTube player.
- **AC-6**: A newly opened YouTube source starts at the beginning regardless of a timestamp in the pasted URL. Playback requires a user action and pauses when its section or browser tab is hidden. Loading a public letter does not contact YouTube before the visitor chooses Play.
- **AC-7**: Owner access requires ownership. Locked, unpublished, disabled, deleted, or otherwise unavailable public pages expose no YouTube source or metadata. Existing uploaded audio access and cleanup remain intact.
- **AC-8**: Music uses the Words section's label sizes, alignment, and compact spacing. Actions remain centered; the existing player is hidden while selecting or uploading a file. The layout works across phone, tablet, and desktop widths without horizontal overflow and keeps the YouTube embed at least 200 by 200 pixels.
- **AC-9**: After reload, the attached link remains usable. Expired metadata is refreshed on demand; a provider outage or playback refusal shows recovery actions without preventing the letter from opening.
- **AC-10**: YouTube credentials remain on the server. Link creation can be disabled independently of reading or removing existing sources, and deployment does not require migrating existing uploaded songs.

The criteria above consolidate the confirmed choices into an implementation contract. The explicit concurrency, access, and rollout criteria express the engineering rules needed to deliver those choices safely.

## Options considered

### Option 1: Widen the existing upload record

Add a source type and YouTube fields to `PageAudio`, making the required file fields conditional.

**Pros**:

- Uses one current source relation and much of the existing projection shape.

**Cons**:

- Changes the meaning of upload states, verification, required file fields, and cleanup queries across the working upload lifecycle.

### Option 2: Add a parallel link record

Keep uploaded audio intact and add a YouTube record sharing the page's one music slot. Adapt the player controls to either source.

**Pros**:

- Preserves file invariants and permits an additive rollout.
- Keeps video identity separate from temporary provider metadata.

**Cons**:

- Requires coordination between two source relations and another playback adapter.

### Option 3: Replace music with a provider system

Move uploads and links into a new general source abstraction and migrate existing records and player callers together.

**Pros**:

- Gives future providers a uniform record and API.

**Cons**:

- Adds migration risk and provider machinery before a second link provider is requested.

## Decision

**Chosen option**: Option 2: Add a parallel link record.

Use the current API, database, cache infrastructure, and vinyl presentation, with separate YouTube persistence and the official IFrame Player API (YouTube's browser playback controls).

## Rationale

The upload record's required storage and verification fields are useful constraints, not gaps to remove. A separate link record adds the requested source without spreading nullable file information into the upload worker. The page owns the one source rule, so storage details stay inside their existing boundaries.

The creator originally requested a hidden YouTube player. The confirmed design keeps the official embed visible because YouTube playback cannot be treated as an extracted audio file or a hidden background source. Custom vinyl controls remain useful, but the official player must remain available too.

Use the existing Redis or Valkey service for the 24 hour metadata cache rather than adding infrastructure or persisting provider titles indefinitely. A server API key is sufficient for public video metadata; creator YouTube OAuth is unnecessary.

## Feature design

### Data model

| Entity          | Fields and relationships                                                                            | Constraints                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Page`          | Existing `currentAudioId`; new nullable `currentAudioLinkId` UUID reference to `PageAudioLink`      | Each current reference is unique. A database check prohibits both references being nonnull. Link deletion sets its current reference to null.                       |
| `PageAudio`     | Existing upload fields and ownership relation                                                       | No change to file fields or upload state meanings.                                                                                                                  |
| `PageAudioLink` | UUID `id`; UUID `pageId`; `provider` with sole value `YOUTUBE`; `videoId`; `createdAt`; `updatedAt` | `pageId` is unique and references its owning Page with cascade deletion. `videoId` is exactly 11 allowed characters. The current link must belong to the same page. |
| Metadata cache  | Video ID, title, nullable duration in seconds, embed permission, privacy status, fetched time       | Maximum lifetime 24 hours, including client memory. No persistent title, duration, API payload, thumbnail, or submitted URL in the link row.                        |

Use separate named relations for link ownership and the current link, matching the existing uploaded audio relations. Enforce same page attachment in the repository. The database check is added in the Prisma SQL migration and documented for future schema changes.

`videoId` represents the creator's submitted reference, normalized before any provider request. API derived metadata remains temporary. The distinction does not exempt future provider data from retention rules.

### URL normalization and metadata lookup

- Accept HTTPS `youtube.com`, `www.youtube.com`, `m.youtube.com`, `music.youtube.com`, and `youtu.be` URLs in recognized `watch?v=`, short link, and `/shorts/` forms. A scheme omitted from one of these exact hosts can be normalized to HTTPS.
- Bound input to 2,048 characters. Reject credentials, nonstandard ports, other schemes, lookalike hosts, iframe HTML, malformed IDs, and links containing only a playlist ID.
- Validate the video ID with `^[A-Za-z0-9_-]{11}$`. Store only that ID and derive the canonical `https://www.youtube.com/watch?v=<id>` when needed.
- Ignore timestamp, playlist, tracking, and fragment values. The playback start is always zero on first opening.
- The infrastructure adapter calls the fixed YouTube Data API `videos.list` endpoint with `snippet,status,contentDetails`. It never fetches the pasted address.
- Require a matching video, a nonempty title, nonprivate visibility, and `status.embeddable === true`. Parse the ISO 8601 duration (YouTube's duration notation) into seconds; a live or unknown duration may be null.
- Use a two second request deadline. Return a recoverable error for timeout, quota exhaustion, provider failure, malformed metadata, or cache write failure. Do not hold a database lock during the external call.
- Recheck ownership, page eligibility, active uploads, and the current slot inside the attachment transaction after lookup succeeds.

The check verifies the provider's current response. Regional, age, rights, or later availability changes can still prevent playback for a particular recipient.

### Metadata cache

Define a metadata provider port and an expiring cache port in the application boundary. Infrastructure implements them using native server fetch and the existing Redis client dependency. Development and tests may use an expiring in memory adapter; production uses the configured Redis or Valkey service.

- Namespace cache keys by environment and format version plus video ID. Cache only the safe metadata fields in the table above.
- Positive entries expire exactly 24 hours after fetching. Do not serve expired provider fields as stale data or persist them in browser storage.
- Missing, private, or unembeddable responses may be cached for five minutes. Network, quota, and credential failures are not stored as a missing video.
- Coalesce simultaneous lookups for the same video. Bound provider concurrency to four requests per API process; use a 60 second shared cooldown after quota exhaustion to avoid repeated failures.
- Use existing owner and public rate limit infrastructure for attach and metadata requests. Authenticate and check access before cache lookup or provider work. Public metadata is looked up only for the page's saved source, never for a caller supplied video ID.
- If the cache is unavailable, attachment stays unsaved and returns Retry. For an existing attachment, return identity with the local fallback `YouTube song` while metadata is unavailable; playback can still be attempted through YouTube.
- Existing generic fallback text is product copy, not stale API metadata. Refresh metadata only when Music becomes visible, preview playback opens, or public playback opens. Initial letter projection never waits on YouTube.

### Slot and interface states

| State                      | Presentation                                                                   | Allowed action                                                      |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Empty                      | `Music (optional)`, Upload or Link choice                                      | Pick a file or paste a link                                         |
| File selected or uploading | Existing file title, rights confirmation, progress and errors; no saved player | Existing upload or Retry flow                                       |
| Link draft                 | URL field with label `YouTube link`, brief helper, centered `Add song`         | Add or switch mode; switching preserves the local unsaved URL       |
| Link checking              | URL remains visible; button shows `Checking…`; no player                       | Prevent duplicate submit and mode changes until the result is known |
| Link check failed          | Inline error beside the form                                                   | Retry the same URL or edit it                                       |
| Upload ready               | Existing vinyl player; centered `Remove song`                                  | Play or remove                                                      |
| Link attached              | Vinyl controls and visible YouTube embed; centered `Remove song`               | Play or remove                                                      |
| Playback unavailable       | Source stays attached; brief playback error                                    | Retry player or `Open on YouTube`; creator can remove               |

After successful link attachment, show the verified title and player instead of the paste form. Do not show Choose a different song or an input that can silently replace the attached song. Link attachment uses a checking state, not fake byte upload progress or an upload rights checkbox.

If navigation or a lost connection interrupts the response, reload the page's source before offering a new attachment. Aborting a browser request is not proof that the server did not save it.

The slot transitions from empty to either an upload reservation or a verified link, and returns to empty on removal. Upload states remain `UPLOADING`, `VERIFYING`, `READY`, `FAILED`, and `EXPIRED`. An attached link has no upload lifecycle. Its loading, playing, paused, and error states are browser state only.

### Atomic mutations and races

All source mutations lock the owning Page row in the repository transaction. Upload prepare, retry, verification completion, link attachment, and removal must use the same rule.

- An existing attached source blocks a different attachment with `AUDIO_SOURCE_OCCUPIED`. An active file upload blocks link attachment with `AUDIO_PROCESSING`.
- Repeating attachment of the same normalized video ID returns the existing link. This makes Retry safe after a lost successful response. Recheck this under the lock.
- Removal clears whichever current pointer exists and cancels pending upload work for the slot. Detach and schedule file cleanup in the same transaction using the existing cleanup service. Removing a link deletes its row without an R2 task.
- Late upload completion checks that its reservation is still eligible. It must never restore removed music or replace a subsequently attached source. Retry of an old failed upload obeys the current slot rule too.
- Source mutations remain independent of page content fields and do not change `contentVersion`, matching uploaded audio operations. Concurrent message saves cannot erase music references.

### API surface

Use existing error envelopes, request context, and session or public unlock handling. Paths below are API paths unless a web proxy is named.

| Endpoint                                                        | Method           | Key inputs                     | Key outputs                                                                           | Access                                                                 | Key errors                                                                                                                                      |
| --------------------------------------------------------------- | ---------------- | ------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/v1/pages/:pageId/audio/links`                                 | POST             | `{ url: string }`              | 201 new or 200 existing `{ audioLink }`, including verified title and metadata expiry | Owner session and page ownership                                       | 422 `AUDIO_LINK_INVALID` or `AUDIO_LINK_UNAVAILABLE`; 409 slot occupied or processing; 503 lookup unavailable or links disabled; 429 rate limit |
| `/v1/pages/:pageId/audio/metadata`                              | GET              | Page ID only                   | Saved link identity, current safe metadata or fallback, nullable `metadataExpiresAt`  | Owner session and ownership                                            | 404 safe unavailable; 429 rate limit                                                                                                            |
| `/v1/public/pages/:slug/audio/metadata`                         | GET              | Slug and existing unlock proof | Same safe link metadata                                                               | Published available page, trusted capability, valid proof if protected | Existing locked or unavailable result; 429 rate limit                                                                                           |
| `/p/[slug]/audio/metadata`                                      | GET              | Slug and existing cookies      | Proxy of eligible public metadata, private no store                                   | Same public gate                                                       | Same safe errors                                                                                                                                |
| `/v1/pages/:pageId/audio`                                       | DELETE           | Page ID                        | Idempotent 204                                                                        | Owner session and ownership                                            | Existing ownership or page eligibility errors                                                                                                   |
| Existing upload prepare, complete, retry and file stream routes | Existing methods | Existing inputs                | Existing file contracts                                                               | Existing gates                                                         | Add current slot conflict handling; never stream a YouTube link as file bytes                                                                   |

`audioLink` contains `id`, `provider: 'YOUTUBE'`, `videoId`, `displayTitle`, `durationSeconds: number | null`, and `metadataExpiresAt: string | null`. Expiry is null when only local fallback copy is available. Responses never include an API key, raw provider payload, raw submitted URL, or private storage information.

Keep the existing owner and public `audio` uploaded DTO (the shared response shape) unchanged. Add optional nullable `audioLink`; schema validation prohibits both being present. Add owner `audioSourceOptions` with `upload: boolean` and `youtube: boolean`, derived from trusted template capability and the server creation flag. Existing clients can ignore unknown fields. New clients normalize `audio` and `audioLink` into a local discriminated source type before calling the player.

Initial page projections read metadata only if already cached, otherwise use `YouTube song`. They do not make an external request. Metadata requests refresh after expiry, and the web discards provider fields from its memory cache at expiry. Add source identity to the editor preview protocol; each playback surface requests metadata through its authorized route rather than making direct Data API calls.

### Value sourcing

| Action                       | Value produced or displayed                   | Source                                                                                   |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Show source choice           | Upload and YouTube availability               | Owner `audioSourceOptions`, derived from template capability and `YOUTUBE_LINKS_ENABLED` |
| Add link                     | Owning page and account                       | Route `pageId`, Better Auth session, repository ownership check                          |
| Normalize link               | Video ID and canonical external URL           | Validated submitted URL and fixed canonical URL pattern                                  |
| Verify link                  | Title, duration, visibility, embed permission | Valid cached metadata or successful YouTube Data API response matching the ID            |
| Attach link                  | Link ID and timestamps                        | Server generated UUID and database timestamps                                            |
| Cache metadata               | Expiry                                        | Successful fetch time plus 24 hours; negative entry plus five minutes                    |
| Render existing source       | Source kind and identity                      | Page current pointers and associated upload or link row                                  |
| Render unavailable metadata  | Display title and null duration               | Fixed `YouTube song` copy and null; no stale API fields                                  |
| Player progress and controls | Playing, mute, current time, duration         | Native audio events for uploads; official IFrame API events and getters for YouTube      |
| Initial start                | Zero seconds                                  | This spec; pasted timestamps are discarded                                               |
| Public eligibility           | Available or locked result                    | Existing lifecycle, password proof, and trusted capability checks                        |
| Show errors and Retry        | User copy and retryability                    | Known application error code mapping; no raw provider error                              |
| Remove song                  | Empty slot and cleanup work                   | Current page relations, pending upload reservations, existing media cleanup rules        |

### Player and responsive presentation

Retain `SecretLetterAudioPlayer` as the presentation. Isolate file and YouTube playback operations behind a typed browser adapter; do not place framework or provider SDK code in domain or application code.

- Native `<audio>` remains the uploaded file path. YouTube uses one shared lazy SDK loader and the official IFrame API to play, pause, seek, and mute. No downloader, converter, proxy audio stream, or hidden iframe is permitted.
- Use the privacy enhanced `www.youtube-nocookie.com` embed with normal visible controls and unobstructed branding. The iframe is at least 200 by 200 pixels. Set its title from current metadata or fallback; reserve its dimensions to avoid layout jumps.
- Render the official embed beneath the vinyl controls within the existing light theme, without another decorative player container. On smaller screens reduce vinyl size and spacing first. Do not clip or shrink the official embed to satisfy a height target. Extremely short screens may scroll vertically.
- Labels match Words typography; `(optional)` stays inline. Use existing shadcn tabs, input, and button primitives with their focus and disabled states. Center actions at every width. Do not restore the removed ready banner or explanatory autoplay copy.
- The creator's vinyl controls are expanded as they are today, while the YouTube iframe remains unloaded until Play is pressed. Public and framed preview playback keep the existing manual opener. Before opening playback, load no YouTube SDK, iframe, thumbnail, or preconnect. State the external provider in the opener with `Play on YouTube` or equivalent accessible text.
- Keep the official player visible once opened, including while paused; never cover it with the custom controls. Playback still needs a click. Pass explicit active and open state into the player because the Music tab is currently force mounted even when hidden.
- Pause when the Music tab, preview pane, browser document, or entire player becomes hidden. Unmount and destroy the YouTube instance on source removal or player closure. A player fully outside the viewport pauses too, preventing background playback. Clean up event handlers and progress timers.
- Initial playback starts at zero. Pause and resume retain the current position. Custom progress polls only while playing, updates from provider events, and disables seek until duration is known. Official controls remain available when custom seeking is unavailable.
- Handle SDK failure, browser playback restrictions, deleted or private videos, denied embedding, and missing provider identification. Present Retry and a canonical `Open on YouTube` link. A playback error never clears the saved source automatically.
- Provide labeled controls, keyboard seeking, visible focus, and announced errors. Respect reduced motion for vinyl and confetti animations. No overlay may intercept the official player's controls.

### Security and privacy

Use the existing page authorization service before returning source identity or refreshing metadata. Preserve the public stream controller's password proof check; it already exists. Apply the same protection to new metadata routes and preview messages. Trusted templates with hidden audio return neither source, and publication rules that require music accept a verified attached link or READY upload.

Public availability governs the page's references and metadata access. It cannot revoke a YouTube video itself or a video ID someone already saw. Removing or disabling a page prevents subsequent Letterly projections; already loaded playback is subject to the existing page revocation boundary and the browser's next availability check.

Keep the server key out of `NEXT_PUBLIC_*`, source maps, browser requests, logs, and error bodies. Send it to the fixed Google API endpoint in the supported key header. Redact credential values and avoid logging pasted URLs or video IDs in general request logs. Record bounded counts and latency by result category for attachment, cache, quota, and player failure monitoring.

Do not mark external video requests as private R2 delivery. Privacy enhanced embedding still contacts YouTube after playback opens. Provide a concise disclosure near the public playback opener; existing letter text remains accessible when the provider is blocked.

The iframe uses runtime `window.location.origin` for the IFrame API `origin` and `referrerPolicy="strict-origin-when-cross-origin"` so provider identification includes the origin without the private letter path. Support localhost, LAN, tunnel, and production origins. If a Content Security Policy is present, merge the narrow official SDK and embed hosts into the relevant editor, preview, and public directives without weakening unrelated routes. Preserve existing no store headers and auth route referrer rules.

### Configuration required

- `YOUTUBE_DATA_API_KEY`: server only key with YouTube Data API v3 enabled. Restrict it to that API and to stable server addresses where deployment supports such restrictions. No OAuth client is needed for this metadata path.
- `YOUTUBE_LINKS_ENABLED`: parsed server boolean, default false. Enabling creation requires a valid configured key. It controls adding links and the owner's Link option, not existing playback or removal.
- Existing Redis or Valkey connection settings: reused for metadata expiry, request coalescing where supported, and quota cooldown. Production does not silently substitute an unbounded process cache.

If creation is disabled and a key is missing, existing link playback uses fallback copy with no Data API request. Upload remains available according to the template's existing audio capability.

### Critical test scenarios

- Upload one file and attach one verified link through their respective empty slot flows, verifies **AC-1**, **AC-3**.
- Normalize watch, short, mobile, music, and Shorts links; reject malicious hosts and playlist only links; ignore timestamps, verifies **AC-3**, **AC-6**, **AC-10**.
- Simulate timeout, quota, bad metadata, failed cache writes, and denied embedding; prove no link row or pointer is created and Retry preserves input, verifies **AC-4**.
- Race link attachment against upload prepare and completion; retry a lost successful response; remove during verification and reject late completion, verifies **AC-2**.
- Reload with valid and expired metadata; simulate provider outage and changed availability without blocking letter rendering, verifies **AC-3**, **AC-9**.
- Drive vinyl and official controls together; seek, mute, pause on hidden force mounted tab or document, clean up on removal, verifies **AC-5**, **AC-6**.
- Inspect public network before Play for zero YouTube requests; verify visible embed dimensions, no clipping, centered actions, focus, and reduced motion at phone, tablet, desktop, and short viewport sizes, verifies **AC-5**, **AC-6**, **AC-8**.
- Request owner and public projections and metadata without ownership or unlock proof; unpublish and disable pages; exercise hidden template capability, verifies **AC-7**.
- Regress uploaded range delivery, rights confirmation, removal, failed uploads, and cleanup; verify keys are absent from browser output and logs, verifies **AC-7**, **AC-10**.
- Disable link creation with saved links present; prove reading, removing, and existing upload behavior remain functional, verifies **AC-9**, **AC-10**.

## Build plan

**Approach**: Tracer Bullet. Prove one real watch URL through persistence, API, editor, and published playback before widening inputs and recovery behavior.

1. Build the narrow vertical path behind the disabled flag: one additive migration, link and metadata ports and adapters, additive contracts, owner attach and removal, one valid watch URL, and the visible controlled player in editor and unlocked public view. Include authorization, start at zero, and the one source transaction rule from the first slice, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-6**, **AC-7**, **AC-10**.
2. Extend normalization and unsaved draft states; add complete cache expiry, quota handling, safe errors, Retry, idempotent attachment, reload metadata endpoints, and fallback playback state, satisfies **AC-3**, **AC-4**, **AC-9**, **AC-10**.
3. Complete the force mounted editor and framed preview integration, mobile sizing, centered actions, accessibility, and visibility cleanup across native and YouTube controls, satisfies **AC-5**, **AC-6**, **AC-8**.
4. Exercise source races and late upload completion; add focused contract, repository, adapter, and browser coverage from the critical scenarios, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**.
5. Configure the server key, inspect safe operational signals, and enable link creation only after all serving API and web instances support the additive contracts and slot rules, satisfies **AC-7**, **AC-9**, **AC-10**.

## Migration plan

**Strategy**: Additive deployment with link creation behind a feature flag.

**Phases**:

1. Add the link table, nullable current reference, indexes, and exclusivity check in one migration. Existing upload rows remain valid; no backfill or file transfer is needed.
2. Deploy API source rules and additive projections with creation disabled. Ensure every upload verifier and API instance understands the new slot invariant before links can be attached.
3. Deploy editor, preview, and public player support. Configure the server key and enable creation after the real end to end path is verified.

**Rollback**: Disable new link creation first. Keep the compatible API and player available for saved links. An old web build can omit the additive source, but that loses YouTube playback and is not a full functional rollback. Do not drop the table or revert API invariants while saved links exist. A full removal requires explicitly detaching saved links in a planned data migration.

**Risks**: Old verification code could attempt to attach an upload into a link occupied slot. The database check prevents mixed current pointers, but coordinated API rollout avoids user facing transaction failures. Provider credentials, quota, and platform playback restrictions may fail independently of deployment.

## Consequences

**Positive**:

- Creators gain the confirmed Upload or Link choice using the existing music interface.
- File storage and processing retain their current invariants.

**Negative / tradeoffs**:

- YouTube adds provider outages, quotas, network requests, and playback restrictions that Letterly cannot eliminate.
- The visible embed uses space. Very short viewports cannot always show the entire editor without vertical scrolling.
- A server API key, expiring metadata, and a second playback adapter require maintenance.

**Neutral**:

- No new infrastructure service or YouTube user account connection is required.
- This proposal does not imply support for other video or music providers.

## Follow-up

- [ ] Configure the server YouTube key before enabling link creation.
