# Template version service verification

Date: 2026-10-03

## Behavior covered

Twelve cases exercise the actual PageService with two isolated versions registered at the same time. The fixture definitions use distinct registry keys, defaults, update titles, readiness rules, and public titles. Both versions use the current Secret Letter content envelope. These fixtures are not canonical catalog entries and do not activate launch content.

The suite replaces only definition and implementation registration boundaries with fixture resolvers built from the production exact resolution and implementation registry helpers. PageService orchestration remains real. Repository and version reader ports are mocked. The update repository mock evaluates the actual updater supplied by the service against the saved content. Public adapters explicitly reuse the existing schema validated Secret Letter projection after applying their own fixture title.

For each version, creation forwards its database version ID and definition defaults. Updates retain saved identity and select the correct updater without consulting active draft eligibility. Publication accepts only that version's readiness marker and refuses the other marker before another repository write. Owner reads retain identity, and public reads dispatch to that version's adapter and preserve its canonical URL and template identity. Additional cases reject unavailable draft versions, unregistered active database identities, conflicting saved identities, and conflicting public identities without substituting a newer version.

## Verification

| Command | Outcome |
| --- | --- |
| Targeted service suite | PASS, 12 cases |
| API type check and focused lint after typed mock refinement | PASS |
| Root lint | PASS, seven tasks |
| Root formatting check | PASS |
| Root type check with concurrency two | PASS, seven tasks |
| Root unit tests | PASS, 737 cases across five workspaces; API 571 in 77 suites |
| Root production build | PASS, fresh Prisma generation, NestJS compilation, and Next.js build |
| API integration suite | PASS, 595 cases; seven skipped, 25 passing suites and four skipped suites |
| Diff whitespace check | PASS |

The full unit, lint, and type gates first passed before tightening the mock declarations to their port types. The final API type check, focused lint, and all twelve new cases passed after that refinement. Production builds and integration checks also passed with the final declarations.

## Remaining evidence

This is a service boundary proof, not a database transaction or browser proof. It does not establish future version behavior inside draft persistence, publication transactions, or owner/public persistence adapters. It also does not establish editor, public component, or preview dispatch with future version implementations. Existing integration cases still exercise current launch bindings. Real PostgreSQL seed rollback remains outside this evidence, and database dependent cases remain skipped.

No web runtime source changed, so browser journeys were not rerun for this milestone. The preceding provisioning milestone's 72 passing desktop/mobile journeys remain prior launch evidence. Continue the isolated version proof through persistence and web dispatch, retaining literal lazy imports, server readable output, and safe unsupported states. The governing version retention spec and overall repository restructuring remain In Progress.

Durable context needs no update for this test addition: existing page context already describes the exact registration and application boundaries used here. This report is self verification, not an independent review.
