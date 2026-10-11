# Exact CSS repetition cleanup, 2026-10-05

This resolves the second minor maintenance finding from [the independent cohesion review](2026-10-05-large-owner-cohesion-luna.md). Six existing feature/template stylesheets lose 215 earlier identical declarations. The removal contract follows parent 0022 historical CSS cleanup while preserving launch presentation. No component, route, template identity, provider, or package dependency changes.

## Removal proof

[The audit artifact](2026-10-05-exact-css-repetition.json) records every removed declaration, its original line, the later retained line, exact selector, ancestor conditions, property, value, and importance. Source hashes use normalized LF line endings. A declaration is removable only when a later declaration matches all those fields within the same stylesheet. Keyframes are excluded. Differing values, states, selectors, and conditions remain intact. The later matching declaration preserves cascade precedence over intervening rules; no retained rule is reordered or consolidated.

| Stylesheet owner | Declarations removed | Empty rules removed |
| --- | ---: | ---: |
| Landing FAQ | 9 | 6 |
| Landing template showcase | 39 | 15 |
| Landing page | 43 | 7 |
| Draft editor | 16 | 3 |
| Visitor response form | 7 | 1 |
| Secret Letter renderer | 101 | 4 |
| Total | 215 | 36 |

PostCSS reparsing preserves the retained syntax tree, including conditional ancestors, comments, values, importance, and node order. Prettier leaves all six retained trees identical, with final source hashes refreshed afterward. Empty conditional wrappers remain, so at rule order is unchanged. A source search finds no CSS rule mutation or enumeration in application code; the existing preview measurement uses computed padding.

## Verification

Before changing source, the production fixture build passed all 96 landing foundation and editor control cases in 1.8 minutes. Chromium, Firefox, and WebKit each covered widths 390 and 1440. Tests cover keyboard and preview focus, reduced motion, forced colors/reflow, no script preview navigation, catalog presentation, owner recovery, and draft/published review geometry. These are behavioral baselines, not pixel comparisons of every template state.

After cleanup, 162 landing foundation, editor control, and shared UI compatibility cases passed in 3.0 minutes across the same six profiles. A separate 60 case template registration run passed in 1.1 minutes, covering public/locked letter content, password focus, message pagination, image fallback, preview identity/focus, and bounded catalog navigation. That run used a temporary configuration extending the existing UI projects; the configuration was removed afterward. WebKit navigation produced two Next destination stream closed early diagnostics, with no failed browser assertion. Their cause was not established by this run.

The enabled visitor response form has no matching fixture in those suites. Its seven removals have the exact declaration/cascade proof above, but this milestone does not claim browser interaction coverage for enabled responses. Fixtures intercept provider/API boundaries and do not prove live deployment or provider behavior.

Both landing performance profiles passed in 5.7 seconds against the unchanged baseline. Each loaded 201,352 CSS bytes, 1,184,750 JavaScript bytes, ten fonts totaling 428,152 bytes, and measured CLS 0. Landing CSS is 2,170 bytes smaller than the preceding 203,522 byte milestone. Fonts and JavaScript retain the prior measurements. All 121 web unit tests passed in 2.521 seconds. A repeat scan of all 43 tracked web stylesheets finds zero earlier identical declarations under the same contract outside keyframes.

The normal root build passed in 26.911 seconds with fresh web/API output and cached database generation. Direct web route/type checks passed afterward. Root commit gates passed, with fresh web lint in a seven task graph (six cached tasks, 27.339 seconds), formatting across all maintained paths, and fresh web types in a seven task graph (six cached tasks, 8.432 seconds). [GPT-6 Luna approved the eight source/evidence files](2026-10-05-exact-css-repetition-luna.md) with no findings. Its independent reconstruction verifies all 215 removed records, 36 emptied rules, twelve source hashes, six retained trees, and all 45 class selector occurrences from emptied rules. Reported runtime gates remain separate from the reviewer's own checks.

The existing launch artwork and differing historical cascade values remain deliberate. Wider shared UI acceptance and the overall repository goal remain open.
