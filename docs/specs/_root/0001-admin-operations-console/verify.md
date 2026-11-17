# Verify: Admin operations console, milestone 1

Updated 2026-11-17. These steps cover the creator lookup and detail slice. Later milestones remain unbuilt. This checklist does not close the feature level Verify it or Test it gates.

## UI and manual checks

1. As an active administrator, open `/admin/creators`, submit an empty lookup, and confirm a labeled validation error. Enter an existing creator ID by keyboard and confirm navigation to its detail route. Covers AC-2 and AC-10.
2. Compare the displayed name, email, role, dates, moderation state, disabled reason, moderation version, and owned page count with the selected User row and related Page count. Use two accounts with different page counts to detect a shared or incorrectly sourced result. Dates display in UTC. Covers AC-2 and AC-9.
3. Repeat as a visitor, creator, and disabled administrator. Confirm access is denied before creator identity loads. Repeat with an absent creator ID and confirm an ordinary unavailable state. A missing account does not prove deletion. Covers AC-9 and AC-10.
4. Check creator details at widths 320, 768, 1023, and 1024 pixels, including an unbroken long name and email. Confirm no horizontal overflow. Open the narrow screen menu, cycle keyboard focus, close with Escape, and confirm focus returns to the trigger. Covers AC-1 and AC-10.
5. Load a creator, then expire or revoke the administrator session and trigger a fresh read. Confirm the visible identity and admin cache are cleared. Confirm sign in uses a validated return path. Repeat with denied access during an existing moderation mutation and confirm the workspace and dialog disappear. No action resumes automatically. Covers AC-9 and AC-10.
6. Inspect the creator response for the exact approved projection. Confirm private page writing, responses, storage keys, provider accounts, session tokens, and passwords are absent. Force a database connection failure and confirm a safe 503 response without identity in the error. Covers AC-9.
7. Follow the account audit history link and confirm its logical target is USER with the creator ID. Exercise the existing report confirmation flow, including pending state, uncertain retry, stale version refresh, and focus return. Confirm old report and audit URLs continue working. Covers AC-1, AC-9, and AC-10.
8. Visit the public landing before and after the admin console. Compare rendered styles. Confirm admin theme markers are absent outside admin routes. Also check sign in, the creator workspace, and public templates during the full feature verification. Covers AC-11.

## Commands

Use Node 24 and the package manager pinned by the repository.

1. `pnpm --filter api test:e2e --runInBand --runTestsByPath test/admin-composition.e2e-spec.ts` checks the production module, authorization, read limits, safe projection, safe errors, and caching.
2. `pnpm --filter api test:e2e --runInBand --runTestsByPath test/admin-creators.database.e2e-spec.ts` runs with `RUN_REAL_DB_TESTS=1`, `NODE_ENV=test`, and a dedicated migrated and seeded PostgreSQL test database. Use only the explicitly selected test connection. Set APP_ORIGIN, BETTER_AUTH_URL, and a test BETTER_AUTH_SECRET. This checks real sessions, identity, related counts, and denied roles.
3. `pnpm --filter web test:e2e:fixtures e2e/admin-creators.spec.ts e2e/admin-confirmation.spec.ts` builds the web application and checks desktop and mobile journeys. API responses in these browser fixtures are mocked. The separate database test proves the database path.
4. `pnpm --filter api openapi:generate` confirms the endpoint contract can be generated. Use the isolated test configuration.
5. `pnpm check:commit` checks lint, maintained source formatting, and types across the repository.

## Coverage limits

The acting administrator comes from a verified session and current User role/status. Creator identity and counts come from the explicit User projection and related Page count. Account history navigation uses the existing logical audit target. Visual values come from the scoped admin theme and interface specification.

The report, appeal, deletion, cleanup, aggregate, coverage, and overview sources in the parent value sourcing table receive their dedicated checks in later milestones. This slice does not claim AC-1 or AC-11 is fully verified across the complete console. Formal feature verification, test review, staging evidence, and release prerequisites remain open.
