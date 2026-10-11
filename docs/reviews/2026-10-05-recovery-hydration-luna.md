# Review, recovery-hydration, 2026-10-05

**Reviewed by**: GPT-6 Luna (author on GPT-6)
**Scope**: 6 files, uncommitted
**Verdict**: Approve

## Summary

The recovery form now disables the email field and submit action until React Hook Form reports that its subscriptions are ready, while retaining the submitting state. The new browser case delays Next.js scripts on password reset and verification pages, checks the disabled-to-enabled transition, and verifies normalized request data and generic completion. The accompanying sign-in test updates align selectors with the current catalog and workspace UI without weakening the visible app behavior; the catalog heading is intentionally screen-reader-only, so attachment is the relevant assertion.

## Strengths

- `formState.isReady` is read in the rendered component and used as the readiness source, matching the spec and avoiding a second state owner.
- Both entry controls remain disabled during submission, and the test covers both affected recovery modes plus normalized payloads.
- The mobile logout test waits for the eventual templates redirect before opening the drawer, avoiding a navigation that previously closed the drawer during the interaction.

## Test coverage

The author reports 121 passing web units. The initial 198-case browser run had 166 passes, 30 credential-entry skips, and two mobile logout failures; the current test waits for the redirect before opening the menu, and its focused six-case rerun was still running during this review. I have not counted browser verification as complete.

## Follow-up verification: mobile logout selector timing, 2026-10-05

The final test awaits the `/templates` redirect before deciding whether to open the workspace drawer. It now branches below 1024 px, matching the 64 rem layout breakpoint, and relies on Playwright's auto-waiting click for the menu control. The six-case focused logout rerun passed in 13.4 seconds, resolving the two earlier mobile failures. This is a targeted rerun, not a claim that the full 198-case suite was repeated.
