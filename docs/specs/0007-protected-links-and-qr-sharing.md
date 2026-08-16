# 0007. Protected links and QR sharing

**Date**: 2026-08-15
**Status**: Accepted

## Summary

Creators can protect a published letter with the existing page password flow and share its canonical public URL with a QR code. The QR is generated in the browser as high contrast SVG, contains no password or tracking data, and is never stored. Existing public, unlock, ownership, and privacy rules remain the source of truth.

## Context

Letterly already has page passwords, page scoped unlock proofs, safe public projections, rate limits, and owner lifecycle controls. The remaining product gap is a safe way for an owner to share a published page without creating another stored media asset or another public access path.

The QR must remain useful after it is printed, must not disclose the password, and must not make private confession pages searchable. Public routes already receive a server generated canonical URL, and this feature extends the owner projection with the same server value. The API already owns page lifecycle and authorization decisions.

The public publishing decision in spec 0005 currently permits changing a published slug. This feature replaces that one behavior because a printed QR must continue to point to the same page after first publication. The existing slug reservation history remains useful for uniqueness and safe deletion.

The blueprint lists QR generation as a planned API capability. This decision fulfills the capability with browser generated SVG and deliberately does not add a QR endpoint or stored QR asset.

## Requirements

**User stories**:

1. As a page owner, I want a QR code for my published letter so that I can share it in print or on another screen.
2. As a visitor, I want a scanned protected link to use the normal password gate so that the QR never exposes the password.
3. As a creator, I want to revoke a shared link with the existing unpublish control so that an old QR cannot reveal the letter after revocation.

**Acceptance criteria**:

1. **AC-1**: An authenticated owner sees the sharing panel only for their own published page. A draft, unpublished, archived, unknown, or unauthorized page does not expose sharing controls.
2. **AC-2**: The authenticated owner page response includes `canonicalUrl: string | null`. The API derives it only for a `PUBLISHED` page from validated `APP_ORIGIN` and the page's current canonical slug. No QR endpoint, QR record, QR object, or QR history record is added.
3. **AC-3**: After the panel mounts, the browser generates an SVG with `qrcode.toString(canonicalUrl, { type: "svg", errorCorrectionLevel: "H", margin: 4, color: { dark: "#000000", light: "#ffffff" } })`. The options are fixed and are not creator editable.
4. **AC-4**: The QR encodes only the API returned canonical URL. It contains no password, query string, fragment, redirect token, or tracking value. In production the configured `APP_ORIGIN` must use HTTPS.
5. **AC-5**: The owner can see a responsive QR preview, download a scalable UTF 8 SVG with MIME type `image/svg+xml;charset=utf-8` named `letterly-{slug}.svg`, and copy the canonical URL. The filename uses the API owner's canonical `slug`, sanitized to lowercase ASCII letters, numbers, and single hyphens, with `letterly-qr.svg` as the fallback. The URL is visible in a read only selectable field at all times. If clipboard access is unavailable, an `aria-live` status explains that it can be copied manually.
6. **AC-6**: A QR scan opens the normal `/p/{slug}` public route. A protected page shows the existing locked projection and password gate, and an unprotected page follows the existing public presentation flow. The password is never included in the QR or returned by the owner sharing response.
7. **AC-7**: Incorrect unlock attempts use the existing public unlock rate limit, generic safe error, and `Retry-After` behavior. A correct unlock creates the existing page scoped HTTP only unlock proof for one day. Changing or removing the page password revokes existing unlock proofs immediately.
8. **AC-8**: A draft slug may change through the existing draft slug action or publish input, then becomes immutable at first publish. `PATCH /api/v1/pages/:pageId/slug` rejects a published page with `409 INVALID_STATE`, and the published slug change control is removed from the web UI. Unpublish and archive keep the URL reserved but return the same safe `404 PAGE_NOT_FOUND` public response as an unknown slug. An old QR therefore reaches an unavailable state rather than revealing content.
9. **AC-9**: Public letter pages return `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`, and are excluded from the sitemap. Locked projections contain no confession content.
10. **AC-10**: Generation failure is distinct from preview failure. If SVG generation fails, the panel shows an inline error and retry action while keeping the URL and copy action available. If generation succeeds but preview rendering is unavailable, the SVG download remains available from the generated string and the panel shows a clear fallback message. Application code does not log the canonical URL or raw slug, and existing metrics use route templates or redacted values. No new client telemetry is added.
11. **AC-11**: The sharing panel meets the existing WCAG AA baseline. The QR region is labelled `QR code for {canonicalUrl}`, the canonical URL is visible as read only text, copy success and failure use an `aria-live` status, retry and download controls are keyboard reachable with visible focus, and the layout adapts to narrow screens.
12. **AC-12**: QR scans have no separate analytics. Existing public request metrics and existing safe error logging remain unchanged and never include passwords, cookies, raw IP addresses, storage paths, or confession content.

## Options considered

### Option 1: Browser generated SVG from the canonical URL

The API supplies the canonical URL in the owner projection. A client component uses the `qrcode` package to generate an SVG on demand.

**Pros**:

1. No database migration, storage lifecycle, or new API endpoint.
2. SVG stays sharp for print and can be downloaded without an image service.
3. The password and unlock token never enter QR data.

**Cons**:

1. A client side dependency and browser error state are required.
2. QR preview generation is not available before hydration.

### Option 2: Server generated QR files

The API would create QR data or an image asset and store or serve it for the owner.

**Pros**:

1. Output is consistent across browsers.
2. A server could provide more download formats later.

**Cons**:

1. Adds an endpoint, storage or rendering work, cleanup, and invalidation concerns.
2. Stored files can become stale when the canonical URL or publication state changes.

### Option 3: External QR service

The browser or API would send the public URL to a third party that returns a QR image.

**Pros**:

1. Little local QR implementation work.

**Cons**:

1. Adds a privacy, availability, and supply chain dependency for sensitive links.
2. It is unnecessary for a short URL and conflicts with the private sharing goal.

## Decision

**Chosen option**: Option 1, browser generated SVG from the canonical URL.

The existing protected page implementation stays in place. The feature adds a client sharing panel and hardens the existing lifecycle and public contracts needed to keep shared links stable and revocable.

This is a focused superseding decision for the published slug rename behavior in spec 0005. The implementation must update that route and its creator control while retaining the rest of the publishing design.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `better-auth-security-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-security-best-practices/`)

## Rationale

Client generated SVG is the smallest change that meets the sharing goal. It reuses the server owned canonical URL, avoids a new persistence model, and keeps passwords and unlock proofs out of the QR data. It also matches the tracer bullet approach by adding one narrow owner to browser path through the existing page response.

The current password and public projection code already supplies the security boundary. Replacing it or introducing a second public route would create duplicate authorization and invalidation rules. A stored or external QR would add failure modes without improving the core sharing contract.

## Feature design

**Data model sketch**:

1. `Page` remains the only feature entity. Existing fields used are `id`, owner identity, canonical slug, `displaySlug`, publication state, password protection, password version, and the existing canonical URL projection.
2. The owner account relationship remains one owner to many pages and is enforced by the existing owner predicate.
3. No new table, column, index, object, or retention job is required.

**State transitions**:

1. Draft page, slug may change, sharing unavailable.
2. First publish, slug becomes immutable, sharing becomes available to the owner.
3. Published page, QR points to the stable canonical URL.
4. Unpublish or archive, the URL remains reserved but public reads return safe `404 PAGE_NOT_FOUND`, and the owner sharing panel hides QR actions.
5. Republish, the same stable slug becomes available again subject to existing publication rules.
6. Password change or removal, the password version changes and existing unlock proofs are revoked.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/pages/:pageId` | `GET` | `pageId` from the authenticated owner route | Existing owner projection including publication state, canonical `slug`, and `canonicalUrl: string | null` | Authenticated owner | Existing not found and ownership errors |
| `/api/v1/public/pages/:slug` | `GET` | Stable public slug, visitor identity and unlock cookie when present | Existing locked or unlocked public projection | Anonymous, with existing visitor and unlock checks | Safe `404 PAGE_NOT_FOUND`, rate limit, existing public errors |
| `/api/v1/public/pages/:slug/unlock` | `POST` | Password in the request body, visitor identity | Existing one day page scoped unlock cookie and unlocked projection | Anonymous visitor | Existing generic invalid password and rate limit errors |
| `/api/v1/pages/:pageId/publish` | `POST` | Existing publish input | Existing published owner projection and canonical URL | Authenticated owner | Existing validation and lifecycle errors |
| `/api/v1/pages/:pageId/unpublish` | `POST` | `pageId` | Existing unavailable owner projection | Authenticated owner | Existing ownership and lifecycle errors |
| `/api/v1/pages/:pageId/password` | `PATCH` | Existing password input or removal | Existing owner projection with updated password state, never plaintext password | Authenticated owner | Existing validation and lifecycle errors |
| `/api/v1/pages/:pageId/slug` | `PATCH` | Draft `customSlug` input | Existing lifecycle response with the draft slug; a published page is rejected | Authenticated owner | `409 INVALID_STATE`, existing validation, ownership, and reservation errors |

No endpoint returns QR markup, QR files, passwords, unlock proofs, or tracking identifiers.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Show sharing panel | Publication state and owner eligibility | Existing authenticated owner page projection and ownership predicate |
| Build QR input | Canonical public URL | API returned `canonicalUrl`, derived as `new URL(`/p/${encodeURIComponent(page.displaySlug)}`, APP_ORIGIN).toString()` and returned only when the page is published |
| Generate SVG | QR markup | `qrcode.toString` in the mounted client component, fixed black and white options, high error correction, standard quiet zone |
| Download SVG | Filename and file contents | API owner `slug`, sanitized to the allowed filename alphabet with `letterly-qr.svg` fallback, and a UTF 8 Blob with `image/svg+xml;charset=utf-8` from the generated SVG string; object URLs are revoked after download |
| Copy URL | Text copied or shown for selection and status | The same API returned `canonicalUrl`, a read only visible field, and an `aria-live` status |
| Show locked page | Safe locked projection | Existing public page projection, password state, visitor identity, and page scoped unlock proof |
| Decide public availability | Published or unavailable state | Existing page lifecycle state and safe public read rules |
| Revoke unlocks | Current password version and proof revocation marker | Existing password update transaction and unlock proof store |

**Key invariants**:

1. The owner sharing panel never trusts a browser supplied owner id or canonical URL.
2. Only the API returned canonical URL is encoded.
3. A published slug cannot change after first publication. The existing live slug route returns `409 INVALID_STATE` and the live slug control is absent.
4. QR output is generated on demand and is not persisted.
5. Passwords, unlock cookies, proof values, visitor identity tokens, and confession content never enter QR data, filenames, application logs, analytics, or public locked projections. Standard access logs must use the existing redaction policy.
6. Unpublish and archive use the same safe public unavailable contract as an unknown slug.
7. Password updates revoke prior page scoped unlock proofs.
8. The public unlock route keeps the existing fail closed rate limit and generic error behavior.
9. `APP_ORIGIN` must be HTTPS in production.

The existing password, unlock cookie, and rate limit values remain authoritative. Their implementations are `apps/api/src/infrastructure/http/unlock-cookie.ts`, `apps/api/src/infrastructure/http/rate-limit.service.ts`, and `apps/api/src/modules/pages/application/page-password.service.ts`; their broader data and privacy contracts are recorded in specs 0002 and 0005.

**Security model**:

1. Better Auth protects the owner route. Repository queries enforce page ownership.
2. Anonymous visitors may request a public slug, but the API exposes only the validated locked projection until a valid page scoped unlock proof exists.
3. Unlock proofs remain HTTP only, page scoped, and valid for one day. Password changes revoke them.
4. The QR is a public URL, not a credential. It must never contain a password, unlock token, redirect token, query parameter, or fragment.
5. Public pages return `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, are excluded from the sitemap, and use safe unavailable responses that do not reveal whether a private page exists.
6. Existing same origin route handlers, signed visitor identity forwarding, secure cookies, and route specific rate limits remain mandatory.

**Configuration required**:

1. `APP_ORIGIN`: reuse the existing validated setting. Add startup validation that rejects a non HTTPS origin when `NODE_ENV === "production"`.
2. No new secret, credential, storage bucket, feature flag, or analytics provider is required.

**Critical test scenarios**:

1. Happy path, publish a page, open the owner sharing panel, generate the SVG, download `letterly-{slug}.svg`, and copy the canonical URL, verifies **AC-1**, **AC-2**, **AC-3**, and **AC-5**.
2. QR content, inspect the generated SVG or decoded value and confirm it contains only the API canonical URL, verifies **AC-4**.
3. Protected visitor path, scan or open the URL, confirm locked content is absent, reject a wrong password safely, then unlock with the correct password and confirm the one day page scoped proof, verifies **AC-6** and **AC-7**.
4. Lifecycle, confirm draft slug edits work, first publish locks the slug, unpublish and archive return the safe 404, and republish keeps the same slug, verifies **AC-8**.
5. Password revocation, unlock a page, change its password, and confirm the old proof no longer unlocks it, verifies **AC-7**.
6. Privacy metadata, confirm `Cache-Control: no-store`, exact `X-Robots-Tag: noindex, nofollow, noarchive`, no sitemap entry, safe locked projection, and no QR analytics, verifies **AC-9** and **AC-12**.
7. Failure states, force QR generation failure, deny clipboard access, and emulate unsupported SVG rendering. Confirm retry, selectable URL, and fallback messaging remain available, verifies **AC-10**.
8. Authorization and accessibility, deny another authenticated user access to the sharing panel and exercise the panel by keyboard and a narrow viewport, verifies **AC-1** and **AC-11**.

## Build plan

The project uses a tracer bullet approach. The first slice proves the existing owner projection through a generated QR and public URL, then the surrounding lifecycle and failure rules are hardened.

1. [x] Add the `qrcode` package and a focused client sharing panel in the existing pages feature. Load it only when the published owner panel is mounted, generate direct SVG with the agreed options, and render the URL text, preview, download action, copy action, loading state, and retry state. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, and **AC-11**.
2. [x] Extend the owner contract with nullable published `canonicalUrl`, derive it from `APP_ORIGIN` and the canonical slug, make draft slug edits explicit, reject published slug changes with `409 INVALID_STATE`, remove the live slug control, and reconcile the affected publishing decision in spec 0005. Add production HTTPS validation and exact public response headers. Satisfies **AC-2**, **AC-4**, **AC-8**, and **AC-9**.
3. Verify the existing password, unlock proof, revocation, visitor identity, and rate limit paths against the QR entry path. Keep all authorization and security decisions in the API and transport boundaries. Satisfies **AC-6**, **AC-7**, and **AC-12**.
4. Add unit and component coverage for SVG generation, filename sanitization, URL copying fallback, accessibility labels, responsive states, unsupported rendering, and retry. Satisfies **AC-3**, **AC-5**, **AC-10**, and **AC-11**.
5. Add API integration and Playwright coverage for owner authorization, publish and unpublish lifecycle, QR content, protected unlock behavior, password revocation, safe public errors, metadata, caching, and no persistence. Satisfies **AC-1** through **AC-12**.

## Consequences

**Positive**:

1. QR codes remain crisp for print and do not need storage or cleanup.
2. The QR never becomes a second credential or public access path.
3. Existing page ownership, password, rate limit, and revocation rules remain centralized in the API.
4. Unpublish remains the single creator control for revoking a shared URL.

**Negative and tradeoffs**:

1. The `qrcode` dependency increases the web bundle when the sharing panel is loaded.
2. SVG generation and clipboard support require explicit client error and fallback states.
3. Owners cannot retrieve a previously saved password from the sharing panel.
4. QR scan analytics and customized colors or logos are intentionally out of scope.

**Neutral**:

1. No database migration or Cloudflare R2 change is needed.
2. Existing QR images downloaded by an owner are local files and are not recoverable or revocable as files. Their URL remains governed by page publication and password state.

## Follow-up

1. [ ] Keep the declined Agent Skill and MCP discovery recorded for this feature. Do not add a new tool unless the implementation exposes a concrete need.
2. [ ] If client error monitoring is introduced later, define a redacted event contract before adding QR failure telemetry.
