# Shared control target correction, 2026-10-05

Spec 0009 AC-3 and the existing target token require controls at least 44 pixels in size. The landing announcement retained a 24 pixel desktop minimum and 40 pixel compact minimum; compact header actions and the short full authentication footer also retained 40 pixels. This milestone corrects those remaining exceptions using the existing `--letterly-target-min` source. It adds no new token value or product behavior.

## Change

Landing Link compositions retain the canonical height at all widths. Button and Link base classes now also use the existing target token for minimum width, so short labels have a complete target. Button's icon size no longer repeats the width class because the base supplies it for every size. Shared site footer and authentication footer utility owners supply the same minimum width to their native Next.js links. Both authentication footer modes use the canonical minimum height; short viewport font sizes remain unchanged.

Caller composition, variants, accessible names, navigation, loading/status placement, focus, hover, and reduced motion contracts remain intact. The increase in target geometry is intentional acceptance work under the existing spec. Earlier geometry reports describe their historical revisions.

## Verification scope

The landing control comparison retains its historical JSON unchanged. It explicitly expects 44 pixel minimum heights for the announcement and header sign in/up controls, and compares all other measured properties with that baseline. It checks actual target rectangles at 320, 390, 768, 1024, and 1440 pixels. Full authentication footer checks measure every link at 390 by 900, 390 by 600, and 1440 by 900 and retain font/focus checks, plus horizontal overflow checks. The landing footer also checks short link width.

A focused production CSS fixture renders a small Button and Link, each labeled Go, and measures both target dimensions and visible keyboard focus across the five widths. This catches undersized short text that a long action label can hide. A 0.01 pixel tolerance handles browser rectangle rounding; the required CSS minimum remains exactly 44 pixels.

All 39 shared UI unit tests and 121 web unit tests pass. The production fixture run passed 180 existing landing, shared link, and shared primitive compatibility cases in 3.3 minutes across Chromium, Firefox, and WebKit at 390 and 1440 pixels. The newly added short control case was discovered in a separate run and passed all six profiles in 16.9 seconds. These are two runs, not one 186 case run.

Both unchanged landing performance baseline checks pass in 4.4 seconds. Each profile loaded 201,129 CSS bytes (223 fewer than the prior milestone), 1,184,785 JavaScript bytes (35 more), and ten fonts totaling 428,152 bytes. CLS remains 0. The font request/hash and CSS/JavaScript budgets pass without refreshing the baseline.

The normal root build passed in 17.176 seconds, with fresh web output and cached API/database tasks. Direct web route and type checks passed afterward. Root gates passed with fresh UI/web lint and types, five cached tasks in each seven task graph, and formatting across all maintained paths. Lint took 23.598 seconds and types took 10.962 seconds. [GPT-6 Luna approved the eleven source, test, context, and report files](2026-10-05-shared-control-targets-luna.md) with no findings. It independently inspected the token, caller compositions, and test assertions, without claiming to rerun the reported gates. Fixtures do not certify live providers, all application controls, or the full WCAG baseline. Automated accessibility acceptance and remaining specification questions remain open.
