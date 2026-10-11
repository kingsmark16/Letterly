# Pages feature

## Overview

This feature owns creator page creation, editing, dashboard flows, private preview, the public Secret Letter presentation, and the Choose Your Heart editor and visitor journey. The web layer consumes API contracts and never replaces API ownership or privacy checks.

## Key files

| File                                             | Owns                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `../catalog/components/create-draft-button.tsx`  | Explicit draft creation from template actions with sign-in return routing         |
| `editor/draft-editor.tsx` | One owner query, exact template identity selection, lazy editor loading, and shared errors |
| `editor/secret-letter-draft-editor.tsx` | Secret Letter form, autosave, conflicts, media, preview, and section navigation |
| `editor/choose-your-heart-workspace.tsx` | Journey workspace navigation, dirty exit protection, and shared deletion |
| `editor/delete-page-control.tsx` | Shared owner deletion, confirmation, and query cleanup |
| `editor/publish-controls.tsx`                | Publish, unpublish, slug, deletion, and safe creator feedback                    |
| `media/image-editor.tsx`                    | Direct image upload, completion recovery, captions, replacement, and ordering    |
| `media/audio-editor.tsx`                    | Direct audio upload, rights confirmation, owner preview, replacement, and removal |
| `editor/question-editor.tsx`                 | Creator question list authoring and response impact confirmation                |
| `public/visitor-response-form.tsx`           | Anonymous response answers, idempotent retry, and private message states        |
| `responses/response-dashboard.tsx`              | Owner response list, detail, read, delete, and retryable error states            |
| `public/locked-letter.tsx`                   | Password unlock state before rendering protected public content                  |
| `editor/qr-sharing-panel.tsx`                | Browser generated canonical URL QR preview, download, copy fallback, and recovery |
| `../../templates/secret-letter/renderer.tsx`     | Secret Letter presentation, envelope motion, and shared private and public structure |
| `editor/choose-your-heart-editor.tsx`           | Choose Your Heart reads, saves, conflicts, and page lifecycle orchestration      |
| `public/template-content.tsx` | Registered public presentation adapters with safe projection narrowing and response/report slots |
| `public/choose-your-heart-page.tsx` | Validated visitor submissions, retry identity, safe errors, and bounded metrics |
| `../../../app/p/[slug]/page.tsx`                 | Server rendered public projection, safe metadata, and unavailable state          |
| `../../../app/p/[slug]/media/[imageId]/route.ts` | Same origin public media proxy and visitor signing                               |
| `../../../app/p/[slug]/audio/route.ts`           | Same origin private audio proxy, visitor signing, and range forwarding           |

## Conventions

- Register creator editor loaders by immutable template registry key, resolve renderer and pinned version before mounting, and pass the existing owner query through `editor/editor-context.ts`. Keep editors mounted behind the shared error state during failed background refreshes so retry preserves unsaved values.

- Group creator workspace files in `dashboard/`, page editing and preview orchestration in `editor/`, uploads in `media/`, private replies in `responses/`, and visitor interaction in `public/`. Keep their CSS modules beside their owners and import components directly.
- The public route handles locked projections before calling `renderPublicTemplate`; metadata uses `getPublicWebTemplate` and rendering uses the validated web implementation registry against the same pinned identity. Legacy omission requires a unique renderer/version match, and supplied invalid keys remain unavailable.
- Choose Your Heart presentation lives in `src/templates/choose-your-heart/`; its `editor/` and `public/` adapters own requests, lifecycle, retry identity, and metrics. Pass typed values and callbacks across this boundary.
- Shared editor CSS and section navigation stay in `editor/`; response components import those owners directly. Do not duplicate styles or controls to make every folder independent.

- `api/list-pages.ts` owns creator list query validation and response parsing through shared browser transport. `draft-dashboard.tsx` passes the TanStack Query abort signal; remaining endpoint functions migrate from `src/lib/api-client.ts` in later slices.

- `dashboard/dashboard-shell.tsx`, `dashboard/dashboard-sidebar.tsx`, `dashboard/dashboard-header.tsx`, and `dashboard/workspace-navigation.module.css` own the shared reference-based workspace chrome. Keep unavailable destinations labeled Coming soon; template search uses `q`, and Drafts/Archive use the page route's `status` parameter. Mobile navigation uses an accessible Radix dialog and the account footer uses a dropdown menu.

- Keep initial public data in the server route and fetch it through the API with `cache: no-store`.
- Keep private and public letter content on the shared renderer model, with public data validated by the shared contracts.
- Keep GSAP effects progressive. Server rendered text must remain readable without JavaScript and with reduced motion enabled.
- Keep focus management, touch target sizing, keyboard access, and unavailable states at WCAG AA baseline.
- `editor/journey-editor-state.ts` derives clean values and refresh conflicts from query data and a local draft baseline. Keep dirty graph values until explicit reload; publish controls stay in this feature and are passed to the template editor as a presentation slot.
- Response dialogs restore focus in Radix `onCloseAutoFocus`, after the focus trap closes. The inbox supplies its response row or heading fallback; editor analytics restores its connected opener.
- Do not persist sessions, page data, or motion preference in local storage.
- Keep image bytes out of page Save requests. Use the API upload lifecycle and render only safe media paths returned by the API.
- Keep audio previews on the owner same-origin route and public playback manual/lazy; do not expose storage keys or request public audio before Play.
- Keep QR data derived only from the API canonical URL. Do not store QR assets or include passwords, tokens, or tracking values.
- Keep visitor response values in current page state only, retain an idempotency key for explicit retries, and never persist response content locally.
- Preserve dirty editor fields when question mutations advance the shared page content version, and announce owner mutation failures with an explicit retry action.
- Keep Choose Your Heart traversal and visitor responses in current page state only, retain one idempotency key for explicit retries, and never persist path or message content locally.

## Related specs

- [Authenticated Secret Letter draft loop](../../../../../docs/specs/0003-authenticated-secret-letter-draft-loop.md)
- [Public Secret Letter publishing](../../../../../docs/specs/0005-public-secret-letter-publishing.md)
- [Protected links and QR sharing](../../../../../docs/specs/0007-protected-links-and-qr-sharing.md)
- [Visitor responses and creator dashboard](../../../../../docs/specs/0008-visitor-responses-and-creator-dashboard.md)
- [Choose Your Heart template](../../../../../docs/specs/0010-choose-your-heart-template/index.md)
- [Shared page audio](../../../../../docs/specs/0017-shared-page-audio.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
