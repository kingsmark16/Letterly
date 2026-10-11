# Native dialog browser policy

Date: 2026-10-04

## Implementation and diagnosis

Legal and template preview links now enhance normal navigation only when HTMLDialogElement.showModal exists. Unsupported browsers follow the original href, including Space key handling without interception. No second dialog implementation or new runtime dependency was added. The native focus, Escape, scroll lock, overlay policy, and visible close behavior remain with the shared Dialog.

Actual JavaScript disabled navigation exposed a public root loading boundary that kept the initial loading shell visible. The root loading convention is removed, the existing screen loader is scoped to admin, and existing dashboard loaders remain. Public Server Components await their readable initial catalog using the unchanged parallel requests and error handling. This changes the initial streaming boundary and can increase time to first content while the catalog is pending. Explicit loading fixtures still use app/loading-state.tsx. No cache or authorization policy changed.

Production fallback tests also reproduced React text hydration error 418 on the catalog. The installed Better Auth store initializes its server snapshot from current store state, which can already resolve in the browser before another catalog control hydrates. The auth feature now owns useAuthSession, preserving a pending snapshot during hydration through React useSyncExternalStore. The affected CreateDraftButton consumes it; after hydration the original session result, actions, and refetch behavior are retained. No duplicate request or stored session is introduced. The focused browser reproduction previously failed in Chromium and WebKit and passes after this change. A server rendering regression covers cached signed in, signed out, and error states. Other session consumers remain part of the final authentication boundary audit.

WebKit also reported access control errors for interrupted RSC prefetches. The trace shows those errors immediately after the test starts its next page.goto from the privacy destination, rather than a failing navigation or hydration. The workflow now waits for each destination's outstanding requests to settle before beginning the next unrelated document navigation. All page error assertions remain active; no errors were filtered or engines skipped. Native focus tests allow the browser chrome transition while explicitly proving background links remain inert, preserving browser native focus handling.

The fixture runner accepts a standard config argument. A focused config reuses its servers and defines Chromium, Firefox, and WebKit projects at 390 and 1440 px. JavaScript disabled contexts inherit each actual viewport. CI installs all three managed engines and runs this suite, with a 15 minute quality job budget. Remote CI execution has not been observed.

## Verification

- All 42 focused browser cases pass. They exercise actual legal and preview dialogs, focus restoration, native background inertness, Escape, visible close, viewport containment, preview overlay policy, route fallback without showModal, and real routes without JavaScript.
- All 94 existing desktop/mobile Chromium fixture cases pass, including pinned template versions, editor workflows, response journeys, and performance budgets.
- The workspace unit gate passes 832 cases, including the new server session regression. The web workspace passes 103 cases. Existing API and database task cache entries remain valid; no new database integration result is claimed.
- Lint and types pass all seven applicable tasks. Formatting and diff whitespace checks pass. The normal root build passes all three tasks after fixture builds, followed by fresh web type generation.
- Both performance profiles load 369,952 CSS bytes and 1,180,587 client JavaScript bytes. Ten unchanged font requests total 428,152 bytes. Observed initial CLS is zero. The original canonical baseline remains unchanged and all budgets pass.
- Browser fixtures use isolated catalog data and mocked authenticated requests. They do not prove a live authentication provider or real database rollback. The user's existing development server and skills-lock.json change remain untouched.

The accepted decision is [recorded here](../specs/0022-repository-structure/0022-native-dialog-browser-policy.md). React documents the stable server and hydration snapshot requirement in [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore). This milestone is self verified, without an independent review claim.

## Remaining scope

Spec 0009 still requires resolving feature CSS overrides of migrated primitive base and state styles, broader admin compatibility, automated accessibility, forced colors, actual 200 percent zoom, and remaining surface acceptance. Cohesive source/style splits, contributor onboarding, commit tooling, template growth measurements, and the full repository completion audit remain open. Version aware registration is already implemented; this milestone does not mark the overall restructuring complete.
