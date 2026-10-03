# Contributor onboarding verification

Date: 2026-10-04

The root and application guides now describe Letterly's actual workspace responsibilities, environment setup, development ports, commands, template contribution path, and verification boundaries. CONTRIBUTING.md records feature ownership, inward dependencies, retained version behavior, and explicit checks. The detailed registration checklist remains owned by its existing reference.

The root manifest now uses the private name letterly and declares Node >=24 <25. .node-version records 24 and the existing setup-node v4 CI step consumes it. pnpm remains 11.20.0; dependencies and the lockfile are unchanged. Runtime selection and engine metadata describe support; they do not force every local shell to switch Node automatically. See [pnpm's engine metadata documentation](https://pnpm.io/package_json#engines) and the [existing setup-node v4 input definition](https://github.com/actions/setup-node/blob/v4/action.yml).

Optional OAuth, R2, and Sentry entries are commented out in the API example because enabled empty or partial values fail current startup validation. Complete placeholders and configuration instructions remain available. A new test parses the checked in example and supplies its required development authentication secret. Validation is unchanged, and integrations are not enabled by default.

See [the accepted decision](../specs/0022-repository-structure/0022-contributor-onboarding.md).

## Verification

- Offline frozen installation passed on Node 24.21.0 and pnpm 11.20.0 without lockfile changes. The first pnpm command attempted an automatic install and stopped because noninteractive module purge confirmation was unavailable; an explicit offline frozen install with confirmation disabled completed successfully.
- The focused API configuration suite passed all nine cases. The full workspace unit gate passed 835 cases: 582 API, 98 templates, 14 database seed, 103 web, and 38 shared UI. All five tasks executed without cache hits.
- Scaffold help and both documented dry runs passed. All six proposed output files remain absent, and no category/template registration or activation changed.
- A local script checked 56 relative file links, documented workspace script names, runtime/CI alignment, and the absent dry run outputs. Links to root setup and app testing use headings present in those documents.
- Lint passed all seven tasks without cache hits; repository formatting passed. The normal root build passed all three tasks without cache hits, including Prisma generation, NestJS compilation, and Next.js production compilation. Fresh route types and all seven workspace type check tasks passed after the build, without cache hits.
- Application behavior, providers, auth rules, database migrations, and public exports are unchanged. Browser suites were not rerun for this documentation and metadata milestone; their prior editor control evidence remains in its separate report.

## Limits and remaining work

This is not a clean machine setup test. No development database was migrated or seeded, no live provider was invoked, and no remote CI run was observed. Existing local environment files and the user's skills-lock.json change are untouched. The absent external blueprint DOCX is identified in the root guide rather than claimed as inspected.

The mandatory working blueprint requires readiness and protected API contract documentation. Current source implements process health only, without a separate database readiness route or generated Swagger/OpenAPI endpoint. The API guide records this gap; implementing it requires a focused decision and verification milestone. Local commit hooks, cohesive source/style splits, shared UI rollout, accessibility acceptance, bounded cleanup, and final finding/spec reconciliation remain open. Overall repository restructuring remains In Progress.
