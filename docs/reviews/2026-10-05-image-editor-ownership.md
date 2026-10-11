# Image editor ownership verification, 2026-10-05

## Outcome

The editor now has separate owners for pure image payload transformations and preview retry state. Upload, replacement, ordering, object URL cleanup, and reconciliation remain in `ImageEditor`. The component file moves from 1,083 to 956 lines; the state and preview owners contain 62 and 77 lines. These counts describe ownership, not a performance improvement.

## Preservation evidence

[The declaration audit](2026-10-05-image-editor-ownership-audit.json) compares baseline `1f5f3a3` with the current TypeScript declarations. All ten types, functions, and constants match after normalizing CRLF and removing export modifiers. This includes the entire `ImageEditor` declaration, preview fallback, retry timing, cleanup, image attributes, and caller key. The initial comparison incorrectly treated line ending differences in JSX text as changes; normalizing both inputs resolved that comparison without source changes.

The draft editor and private preview import image state directly. The upload component imports the preview directly. No compatibility reexports, new providers, state owner changes, or stylesheet changes were introduced.

## Checks

- Web unit tests: all 121 passed.
- Web type checks and production build passed.
- Root `pnpm check:commit`: lint, formatting, and workspace types passed. The first run found an unused moved contract import; it was removed. A subsequent formatting failure was corrected with Prettier before the passing run.
- Production `test:e2e:ui image-editor.spec.ts --max-failures=1`, using isolated API port 3003 and web port 3103: all 18 cases passed in 45.5 seconds across Chromium, Firefox, and WebKit at 390 and 1440 pixels.
- [GPT-6 Luna review](2026-10-05-image-editor-ownership-luna.md): approved, independently confirming all ten declaration hashes.

The browser checks prove a saved image renders, captions autosave as trimmed identity/order/caption payloads and survive reload, two failed media responses recover on the third request, and persistent failures stop after three attempts while caption input stays usable.

## Failed attempts and limits

The first browser run used the legacy `Memories` tab name. It was stopped after eight locator failures; two workers were interrupted. The next run reached the current `Photos` tab but used the obsolete image list role; one case failed and one was interrupted under the early failure limit. The final run uses the current `Letter photos` carousel region and draft autosave contract. Only test locators and assertions changed during this correction.

The browser runs use synthetic sessions, owner responses, and image bytes against the real production web build. They do not prove live authentication, R2 upload transport, or database persistence. Local object URL fallback and timeout cleanup are covered by exact syntax preservation and the reviewer, rather than new runtime cases. Legacy media suites retain their separate authenticated environment requirements.

## Acceptance mapping

AC-1 through AC-3 are proved by the declaration audit, migrated callers, and Luna review. AC-4 is proved by the 18 browser cases and passing unit, build, and commit checks. The overall repository restructuring remains in progress.
