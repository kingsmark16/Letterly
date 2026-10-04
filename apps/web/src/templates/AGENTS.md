# Web templates

## Overview

This area owns independent public and preview template implementations. Each
template keeps its renderer, styles, entry point, and template specific motion
close together. Templates consume validated render models from
`@letterly/templates` and do not own API calls, persistence, or authorization.

## Key files

| File | Owns |
| --- | --- |
| `secret-letter/renderer.tsx` | Shared public and private Secret Letter presentation and opening interaction |
| `secret-letter/renderer.module.css` | Secret Letter envelope, paper, responsive layout, and accessible visual states |
| `secret-letter/memory-gallery.tsx` | Accessible Secret Letter memory list, lazy images, and unavailable image state |
| `secret-letter/memory-gallery.module.css` | Scoped gallery layout, image, caption, and responsive styles |
| `secret-letter/message-pagination.ts` | Deterministic message pagination and measured page fitting |
| `secret-letter/audio-player.tsx` | Manual owner/public audio playback controls and playing-state motion |
| `secret-letter/audio-player.module.css` | Secret Letter audio player, disc, progress, focus, and reduced-motion styles |
| `registration.ts` | Plain web descriptors derived from canonical identity, exact resolution, preview copy, and public metadata |
| `implementation-registry.ts` | Exact version validation and dispatch for editor, preview, and public component bindings |
| `thumbnails.tsx` | Typed lightweight thumbnail component registrations |
| `secret-letter/preview.tsx` and `secret-letter/thumbnail.tsx` | Sample letter and first section presentations, without feature forms |
| `choose-your-heart/preview.tsx` and `choose-your-heart/thumbnail.tsx` | Sample question and first section presentations |
| `secret-letter/index.ts` | Named template export used by routes and feature previews |
| `choose-your-heart/renderer.tsx` | Visitor traversal, progress, outcomes, and message interaction through typed adapter callbacks |
| `choose-your-heart/editor.tsx` | Controlled graph authoring, receiving values, callbacks, save state, and a lifecycle presentation slot |

## Conventions

- Keep public content server rendered and readable without JavaScript, GSAP,
  music, video, or 3D.
- Keep Secret Letter memory markup and gallery-only styles in
  `secret-letter/memory-gallery.tsx` and
  `secret-letter/memory-gallery.module.css`. The renderer maps validated
  content, owns failed-image state, and coordinates gallery reveal motion.
- Keep message pagination and measured fitting in
  `secret-letter/message-pagination.ts`. The renderer owns page state and
  presentation; the utility receives the measurement element from the client.
- Keep template specific motion inside the template folder. Scope GSAP to the
  renderer root, clean it up on unmount, and respect reduced motion.
- Keep audio optional and manual. Lazy-load the track only after Play, keep the
  player keyboard accessible, and make playing-state decoration safe under
  reduced motion.
- Render user content as text. Use only safe media paths and preserve explicit
  image dimensions, lazy loading, captions, and unavailable states.
- Keep template code independent from generic page feature components. Update
  the template entry point and its owning route or feature import together.
- Template editors receive typed values and callbacks; keep API clients, query state, version conflicts, and publishing in the owning pages adapter. The Choose Your Heart editor has no persistence or query imports.
- Public template renderers receive submission state and callbacks. Keep validation, retry keys, query mutations, and metrics transport in the owning public pages adapter.
- Resolve web presentations with category, template, and immutable version whenever available. Legacy key or key/version inputs are accepted only when uniquely resolvable; never render an unknown identity as Secret Letter. Add metadata and typed preview, thumbnail, and public adapter registrations together.
- Editor, preview, and public bindings declare their own registry key, version, and implementation. `createWebTemplateImplementationRegistry` validates complete canonical coverage through the shared exact registry helper and resolves metadata plus implementation together. Keep literal dynamic imports at their call sites. Known ambiguous preview families must remain unavailable instead of entering catalog fallback.
- Web ESLint rejects template imports from features, browser API clients, TanStack Query, and the database package.
- Follow `apps/web/design.md`, the relevant template spec, WCAG AA, and the
  shared `SecretLetterRenderModel` contract.

## Related specs

- [Secret Letter cinematic presentation redesign](../../../../docs/specs/0013-secret-letter-cinematic-redesign.md)
- [Public Secret Letter publishing](../../../../docs/specs/0005-public-secret-letter-publishing.md)
- [Shared page audio](../../../../docs/specs/0017-shared-page-audio.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
