# Draft update ownership verification

Date: 2026-10-03

Spec: [template owned draft updates](../specs/0022-repository-structure/0022-draft-update-ownership.md).

Implementation self verification, not an independent review.

## Result

The existing registered application draft policies own stored content parsing and editable field merging. Secret Letter and Choose Your Heart explicitly use the shared letter compatibility helper. PageService selects the exact trusted policy and supplies its pure updater through the repository port. Persistence applies that updater to current locked content and retains lifecycle/media operations.

| Criterion | Evidence                                                                                                                                                                                                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1      | Six new policy cases cover both launch templates, current schema rejection, omitted optional field retention, explicit empty values, section preservation, and independent parsed values. Existing registration/default tests remain green.                                                                                                                        |
| AC-2      | Service cases assert exact repository input shape and evaluate the supplied updater for both identities with image inputs. Existing missing owner/definition and concurrency cases pass. The port no longer contains title, recipient, message, or creator fields.                                                                                                 |
| AC-3      | Repository coverage proves lock, current read, preparation, and write order; opaque stored input reaches preparation without a generic letter parse. Early missing/stale/image shape exits skip preparation. Preparation failure propagates before writes. Existing media, stale-write, section retention, cleanup, and owner projection assertions remain intact. |
| AC-4      | Targeted save coverage has 140 passing tests; root tests total 629. Lint, formatting, type checks, build, and API integration checks pass. Controller source and request/response schemas are unchanged.                                                                                                                                                           |

## Commands

| Command                                                                                                                                                                                                                                  | Outcome                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm --filter api test --runInBand --runTestsByPath src/modules/pages/application/templates/draft-policies.spec.ts src/modules/pages/application/page.service.spec.ts src/modules/pages/infrastructure/prisma-pages.repository.spec.ts` | PASS, 140 tests                                                                             |
| `pnpm lint`                                                                                                                                                                                                                              | PASS, 7 tasks                                                                               |
| `pnpm format:check`                                                                                                                                                                                                                      | PASS                                                                                        |
| `pnpm check-types`                                                                                                                                                                                                                       | PASS, 7 tasks                                                                               |
| `pnpm test`                                                                                                                                                                                                                              | PASS, 629 tests across five workspaces, including 515 API tests                             |
| `pnpm build`                                                                                                                                                                                                                             | PASS, Prisma generation, API build, and web production build                                |
| `pnpm --filter api test:e2e --runInBand`                                                                                                                                                                                                 | PASS, 568 tests; 7 database dependent tests skipped, 24 passing suites and 4 skipped suites |
| `git diff --check`                                                                                                                                                                                                                       | PASS                                                                                        |

Strict test matcher typing and API line endings were corrected before the final lint pass. Targeted tests were rerun after those changes.

## Limits

The update command and owner content type still describe current launch content. This change separates responsibility; it does not create arbitrary new content schemas or a third launch template. The updater must remain pure and synchronous because persistence evaluates it inside the transaction. No migration or live seed ran. Existing `skills-lock.json` changes remain excluded.
