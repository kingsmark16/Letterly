# API shared strict configuration

The API now consumes shared compiler and lint configurations through workspace package exports. This closes the standalone compiler and disabled explicit any findings in the repository structure review.

## Compiler ownership

`packages/typescript-config/nestjs.json` extends the existing strict base. The API inherits full strict mode, checked indexed access, NodeNext resolution, and the shared module conventions. The Nest configuration preserves the existing ES2023 target, decorator metadata, experimental decorators, source maps, comment removal, package export resolution, filename casing, and switch checks. Workspace paths, Node/Jest types, incremental compilation, and the existing absence of declaration maps remain local overrides.

A diagnostic run showed full strict mode already passed. Enabling checked indexed access exposed forty eight diagnostics in tests, with no production source diagnostics. The corrections require expected fixture elements and mock call order values through `test/support/required-test-value.ts`. Missing values throw a contextual test failure. The tests do not use non null assertions, type casts, default numbers, or disabled compiler checks to hide missing data. Named question and choice fixtures keep nested graph setup readable.

## Lint ownership

`packages/eslint-config/nest.js` extends the shared `baseConfig` and type checked rules. Explicit any, floating promises, and unsafe arguments are errors. The API retains local project service paths, Prettier integration, and feature dependency restrictions. Its read only lint command fails on warnings; `lint:fix` remains explicit.

The shared base has a separate export without the legacy warning conversion plugin. Existing web/library consumers keep the previous `config` export and warning policy. Nest consumers do not convert errors into warnings. The Turbo environment declaration rule is disabled only for test files that deliberately manipulate environment fixtures; production files retain the shared rule.

Effective configuration inspection verified strict mode, checked indexed access, and both Nest decorator options. ESLint inspection verified error severity for all three selected rules and absence of the warning conversion plugin.

## Verification

- Root lint and type checks pass across seven tasks, with all tasks executing after the shared dependency changes. API lint and types also pass after the final fixture cleanup.
- Root formatting check and `git diff --check` pass.
- All 799 root unit tests pass across five workspaces. API has 581 tests in 78 suites, templates 98, web 91, database 14, and UI 15. Unchanged web and database results were cached. The final catalog fixture simplification also passes its eleven targeted tests.
- API integration passes 595 tests across 25 suites. Seven tests in four database dependent suites remain skipped locally.
- Root build passes all three tasks freshly, including Nest compilation, Prisma client generation, and the normal Next.js production build.
- The lockfile adds exactly six lines for two internal workspace links. No package version changed.

The first root unit run was blocked before UI test execution by sandbox directory access during esbuild configuration loading. A rerun with process access passes, including all fifteen UI cases. The initial serial Jest invocation included an extra argument separator and selected no tests; the corrected command ran the full suite. The initial install attempt could not prompt to confirm module reuse. A frozen install with the existing store path and lifecycle scripts disabled completed. Although the install used the offline flag, pnpm's supply chain verification made registry metadata requests; no new dependency package or upgrade was introduced.

No production TypeScript source, route, provider binding, database schema, migration, or product behavior changed. Browser journeys were not rerun for this compiler and test configuration milestone; the preceding web cancellation milestone passed all 72 cases. Live PostgreSQL execution, remote CI execution, and deployment remain unclaimed. This is self verification, not an independent review. The overall repository restructuring remains in progress, including shared UI ownership and the final file audit.
