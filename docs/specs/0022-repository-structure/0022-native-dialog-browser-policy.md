# Native dialog browser policy verification

Date: 2026-10-03

**Status**: Accepted

## Decision

Retain the native shared Dialog and verify actual legal and preview consumers in Chromium, Firefox, and WebKit at narrow and desktop widths. Reuse the existing fixture server and runner through a standard config argument; do not copy build or server orchestration. The focused suite is separate from the Chromium performance baseline because asset totals are engine dependent.

Legal and preview links enhance navigation only when native showModal exists. Unsupported browsers keep their normal route links. Verify both JavaScript disabled and missing native enhancement through real navigation, not a forced fixture catalog or injected rendered HTML.

The initial no JavaScript run reproduced a root loading shell that never exposed the public landing content. Scope route loading to private dashboard and administrator areas. The dashboard already has scoped loading files; add the existing screen loader to admin and remove the root loading convention. Public routes still use Server Components, the same catalog requests and error states, and no new cache. They wait for their readable initial content rather than relying on the loading boundary's client completion. Explicit loading state fixtures and private query loading remain available.

Native modal keyboard focus must stay off inert background controls. Browser chrome remains reachable through native keyboard behavior; a body active element during that browser transition is not evidence that a background link became focusable. Verify return into the modal and explicitly attempt background focus before Escape and trigger restoration. Do not introduce a competing JavaScript focus trap.

## Acceptance

- Real legal and preview dialogs pass the focused suite in all three engines at 390 and 1440 px, including initial focus, keyboard movement, inert background, Escape, visible close, overlay policy, viewport fit, and restored trigger focus.
- Legal and preview routes are usable without JavaScript and with native showModal unavailable. Browser errors remain absent in the unsupported enhancement case.
- Scoped loading preserves private loaders and public route contracts. Run the normal fixture gate, unit, lint, format, types, and normal build, retaining performance budgets and the unchanged canonical baseline.
- CI installs and executes the three supported engines. Update commands and context with actual evidence, keeping remote execution and wider accessibility/zoom checks distinct.

Remaining spec 0009 CSS override conflicts and accessibility requirements are not declared complete by this milestone.

## Implementation evidence

The production fallback checks also reproduced catalog text hydration failures. Better Auth's current store can resolve before individual catalog controls hydrate. The auth feature owns a session hook with a stable pending server snapshot using React useSyncExternalStore, consumed by the affected draft control. Actual session state becomes available after hydration without a second request or persistent storage. An SSR regression covers already resolved signed in, signed out, and error stores.

The focused browser suite passes all 42 cases. WebKit traces localized the remaining request errors to test driven navigation interrupting destination page prefetches; the route workflow now settles each navigation before starting the next, retaining all page error assertions. Wider acceptance stays open.
