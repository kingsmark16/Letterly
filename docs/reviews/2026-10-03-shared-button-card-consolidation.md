# Shared Button and Card consolidation

Date: 2026-10-03

## Change and ownership

`packages/ui` now owns the live Button and Card implementations. The three editor consumers import the package directly. The unused application Card subcomponents and the application Button/Card files are removed. The landing hero uses the existing shared Link directly, retaining its navigation target, feature styles, and magnetic enhancement attribute.

Button uses static class variants and the package class merge helper. Its existing primary, secondary, and tertiary variants, native button props, forwarded ref, loading attributes, disabled behavior, state slot, and external loading announcement are retained. Ghost and small/icon sizes support the existing editor callers. Prop types derive from the variant definition so additions do not require a second variant list. Card retains article/section semantics and its optional state region. The editor explicitly chooses section.

The package owns `cn` at `src/lib/utils.ts`, exported through `@repo/ui/lib/utils`. It composes clsx with a centrally configured Tailwind merger. Letterly text, radius, shadow, target, and duration names have explicit merge coverage. Caller utility overrides remain predictable without treating CSS Module selectors as mergeable utilities. Production Tailwind scanning includes package source explicitly. Fast motion and minimum target utilities reference the canonical tokens.

Only class-variance-authority 0.7.1, clsx 2.1.1, and tailwind-merge 3.7.0 were added to the package. The lockfile adds their package links and the one missing tailwind-merge version. Existing dependencies were not upgraded. No runtime component or icon library was introduced.

Obsolete Button/Card selectors were removed from the shared CSS Module after searches confirmed their source references were gone. Other primitives still use that stylesheet. Active scale and tertiary underline offset retain their existing values through the token stylesheet. The desktop checklist CSS previously overrode the target to 36 px; it now references the 44 px target token.

## Verification

- Repository unit suite: 817 passing cases, including 26 UI cases. API, templates, and database results reused valid Turbo cache entries. UI and web executed freshly.
- Seven class merge cases cover caller padding, color, radius, shadow, target, motion, semantic typography, conditional inputs, CSS Module names, responsive/state modifiers, and important classes.
- Four additional component cases cover refs and activation, caller styling, separate disabled/loading behavior and announcement placement, and semantic Card elements/state content. The previous fifteen primitive cases continue to pass.
- Repository lint passes all seven tasks with zero allowed warnings. Formatting passes.
- Production browser fixture suite: all 76 cases pass on desktop and mobile. The existing editor navigation case now verifies semantic Card output, retained compact desktop CSS Module padding, utility precedence, the minimum button target, typography, and keyboard focus. A new landing case checks the hero link at 390, 768, 1024, and 1440 px, including padding, pill shape, font size, visible keyboard outline, and absence of nested interactive elements. Existing dropdown navigation, saved pages, failure recovery, previews, and public rendering journeys pass.
- The first new assertions incorrectly assumed feature Card padding came only from utilities and that Tailwind serialized a full radius as 9999 px. They were corrected to check the existing CSS Module override and actual pill shape. The target check then exposed the desktop override described above. The focus test now uses keyboard input before evaluating focus-visible styling.
- Final regular repository build passes all three tasks, with web built freshly after the fixture suite and API/database using valid cache entries. Final repository type checks pass all seven tasks, including fresh UI and web checks after the regular build. The workspace is restored to its normal build configuration.

## Performance

Both measured Chromium profiles retain the same results. The canonical baseline fixture was not changed.

| Initial landing measurement | Baseline | After consolidation |
| --- | ---: | ---: |
| Loaded CSS bytes | 451,379 | 450,306 |
| Loaded client JavaScript bytes | 1,173,075 | 1,203,875 |
| Font requests | 10 | 10 |
| Font bytes | 428,152 | 428,152 |
| Observed initial CLS | 0 | 0 |

CSS decreased by 1,073 bytes. JavaScript increased by 30,800 bytes, about 2.6 percent. The existing gate passes the 10 percent CSS/JavaScript budgets, exact font content/request checks, and initial CLS allowance. These are loaded decoded static response sizes and observed initial layout shifts, not field performance or an entire user visit.

## Remaining work and limits

This is the Button/Card migration milestone, not completion of spec 0009 or the repository restructuring. Other shared primitives still need Tailwind migration and compatibility evidence. Application Badge, Chart, Separator, and Tabs remain for an ownership review. The package generator configuration, complete semantic alias/breakpoint adapter setup, and token sync checks remain open. Wider manual accessibility, forced colors, zoom, native dialog cross-browser checks, and a final import audit remain required by the governing specifications.

API integration was not rerun because no API, database, or transport behavior changed. Existing database-dependent skips and unobserved remote CI remain prior delivery limits. This report records self verification, not an independent review. The user's existing skills-lock.json modification is preserved outside this milestone.
