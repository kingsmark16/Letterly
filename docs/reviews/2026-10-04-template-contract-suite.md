# Shared template contract coverage

Date: 2026-10-04

The repository now has an explicit contract matrix for every canonical template definition. Its fixture map is keyed by registry identity and checked against `templateDefinitions`, so adding a registered version requires adding its contract data before the suite type checks.

The shared package suite validates registered defaults against their content and settings schemas, missing optional fields, malformed content and settings, capability values and audio consistency, exact version resolution, and unsupported identities. It exercises the Secret Letter 20,000 grapheme content boundary and the Choose Your Heart 200 grapheme prompt and 2,000 grapheme outcome boundaries, including rejection beyond those limits and complete graph validation.

Both API public projection layers now use explicit fixtures for every registered definition. Persistence projection cases cover pinned identity, absent optional media, long template content, private stored field removal, malformed stored content, and unsupported identities. Transport projection cases cover absent media, template specific audio projection shape, private media field removal, and existing legacy response behavior.

The public browser contract uses the isolated letter and journey fixtures. At a 375 pixel viewport with reduced motion enabled, it opens the Secret Letter by keyboard, checks the rendered letter remains readable, then navigates the Choose Your Heart question path by keyboard and checks touch target size and horizontal overflow. Existing template preview, public unavailable state, and server rendered journey fallback cases remain in their owning browser suites.

Verification:

- `pnpm --filter @letterly/templates test`: 110 tests passed.
- `pnpm --filter api exec jest --runInBand modules/pages/infrastructure/templates/public-projection-adapters.spec.ts modules/pages/application/projections/public-projection-adapters.spec.ts`: 23 tests passed.
- `pnpm --filter web test`: 104 tests passed.
- The new browser assertion passed in Chromium with the 375 pixel viewport and reduced motion. The local Playwright process then exceeded the explicit 25 second global timeout while tearing down its fixture services, so that command exited nonzero even though its test passed. The fixtures on ports 3002 and 3100 were stopped after verification. This is recorded as a local runner limitation, not a passing full browser suite.

This suite does not measure database pagination or query capacity, indexes, media and submission work bounds, or template bundle isolation. It does not activate another production category or template. Those growth requirements remain open.
