# Public template adapter and registry resolution

Date: 2026-10-02
Branch: `feat/repository-verification-baseline`
Contract: [public template adapter](../specs/0022-repository-structure/0022-public-template-adapter.md)

Choose Your Heart public presentation now lives beside its editor under `apps/web/src/templates/choose-your-heart/`. The public pages adapter owns submission validation, query mutations, safe errors, retry keys, and bounded operational metrics. Sixteen repeated API definition scans across ten files now call one trusted registry helper.

## Ownership and behavior

`renderer.tsx` owns local answers, progress, outcomes, message input, and markup. Typed props carry submission state and callbacks. It imports no API client, query library, page feature, database, or metric transport. The existing template ESLint restriction applies to this renderer.

`public/choose-your-heart-page.tsx` validates submissions using the shared request schema. Unchanged failed requests retain their key; editing the message, choosing to omit a previously submitted message, restarting, or navigating back from an outcome changes submission identity. The adapter compares normalized request content to preserve retry identity. These values stay in memory and are never emitted as metrics. Navigation and message editing are disabled while a request is pending, preventing an accepted response from appearing against a different path. The route keys the adapter by slug to reset local state when changing public pages.

The template reports outcome display order through a callback. The adapter emits only the existing bounded metric category, event, and template key. Messages, answer choices, and complete traversal paths are excluded from operational metrics.

`resolveTemplate` requires a version and at least one identity field. Every supplied registry or renderer key must match. An explicitly undefined or null key fails closed; it is not treated as an omitted constraint. Existing renderer-only resolution remains renderer-only. Public mappings that checked both keys retain both checks. Unknown and prototype-like keys do not resolve. No authorization, transaction, immutable graph, API route, or database schema behavior changed.

## Verification

* Production web build passed, including TypeScript and route generation.
* Root lint and all seven configured type tasks passed.
* API unit tests: 391 passed across 57 suites.
* API integration tests: 39 passed, 7 skipped across the existing gated suites.
* Web unit tests: 23 passed; shared UI tests: 15 passed.
* Database package tests: 5 passed, including exact resolution, mismatched keys, missing identities, unsupported versions, and prototype-like keys.
* Browser fixture checks: 52 passed on desktop and mobile in the final run.
* Formatting and `git diff --check` passed.

The ten added browser cases cover multi-question traversal, unchanged retry identity and matching header/body keys, restart, edited and omitted messages, disabled responses, back navigation, pending request controls, safe metric payloads, and first-question markup in the server HTML. Browser submissions and metrics are mocked; these checks do not prove live provider or database behavior.

Initial browser failures were an incorrect expected root key and a no-JavaScript visibility assertion. The root key assertion now matches the existing graph. The HTML check verifies actual rendered button markup rather than claiming visibility in a JavaScript-disabled browser. With JavaScript disabled, this public route currently stays on the existing Loading Letterly fallback. That route/loading problem needs a separate fix; server HTML presence alone does not satisfy readable fallback behavior. The previously recorded policy fallback issue also remains unresolved.

Windows sandbox server teardown hangs after browser execution. The final run used an ignored fixture configuration wrapper with server startup disabled against the production build and servers started by `test:e2e:fixtures`. Only verified fixture and Next.js test servers were stopped after verification.

## Durable context and remaining work

Five context files were corrected surgically: web workspace, pages feature, web templates, shared templates, and API pages. The contribution guide and parent spec now link this ownership slice. Historical review records remain unchanged. The parent restructuring spec stays in progress; there is no matching product scope feature to mark complete. No new tools or dependencies were introduced.

Template-specific API workflows, public metadata, preview dispatch, and thumbnail dispatch still use explicit branches. A catalog entry alone does not implement a new template behavior. Typed presentation and behavior registration remains necessary before adding a generator. No live catalog seed or migration was run, no independent model review ran, and no changes were pushed. The preexisting `skills-lock.json` edit is excluded from this milestone.
