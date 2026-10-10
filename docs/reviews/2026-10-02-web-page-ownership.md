# Web page ownership milestone

Date: 2026-10-02

Branch: `feat/repository-verification-baseline`

Starting revision: `e707a73`. A fresh fetch showed no missing `origin/main` commits. The user authorized this slice with `next` after the proposed editor and dashboard grouping.

Governing decision: [Repository structure and ownership](../specs/0022-repository-structure/index.md), web ownership and rollout milestone 5. This records a bounded file migration, not completion of the overall restructuring or a formal independent review.

## File ownership

| Folder under `apps/web/src/features/pages` | Files moved | Responsibility                                                                                           |
| ------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------- |
| `dashboard/`                               | 16          | Workspace shell, navigation, icons, home, FAQ, and creator page list                                     |
| `editor/`                                  | 21          | Draft editor, settings, lifecycle controls, QR sharing, questions, analytics, and private preview bridge |
| `media/`                                   | 4           | Image and audio editing with their CSS modules                                                           |
| `responses/`                               | 6           | Private reply dashboard, response dialog, and editor viewer panel                                        |
| `public/`                                  | 5           | Unlock, report, visit tracking, and visitor response form                                                |

All 52 moved files keep their original content except relative path strings and mechanical formatting. All 17 CSS modules keep exactly the same rules. The remaining 14 caller files likewise differ only in relative path strings and mechanical formatting. Those callers include route composition, shared preview composition, retained template components, and the source boundary browser test.

No compatibility wrappers, barrel files, dependencies, routes, API contracts, state owners, markup, event handlers, or database changes were added. Existing browser tests remain in `e2e/` because they verify route journeys, not just one component. There were no colocated unit tests in the moved component area. The existing source boundary test now reads the editor's new path.

Shared editor styles remain in `editor/draft-editor.module.css`. The response viewer imports them there rather than copying selectors. Shared question styles and preview protocol remain with their editor owner. Response navigation imports the existing editor section control. Asset imports retain their resolved targets.

Choose Your Heart editor and renderer remain in `components/` for the separate template registration milestone. Their page persistence and template presentation need separation before changing template ownership. Audio editing retains its existing Secret Letter player dependency. The private preview files move as page orchestration, without a claim that template independence is complete.

## Verification

| Check                        | Result                                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web lint                     | Passes with zero warnings.                                                                                                                                                  |
| Web types                    | Passes, including Next route type generation.                                                                                                                               |
| Web unit tests               | All 19 existing tests pass.                                                                                                                                                 |
| Production build             | Both the migrated and original web versions build successfully. The final bundle is rebuilt from restored migrated sources.                                                 |
| Mechanical comparison        | All 52 moves and 14 changed callers preserve content apart from relative path strings and mechanical formatting. All 17 stylesheet rule sets remain unchanged.                       |
| Initial selected browser run | 24 pass, 11 fail, one skip across desktop and mobile Chromium. This is not a green browser gate.                                                                            |
| Original source comparison   | Rebuilt the pre-migration source and reran all 12 cases corresponding to the failures. The same 11 fail and one skips. Every migrated file was then restored byte for byte. |

The passing browser cases include query filters, cursor pagination and retry, editor section navigation, waiting for owner data, password settings, failed save recovery, source boundary checks, navigation search, account error visibility, and draft/archive links. This does not claim full browser regression coverage.

The failed cases are grouped below. All reproduce against the original source with the same local fixtures:

- Two create/save/reopen/delete cases cannot find the create action because the local catalog fixture returns no templates. They remain unverified in this harness.
- Five private response cases expect an older recipient heading, response row label, manual read action, or inline mobile detail controls. The current source uses Private inbox, Anonymous response rows, automatic read state, and a dialog.
- Two navigation cases expect square desktop sidebar corners while the current stylesheet specifies rounded right corners.
- Two Home cases expect the older hero aspect ratio.

Do not weaken application behavior to satisfy these assertions. The response and layout checks need reconciliation with the accepted current UI, and the create journey needs a complete catalog fixture or the real isolated integration environment.

The harness uses a real production web server and a read only local catalog fixture on `127.0.0.1:3001`. Authentication and private page responses are intercepted by browser tests. No database or external auth provider is used. Test configs, baseline snapshots, traces, and the move manifest are ignored under `apps/web/output/`. Local servers are stopped after verification.

## Skills and remaining work

Vercel React guidance keeps imports direct and preserves client/server boundaries, query behavior, and existing lazy QR loading. Installed Next.js project structure and CSS guidance were read before moving code. No bundle or runtime performance improvement is claimed without measurement.

The development skill's read only scout identified cross folder styles, preview protocol, route callers, and template boundaries. Sync updates only the existing pages ownership context and path references. No product scope row matches this restructuring, so no scope boxes change. Spec 0022 remains In Progress.

The wider browser gate remains red for the baseline reasons above. Live provider login, live database persistence, full public rendering, GitHub CI, deployment, push, pull request, and formal independent review are not reported as completed. The previously recorded policy rendering issue with JavaScript disabled remains open. The user's existing `skills-lock.json` edit stays outside the milestone.

Suggested next work is to reconcile the existing browser checks and supply complete catalog fixtures before continuing template registration. Template registration must then prove descriptor, API adapter, and web presentation ownership with the two existing launch templates.
