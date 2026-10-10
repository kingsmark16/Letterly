# Web template presentation registration

Date: 2026-10-02
Branch: `feat/repository-verification-baseline`
Contract: [web presentation registration](../specs/0022-repository-structure/0022-web-template-registration.md)

Web previews, thumbnails, public metadata, and public rendering now resolve trusted presentation registrations. Template samples and first section markup live beside their templates. Generic routes and preview wrappers no longer select implementations through template name branches.

## Identity and compatibility

`apps/web/src/templates/registration.ts` derives category, template, version, registry key, name, and capabilities from the canonical catalog. It attaches the existing preview copy and public metadata. The metadata map and component maps require every trusted registry key at compile time. The plain descriptor module imports no React components or loaders.

Resolution checks every supplied identity constraint and returns a result only when exactly one entry matches. Full identity resolves repeated template keys across categories and versions. A mismatched registry key, explicitly missing field, unsupported version, unknown key, or ambiguous short identity fails closed. The unit suite proves these rules with synthetic categories and versions without activating a new launch template.

Existing `/preview/<template-key>` URLs remain compatible for uniquely resolvable templates. Catalog and landing preview links now include category and immutable version while retaining the UUID start path used for draft creation. The route rejects invalid explicit parameters and never downgrades them to a supported bare key. Server catalog lookup also rejects ambiguous bare keys and can resolve by requested category.

Public projections still supply only template key and version. Public metadata and rendering resolve that pair only when unique. A future cross category collision will remain unavailable until the transport contract supplies full identity. This milestone changes no API schema or privacy contract.

## File responsibilities

* `src/templates/<template>/preview.tsx` owns each sample presentation. Secret Letter keeps its sample content and images; its renderer accepts the response form through a child slot. Choose Your Heart keeps its sample question and first section.
* `src/features/catalog/preview/secret-letter-preview.tsx` owns the demonstration response form and passes it to the pure template. It retains preview mode, which never sends answers.
* `src/features/catalog/preview/registered-preview.tsx` registers explicit `next/dynamic` imports from a Client Component boundary. Server rendering remains enabled, and import paths remain statically analyzable.
* `src/components/template-preview-dialog.tsx` keeps the existing link fallback, dialog controls, safe return path, and focus behavior. Samples mount only while the dialog is open, so closed cards no longer initialize sample forms and renderers. Closing discards sample interaction state.
* `src/templates/<template>/thumbnail.tsx` owns lightweight first section markup. `src/templates/thumbnails.tsx` registers those components. The shared thumbnail wrapper retains scaling, CSS, page/catalog contexts, and stable element IDs. Unsupported or mismatched identities show a generic decorative placeholder rather than a Secret Letter.
* Catalog cards and the landing page pass category and version. Dashboard cards pass their pinned version and registry key, preventing a mismatched record from selecting a different thumbnail.
* `src/features/pages/public/template-content.tsx` owns public presentation adapters, safe union narrowing, and response, visit, audio, and reporting slots. `app/p/[slug]/page.tsx` handles locked projections before this dispatch and retains unavailable handling, private transport, and safe metadata. The Secret Letter and journey adapters reject a projection of the wrong shape without unchecked casts.

Template source remains free of query, API client, database, or feature imports. Existing keys, immutable versions, CSS values, catalog definitions, database records, and API routes remain unchanged.

## Verification

* Production web build passed, including type compilation and route generation.
* Root lint and all seven configured type tasks passed; web lint and types passed again after the final adapter and lazy mounting changes.
* Root unit tests passed: API 391 across 57 suites, web 28, database package 5, shared UI 15.
* All 64 browser cases passed on desktop and mobile in the final run, with no failures or skips.
* Formatting and `git diff --check` passed.

The twelve added browser cases prove generic thumbnails for unknown or mismatched identity; old and full identity preview URLs; rendered sample HTML; safe unknown and invalid preview states; category/version link parameters; samples absent before opening; dialog loading, Escape, and restored focus; pinned public metadata; unsupported public versions; published Secret Letter content; and the locked envelope/password boundary with no letter body in the locked HTML. Existing journey retries, editor conflicts, page listing, response privacy, workspace navigation, and shared primitive checks also pass.

Initial browser failures were test setup issues: the draft button's accessible name includes the template name, and the locked envelope must be opened before its password form is visible. Those checks now follow the actual interaction without weakening the identity or content assertions. A subsequent full run also hit two existing mobile autosave checks while the browser reported itself offline. All six mobile draft tests passed on an isolated rerun without application or assertion changes; the full suite was rerun for the final result.

The final browser run used an ignored wrapper with server startup disabled against the production build and fixture servers started by `test:e2e:fixtures`. Windows sandbox teardown requires stopping only verified fixture and Next.js test server processes. Browser API writes are mocked. API integration tests were not rerun for this web-only milestone; the previous milestone recorded 39 passes and 7 gated skips. No live database, OAuth, storage, or provider behavior is established here. No bundle size or runtime throughput improvement has been measured.

## Durable context and remaining work

Three existing context files were updated surgically: web workspace, pages feature, and web templates. The contribution guide lists the actual registration steps, and the parent spec links this contract and evidence. Historical reviews remain unchanged. The parent structure migration remains in progress, with no matching product scope feature to mark done.

API template workflows, public transport parsing, creator editor dispatch, and landing artwork still contain explicit branches. These remain follow up work before adding a generator. The previously recorded no JavaScript loading fallback defects remain unresolved; rendered server HTML does not prove readable fallback visibility. No new dependencies, schema migrations, catalog seeds, independent model review, push, or PR are included. The preexisting `skills-lock.json` edit is excluded.
