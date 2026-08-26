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
| `secret-letter/index.ts` | Named template export used by routes and feature previews |

## Conventions

- Keep public content server rendered and readable without JavaScript, GSAP,
  music, video, or 3D.
- Keep template specific motion inside the template folder. Scope GSAP to the
  renderer root, clean it up on unmount, and respect reduced motion.
- Render user content as text. Use only safe media paths and preserve explicit
  image dimensions, lazy loading, captions, and unavailable states.
- Keep template code independent from generic page feature components. Update
  the template entry point and its owning route or feature import together.
- Follow `apps/web/design.md`, the relevant template spec, WCAG AA, and the
  shared `SecretLetterRenderModel` contract.

## Related specs

- [Secret Letter cinematic presentation redesign](../../../../docs/specs/0013-secret-letter-cinematic-redesign.md)
- [Public Secret Letter publishing](../../../../docs/specs/0005-public-secret-letter-publishing.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
