# Draft template policies and creator editor registration

Date: 2026-10-02
Branch: `feat/repository-verification-baseline`
Contract: [draft template adapters](../specs/0022-repository-structure/0022-draft-template-adapters.md)

## Result

Draft creation resolves a registered plain policy by trusted registry key and immutable version. PageService retains active database version lookup, errors, bounded graph validation metrics, and persistence. Secret Letter overrides and defaults are unchanged. Choose Your Heart retains its existing compatibility content/settings envelope and writes a fresh validated graph. Invalid journey defaults emit the existing bounded metric and fail before a repository write.

The creator dispatcher owns one page query and checks registry key, renderer key, and pinned version before selecting a statically imported lazy editor. The extracted Secret Letter editor retains forms, autosave, questions, media, conflict handling, preview, and section navigation. Journey editing initializes its own workspace and graph editor without Secret Letter hooks or requests. Shared deletion controls have one owner. Editors stay mounted behind the shared error view when background owner refresh fails, so retry preserves unsaved values. Initial owner failures still show the original loading/error/retry presentation.

## Verification

* Root lint, type checks, formatting checks, and unit test tasks pass.
* API unit tests: 396 passed across 58 suites. Four policy tests cover registration, defaults/overrides, journey compatibility, and independent draft values. A service regression covers invalid graph defaults, bounded metrics, and no write.
* Web unit tests: 28 passed. Database catalog tests: 5 passed. Shared UI tests: 15 passed.
* API integration: 39 passed, 7 skipped across four passing and four skipped suites.
* Production API and web builds pass.
* Browser fixtures: 70 passed across eight desktop/mobile suites. Existing Secret Letter creation, save, reopen, deletion, section navigation, and failure recovery still pass. Journey checks cover retry, remote conflicts, read only published graphs, dirty exit cancellation, absence of question/PATCH requests, mismatched identity, unsupported versions, and dirty state after a failed owner refresh.
* `git diff --check` passes.

The browser fixture harness stalls during server teardown under the Windows sandbox. A local ignored Playwright wrapper reused the running fixture and production servers with no server management and exited successfully after all 70 checks. Only the verified server processes owned by this run were stopped afterward.

## Ownership documentation

Updated API pages, web pages, and web workspace context with policy/query/editor ownership. The template registration guide now names the required draft policy and static creator editor registrations. The parent structure spec links this milestone. The overall structure migration stays In Progress; this milestone does not mark the complete restructuring finished. Historical reports remain unchanged.

## Limits and next work

Browser API requests are mocked. These checks do not prove live database, OAuth, storage, or email provider behavior. The seven skipped API integration cases were not executed. No database schema, migration, live seed, template activation, dependency, route, or generator changed. No independent fresh model review ran.

The legacy stored Secret Letter content schema still accepts titles up to 120 characters, while editable HTTP title validation uses the existing 60 grapheme rule. This extraction preserves both existing boundaries rather than silently changing a validation contract.

Publishing, repository projections, public transport identity, public payload parsing, and landing artwork still need further template adapter work. Draft policy results explicitly reflect the current Secret Letter shaped persistence envelope; this does not complete the future general content model. The previously recorded visible no JavaScript fallback problem on public, preview, and policy routes remains unresolved. Server HTML presence alone does not verify readable fallback behavior.

The preexisting `skills-lock.json` edit remains outside this milestone commit. No push, pull request, deployment, or live catalog mutation was performed.
