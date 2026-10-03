# Shared Link and layout migration

Date: 2026-10-03

## Implementation

Link, Container, and Stack now use token-backed Tailwind classes and the shared class merger. Public import paths, prop types, semantic element choices, native attributes, and existing data attributes remain compatible. Link retains safe blank-target rel composition and visible keyboard focus. Its actual landing and preview callers remain in place.

Container keeps the legacy page width cap of 1760 px, the content cap of 720 px, and 24/28/40 px responsive inline padding. The full option still removes the content max-width constraint while retaining the legacy base width cap. This milestone does not silently change that behavior to an uncapped layout.

Stack has complete static classes for all nine token gaps, both directions, alignment, justification, and wrapping. No Tailwind class is assembled from a runtime string. Caller recognized utility overrides go through cn, and caller inline styles pass through directly. There are no production Container/Stack callers at this milestone. The old internal stack gap custom property has no external source references and is no longer needed.

Application Badge and Separator are removed. Workspace import, symbol, and re-export searches found only their definitions; there is no published web package export for them. Tabs still serves the Secret Letter editor and Chart serves editor analytics, so those remain for the next ownership review. The unused application dependency audit will be reconciled with that remaining ownership work.

Link/Container/Stack selectors and their now-obsolete responsive container rules were removed from the shared CSS Module. Other primitives still use that stylesheet. No production route, API, database, or template identity behavior changed.

## Verification

- Repository unit suite: 824 passing cases. UI has 29 cases, including three added checks for safe Link composition and caller typography, Container semantics/utility overrides, and Stack options/caller classes/styles. UI and web executed freshly; API, templates, and database used valid cache entries.
- All 78 desktop/mobile browser fixture cases pass. Existing Link consumers pass the landing action, preview navigation, keyboard focus, and launch journeys.
- The new production-style case renders the actual Container and Stack through an isolated Node fixture. Chromium checks padding and width at 390, 768, 1024, 1440, and 1920 px, all three size modes, row direction, alignment, justification, wrapping, and all nine gap values. These are stylesheet checks of the real primitive output, not a claim that unused layout primitives have a production product journey.
- Direct Playwright imports initially produced its special component JSX representation instead of React elements. The Node fixture avoids that transform. The linked package source uses tsx's classic JSX transform in this harness, so React is provided only in that short-lived child process. A direct Node render then succeeded before the browser suite was rerun. No production React global or compiler change was introduced.
- Repository lint and type checks each pass seven tasks. Formatting passes. The regular repository build passes all three tasks, with web built freshly after browser fixtures and API/database using valid cache entries. UI/web types executed freshly after that normal build. The workspace is restored to normal build configuration.

## Performance

Both measured Chromium profiles load 449,242 CSS bytes and 1,203,770 client JavaScript bytes. The canonical baseline is 451,379 and 1,173,075 bytes respectively. CSS is 2,137 bytes lower; JavaScript is 30,695 bytes higher (about 2.6 percent). Ten font requests, exact font contents, and 428,152 font bytes remain unchanged. Observed initial CLS is zero. The existing budgets pass, and the canonical baseline fixture was not regenerated.

## Remaining scope

Input, Textarea, Field, IconButton, Status, and Dialog still need their Tailwind migration and compatibility evidence. Tabs/Chart ownership and unused application dependencies remain open. The shared stylesheet remains until its final consumer migrates. Wider accessibility and dialog browser checks, source/style decomposition, contributor onboarding, template contract/growth measurements, and the final repository acceptance audit remain required.

API integration was not rerun because this is presentation and test harness work. Remote CI and the existing database-dependent skips remain unobserved delivery limits. This is self verification, not an independent review. The user's skills-lock.json modification remains untouched.
