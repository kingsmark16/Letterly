# Review, CI WebKit and API startup, 2026-10-11

**Reviewed by**: GPT 5.6 Terra, independent reviewer, author on GPT 6
**Scope**: Uncommitted changes in `.prettierignore`, `apps/api/package.json`, `apps/web/.gitignore`, `apps/web/e2e/landing-foundation.spec.ts`, `packages/eslint-config/next.js`, and `packages/eslint-config/AGENTS.md`
**Verdict**: Approve

## Summary

The API command is correct. Nest CLI compiles the API to `dist`, then runs the compiled entry file with `tsx`. The installed Nest CLI accepts `--exec`, and `tsx` is an installed API dependency.

The ignore rule is correct. It matches the existing root level `.next-fixtures-*` directories and prevents Tailwind 4 automatic source detection from scanning generated build output. It does not ignore `.next` or source directories beyond the existing rules.

The updated WebKit wait is correct. It waits for the existing `data-motion-ready="true"` state on the landing root. `LandingEffects` sets that state inside its client effect after initial hydration, so the test waits for client readiness rather than a brief absence of network traffic.

The shared ESLint update is correct. `apps/web/eslint.config.js` imports the shared Next configuration, and `globalIgnores` makes `.next-fixtures-*/**` a global ignore pattern for that workspace. It skips generated fixture contents while preserving linting of application source and the existing ignored output directories. The documentation records the same scope.

The Prettier update is correct. The root formatting commands pass explicit recursive application and package globs, so `.prettierignore` must exclude generated fixture content separately. `**/.next-fixtures-*/**` matches the contents of every generated fixture directory inside those formatter scopes without excluding maintained source files.

## Strengths

1. `apps/api/package.json:11` restores Nest CLI compilation for the server started by Playwright while preserving `tsx` as the runtime executable.
2. `apps/web/.gitignore:15` precisely covers the generated fixture output directories already present in the workspace.
3. `apps/web/e2e/landing-foundation.spec.ts:329` replaces the prior network quietness check with the landing client effect signal. This is a direct and stable readiness condition for the preview interaction.
4. `packages/eslint-config/next.js:24` applies the fixture output exclusion through ESLint's global ignore mechanism. A direct ESLint invocation identifies an existing generated fixture file as ignored, and the normal workspace lint run is reported to pass with those directories present.
5. `.prettierignore:3` excludes generated fixture contents from the root explicit Prettier globs. Prettier file information reports an existing fixture build artifact as ignored.

## Test evidence and limits

I did not run tests or the full formatter, as requested. I inspected the uncommitted diff, the installed Nest CLI implementation, the existing fixture directories, the landing client effect, the ESLint flat configuration, the root formatter scope, and Playwright 1.62 type documentation. The focused WebKit 390 preview and focus test was reported to pass in 10 of 10 repeated runs after this update. `pnpm --filter web lint` was reported to pass with fixture directories present. Directly linting a named ignored fixture file reports the expected ignored file warning and exits 1 under the workspace warning policy, so the workspace lint result is the relevant proof. Prettier file information reports a generated fixture build artifact as ignored. My `git diff --check` inspection reports no whitespace errors.

## Severity counts

Blocker: 0.

Major: 0.

Minor: 0.

Nit: 0.
