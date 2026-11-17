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

## Milestone 2, updated 2026-11-18

The steps above preserve the first milestone baseline. Creator lookup now opens a bounded search result before its detail route. This section adds creator and page management and the dedicated appeal inbox. Deletion and analytics sources remain for later milestones.

### UI and manual checks

1. As an active administrator, browse `/admin/creators` and `/admin/pages`. Search by exact ID, creator name prefix, creator email, and exact page slug. Check filtering, newest first ordering, empty results, next results, and first results. Change the search and confirm its cursor resets. Filters may appear in the URL, but identity search values and search cursors must not. Covers AC-1, AC-2, AC-9, and AC-10.
2. Submit a valid 254 character email surrounded by whitespace and uppercase characters. Confirm the full input survives browser entry and returns the same matches as its trimmed lowercase value. Reject 255 characters, blank input, internal whitespace, and nonASCII input. Check that plus tags and underscores match literally. Confirm identity is absent from browser storage, request URLs, query keys, logs, and safe errors. Find a legacy address outside this contract by account ID. Covers AC-2, AC-9, and AC-10.
3. Compare creator identity, dates, state, version, and page count with its User row and related Pages. Compare page identity, creator link, slug, state, dates, report count, template key, and pinned version with Page, TemplateVersion, Template, and related PageReport rows. Use different creators, counts, and template versions to expose an incorrect join. Confirm private content and storage keys are absent. Covers AC-2 and AC-9.
4. Disable and restore a creator and a page through confirmation. Confirm the version and audit history advance, creator disable revokes existing sessions, and administrator accounts cannot be moderated. Pages owned by administrator accounts must be excluded and protected by the API. Race two actions with the same expected version and confirm only one succeeds. Covers AC-4 and AC-9.
5. Force an uncertain mutation response. Retry and compare the complete body and idempotency key with the original attempt. Change a note while the attempt is uncertain and confirm the retry still uses the original snapshot. Force a stale version and confirm the refreshed state requires a new confirmation. Cancel and complete dialogs by keyboard, and confirm focus returns to the trigger or appropriate heading. Covers AC-3, AC-4, and AC-10.
6. Open `/admin/moderation/appeals`, filter by status and logical target, and follow target, original action, and audit links. Record support intake with an original action ID, external reference, and reason. Accept or reject it and compare state, resolver, and dates with Appeal, target with the original ModerationAction, and resolution note/reason with the latest decision action. Repeat intake after an uncertain failure and confirm its stored body and key are reused. Covers AC-3 and AC-9.
7. Repeat reads and actions as a visitor, creator, disabled administrator, expired session, and invalid origin. Confirm denied responses, cleared admin identity/cache on lost access, private caching, safe errors, and bounded rate limits. Search POST requests use the read budget and trusted origin guard. Covers AC-9 and AC-10.
8. Exercise creator, page, appeal, report, and audit routes on desktop and mobile. Check keyboard navigation, focus outlines, narrow layouts, loading, empty results, errors, and recovery. Only the active table or mobile list may expose controls. Compare the public landing before and after admin navigation, and run shared control regression checks. Full sign in, creator workspace, and template style verification remains part of the final integrated gate. Covers AC-1, AC-10, and AC-11.

### Commands and database evidence

Use Node 24. Real database checks require an explicitly selected isolated PostgreSQL database with all migrations and catalog seed applied, `RUN_REAL_DB_TESTS=1`, `NODE_ENV=test`, and the test auth/origin configuration described above.

1. `pnpm --filter api test:e2e --runInBand --runTestsByPath test/admin-operations.database.e2e-spec.ts test/admin-composition.e2e-spec.ts` checks real sessions and database behavior alongside the existing HTTP composition tests. Confirm search normalization, safe projections, cursor binding, roles, origin, protected targets, concurrency, session revocation, and appeal decision sources. Covers AC-2 through AC-4 and AC-9.
2. The real database suite creates representative synthetic rows and runs `EXPLAIN` for email and name searches. Confirm both lookup indexes are used and the email expression uses explicit `C` collation. Confirm the additive ordered/filter indexes exist after migration. Covers AC-2 and AC-9.
3. `pnpm --filter api test --runInBand modules/admin` checks existing moderation transitions and protected target rules. Covers AC-3, AC-4, and AC-9.
4. `pnpm --filter web test:e2e:fixtures e2e/admin-operations.spec.ts e2e/admin-creators.spec.ts e2e/admin-confirmation.spec.ts e2e/design-system-compatibility.spec.ts` builds the web application and checks desktop/mobile behavior, Axe accessibility, shared controls, privacy, retries, stale state, and focus. Browser API responses are mocked; the separate real database suite proves backend integration. Covers AC-1 through AC-4 and AC-9 through AC-11 within this milestone.
5. `pnpm --filter api openapi:generate`, `pnpm --filter api build`, and `pnpm check:commit` check contract generation, production API compilation, lint, maintained formatting, and types. Covers AC-9 and AC-11.

### Coverage limits

The migration was applied to the isolated local test database only. Production and staging rollout remain separate work. These checks cover the acting administrator, creator identity/counts, canonical email lookup, page metadata/owner, report/appeal/history, and visual behavior rows of the parent value sourcing table. Deletion confirmation, receipts, jobs, processor barriers, cleanup, totals, trend buckets, coverage, and analytics period timestamps remain unbuilt. This record does not close the feature level Verify it, Test it, or review gates.

### Build self check evidence

On 2026-11-18, using Node 24.22.1, the API composition and real database suites passed 43 tests, including 9 new real database cases. The admin unit suites passed 38 tests. The browser run passed 67 checks with one existing skip; its two failing shared keyboard test assumptions were corrected and both passed in a focused desktop/mobile rerun, for 69 passing checks overall. All new operations browser cases passed. Axe checks passed for the three new directories, and desktop/mobile screenshots were visually inspected. API production compilation, web production compilation, and OpenAPI generation passed. The migration and lookup query plans were verified against the isolated local PostgreSQL database.
