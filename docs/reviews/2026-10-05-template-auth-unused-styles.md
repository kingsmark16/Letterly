# Template and authentication style cleanup and recovery readiness

Date: 2026-10-05

## Result

Removed 37 unreachable whole CSS rules from two feature stylesheets. Secret Letter renderer styles decreased from 3883 to 3577 lines, and authentication styles from 1252 to 1214 lines. The cleanup removes obsolete locked envelope artwork and obsolete authentication divider, prompt, and session selectors. Current markup, animations, active declarations, and provider behavior remain unchanged by the stylesheet edit.

The same verification run reproduced an existing recovery bug: an email entered in the server rendered form became empty when React Hook Form initialized. Both recovery email forms now disable input and submission until their existing `formState.isReady` flag is true. The existing submitting guard remains. This is the only application behavior change in this milestone.

## Static evidence

The [audit artifact](2026-10-05-template-auth-unused-styles.json) records all five renderer owners and three authentication owners, their final hashes, used classes, removed selectors, and retained cascade hashes. The stylesheet binding analysis found no escaping style objects. A rule was removable only when every selector branch required an unused positive class. Selectors with functional syntax or escapes were excluded from automatic pruning, and mixed active selectors were retained.

All 407 renderer and 186 authentication retained rules were compared against HEAD, including declaration text, enclosing conditions, and sequence. All 593 matched. Normalize CRLF before parsing to prevent operating system line endings from producing false differences in multiline values and comments. Owner hashes were refreshed after the recovery guard; its class usage is unchanged.

## Browser evidence

The production fixture suite used Chromium, Firefox, and WebKit at widths 390 and 1440, with API port 3003 and web port 3103. Provider responses were intercepted, so these checks sent no real recovery email.

The initial 186 case run had 133 passes, 30 deliberate credential entry skips, and 23 failures. Those failures exposed obsolete catalog and logout expectations, floating point target measurements less than 0.000001 pixel below 44, and the actual WebKit recovery input loss. A separate held JavaScript probe confirmed that an entered email became empty after hydration.

After the readiness guard and test corrections, the 198 case run had 166 passes, 30 skips, and two mobile logout failures. The remaining failures came from the test racing the dashboard redirect and checking Menu visibility while the guest shell was still rendered. The test now awaits the existing templates redirect and uses an auto waiting click at the actual compact workspace breakpoint. A focused rerun passed all six logout cases in 13.4 seconds. These are separate runs, not a claim that a single final 198 case run passed.

All twelve delayed hydration cases passed in the 198 case run, covering both recovery modes across the six projects. They hold local JavaScript chunks, assert disabled server rendered controls, release chunks, assert usable controls, and check the normalized email payload and generic completion. Public template rendering, locked pages, preview registration, bounded catalog navigation, pagination, and image fallback cases passed in that run.

Authentication and recovery tests are now included in both permanent fixture and UI configurations. The thirty credential entry cases remain skipped because public email and password entry is deliberately Coming soon. This milestone does not enable those flows or certify real provider delivery.

## Review and gates

GPT-6 Luna approved the [stylesheet scope](2026-10-05-template-auth-unused-styles-luna.md) and the [recovery and test scope](2026-10-05-recovery-hydration-luna.md), with no findings. Browser results were recorded separately from review.

The production web build and all 121 web unit tests passed. Root lint, format, and type gates passed. The permanent UI configuration discovers 336 cases across eight files, including the new recovery regression. Overall repository restructuring remains in progress. The pending YouTube behavior conflict, wider accessibility acceptance, and final repository audit remain open.
