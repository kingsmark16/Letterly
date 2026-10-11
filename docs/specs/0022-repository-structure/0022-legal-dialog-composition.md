# Legal dialog composition

Date: 2026-10-04

**Status**: Accepted

## Decision

Legal owns the policy dialog and its content styles beside the server privacy and terms documents. Landing and authentication import that owner directly. Keep rendered server document nodes, policy text, dates, section IDs, native dialog lifecycle, and ordinary route fallback unchanged.

Use the shared Dialog root className and typed presentation slots for root, wrapper, header, title, and description composition. Add an optional heading slot for the title/description container so legal can preserve min-width without a descendant selector. Default consumers retain their existing structure and styling. The existing legal 62 rem width and 56 rem height caps become canonical dialog tokens.

Preserve legal desktop geometry, separate header and scrolling document body, inclusive full screen compact layout, safe area padding, typography at 48 and 30 rem, and the canonical close control. Feature CSS retains document content and trigger styling, and stops overriding shared primitive internals. No policy copy enters the client bundle through a new import, no compatibility barrel is kept, and no dependency or modal implementation is added.

## Acceptance

- Legal dialog and stylesheet have one legal owner, and maintained consumers do not import their former generic component paths.
- No legal CSS selector targets shared Dialog root, wrapper, header, heading, description, or close internals. Document content styles remain local.
- Typed heading composition does not leak configuration to HTML and default Dialog contracts remain compatible.
- Actual legal browser checks cover both policies, desktop caps and centering, compact edges, short screens, title/description typography, header padding, close visibility, internal scrolling through all sections, and restored focus across supported engines.
- Unit, lint, formatting, type, build, fixture, and unchanged performance gates pass. Wider feature CSS, accessibility, and full repository acceptance remain open.

## Evidence

[The composition report](../../reviews/2026-10-04-legal-dialog-composition.md) records ownership, the corrected media cascade, computed style and scrolling checks, authentication consumers, and repository gates. All 66 native cases and 94 fixture cases pass, with a further six case boundary run proving the exact 480 and 481 px layouts. Wider acceptance remains open.
