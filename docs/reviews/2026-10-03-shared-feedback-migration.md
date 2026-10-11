# Shared IconButton and Status migration

Date: 2026-10-03

## Implementation

IconButton now composes the canonical Button variants and shared class merger, with its existing round shape and 24 px decorative icon wrapper. Accessible name precedence, native attributes, default button type, disabled/loading behavior, and data attributes are preserved. It remains a plain button, with no added loading announcement or client boundary.

Status uses static Tailwind classes and keeps its caller supplied content and recovery slots. Idle returns children without a wrapper. Loading, empty, and errors without recovery announce politely; actionable errors use an assertive alert. The decorative state cue retains its interrupted loading border and filled error shape. Caller utility layout overrides use cn. No domain mapping or feature copy was introduced.

Obsolete icon and status selectors are removed from the shared CSS Module. Dialog is its only remaining consumer. No dependency, public export, template identity, API, or persistence change was introduced. IconButton has no current production web caller; Status remains used by landing and public page composition.

The existing landing catalog state test was moved from landing foundation into design system compatibility so the routine fixture suite executes it. The test is retained once, with loading, empty, unavailable, and recovery link assertions. Broader landing foundation checks remain in their existing suite.

## Verification

- Repository unit suite: 829 passing cases, including 34 UI cases. Added checks cover icon name overrides/loading/reset/decorative content and caller utility precedence; Status idle output and layout precedence are covered alongside existing state announcements and recovery tests. UI and web ran freshly; unchanged workspaces used valid cache entries.
- The complete fixture run passes 82 desktop/mobile cases, including actual server rendered IconButton and Status output checked against production CSS. Checks cover 44 px controls, round radius, icon dimensions, keyboard focus, disabled/loading cursor, status spacing, radius, error border, cue dimensions, loading border, announcements, recovery content, and reduced motion. Existing launch and public unavailable routes remain covered.
- The relocated landing state case passes a separate targeted desktop/mobile run (two cases). The routine suite now contains 84 cases; the complete 84 case suite is not claimed as rerun.
- Lint and types pass seven tasks each. Formatting passes after correcting the new browser file. The final normal build passes three tasks with fresh web compilation after the targeted browser run. UI and web types ran freshly after that build. The workspace is restored to ordinary build configuration.

## Performance

Both measured profiles load 396,794 CSS bytes and 1,203,272 client JavaScript bytes. Against the canonical 451,379 CSS and 1,173,075 JavaScript baseline, CSS is lower by 54,585 bytes and JavaScript is higher by 30,197 bytes (about 2.6 percent). Ten font requests, their exact contents, and 428,152 font bytes are unchanged. Observed initial CLS is zero. Existing budgets pass and the canonical baseline is unchanged. These are measured loaded assets and initial layout shifts, not field performance or all generated asset totals.

## Remaining scope

Dialog migration, Tabs/Chart ownership, and unused dependency reconciliation remain open. Wider accessibility, browser engine, source/style decomposition, onboarding, template contract/growth measurements, and full repository acceptance remain required.

API integration was not rerun for this presentation change. Remote CI and the existing database dependent skips remain unobserved. This is self verification, with no independent review claimed. The user's skills-lock.json change remains untouched.
