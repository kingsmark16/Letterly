# Pages feature

## Overview

This feature owns creator page creation, editing, dashboard flows, private preview, and the public Secret Letter presentation. The web layer consumes API contracts and never replaces API ownership or privacy checks.

## Key files

| File                                             | Owns                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `components/create-letter.tsx`                   | Authenticated template selection and draft creation                              |
| `components/draft-editor.tsx`                    | Saved page editing, optimistic version handling, preview, and lifecycle controls |
| `components/publish-controls.tsx`                | Publish, unpublish, slug, deletion, and safe creator feedback                    |
| `components/image-editor.tsx`                    | Direct image upload, completion recovery, captions, replacement, and ordering    |
| `components/question-editor.tsx`                 | Creator question graph authoring and response impact confirmation                |
| `components/visitor-response-form.tsx`           | Anonymous response answers, idempotent retry, and private message states        |
| `components/response-dashboard.tsx`              | Owner response list, detail, read, delete, and retryable error states            |
| `components/locked-letter.tsx`                   | Password unlock state before rendering protected public content                  |
| `components/qr-sharing-panel.tsx`                | Browser generated canonical URL QR preview, download, copy fallback, and recovery |
| `components/secret-letter-renderer.tsx`          | Shared private and public Secret Letter structure                                |
| `../../../app/p/[slug]/page.tsx`                 | Server rendered public projection, safe metadata, and unavailable state          |
| `../../../app/p/[slug]/media/[imageId]/route.ts` | Same origin public media proxy and visitor signing                               |

## Conventions

- Keep initial public data in the server route and fetch it through the API with `cache: no-store`.
- Keep private and public letter content on the shared renderer model, with public data validated by the shared contracts.
- Keep GSAP effects progressive. Server rendered text must remain readable without JavaScript and with reduced motion enabled.
- Keep focus management, touch target sizing, keyboard access, and unavailable states at WCAG AA baseline.
- Do not persist sessions, page data, or motion preference in local storage.
- Keep image bytes out of page Save requests. Use the API upload lifecycle and render only safe media paths returned by the API.
- Keep QR data derived only from the API canonical URL. Do not store QR assets or include passwords, tokens, or tracking values.
- Keep visitor response values in current page state only, retain an idempotency key for explicit retries, and never persist response content locally.
- Preserve dirty editor fields when question mutations advance the shared page content version, and announce owner mutation failures with an explicit retry action.

## Related specs

- [Authenticated Secret Letter draft loop](../../../../../docs/specs/0003-authenticated-secret-letter-draft-loop.md)
- [Public Secret Letter publishing](../../../../../docs/specs/0005-public-secret-letter-publishing.md)
- [Protected links and QR sharing](../../../../../docs/specs/0007-protected-links-and-qr-sharing.md)
- [Visitor responses and creator dashboard](../../../../../docs/specs/0008-visitor-responses-and-creator-dashboard.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
