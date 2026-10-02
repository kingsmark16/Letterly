# Browser verification baseline

Date: 2026-10-02
Branch: `feat/repository-verification-baseline`

The five affected web suites now pass all 36 desktop and mobile cases. The previous ownership migration reproduced 11 failures and one skipped check against the original source. This milestone reconciles the stale expectations, supplies a complete catalog, and fixes a focus bug exposed by stronger keyboard coverage.

## Changes

The reusable catalog fixture supplies Secret Letter and Choose Your Heart. Version numbers, capabilities, and audio behavior come from the trusted template definitions. Shared catalog schemas validate its responses at startup. The fixture binds only to localhost and returns an error for unmocked requests.

`pnpm --filter web test:e2e:fixtures` builds the production web app with its isolated catalog endpoint, then runs workspace navigation, authenticated draft editing, private responses, design system compatibility, and page list transport on desktop and mobile. It requires ports 3002 and 3100 to be free. The original `test:e2e` configuration still uses the real API server.

The response checks cover private content before and after opening, automatic read status, unread counts, deletion, safe errors, explicit retries, keyboard opening and closing, and focus restoration. Keyboard coverage now runs on both projects instead of skipping desktop. Session fixtures expire in 2099 to avoid failures caused by the calendar.

Home checks retain exact artwork ratios, grid geometry, sidebar corners, and overflow assertions. They now account for the existing mobile ratios and the desktop grid's available width, including sidebar space. No stylesheet changed.

## Focus regression

Closing a response dialog lost focus on both desktop and mobile. The dashboard attempted to focus its response row in an animation frame while the dialog was still closing. Radix's later cleanup expects a `Dialog.Trigger`, which this URL controlled dialog does not have.

Focus now returns through `onCloseAutoFocus`, after the focus trap closes. The inbox selects the response row or heading fallback. The shared dialog records its connected opener for the editor analytics caller. The new keyboard regression failed on both projects before this fix and passed on both afterward.

## Verification

* Production build passed, including TypeScript compilation and route generation.
* Repository lint passed, including web ESLint with zero warnings.
* Repository `check-types` passed across all seven configured tasks.
* Repository formatting and `git diff --check` passed.
* All 19 web unit tests passed.
* All 36 selected browser cases passed, with zero failures or skips.

The successful browser command was `pnpm --filter web exec playwright test --config playwright.fixtures.config.ts` against the fixture origin production build produced by the new runner. Windows sandbox process cleanup stalled after the cases completed. Stopping the two verified test servers allowed Playwright to finish with exit code zero and its 36 passed summary. This was test server teardown, not a browser assertion failure.

These journeys mock authenticated browser requests and serve catalog fixture data. They do not establish real database, API ownership enforcement, OAuth, or storage coverage. The existing no JavaScript policy rendering issue remains outside this milestone. Template registration and editor ownership separation remain the next structure milestone.
