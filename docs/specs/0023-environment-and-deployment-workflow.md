# 0023. Environment and deployment workflow

**Date**: 2026-10-10
**Status**: In Progress

## Summary

Keep development on local settings and use GitHub Actions to release staging and production in order. Staging's API uses Azure Container Apps Express in Southeast Asia because the subscription cannot create another standard environment. Staging secrets are stored directly on that app. Production keeps the standard Container Apps and Key Vault plan and remains blocked until its separate quota and resources are available.

## Context

> Premise note: Express cannot use Key Vault secret references, traffic splitting, or the standard environment's network boundary. Staging can accept app-level secrets because it uses synthetic data and its own service credentials. Production remains on its separately reviewed standard environment plan.

Letterly has a Next.js web app and a NestJS API in one pnpm and Turborepo repository. The CI workflow already checks pull requests and pushes to `main` or `master`, but it does not include `staging` or deploy either app. There is no API container build yet. The release runbook already requires migrations before application rollout, API readiness before web rollout, smoke checks, and rollback to a compatible version.

The project uses Neon, Redis, Cloudflare R2, Better Auth, and Sentry. Runtime configuration validates `development`, `test`, or `production` as `NODE_ENV`; staging must therefore use production configuration rules and identify itself with `SENTRY_ENVIRONMENT=staging`. The selected hosts are Vercel Hobby for the web app and Azure Container Apps for the API. The repository is public, so GitHub Environments and their required reviewer rules are available on current plans.

A standard Container Apps environment already exists in `rg-portfolio-prod`, and this Azure for Students subscription rejected a standard staging environment preview with `MaxNumberOfGlobalEnvironmentsInSubExceeded`. The Azure quota page shows Express Environment Count at `0 of 450` for Southeast Asia, but the read-only preview of `staging-express.bicep` also failed with `MaxNumberOfRegionalEnvironmentsInSubExceeded`. On 2026-10-14, the Express portal nevertheless created `letterly-api-staging` in `rg-letterly-staging` and environment `express-southeastasia-5shm2e8`. This portal result does not reconcile the CLI/Bicep preflight. The full Bicep template generates a different environment name and must not be applied to this resource group. A separate identity-only template provisions GitHub OIDC and an app-scoped role against the existing app without changing its configuration or secrets. The first container startup logged `Cannot find module '@letterly/config'`: the production image copies the deployed API but omits the source targets of the workspace dependency links and their pnpm store path. A Dockerfile fix now copies those four workspace packages into the runtime image and links their pnpm store path to the deployed production dependencies. A corrected image still needs to be published and deployed, app secrets still need configuration, and `/ready` has not passed.

## Requirements

**User stories**:
- As a developer, I want local development configuration to stay independent so I can build without production credentials.
- As the release owner, I want staging to exercise production-like resources before production so schema and service changes are caught early.
- As the release owner, I want an approved production release to follow the same migration, API readiness, and web rollout order as staging.

**Acceptance criteria**:
- **AC-1**: Local development uses `pnpm dev`, local configuration, and development-only data and provider credentials. No GitHub `development` environment is required.
- **AC-2**: Feature branches merge to `staging` through pull requests. A successful staging release uses a separate database project, Redis endpoint, R2 bucket, OAuth app, email configuration, and monitoring environment, and never uses production user data. Provider free-tier quotas may be pooled at the account level, but credentials and data remain environment scoped.
- **AC-3**: The existing quality workflow runs for pushes to `staging` and `main`, and deployment jobs run only after the quality job succeeds for those push events.
- **AC-4**: A release applies Prisma migrations once using the direct or unpooled database URL before deploying API code. The API is deployed to the matching Azure Container App and must pass `GET /ready` before the web deployment begins.
- **AC-5**: Staging and production use separate Vercel Hobby projects with separate project variables and generated `.vercel.app` hostnames. Each project includes source files outside its `apps/web` root during the build so workspace packages resolve. The staging candidate passes HTTP smoke checks before it is promoted to the staging project's stable hostname. The production candidate passes smoke checks before its project hostname is promoted, and does not go live before production GitHub Environment approval.
- **AC-6**: Production deploys an immutable API image referenced by a staging release manifest for the same source tree. The manifest is created only after the staging API readiness and Vercel smoke and promotion checks succeed; the earlier bootstrap image manifest cannot satisfy production. It records both the release workflow attempt and the attempt that built the image so a failed-job rerun can reuse a successful image build. The workflow fails closed if the validated manifest or image is unavailable, expired, or mismatched.
- **AC-7**: Azure deployment uses GitHub OIDC federation with environment-scoped identities that can update only their own Container App and cannot list Container Apps secret values. Production runtime secrets remain in its separate Azure Key Vault Standard vault. Staging runtime secrets are added directly to its Express app and referenced by environment variables. Database migration URLs and the Vercel deployment token are GitHub Environment secrets. No secret is committed, passed as a Bicep parameter or command argument, exposed as a build argument, or printed.
- **AC-8**: Rollback can restore the prior API revision and Vercel deployment while keeping successful additive database migrations in place. Destructive schema changes require a later compatible contraction release.
- **AC-9**: Free-first resource choices and their limits are explicit. Staging and production never share a free Redis database, credentials, or user data. Production deployment cannot be enabled until its separate authenticated TLS Redis resource is provisioned.
- **AC-10**: Staging uses an Express environment in Southeast Asia, with HTTPS on its default Azure domain and bounded scale from zero to two replicas. The setup is attempted only with an Azure sign-in backed by Microsoft Entra ID.
- **AC-11**: Staging app secrets are entered through the Express management experience, with API environment variables explicitly mapped to those app secrets. Secret values never appear in Bicep parameters, shell history, GitHub logs, or source control. Staging deployment remains disabled until secret configuration is complete and `GET /ready` passes.

## Options considered

### Option 1: GitHub Actions controls both deployments

GitHub Actions runs the environment release in order, using Azure Container Apps for the API and the Vercel CLI for the web app.

**Pros**:
- Migration, API readiness, web smoke checks, and promotion are one auditable release sequence.
- GitHub Environment approval can stop production work before migration or deployment begins.
- The same container image can be validated in staging and promoted to production.

**Cons**:
- GitHub needs a Vercel token and Azure OIDC setup, and automatic Vercel Git deployments must not race the workflow.
- Deployment configuration has more steps than letting each host deploy independently.

### Option 2: Vercel deploys from Git while GitHub deploys the API

Vercel automatically publishes branch deployments while a separate GitHub workflow updates the API.

**Pros**:
- Vercel Git integration gives branch preview deployments with little setup.
- Fewer deployment credentials are stored in GitHub.

**Cons**:
- The web app can publish before Azure migrations and readiness complete.
- API and web deployment outcomes are split across systems and harder to promote as one release.

### Option 3: Standard Container Apps environment with Key Vault for staging

Continue with the original standard Consumption environment and Key Vault references for staging.

**Pros**:
- Keeps the original secret centralization, environment feature set, and infrastructure model.
- Provides a cleaner path to environment networking and advanced rollout controls.

**Cons**:
- Azure rejected another standard environment because the subscription has already reached its global environment limit. A quota increase would require Azure support and has not been approved.

### Option 4: Express Container Apps environment with app level secrets for staging

Use Azure Container Apps Express for staging, while keeping the production plan separate.

**Pros**:
- The API only needs HTTP ingress, scale to zero, health probes, and a default HTTPS hostname. The Express portal created the staging app and environment in Southeast Asia even though Bicep `what-if` returned `MaxNumberOfRegionalEnvironmentsInSubExceeded`. The discrepancy remains unresolved for future Bicep deployments.
- The portal accepted the current subscription and sign-in, so staging can proceed on Express without waiting for a standard environment quota increase. The existing Express environment must be reconciled with Bicep before applying that template.

**Cons**:
- Express does not support Key Vault references, traffic splitting, custom domains, sidecars, workload profiles, or a system assigned identity. Secret rotation is manual, and Express is not a network isolation boundary. (basis: Azure Container Apps Express overview and FAQ)

## Decision

**Chosen option**: Option 1 for release orchestration and Option 4 for staging API hosting

Use protected `staging` and `main` branches. Keep local development outside GitHub Environments. Extend the existing CI workflow with staging and production deploy jobs that depend on its successful quality job. Configure GitHub Environments named `staging` and `production`; restrict their deployment branches to the matching branch, and require a reviewer who is not the deployment initiator for production, with self-review prevention enabled. At least one second trusted GitHub reviewer account is therefore required to release production; a sole maintainer cannot self-approve the deployment. Branch rules require pull requests and successful quality checks, prohibit force pushes and deletion, and reserve `main` for staged changes. Because branch rules do not enforce the source branch of a pull request, the production gate also requires an unexpired staging release manifest for the exact `main` Git tree. A release manifest is created only after the staging API readiness and Vercel smoke and promotion checks succeed. The earlier bootstrap image manifest supports initial Azure provisioning but is not eligible for production. Production is enabled only after the release owner has confirmed Vercel Hobby use complies with its personal, noncommercial restriction and supplied isolated production services.

Disable Vercel Git triggered deployments so they cannot race GitHub Actions. Create two Vercel Hobby projects from the same repository and `apps/web` root. Enable Vercel's **Include source files outside of the Root Directory in the Build Step** setting because the web app imports workspace packages from `packages/`. Use one project for staging and one for production. Use a separate authorized personal account and token for each project because Hobby does not provide project-level roles and account tokens can deploy to all projects owned by that account. Do not create duplicate accounts for one person to bypass provider limits. Store staging settings in the staging project's built-in Production variables, and production settings in the production project's built-in Production variables. Deploy both projects only from the Vercel CLI in the approved GitHub workflow; feature branches receive CI but no automatic Vercel deployment. Each project has its own generated `.vercel.app` hostname, so no paid custom Vercel environment or purchased domain is required. Opt out of model training in each Vercel account and project before deploying. Use distinct Neon Free projects for staging and production, never a production-derived staging branch. Neon announced 1 GB storage and 100 CU-hours per Free project on 2026-10-02; verify the current allowance in the console before provisioning because provider limits can change. Use separate R2 buckets, OAuth applications, email configuration, Sentry environments, and Container Apps resources per environment. Staging uses an Express environment and app in Southeast Asia; production retains the standard Consumption and Key Vault design until its own environment can be provisioned. An Express environment is a lightweight app grouping, not a network isolation boundary. Do not put production workloads or secrets in the staging Express environment. Set API `NODE_ENV=production` and `SENTRY_ENVIRONMENT=staging`. Deploy the API first and require `/ready`; then create a staging-project production candidate with domain assignment skipped, smoke check its unique deployment URL, and promote it to the staging project's stable `.vercel.app` hostname.

### Free-first resource plan

| Area | Initial choice | Free-tier boundary and decision |
|---|---|---|
| Local development | Docker Compose Postgres and Redis | Runs locally; development data and provider credentials stay separate from hosted environments. |
| CI and API image | Standard GitHub-hosted runners and public GHCR package | Public repository runner usage and public packages/container image storage are currently free. The public API image contains source/build output only, never configuration or secrets. |
| PostgreSQL | Separate Neon Free projects for staging and production | Neon announced 1 GB storage and 100 CU-hours per Free project on 2026-10-02; verify the current console allowance. Free computes scale to zero after 5 minutes and have a 6-hour instant restore window, so require a successful restore check and upgrade if the recovery objective or traffic exceeds the free allowance. |
| Redis | A dedicated Upstash database for each hosted environment | Upstash Free currently lists about 250 MB of data, 500,000 commands/month, and 10 GB monthly bandwidth. Its pricing page conflicts about the number of Free databases available, so verify the account quota before relying on a second free database. Never share a Redis endpoint between environments. Use a separate free production database only if the account allows it and the free limits fit the recovery and availability needs; otherwise use an authenticated TLS Pay as You Go database with a budget cap. Production stays deployment-blocked until a distinct authenticated TLS endpoint exists and its plan and billing boundary are confirmed. |
| Media storage | Separate Cloudflare R2 Standard buckets and bucket-scoped API tokens | The current Free allowance is 10 GB-month storage, 1 million Class A operations, and 10 million Class B operations; separate buckets and tokens isolate data, while allowance usage is shared at account level. |
| API hosting and logs | Staging uses an Azure Container Apps Express environment and app in Southeast Asia; production retains the standard Consumption environment and app design. Each environment has its own Log Analytics workspace. | Express scales from zero and supports the staging API's HTTP ingress and probes. The Azure quota page showed 0 of 450 Express environments used in Southeast Asia on 2026-10-14; verify availability again before provisioning. ACA compute and request grants are pooled per subscription and are not a spending cap; Log Analytics ingestion and other resources can bill separately. Bound replicas, keep logs useful and low-volume, and set budget alerts. |
| Runtime secrets | Staging secrets are app-level Express secrets; production secrets remain in a separate Azure Key Vault Standard vault. | Express does not support Key Vault references. App secrets are encrypted at rest but lack centralized vault management and automatic rotation, so staging uses synthetic data and separate credentials. Production keeps Key Vault RBAC and managed identity. Key Vault Standard operations are metered and have no always-on compute charge. |
| Web hosting | Two Vercel Hobby projects, one for staging and one for production | Free for personal, noncommercial use. Each project keeps its own Production variables and generated `.vercel.app` hostname. Hobby has no custom environments; its usage quotas are pooled and projects can be paused when usage is exceeded. Opt out of AI model training at account and project level before deployment, and do not use Hobby for a commercial Letterly service. |
| OAuth, email, monitoring | Provider free tiers where they meet the flow | Keep environment credentials/configuration separate and monitor pooled provider quotas. Staging email must target controlled test addresses or be suppressed; confirm each provider's current limits during setup. |

Bicep provisions the staging Express environment, app, Log Analytics workspace, and environment-scoped GitHub deployment identity without staging secret values. Production continues to use the standard Container Apps template with Key Vault references. Add staging secret values and their environment-variable mappings through the Express management experience after provisioning. Free allowances are starting points for local development, staging, and a low-traffic private beta. When no suitable free service preserves data separation and required security, pause the production release until the separately metered resource is provisioned; never share resources across environments to force a $0 bill.

For production, require approval before applying migrations. Build the API image on the staging push and save its source tree and digest in a bootstrap artifact so the image can be used to provision Azure before staging deployment is enabled. The image job records its run attempt and bootstrap artifact name as outputs. After staging API readiness and Vercel smoke checks and promotion succeed, publish a separate validated release artifact that records the workflow run, release attempt, and image build attempt. This lets a failed-job rerun reuse the artifact from a successful earlier image job while recording the newer attempt that completed staging. A full rerun records the new build and release attempts. The production job searches only validated release artifacts, matches the exact `main` tree and release attempt, verifies the recorded image build attempt and digest are valid, confirms the digest is still pullable from GHCR, and deploys by digest; a tag is only a lookup hint and is never treated as immutable. Then it applies production migrations, waits for API readiness, creates a candidate in the production Vercel project with domain assignment skipped, smoke checks it, then promotes it to that project's generated hostname. Keep API changes backward compatible while old web deployments can still reach the API.

Use separate Bicep templates for staging Express and production standard Container Apps. The staging template creates an Express managed environment, API app, Log Analytics workspace, GitHub deployment identity, federated credential, and narrowly scoped app-update role assignment. It creates no Key Vault or runtime managed identity. The app uses external HTTP ingress on Azure's default HTTPS domain and scales from zero to two replicas. The production template remains unchanged: it creates a standard Consumption environment, Key Vault, runtime managed identity, and role assignments. GitHub OIDC federation uses separate Azure deployment identities for staging and production; each can update only its own Container App. A separate setup operator provisions resources and adds staging app secrets through the Express management experience or production secrets to Key Vault. Publish the image to GHCR with a source-tree lookup tag and record its digest; production resolves that digest from the staging run artifact. Secret values are added after Bicep runs and never appear in Bicep parameters, workflow logs, or image layers. GitHub Environment secrets hold the direct migration connection URL and Vercel CLI token; environment variables hold resource names, URLs, and non-secret identifiers. Staging values belong to the dedicated staging Vercel project's built-in Production environment; production values belong to the production project's built-in Production environment.

The free-first profile is intended for local development, staging, and a low-traffic private beta. Free allowances do not provide a production SLA, predictable warm starts, or unlimited storage/commands. Azure budgets notify or invoke configured actions; they do not stop usage by themselves. Monitor Neon Free, Vercel Hobby, Upstash Free, R2, and Azure Consumption against their current quotas. Upgrade a provider before exceeding a limit or when product usage, commercial status, availability target, recovery objective, or data sensitivity requires paid production controls. Vercel Hobby is restricted to personal, noncommercial use; it is not an appropriate plan for a commercial Letterly service. Key Vault Standard has no free allowance but bills operations rather than idle compute; keep requests low and do not add paid networking features in this profile.

**Implementation skills**: `turborepo` (`Vercel/turborepo`, `.agents/skills/turborepo/`) and `nestjs-best-practices` (`Kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`)

## Rationale

The existing release runbook already requires migration first, API readiness second, and web rollout afterward. GitHub Actions can express those dependencies in one workflow and attach production approval before any production credential becomes available. Vercel Hobby does not support custom environments. Two projects preserve independent settings at no additional project charge and use Vercel's generated hostnames, while GitHub Actions retains release ordering without allowing Vercel Git integration to deploy the web early. The tradeoff is that the staging project uses its own built-in Production variable set and consumes the same Hobby account quotas.

Create a new staging Express environment with `infra/azure/staging-express.bicep`, using `environmentMode: 'Express'` and the container app's `environmentId`. For the portal-created environment, use `infra/azure/staging-express-identity.bicep` to create only the GitHub deployment identity, federation, custom role, and app-scoped assignment. Keep the staging app on external HTTP ingress with Azure's default HTTPS domain, zero minimum replicas, at most two replicas, HTTP health probes, and Log Analytics. The API does not need a custom domain, sidecars, Dapr, workload profiles, traffic splitting, or a system-assigned identity. The signed-in Azure account must be backed by Microsoft Entra ID; personal Microsoft accounts without an Entra-backed identity are not supported.

Enter staging API secret values in the Express management experience at `https://containerapps.azure.com/`, then map each API environment variable to the matching app secret. Use short secret aliases of 20 characters or fewer. Do not enter values through a shell command or Bicep parameters. The existing staging workflow updates the image only; it does not read or set secret values. Rotate a secret manually in the Express app and restart or redeploy the API so it uses the new value. Keep `DEPLOY_STAGING` unset until secret configuration is complete and `GET /ready` succeeds.

The API image is keyed by the source tree rather than the merge commit because merging the staged tree into `main` can create a new commit with identical application content. Requiring the digest from the staging run prevents a production rebuild from silently differing from the tested API artifact. Azure OIDC avoids a long lived Azure service principal password. Free tiers are used for the low-traffic beta where their quotas fit; production Redis may use a separate free database only when Upstash permits it and its quotas meet the recovery and availability needs, otherwise it uses a budget-limited paid plan. Key Vault Standard secret operations remain an explicit metered exception for secret protection. First-time provider account, resource, and identity setup remains an operator task because no Azure or Vercel credentials are available in this workspace.

## Feature design

**Data model sketch**:
No application database schema changes. Staging and production use distinct Neon projects with distinct credentials and service resources. Staging uses synthetic data; it is never created from a production data snapshot.

**Deployment flow**:

| Environment | Trigger | Configuration | Release sequence |
|---|---|---|---|
| Development | Local `pnpm dev` | Local Docker Compose Postgres and Redis, local env files, development-only provider credentials | No GitHub deployment job |
| Staging | Successful push to `staging` after a pull request | Neon Free project, Upstash Free database, R2 staging bucket/token, staging OAuth/email/monitoring settings, dedicated ACA Express environment/app/workspace with app-level secrets, and a dedicated Vercel project with staging Production variables | Migrate, build/publish API image to public GHCR, wait for `/ready`, create staging web candidate with domain skipped, smoke check, promote staging project hostname |
| Production | Successful push to `main` with a matching staging artifact | Separate Neon project, separately authenticated TLS Redis, separate Key Vault/R2 bucket/token/OAuth/email/monitoring settings, dedicated standard ACA environment/app/workspace, and a dedicated Vercel project with production variables | GitHub reviewer approval, verify staged image digest and required restore evidence, migrate, deploy API, wait for `/ready`, create production web candidate with domain skipped, smoke check, promote production project hostname |

**Value sourcing**:

| Action | Value produced or used | Source |
|---|---|---|
| Select deployment environment | `staging` or `production` | GitHub job environment selected by the push branch |
| Configure API runtime | Validated API values such as `APP_ORIGIN`, `DATABASE_URL`, `REDIS_URL`, and R2 settings | Staging: non-secret Container App settings plus matching app-level Express secrets, following `apps/api/.env.example`. Production: standard Container App settings plus that environment's Key Vault secret references. |
| Run Prisma migration | Direct database URL | Required `DATABASE_URL_UNPOOLED` GitHub Environment secret; the deployment step fails if it is empty |
| Select API image | Git tree identity and immutable content digest | Staging run artifact maps the Git tree to the GHCR digest; production pulls by `@sha256:` digest and fails closed if the artifact has expired or the digest is unavailable |
| Log in to Azure | Tenant, subscription, client identity | GitHub Environment variables and an Azure federated identity credential whose subject names the repository and environment |
| Select API health target | Environment API origin | GitHub Environment variable `API_BASE_URL`, ending at the Azure Container App ingress URL |
| Deploy web app | Vercel account and project | `VERCEL_TOKEN` GitHub Environment secret, plus Vercel organization and project IDs in GitHub Environment variables |
| Configure web API origin | `API_ORIGIN` and `APP_ORIGIN` | Production variables in the staging Vercel project's own project settings for staging; production variables in the production Vercel project for production |
| Select stable web URL | Staging and production hostnames | Each Vercel project's generated `.vercel.app` hostname, recorded as `WEB_URL` in the matching GitHub Environment |

**Key invariants**:
- Staging never reads production database records or writes to production storage.
- `NODE_ENV` is `production` in both hosted environments. `SENTRY_ENVIRONMENT` distinguishes `staging` from `production`.
- Staging and production each have a distinct Redis endpoint. Production Redis must use authenticated TLS; use an application-specific ACL credential with only required commands/key patterns where the provider supports it. Never publish a Redis endpoint or create a plaintext public Redis listener.
- Migrations use a direct or unpooled database URL. Runtime API instances use the pooled URL.
- No new API route is introduced. `GET /ready` is the API deployment gate; `GET /health` is process liveness only.
- Azure Monitor and Sentry receive operational data only; application logs, smoke checks, and release artifacts never contain confession content, user tokens, passwords, or connection strings.
- Production promotion cannot run if quality checks, migration, API readiness, or the web smoke check fails.
- Database migrations remain additive while the previous API or web deployment may still be serving traffic.
- Azure credentials use OIDC. The deployment identity for staging cannot access production environment secrets, Container App, or Key Vault. A public image contains no environment configuration or secrets.
- Vercel Hobby use must remain personal and noncommercial. Disable AI model training in the account and both Vercel projects before deployment, and confirm the settings in each GitHub Environment.
- Keep staging and production Vercel projects in different authorized personal accounts. Hobby has no project-level RBAC, so account tokens for projects in the same account would cross the environment boundary.
- Free allowances and cost alerts are not hard spending caps. Keep ACA replicas bounded and inspect Azure/provider billing after deployment.
- Production deployment is blocked until its own TLS Redis endpoint is present and staging and production resource checks confirm no shared credentials or data.

**Security model**:
Feature branches can run CI but cannot access deployment secrets. Pull requests must merge into `staging`; only a successful staging deployment can produce an API image eligible for production. The production environment is limited to `main`, requires a human reviewer, and prevents self-review. Azure identities use environment-scoped federation and least privilege. The GitHub identity's custom role grants Container Apps read and write only and omits the `listSecrets` action. Staging values are entered only through the Express management experience; production runtime secrets remain in Key Vault and are read by the production runtime managed identity. Runtime secrets are not copied into GitHub Actions logs or build arguments. R2 API tokens are bucket-scoped. Staging fixtures use synthetic accounts and content, and staging email delivery is limited to controlled test addresses.

**Configuration required**:
- `DATABASE_URL_UNPOOLED`: Environment scoped GitHub secret used only for Prisma migration.
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `RESOURCE_GROUP`, `CONTAINER_APP_NAME`, `API_BASE_URL`: Environment-scoped GitHub variables for OIDC login and the corresponding Azure resources. The existing staging app's values come from `staging-express-identity.bicep`; a new staging environment's values come from `staging-express.bicep`; production values come from `main.bicep`.
- `VERCEL_HOBBY_NONCOMMERCIAL_CONFIRMED`, `VERCEL_AI_TRAINING_OPT_OUT_CONFIRMED`, `VERCEL_DEPLOYMENT_ACCOUNTS_ISOLATED_CONFIRMED`: Environment scoped GitHub variables required by both staging and production release jobs.
- Production Key Vault name and secret URIs: Local `main.bicep` parameter values; the deployment job does not need direct Key Vault access. Staging has no Key Vault references.
- `VERCEL_TOKEN`: Environment scoped GitHub secret for the Vercel CLI.
- `VERCEL_ORG_ID`, `VERCEL_STAGING_PROJECT_ID`, `VERCEL_PRODUCTION_PROJECT_ID`, `STAGING_WEB_URL`, `PRODUCTION_WEB_URL`: Environment scoped GitHub variables.
- API runtime values: Non-secret Azure settings and `apps/api/.env.example` define configuration names. Enter staging secret values and map aliases to environment variables in the Express management experience; enter production values in its Key Vault and use the existing versionless secret URI mapping.
- Web values: the staging project's Production variables and the production project's Production variables, based on `apps/web/.env.example`.

**Critical release scenarios**:
- Successful staging push migrates staging, waits for API readiness, smoke checks a candidate from the separate staging Vercel project, then promotes that project's generated hostname, verifying **AC-2**, **AC-3**, **AC-4**, and **AC-5**.
- Failed CI, migration, API readiness, or web smoke check stops the workflow before the next release step, verifies **AC-3**, **AC-4**, and **AC-5**.
- Production uses the staged image digest, waits for a reviewer before production credentials are available, and does not promote the web domain until smoke checks pass, verifies **AC-5**, **AC-6**, and **AC-7**.
- Rollback restores the last known good API revision and Vercel deployment without deleting the additive migration, verifies **AC-8**.
- Production workflow remains blocked when its separately provisioned TLS Redis endpoint or required restore evidence is missing, verifying **AC-9**.

## Build plan

1. Add local Postgres to Docker Compose and an API Docker build from the monorepo root using Node 24; publish the image to public GHCR without secrets, satisfying **AC-1**, **AC-4**, and **AC-6**.
2. Add a staging Express Bicep template and retain the standard production Container Apps and Key Vault template. Create environment-scoped GitHub identities and least-privilege app-update role assignments; configure staging to scale from zero to two replicas and do not include secret values, satisfying **AC-7**, **AC-9**, **AC-10**, and **AC-11**.
3. Extend CI to run on `staging` pushes and add ordered GitHub Environment deployment jobs for staging and production, with OIDC login and environment-scoped settings, satisfying **AC-1**, **AC-3**, and **AC-7**.
4. Implement the staging release sequence: direct URL migration, free-tier isolated staging services, API image publish/bootstrap manifest, Azure deployment, `/ready` gate, Vercel staging-project candidate, smoke check, hostname promotion, and a validated release manifest published only after success, satisfying **AC-2**, **AC-4**, **AC-5**, and **AC-6**.
5. Implement the production approval and promotion sequence, requiring the validated staging release manifest for the exact source tree, separate TLS Redis and restore evidence, and migration/readiness/web smoke gates before promotion, satisfying **AC-5**, **AC-6**, **AC-7**, and **AC-9**.
6. Document GitHub branch protection, environment settings and values, Vercel variables, production Key Vault setup, Express account prerequisites and manual staging app-secret setup, free-tier quotas and cost alerts, Neon isolation, rollback, and the Vercel Hobby commercial-use limit, satisfying **AC-1**, **AC-2**, **AC-7**, **AC-8**, and **AC-11**.

For this staging deployment slice, step 2 adds the Express provisioning template and the identity-only template for the portal-created app, plus example parameters for new environments. It preserves `infra/azure/main.bicep` for production. Step 3 compiles all three templates in the existing CI infrastructure gate and builds and imports the production API image on pull requests. Step 6 explains the Entra sign-in prerequisite, OIDC setup for the existing app, manual staging app-secret setup, and the readiness gate before deployment is enabled.

## Consequences

**Positive**:
- The web and API move through staging and production in a recorded, ordered release.
- Production requires a reviewer and deploys the same API artifact that passed staging.
- Local development remains independent of cloud accounts and production data.

**Negative / tradeoffs**:
- Initial setup needs Azure identities, a staging Express environment and app, production standard Container Apps and Key Vault resources, a public GHCR package, Vercel project values, isolated provider accounts, and GitHub Environment configuration.
- Vercel deployment requires a long lived token stored as an environment secret and rotated by an operator.
- Vercel Hobby is limited to personal, noncommercial projects; a commercial Letterly launch requires a suitable plan.
- Vercel Hobby provides no custom environment isolation. Staging and production use separate projects; the staging project's built-in Production settings point to staging resources.
- Azure's Container Apps free grant is pooled per subscription; budget alerts do not stop usage. Azure Key Vault Standard is metered by secret operations and has no free tier; it is retained as the low-volume security exception.
- Staging Express app secrets require manual setup and rotation, do not support Key Vault references, and are not a network boundary. Use only staging credentials and synthetic records there; production remains on standard Container Apps and Key Vault.
- Upstash's current pricing page conflicts about Free database count. Production must have its own authenticated TLS endpoint; use Free only if a separate database is available and its limits fit, otherwise use Pay as You Go with a budget cap. The production workflow remains blocked until the plan and billing boundary are confirmed.
- Neon Free quotas and recovery limits can fit an early private beta but do not imply an SLA. A restore test and an explicit recovery target are required before production enablement.

**Neutral**:
- No application schema change is needed for environment separation.
- GitHub Actions is the single deployment controller; Vercel Git triggered deployments are disabled to prevent a staging or production release from racing the workflow.

## Follow-up

- [ ] Confirm whether Letterly remains a personal noncommercial project while using Vercel Hobby; upgrade before a commercial launch.
- [ ] Create separate staging and production provider resources and configure the named GitHub and Vercel settings before enabling deployment jobs.
- [ ] Provision a distinct production Redis endpoint with authenticated TLS and verify the current plan/quota/billing boundary before enabling production deploys.
- [ ] Confirm the production backup and restore objective fits Neon Free's current recovery window; upgrade the database plan before launch if it does not.

## References

**Project sources**:
- Root `AGENTS.md`, the release runbook, API and web environment examples, and API health and configuration context.
- Spec 0001, which defines the monorepo and database connection roles.
- Spec 0011 and its recovery runbook, which define staging isolation and restoration constraints.

**Practices & standards**:
- Expand and contract database migrations, readiness gated rollouts, immutable container image promotion, least privilege, and OIDC federation.

**Links**:
- GitHub Actions environments and required reviewers: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- GitHub rulesets and branch protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- GitHub Actions free usage for public repositories: https://docs.github.com/en/actions/concepts/billing-and-usage
- GitHub OIDC with Azure: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure
- Azure Container Apps with GitHub Actions: https://learn.microsoft.com/en-us/azure/container-apps/github-actions
- Azure Container Apps Express overview and current feature/region matrix: https://learn.microsoft.com/en-us/azure/container-apps/express-overview
- Azure Container Apps Express account, portal, and billing FAQ: https://learn.microsoft.com/en-us/azure/container-apps/express-faq
- Bicep guidance for Express environmentMode and container app environmentId: https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/container-apps-workflows
- Deploy an Express Container App with the Azure CLI: https://learn.microsoft.com/en-us/azure/container-apps/deploy-express-cli
- Azure Bicep: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview
- Azure Container Apps billing and Consumption free grant: https://learn.microsoft.com/en-us/azure/container-apps/billing
- Azure Container Apps secrets: https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets
- Azure Container Apps secret permissions and custom roles: https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets#permissions-for-managing-secrets
- Azure Container Apps environment isolation and logging: https://learn.microsoft.com/en-us/azure/container-apps/environment
- Azure Container Apps Log Analytics: https://learn.microsoft.com/en-us/azure/container-apps/log-monitoring
- Azure Monitor free ingestion allowance and retention: https://azure.microsoft.com/en-us/pricing/details/monitor/
- Azure Key Vault Standard pricing: https://azure.microsoft.com/en-us/pricing/details/key-vault/
- Azure Cost Management budgets (alerts do not stop usage): https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets
- Neon Free plan announcement (2026-10-02): https://neon.com/blog/neon-free-plan-1-gb-per-project
- Upstash Redis pricing and Free limits: https://upstash.com/pricing/redis
- Upstash Redis database-count and upgrade guidance: https://upstash.com/docs/redis/howto/upgrade-database
- Upstash Terms of Service: https://upstash.com/trust/terms
- Redis Cloud Free database and TLS restrictions: https://redis.io/docs/latest/operate/rc/databases/create-database/create-free-database/ and https://redis.io/docs/latest/operate/rc/security/database-security/tls-ssl/
- GitHub Packages billing for public GHCR images: https://docs.github.com/en/billing/concepts/product-billing/github-packages
- Cloudflare R2 pricing and Free limits: https://developers.cloudflare.com/r2/pricing/
- Vercel CLI deployment and production domain controls: https://vercel.com/docs/cli/deploy
- Vercel promotion: https://vercel.com/docs/cli/promote
- Vercel access roles: https://vercel.com/docs/rbac/access-roles
- Vercel CLI token and project selection: https://vercel.com/docs/cli/global-options
- Vercel staged production deployment: https://vercel.com/docs/cli/deploy and https://vercel.com/docs/cli/promote
- Vercel generated deployment URLs: https://vercel.com/docs/deployments/generated-urls
- Vercel environments: https://vercel.com/docs/deployments/environments
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- Vercel March 2026 terms and AI training settings: https://vercel.com/changelog/updates-to-terms-of-service-march-2026
- Vercel Terms of Service: https://vercel.com/legal/terms

## Migration plan

**Strategy**: Strangler
**Phases**:
1. Keep local development unchanged while adding the container build, protected branches, staging resources, and staging workflow.
2. Exercise the staging release and recovery path with synthetic data, then provision production resources and approval rules.
3. Enable production releases only after the staging release and restore checks succeed.
**Rollback**: Disable the deployment job or revert the workflow change. For an application release, restore the prior Azure revision and Vercel deployment. Keep compatible additive migrations in place and repair forward.
**Risks**: Incorrect GitHub environment values could target the wrong resource. Branch rules and Azure federated credential subjects must be verified before production secrets are added. The staging digest artifact has a retention limit; production fails closed if the artifact expires or the image cannot be fetched. Free-tier caps, cold starts, and provider availability can interrupt the private beta. Production and staging source trees must match the successful staging artifact before production deployment.
