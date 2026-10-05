# Shared UI surface performance, 2026-10-05

The expanded performance gate passes all 38 cases, covering 19 production route and state scenarios at 390 and 1440 CSS pixels. This closes the previous landing only measurement gap for the named scenarios. It does not establish full WCAG AA acceptance or every possible product state.

## Reference and measurement

The original `apps/web/e2e/fixtures/landing-ui-baseline.json` is unchanged. Its SHA256 remains `F936079DC28C08F9A9B5DF631683C7AE9943A41C464CE4FF0E00B638DBC36AB7`. The ordinary landing check continues to use that reference.

The new `surface-ui-baseline.json` contains 38 actual historical measurements at `0717c1f0e6724314baab540cd1fce4effc5d2782`, before the shared primitive migration. The historical source was built in an isolated Git worktree using its frozen lockfile and an offline dependency installation. Current deterministic fixture payloads and the same route exercises were used for both builds. No production credentials or live provider calls were used. GPT-6 Luna independently compared all 38 samples with their raw capture files before the temporary worktree was removed. The baseline records the source revision, fixture revision, lockfile hash, harness hashes, and capture results.

The first historical capture passed 28 cases and failed ten because the isolated server lacked synthetic authentication and media secrets. Those failures supplied no accepted measurement. A focused rerun with synthetic fixture secrets passed the remaining ten cases. This is recorded in the baseline rather than described as a clean first run.

Each case starts in a fresh browser context, navigates to the production route, and verifies its named visible behavior. Measurements sum decoded bodies of observed Next static stylesheet and script responses. Fonts retain response counts, bytes, and content hashes. Completion waits for fonts, two animation frames, and all observed static requests. Ordinary landing additionally retains its original network idle wait. Other routes avoid whole page network idle because public analytics can poll continuously. This is a bounded initial route or exercised dialog measurement, not a claim about all future lazy interactions or network traffic.

The same ten percent CSS and JavaScript limits apply to each corresponding historical route and viewport. No case may add font requests or introduce a font content hash absent from its reference. The ordinary landing retains the original CLS allowance of 0.02. Other scenarios record layout shift without applying an unrelated initial landing threshold to interaction states. Failed budget checks now retain their measurement artifacts for diagnosis.

## Production correction

The first valid route matched comparison passed 34 cases and found four editor CSS violations. Overview and settings fetched 480,333 decoded CSS bytes against their 435,009 byte reference, exceeding the unchanged 478,509.9 byte limit.

`apps/web/app/globals.css` now disables automatic Tailwind source discovery and explicitly scans production code under the web `app`, web `src`, and shared UI `src` owners. It excludes colocated test and spec files. This prevents tests, fixture data, documentation, and unrelated files from adding unused utilities to production styles. The source registration contract test covers these three owners and exclusions. Tailwind documents this explicit source configuration in its [official source detection guide](https://tailwindcss.com/docs/detecting-classes-in-source-files).

The final overview and settings measurements are 477,397 bytes, 9.74 percent above the historical reference and within the existing limit. Content is 496,968 bytes, 9.29 percent above its reference. The editor budget has little remaining headroom; later changes must continue to pass the gate. The ordinary landing fetches 198,193 CSS bytes and 1,184,785 JavaScript bytes, with ten font requests and CLS zero at both measured widths. Template font scenarios retain their historical fourteen requests. No token, template art, route, API, authentication, persistence, or rendering boundary is changed by the source filter.

## Verification

- The complete expanded performance suite passes 38 cases in 17.8 seconds. [All current measurements](2026-10-05-shared-ui-surface-performance.json) retain route, viewport, browser, assets, and observed timing.
- All 121 web unit tests pass, including the updated source registration contract.
- The broader production style and interaction run in Chromium, Firefox, and WebKit finishes with 395 passes, 30 intentional skips, and one failure in 7.5 minutes. It covers shared primitives, landing states and links, footer composition, editor controls, administrator confirmation, authentication, and native legal/preview dialogs. The skipped cases are credential flows deliberately unavailable on the public entry screens.
- The failure is the Firefox 1440 password reset success assertion. Its trace shows both filled fields and no reset request. The root cause is unproven. Without changing code or assertions, the isolated case subsequently passes 20 repetitions in 51.5 seconds, and the surrounding Firefox authentication suite at both widths passes all 32 enabled cases with ten intentional skips in 39.3 seconds. These reruns do not erase the initial failure or prove a fix.
- [GPT-6 Luna's independent review](2026-10-05-shared-ui-surface-performance-luna.md) approves the source and measured comparisons. Its review distinguishes file inspection and historical raw measurement comparison from author run browser evidence.

The normal `pnpm build` passes in 21.145 seconds, with a fresh web build and cached unchanged API/database tasks. Direct web route generation and type checking pass after build restoration. `pnpm check:commit` passes lint, formatting, and type checks; web lint/types execute freshly while six unchanged workspaces use their cached checks. The new evidence and report files also pass separate Prettier checks. These results do not close full UI acceptance.

The exercised scenarios are ordinary landing; landing empty, error, and loading; legal dialog; catalog preview dialog; sign in; password recovery; both template previews; empty creator dashboard; owner overview, content, and settings; administrator reports, confirmation, and audit; opened public Secret Letter; and Choose Your Heart private response entry. The public letter comparison uses the common content fixture available at both revisions. Long letter pagination, full analytics interactions, live authentication, database persistence, real uploads, provider media, remote CI, and complete accessibility acceptance are outside this performance comparison.
