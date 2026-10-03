# Shared text control migration

Date: 2026-10-03

## Implementation

Input, Textarea, and Field now use static Tailwind classes in the canonical UI package. The internal `src/lib/control-styles.ts` shares Input and Textarea styling without adding a public export or a runtime dependency. The existing textarea minimum height of 8rem now lives in the canonical token stylesheet.

Public imports, exported props, forwarded refs, native values, disabled and loading semantics, data attributes, and the textarea count sibling remain compatible. Field retains label association, stable IDs, required semantics, error precedence, and deduplicated descriptions. Caller recognized utility overrides use the shared class merger. No client boundary was added.

The global control hover selector now excludes invalid controls. Otherwise its unlayered border rule would override the Tailwind error border. The production browser probe confirms an invalid textarea keeps its error border on hover and its visible focus outline. The obsolete shared text control CSS Module selectors are removed. IconButton, Status, and Dialog still use that stylesheet.

There are no production application imports of these three shared primitives at this milestone. The browser probe renders the actual components in the existing isolated Node fixture and checks them against the production stylesheet. This proves package compatibility, not migration of existing feature forms.

## Verification

- Repository unit suite: 827 passing cases, including 32 UI cases. Three added cases cover Input refs/loading/validation, Textarea refs/native values/count placement/caller overrides, and Field relations when errors clear. UI and web ran freshly; unchanged API, template, and database tasks used valid cache entries.
- All 80 desktop and mobile browser fixture cases pass. New checks cover labels, descriptions, errors, required state, target and textarea minimum heights, padding, typography, radius, surface color, invalid hover, keyboard focus, loading, caller overrides, and reduced motion.
- Repository lint and type checks pass seven tasks each. Formatting and diff checks pass. The normal repository build passes three tasks after the browser fixture build. UI and web type checks ran freshly after the normal build, restoring ordinary build configuration.

## Performance

Both Chromium profiles load 448,165 CSS bytes and 1,203,524 client JavaScript bytes. Against the canonical baseline of 451,379 CSS bytes and 1,173,075 JavaScript bytes, CSS is 3,214 bytes lower and JavaScript is 30,449 bytes higher (about 2.6 percent). Ten font requests, exact font contents, and 428,152 font bytes remain unchanged. Observed initial CLS is zero. All existing budgets pass; the canonical baseline was not regenerated.

## Remaining scope

IconButton, Status, Dialog, application Tabs/Chart ownership, and unused dependency reconciliation remain open. Wider accessibility and dialog browser checks, source/style decomposition, contributor onboarding, template contract/growth measurements, and the full repository acceptance audit are still required.

API integration was not rerun for this presentation and test harness change. Remote CI and existing database dependent skips remain unobserved delivery limits. This is self verification, with no independent review claimed. The user's skills-lock.json modification remains untouched.
