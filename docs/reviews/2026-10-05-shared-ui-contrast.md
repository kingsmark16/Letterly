# Shared text control contrast correction

The shared Input boundary measured 1.40:1 against its surrounding canvas, below the required 3:1 for identifying an empty input. The semantic input alias now references the existing canonical ink-muted token, and shared Input and Textarea use `border-input` in normal and hover states. Decorative borders and palette values remain unchanged. Invalid borders and focus styles retain their existing tokens.

Five actual administration Input consumers had redundant `border-border` classes overriding that default. Their layout classes remain, while the shared primitive owns its border. The two native audit selects retain their original styling. No props, filter callbacks, request payloads, route behavior, or domain rules change.

## Browser evidence

The final focused run passed all 24 cases in 50.5 seconds. Chromium, Firefox, and WebKit each tested 390 and 1440 CSS pixel widths. The contrast test records nine shared fixture probes and five actual administration Input consumers per profile. It asserts normal text contrast of at least 4.5:1, keyboard focus contrast of at least 3:1, and normal and hover input boundaries of at least 3:1. Empty fixture input and textarea boundaries now measure 5.92:1. Labels, help text, errors, button variants, and invalid textarea borders are measured separately.

Luna identified that the first audit edit had removed select borders instead of the two Input overrides. That run passed 18 cases and failed all six contrast cases on the audit target Input at 1.24:1. The select styles were restored and the Input overrides corrected before the final passing run.

All 38 surface performance comparisons then passed in 19.9 seconds against the unchanged historical references and thresholds. [The measurements](2026-10-05-shared-ui-contrast.json) preserve the original eight fixture probes per profile, the final fourteen probes per profile with hover colors and paths, and current performance summaries. Before measurements do not include actual administration consumers or the subsequently added empty textarea.

The measured scope is opaque solid backgrounds and these named shared controls. This does not establish complete website WCAG conformance or native select contrast. Disabled controls and decorative button boundaries are treated according to [W3C non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## Documentation reconciliation

Spec 0009 records the semantic mapping and production Tailwind scanning contract. Its checklist closes four directly tested configuration items: generator ownership, `cn` class conflicts, semantic aliases, and breakpoint synchronization. Wider accessibility and behavior acceptance remains open pending complete evidence mapping. Spec 0022 now distinguishes completed queue, CSS, onboarding, query-plan, and version retention milestones from remaining verification work.

UI and administration context files record that caller border overrides must preserve accessible shared defaults. The repository remains on the existing feature branch. The original landing baseline and the user-owned skills lock file remain outside this change.

## Repository gates

The normal production build passed in 20.261 seconds with a fresh web build and cached API/database builds. Direct web route generation and type checking passed. All 39 shared UI and 121 web unit tests passed freshly. The final `pnpm check:commit` gate passed lint, maintained source/configuration formatting, and all seven type tasks, with fresh web lint and fresh UI/web types.

An initial direct type check caught an inferred implicit array type in the new measurement helper. The helper now returns its inferred record type into a typed array, without `any` or changed assertions. An initial formatting check also caught the global stylesheet formatting, corrected before the final passing gate. Neither initial failure is counted as a passing check.

A direct token reference check confirms that all 60 canonical Letterly variables referenced by the global stylesheet exist in the package token source. [GPT-6 Luna's independent review](2026-10-05-shared-ui-contrast-luna.md) approves the focused change with no remaining findings, independently checks all 84 final contrast records, and distinguishes source/artifact inspection from author-run tests.
