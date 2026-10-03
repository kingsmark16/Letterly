# Browser read cancellation

The browser endpoint ownership migration is complete. This follow through connects query cancellation to the existing Axios transport without changing mutation contracts.

## Behavior

`src/lib/api/transport.ts` exports a plain `ApiReadOptions` interface with an optional AbortSignal. All twelve page and administrator read endpoints accept this optional final argument and forward it to their Axios GET request. Existing callers can omit the options. Input validation, response schemas, credential settings, request paths, filters, cursor parameters, and timeout remain intact.

Thirteen query callbacks now consume the TanStack Query signal. The creator page list already consumed it. Owner pages, journeys, questions, analytics, response lists and details, administrator reports and details, and audit pagination all pass the signal to their feature endpoint. Direct reads used to recover from mutation conflicts remain valid without a query signal.

This follows the blueprint section 13 and [TanStack Query cancellation guidance](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation). No effect, controller, request cache, dependency, or cancellation mechanism was added to mutation functions.

## Evidence

The new `src/features/pages/api/read-cancellation.test.ts` suite contains twenty four cases across all twelve read boundaries. One case per endpoint cancels an in flight request and requires an Axios cancellation error rather than a normalized offline error. A second case uses the actual installed QueryClient to cancel a refetch, verifies transport cancellation, restores the prior cached object, and leaves fetch status idle with no query error. The Axios adapter is isolated and restored after each case. Tests have a five second deadline.

The first test run incorrectly expected a canceled refetch to reject at the QueryClient boundary. Installed query core 5.101.4 returns the retained data when reverting a canceled refetch. The assertion was corrected to test that actual behavior while separately requiring the transport promise to reject with Axios cancellation. The first type check rejected Promise.withResolvers because the configured TypeScript library does not include that API; the test helper now uses the existing Promise constructor pattern. Both issues were test harness assumptions, and the corrected checks pass.

Verification completed:

- Root unit suites pass, 799 cases across five workspaces, including 91 web cases. Unchanged workspace results may come from Turborepo cache.
- Root lint and type checks pass across seven tasks. Formatting checks pass.
- Root production build passes, including a fresh Next.js build.
- The fixture runner completes a fresh build and all 72 desktop/mobile browser cases, with successful owned server teardown.
- A regular Next.js build is restored after the fixture run.
- All thirty non read functions in changed endpoint modules match HEAD after whitespace normalization, including writes and upload helpers.

The cancellation proof uses an isolated Axios adapter and the real QueryClient. Browser cases verify existing launch flows, not every administrator console or a delayed network cancellation journey. No live API, seed, database migration, or deployment was run. The overall repository restructuring remains in progress.
