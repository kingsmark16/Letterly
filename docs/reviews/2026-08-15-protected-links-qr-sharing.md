# Review, protected links and QR sharing, 2026-08-15

**Reviewed by**: gpt-5.6-sol (author on Codex GPT 5)
**Scope**: 17 files, uncommitted
**Verdict**: Changes requested

## Summary

The change adds an owner canonical URL, browser generated SVG QR sharing, production HTTPS checks, and draft only slug controls. The owner, lifecycle, public privacy, configuration, and main QR paths are well bounded. The remaining issues are that preview failure detection does not prove that the SVG rendered, and the tests do not exercise several critical QR and protected link paths.

## Major

### 🟠 Preview failure detection only checks for an SVG element, `apps/web/src/features/pages/components/qr-sharing-panel.tsx:86`

**Problem**: The component decides that the preview is available when `querySelector("svg")` finds an element. A browser can create an SVG DOM element but still fail to render it visually, so this check reports success and the fallback never appears.
**Why it matters**: AC-10 explicitly requires generation failure and preview failure to behave differently. The current check does not observe the preview result, so it cannot reliably preserve the download while explaining a rendering failure.
**Suggested fix**: Render the preview through a surface with real load and error signals, while retaining the original markup for download. Drive the preview fallback from that error result and keep copy and download available.

### 🟠 Critical QR and protected link paths are not proved, `apps/web/e2e/public-secret-letter.spec.ts:313`

**Problem**: The browser tests confirm that an SVG appears and downloads, but they never decode or otherwise assert the QR payload. They do not force generation failure and retry, force preview failure while keeping download available, or follow the QR URL through password failure, successful unlock, and password revocation. The mocked owner route also does not prove real owner authorization.
**Why it matters**: These are branching, privacy relevant paths from the governing spec. A regression could encode the wrong value, reveal a protected path incorrectly, or remove required fallback behavior while the current tests stay green.
**Suggested fix**: Add focused component or browser coverage for the fixed QR options, exact decoded canonical URL, filename fallback, generation retry, preview fallback, and clipboard outcomes. Add an API integration and browser journey through owner authorization, locked projection, wrong password rate limit response, one day page scoped unlock, password revocation, unpublish, and safe public unavailability.

## Strengths

* The QR dependency is loaded only after the published sharing panel mounts, and its fixed high contrast options match the spec.
* The owner projection is guarded and owner scoped, while public reads keep exact no store and no index headers and a locked projection without confession content.
* The UI keeps the canonical URL visible and selectable, supplies keyboard reachable controls and global focus indicators, and adapts the QR layout for narrow screens.
* Publication history now prevents slug changes after archive and restore, and production configuration rejects credential bearing origins.

## Test coverage

The mapper, controller, repository, configuration, and browser happy paths have useful coverage. The four targeted API suites pass with 51 tests, and web lint and type checks pass. The missing QR payload, generation failure, retry, preview error, protected visitor, and revocation cases leave important new contract edges unproved.
