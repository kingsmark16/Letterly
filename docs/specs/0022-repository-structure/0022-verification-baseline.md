# Verification baseline milestone

## Summary

You authorized milestone 1 and requested a new branch from the latest integration code. This slice establishes checks for the current repository before template and ownership migrations. It preserves product behavior and existing test runners.

## Requirements

- **AC-1:** A new `feat/` branch starts from the freshly fetched `origin/main`; existing local work remains intact.
- **AC-2:** `pnpm lint` checks API, web, UI, config, contracts, database, and templates without writing fixes. API fixes remain available through `lint:fix`.
- **AC-3:** `pnpm format:check` checks maintained application source and repository/workspace configuration without modifying files. Generated, local, and personal artifacts are excluded. Historical Markdown and the dependency lockfile are outside this code formatter gate.
- **AC-4:** `pnpm test` executes the current API Jest tests, UI Vitest tests, and existing web catalog and Next config tests. Web owns the required tsx dependency. No test runner replacement.
- **AC-5:** Shared source changes propagate through Turbo test hashes. A template source edit invalidates consuming API tests; restoring the file restores the original hash.
- **AC-6:** CI includes code formatting, Prisma validation, and all workspace unit tests, while retaining isolated database integration tests and the existing Playwright smoke journey.
- **AC-7:** Type checks and production builds pass after the tooling and mechanical formatting changes. Formatting changes do not alter application JavaScript behavior.

## Decisions and sources

The governing source is the structure proposal plus the user's instruction to implement its first milestone. Inputs are workspace manifests, existing test files, formatter configuration, the Turbo dependency graph, and the current CI workflow. No schema, route, provider, or product decision is introduced.

Use the installed ESLint version and shared configuration package for the missing library checks. Library lints fail on warnings, consistent with web and UI. Keep the API's existing type aware rules in this slice. Strictness and application boundary enforcement remain later milestones.

Use Node's existing test runner through tsx for `apps/web/lib/catalog.test.ts` and `next.config.test.mjs`. Preserve Jest and Vitest. Use a transit task for dependency aware test caching. Database configuration's environment references are declared for its lint task; lint does not connect to a database.

The formatter preserves local line endings and existing API quote style. It checks TypeScript, JSX, JavaScript, JSON, CSS, and root/workflow YAML in explicit source/configuration paths. It excludes generated clients, build output, reports, local QA output, dependency files, and personal tooling. Existing mismatches within that scope receive mechanical formatting only. Markdown remains separately formatted when edited, avoiding historical review churn.

## Implementation and verification

1. Fetch and create the branch, preserve existing work, and record the baseline, satisfies AC-1.
2. Add library lint ownership, make API lint read only, and ignore web generated QA artifacts, satisfies AC-2.
3. Add formatter scope and repair existing formatting within it, satisfies AC-3 and AC-7.
4. Wire existing web tests and shared source cache propagation, satisfies AC-4 and AC-5.
5. Update CI and lockfile, satisfies AC-6.
6. Run uncached relevant checks, compare formatter only source behavior, and inspect the diff, satisfies AC-2 through AC-7.

The baseline before changes passed all seven type check tasks and all three build tasks. Existing API lint passed. Existing unit suites passed 386 API tests and 15 UI tests after running outside a Windows sandbox limitation. The new web command adds six existing tests to root unit coverage.

Final verification results are recorded in the milestone review. Integration and browser commands use isolated resources; no local or production database migration is authorized by this tooling slice.

## Consequences

Future file moves have repeatable validation commands and dependency aware test caches. Some existing source files change formatting to make the gate pass. This creates review noise, but those changes are mechanical and are verified separately from the tooling changes.

CI execution on GitHub remains unobserved until the branch is pushed. The existing browser smoke step remains deliberately narrower than the complete Playwright suite.
