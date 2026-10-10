# Legal document presentation

This feature owns the reusable privacy and terms documents consumed by the policy routes, landing page, and authentication dialogs.

## Files

- `privacy-document.tsx` owns the privacy document, its section contents, and its displayed update date.
- `terms-document.tsx` owns the terms document, its section contents, and its displayed update date.
- `legal-page.module.css` owns the shared policy page and document styles.

## Conventions

- Keep these documents as server components. Server routes pass rendered document nodes to the client dialog; the dialog owns interaction and focus.
- Import each document directly from its feature file. Route entry files own metadata and page composition, and must not serve as reusable document modules.
- Preserve section IDs, heading relationships, content, contact links, and update dates when reorganizing presentation.
- Do not move legal text into the client dialog or add a broad feature barrel.

## Verification

The existing `e2e/privacy.spec.ts`, `e2e/terms.spec.ts`, and `e2e/legal-dialog.spec.ts` cover full pages, responsive widths, dialog content, closing, and focus restoration.

_Drafted by /sync from the introducing change, worth a quick human pass._
