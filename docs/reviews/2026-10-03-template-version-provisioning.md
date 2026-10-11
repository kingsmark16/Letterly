# Template version provisioning verification

Date: 2026-10-03

Spec: [template version registration and retention](../specs/0022-repository-structure/0022-template-version-retention.md), second build step, provisioning and seed safeguards from AC-2 and AC-3.

Implementation self verification, not an independent review.

## Result

Category and version descriptors declare explicit ACTIVE or INACTIVE provisioning status. Both launch templates and Confession remain ACTIVE at their original v1 identities. Runtime definitions and API/web binding maps retain all registered descriptors without an eligibility filter. Status controls deliberate provisioning and new draft choices, while saved readers resolve the pinned version independently.

The pure provisioning plan validates identity and status before any store write. It groups versions by category and renderer key, sorts each family numerically without changing source order, and keeps every retained entry. Shared family metadata comes from the highest active version, or the highest retained version when none is active. A family is eligible only when its category is active and it has an active version.

The seed writes one family row per group. Existing version upserts have an empty update and return only identity fields. A mismatched registry key, version, or template ID throws a developer facing conflict. A later status write requires the exact ID, template ID, version, and registry key and updates status only. A missing identity match also throws. The actual CLI calls seedCatalogInTransaction, with bounded 30 second wait and execution limits, so all category, family, and version writes share one Prisma transaction. The seed store exposes no Page write operation.

Source status is authoritative for an explicit seed run. An INACTIVE descriptor stays inactive on repeated provisioning, and an explicit ACTIVE descriptor may reactivate its matching database row. Registration or seeding never removes retained definitions or changes Page.templateVersionId. Unrepresented database rows are not deleted; source registration must continue to retain released definitions needed by saved pages.

Browser fixture construction consumes the same plan and shared response schemas, producing one card per active family with ascending active version choices. Entries in one family must use a consistent template fixture ID. Launch IDs, names, capabilities, and preview paths remain unchanged.

## Evidence

- Nine pure planning cases cover launch eligibility, unsorted retained versions, highest eligible metadata, retired v1 resolution, fully retired families, inactive categories, category isolation, empty inputs, unknown status, and ambiguous identities.
- Eight additional seed cases cover one family write, v1 identity and published Page reference preservation, retained inactive status across repeated runs, explicit activation, category and family retirement, successful transaction commit, conflict rollback, a lost guarded status match, and validation before writes. These cases use an in memory store and transaction host. Existing six launch and resolution cases also pass.
- Six browser fixture cases verify unchanged launch metadata and IDs, one card for v1/v2, highest eligible selection order, retirement choices, category retirement, and invalid fixture identities.
- Five actual PrismaTemplateVersionReader boundary cases confirm active hierarchy predicates for creation, exact saved ID lookup without status filters, missing identity without fallback, and propagated database failures. These use injected query mocks, not a live database.
- The existing PageService case rejects an inactive or missing template before creating a page. All current API and web production bindings, draft, publication, projection, ownership, and transport suites continue to pass.
- Seventy two existing browser fixture cases pass across desktop and mobile, covering both launch editors, catalog and preview identities, public readable output, locked boundaries, private responses, navigation, and transport errors. They use fixture API responses and do not prove real authentication or PostgreSQL persistence.

| Command | Outcome |
| --- | --- |
| `pnpm --filter @letterly/templates test` | PASS, 85 tests |
| `pnpm --filter @letterly/database test` | PASS, 14 tests |
| `pnpm --filter web test` | PASS, 39 tests |
| `pnpm lint` | PASS, seven tasks |
| `pnpm format:check` | PASS |
| `pnpm check-types` | PASS, seven tasks, including the actual Prisma transaction host assignment |
| `pnpm test` | PASS, 710 tests across five workspaces, including 557 API tests in 76 suites |
| `pnpm build` | PASS, fresh Prisma generation, NestJS build, and Next.js production build |
| `pnpm --filter api test:e2e --runInBand` | PASS, 595 tests; seven skipped, 25 passing suites and four skipped suites |
| `pnpm --filter web test:e2e:fixtures` | PASS, fresh fixture production build and 72 desktop/mobile browser tests |
| `git diff --check` | PASS |

## Operational observations

The first lint run found an unused variable in a new test expectation. The expectation now explicitly projects category fields, and the complete lint gate passes.

The browser runner completed its workers but waited on Windows fixture server teardown. Process inspection confirmed the exact runner ancestry and the two owned server trees. Only those server trees were stopped; the original runner then reported 72 passed and exited with code zero. Unrelated servers and processes were preserved. The browser server also logged two closed response streams during route navigation; this run did not investigate that log behavior, and no browser assertion failed.

## Limits and continuation

No live seed, database migration, new category activation, or third template activation ran. The transactional seed is wired to the actual Prisma client and type checked, but its rollback and Page reference tests use an isolated memory transaction host. Live PostgreSQL rollback has not been demonstrated by this milestone; seven existing database dependent integration cases remain skipped.

The generator still rejects a registered family at every version. Later version generation, version specific owner/public metadata, and a combined saved v1 versus future v2 proof through actual API and web dispatch remain incomplete. This milestone verifies provisioning boundaries and unchanged launch behavior, not the complete published page retention guarantee. The governing spec and overall repository restructuring remain In Progress.
