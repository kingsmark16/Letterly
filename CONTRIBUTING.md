# Contributing to Letterly

Start with [README.md](README.md), [AGENTS.md](AGENTS.md), and the relevant feature or package context. The [working blueprint](docs/references/letterly-blueprint.md) defines mandatory engineering rules. Use [scope](docs/scope/scope.md) and [specifications](docs/specs/0022-repository-structure/index.md) to identify the approved slice before extending product behavior.

## Put code with its owner

- Web route files compose pages and server reads. Interactive application behavior belongs to `apps/web/src/features/<feature>/`. Keep component styles and tests beside their owner. Use direct imports rather than broad feature barrels.
- Template presentation belongs to `apps/web/src/templates/`. Keep its assets, styles, and heavy motion dependencies there. Feature adapters own API requests, authentication state, retries, and lifecycle behavior.
- API operations belong to `apps/api/src/modules/<feature>/`. Keep domain invariants plain, application use cases dependent on ports, infrastructure adapters responsible for providers, and presentation controllers thin.
- Shared packages contain genuinely reusable contracts, definitions, configuration, controls, or tooling. Framework code, database clients, and providers stay outside domain/application code. Do not create generic helpers or empty folders to anticipate unrelated future work.
- Database schema and migration history belong to `packages/database`. Generated Prisma output and local build artifacts stay untracked. Released migration files remain immutable.

Use strict TypeScript, named exports for reusable code, exhaustive types where practical, and validated plain objects at boundaries. Browser rendering is not authorization. NestJS enforces ownership, availability, capability validation, safe projections, and persistence invariants.

## Add categories and templates

Use the complete [registration guide](docs/references/template-registration.md), including scaffold dry runs and the exact API/web bindings. Keep stable category and registry keys. New behavior requires an explicit template version and its own verification, not a latest version fallback for saved pages.

Registering a category does not require another seed branch. A new template still needs its own behavior, capability rules, schema, defaults, policies, and presentation. Generation produces unregistered placeholders and a checklist; review and complete them before deliberate provisioning and activation. Keep launch scope unchanged unless the product decision approves an addition.

## Verify a change

From the root, run the gates relevant to the change:

```bash
pnpm lint
pnpm format:check
pnpm check-types
pnpm test
pnpm build
```

Use targeted workspace commands while developing, then run the affected end to end path. See [API testing](apps/api/README.md#testing) for isolated database requirements and [web testing](apps/web/README.md#testing) for production browser fixtures. A green unit gate does not prove live authentication, R2 uploads, database transactions, or browser behavior.

Every template needs valid defaults, long content, missing optional media, unsupported capability, mobile, reduced motion, and readable fallback coverage. Changes to shared controls also need state, focus, keyboard, error, and loading behavior checks. Preserve the original performance baseline; do not replace it to make a budget pass.

Build and type generation share `.next`, so run them sequentially. Isolated browser fixture scripts build with fixture origins; restore the normal build and fresh route types before finishing. Avoid recording secrets, page bodies, private responses, or provider credentials in reports.

## Keep changes reviewable

Use a `feat/` branch and conventional commits for verified milestones. Record a load bearing decision before implementing it. Keep the initial path narrow enough to prove database, API, interface, and user behavior together.

Update the owning context and contribution pointers when moving code. Record verification commands, their real scope, and remaining limitations in `docs/reviews/`. Preserve historical reviews and distinguish a completed milestone from the overall feature. The selected commit gate is lint, formatting, and types; automatic local commit hooks remain pending, so run these checks explicitly.

Production operations follow the [launch checklist](docs/runbooks/launch-hardening-checklist.md). Use separate environment resources, controlled migration/deployment order, and restore evidence. Do not use routine local setup commands as a production release procedure.
