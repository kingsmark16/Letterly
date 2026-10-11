# Letterly

Letterly lets creators publish personal pages with private visitor responses. The current launch category is Confession, with Secret Letter and Choose Your Heart templates. Each saved page belongs to one immutable template version.

## Workspace

| Location                                                                                                                       | Responsibility                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [apps/web](apps/web/README.md)                                                                                                 | Next.js routes, creator interface, previews, and public presentation                         |
| [apps/api](apps/api/README.md)                                                                                                 | NestJS authentication verification, authorization, use cases, and provider adapters          |
| [packages/templates](packages/templates/AGENTS.md)                                                                             | Framework independent schemas, capabilities, trusted catalog, and exact version registration |
| [packages/contracts](packages/contracts/AGENTS.md)                                                                             | Shared Zod transport schemas and ports                                                       |
| [packages/database](packages/database/AGENTS.md)                                                                               | Prisma schema, immutable migrations, generated client, and catalog provisioning              |
| [packages/config](packages/config/AGENTS.md)                                                                                   | Validated API and web environment configuration                                              |
| [packages/ui](packages/ui/README.md)                                                                                           | Source owned React primitives, tokens, and class composition                                 |
| [packages/eslint-config](packages/eslint-config/AGENTS.md), [packages/typescript-config](packages/typescript-config/AGENTS.md) | Shared lint and compiler configuration                                                       |
| [docs](docs/scope/scope.md)                                                                                                    | Product scope, specifications, verification reports, and operational runbooks                |

Application code is organized by feature. Domain and application responsibilities depend inward on plain contracts; infrastructure implements ports and presentation handles HTTP or interface composition. See [CONTRIBUTING.md](CONTRIBUTING.md) for placement and change rules.

## Local setup

Use Node **24**, recorded in [.node-version](.node-version), and pnpm **11.20.0**, recorded in [package.json](package.json). The application stack uses TypeScript, Next.js 16, React 19, NestJS 11, Prisma 7, Better Auth, and PostgreSQL.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @letterly/database generate
```

Create local environment files by copying these examples, then replace their required placeholders:

| Example                                                          | Local file               | Required setup                                                                                      |
| ---------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| [apps/api/.env.example](apps/api/.env.example)                   | `apps/api/.env`          | Development `DATABASE_URL`, `BETTER_AUTH_SECRET` of at least 32 characters, and matching web origin |
| [apps/web/.env.example](apps/web/.env.example)                   | `apps/web/.env`          | Web/API origins; matching signing secrets when using signed public features or production builds    |
| [packages/database/.env.example](packages/database/.env.example) | `packages/database/.env` | Development pooled `DATABASE_URL` and direct `DIRECT_URL` for migrations                            |

You can generate a secret locally with Node's built in crypto module:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use the same `BETTER_AUTH_SECRET` in API and web configuration when setting it in both. Public media uses a separate `PUBLIC_MEDIA_PROXY_SECRET`, also matched between applications. Keep local environment files untracked. Configuration examples contain placeholders, not working service credentials.

For a newly provisioned **development** database, verify the connection targets before applying committed migrations and provisioning the trusted catalog:

```bash
pnpm --filter @letterly/database validate
pnpm --filter @letterly/database exec prisma migrate deploy
pnpm --filter @letterly/database seed
pnpm dev
```

The web application runs at `http://localhost:3000`; the API runs at `http://localhost:3001`. The web dev script waits for the API's `/health` response before starting Next.js. The root dev command starts both workspaces through Turborepo.

Email verification and password recovery need Resend configuration. Google/Facebook need complete provider credential pairs. Media uploads need all four R2 settings together. These optional development integrations are documented in [the API guide](apps/api/README.md). The repository's Redis Compose service is a local helper; development/test rate limits use memory, while production requires authenticated TLS Redis or Valkey. Production setup follows [the launch runbook](docs/runbooks/launch-hardening-checklist.md), not the local defaults.

## Commands and evidence

```bash
pnpm lint
pnpm format:check
pnpm check-types
pnpm test
pnpm build
```

Development installation also configures local commit hooks. `pnpm check:commit` runs the selected lint, formatting, and type gate; commit messages follow the conventional preset. See [the contributor guide](CONTRIBUTING.md#keep-changes-reviewable) for setup and limits.

Root commands delegate workspace tasks through Turborepo, except repository formatting and the template scaffold delegation. Unit runners are Jest for API code, Vitest for shared UI, and Node for web/template/database fixtures. `pnpm test` does not run live database integration or browser journeys. [CI](.github/workflows/ci.yml) separately prepares PostgreSQL and runs its integration and smoke selections.

The [web guide](apps/web/README.md) documents isolated browser fixtures, supported engine checks, and the normal build restoration step. The [API guide](apps/api/README.md) distinguishes unit, HTTP integration, and opt in real database tests. Run Next.js builds and route type generation sequentially, since both write `.next` artifacts. On Windows, use `pnpm.cmd` if PowerShell blocks the `pnpm` shim.

## Categories and template versions

Follow [Registering categories and templates](docs/references/template-registration.md). A category adds canonical metadata; a template adds explicit schema, capability, API policy, persistence, editor, preview, and public presentation bindings. Registrations are trusted source code. Database metadata never stores executable template code.

Inspect a starter without creating files:

```bash
pnpm scaffold:template --category celebration --template birthday-note --version 1 --dry-run
pnpm scaffold:template --category confession --template secret-letter --version 2 --dry-run
```

The generator creates three unregistered starter files only when run without `--dry-run`. It does not activate a template or migrate pages. Retain released versions and use a new immutable registry key for a changed version. Existing pages must continue resolving their saved identity, including after a version is retired from new draft creation.

## Project references

- [Contributor guide](CONTRIBUTING.md): boundaries, checks, and contribution workflow.
- [Working blueprint](docs/references/letterly-blueprint.md): product and mandatory engineering rules. The original `Letterly_Confession_Platform_Blueprint_v3_2.docx` is an external, ignored reference and is absent from this checkout; the summary cannot prove omitted details.
- [Scope](docs/scope/scope.md): current work and completion requirements.
- [Repository restructuring](docs/specs/0022-repository-structure/index.md): accepted decisions, verified milestones, and outstanding work.
- [Launch checklist](docs/runbooks/launch-hardening-checklist.md) and [restore drill](docs/runbooks/launch-hardening-restore.md): operational release evidence.

Historical specs and reviews record their original decisions. Current source, later accepted decisions, and verification reports establish what has actually been implemented. Overall repository restructuring remains in progress.
