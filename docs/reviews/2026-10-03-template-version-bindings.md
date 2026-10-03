# Exact template version binding verification

Date: 2026-10-03

Spec: [template version registration and retention](../specs/0022-repository-structure/0022-template-version-retention.md), first build step and AC-1 only.

Implementation self verification, not an independent review.

## Result

All seven API policy and adapter maps use the same framework independent registry builder. It rejects missing canonical coverage, unknown keys, and mismatched implementation key/version identities before requests. It copies bindings into a private Map and resolves only an exact key and version. Later source map replacement does not change retained bindings. Mutating a retained implementation's identity makes it unavailable rather than routing the saved identity to another version.

The API still owns its separate draft, publish, persistence, and projection responsibilities and keeps compile time coverage of canonical keys. No controller, payload schema, repository write, web component, launch identity, or activation flag changed.

## Evidence

- Sixteen new helper tests cover distinct v1/v2 behavior, category isolation, missing and unknown registrations, wrong key and version, duplicate definitions, invalid versions, empty keys, source map replacement, mutated identities, empty registries, and prototype names.
- Seven API production binding cases check every current canonical identity through all seven actual resolvers, stable implementation reuse, and failure for unknown or substituted versions.
- Existing draft, publication, repository, projection, HTTP, and web tests pass after the resolver changes. Both launch templates remain registered at their original v1 identities.

| Command | Outcome |
| --- | --- |
| `pnpm --filter @letterly/templates test` | PASS, 76 tests, including sixteen new binding cases |
| `pnpm --filter api test --runInBand --runTestsByPath src/modules/pages/application/template-registration.spec.ts` | PASS, seven production binding cases |
| `pnpm lint` | PASS, seven tasks |
| `pnpm format:check` | PASS |
| `pnpm check-types` | PASS, seven tasks |
| `pnpm test` | PASS, 682 tests across five workspaces, including 552 API tests |
| `pnpm build` | PASS, Prisma generation, API build, and web production build |
| `pnpm --filter api test:e2e --runInBand` | PASS, 595 tests; seven skipped, 25 passing suites and four skipped suites |
| `git diff --check` | PASS |

## Limits and continuation

This proves exact implementation binding, not the full saved page guarantee. The coexistence behavior test uses isolated helper implementations; the production matrix exercises current v1 registrations. Additional version fixtures must still prove actual saved page API and web paths. Provisioning eligibility, guarded seed identity, and later version generation remain incomplete. Seven database dependent integration tests remain skipped. No live seed, migration, or new template activation ran. Browser journeys will be checked when the web/version selection changes land. The parent version retention spec and overall restructuring stay In Progress.
