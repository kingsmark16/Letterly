# Development, staging, and production setup

This runbook turns the approved environment design into provider settings. The
repository contains the workflow and infrastructure templates, but it does not
create cloud resources or store provider credentials. Keep deployment disabled
until the matching environment is complete.

## Environment boundaries

| Environment | Web and API | Data and provider settings |
| --- | --- | --- |
| Development | Local Next.js and NestJS processes | Docker Compose PostgreSQL; optional local Redis; local `.env` files; synthetic developer data. |
| Staging | One Vercel Hobby project and one Azure Container Apps Express app in Southeast Asia | A dedicated Neon Free project, a dedicated Upstash Redis database, a separate R2 bucket and token, app-level Express secrets, staging OAuth credentials, controlled email delivery, and staging monitoring. Use synthetic records only. |
| Production | A separate Vercel Hobby project and standard Azure Container App | A separate Neon project, a separate authenticated TLS Redis database, a separate R2 bucket and token, production Key Vault secrets, production OAuth credentials, verified email settings, and production monitoring. No staging credential or dataset is reused. |

The API uses Redis for shared, atomic rate limit counters and other short lived
coordination between API instances. PostgreSQL remains the durable application
database. Separate Redis endpoints keep staging counters and keys isolated from
production.

Production Redis must use TLS (`rediss://`) with a unique authenticated
application credential for each environment. Where the provider supports ACLs,
allow only `PING`, `EVAL`, `INCR`, `EXPIRE`, `TTL`, `GET`, and `SET` for the
Letterly API; these are the commands used for rate limits and short lived
unlock proofs. Use only the keys in that environment's dedicated Redis
database. Never give the API an administrative credential or allow destructive
commands such as `FLUSHALL` or `CONFIG`. Restrict network sources to the API's
stable egress addresses if the provider and hosting plan support it. If the
provider does not support a network allowlist, keep the endpoint managed, TLS
protected, and authenticated; do not expose a self hosted Redis listener.

Local development starts with `docker compose up -d postgres redis`. Both
service ports bind to `127.0.0.1` only. PostgreSQL uses the development only URL
in the environment examples. Redis is optional
for ordinary local rate limiting, which uses memory in development and tests.
Never put a hosted service credential in a local environment file that is
committed to Git.

Free allowances are the starting point, not a promise that every production
dependency will stay free. Neon projects and R2 buckets must be distinct even
when their account quotas are shared. Upstash Free currently lists 250 MB of
data, 500,000 commands per month, and 10 GB of monthly bandwidth. Its pricing
page gives conflicting database-count limits in the plan comparison and FAQ,
so check the account console before assuming it can provide separate free
staging and production databases. Never share a Redis endpoint between
environments. Use a separate free production database only if the account
allows it and the free-tier limits meet the beta's recovery and availability
needs; otherwise use a separate authenticated TLS database on a pay-as-you-go
plan with a monthly budget cap. Production stays disabled until that separate
TLS endpoint is ready. Key Vault Standard secret operations are metered; that
small cost keeps runtime credentials in an Azure secret store. Azure Container
Apps scales to zero and has a monthly Consumption grant, but the grant is pooled
and does not stop charges. Create Azure budget alerts and review provider usage.
Azure budget alerts do not cap spending.

Vercel Hobby is for personal, noncommercial use. The workflow uses two Hobby
projects with their generated `.vercel.app` hostnames, so it needs no paid
custom domain. Do not enable a commercial Letterly launch on Hobby. Before any
commercial release, move to a plan or host that permits that use and review the
deployment workflow's Vercel settings.

## Git branches and protection

Use `feat/<short-name>` branches for development. Open a pull request from a
feature branch into `staging`; the `quality` job runs but deployment secrets are
not available to pull requests. Merge a validated staging change into `main`
through a pull request. Do not push directly to either long lived branch.

In the public GitHub repository, protect `staging`, `main`, and the
`feat/milestone-*` branches:

1. Require a pull request before merging.
2. Require the successful `quality` check from the `CI` workflow.
3. Require conversation resolution before merging.
4. Block force pushes and branch deletion.

This repository currently has one maintainer. Set the required approval count
to zero for `staging` and `feat/milestone-*`, so the maintainer can merge the
ordered milestone PRs after `quality` passes. Keep PRs and CI required, and
review each incremental diff before merging when possible. This permits staging
work; it does not count as an independent code review.

Keep one approving review required for `main`, dismiss stale approvals after
new commits, and require an independent trusted account to review the staging
to main promotion. Until a trusted reviewer is available, do not promote to
`main` or enable production deployment.

GitHub branch rules do not prove that a pull request came from `staging`. The
production workflow therefore compares the exact Git tree on `main` with an
unexpired staging release manifest. That manifest is created only after the
staging API readiness check and Vercel smoke checks and promotion succeed. A
quality-only run while `DEPLOY_STAGING` is unset creates a separate bootstrap
image manifest, which is not eligible for production. If the trees differ or
the validated release manifest is missing, the production workflow stops
before the migration. Keep staging and main branch history intact so this
check can find the matching run.

## GitHub environments and settings

Create GitHub Environments named exactly `staging` and `production`.

For `staging`, allow deployment from the `staging` branch. Keep
`DEPLOY_STAGING` unset until staging resources and settings are ready. For
`production`, allow deployment from `main`, require a trusted reviewer, and
enable prevention of self review. A second trusted account is required to
approve production; a single maintainer cannot approve their own deployment.
Configure environment protection before turning on production deployment.

Set these as **repository variables**. Leave them unset until the corresponding
setup is complete:

| Repository variable | Value |
| --- | --- |
| `DEPLOY_STAGING` | Set to `true` after staging services, Vercel settings, Azure resources, and GitHub Environment values are ready. |
| `DEPLOY_PRODUCTION` | Set to `true` only after staging promotion, production restore evidence, an isolated TLS Redis endpoint, and production Vercel and Azure settings are ready. |

Set these as **environment variables** in both environments, using each
environment's own values:

| Environment variable | Purpose |
| --- | --- |
| `AZURE_CLIENT_ID` | Client ID output by the environment's Bicep deployment. |
| `AZURE_TENANT_ID` | Tenant ID output by Bicep. |
| `AZURE_SUBSCRIPTION_ID` | Subscription containing this environment's resource group. |
| `VERCEL_HOBBY_NONCOMMERCIAL_CONFIRMED` | `true` only while this deployment remains personal and noncommercial. |
| `VERCEL_AI_TRAINING_OPT_OUT_CONFIRMED` | `true` after disabling AI model training for both Vercel projects. |
| `VERCEL_DEPLOYMENT_ACCOUNTS_ISOLATED_CONFIRMED` | `true` only after staging and production use different Vercel accounts and tokens. |
| `RESOURCE_GROUP` | Azure resource group containing only this environment's resources. |
| `CONTAINER_APP_NAME` | `letterly-api-staging` or `letterly-api-production`, as returned by Bicep. |
| `API_BASE_URL` | HTTPS ingress URL returned by Bicep, with no trailing slash. |
| `VERCEL_ORG_ID` | Vercel team or account identifier. |
| `VERCEL_PROJECT_ID` | The separate Vercel project identifier for this environment. |
| `WEB_URL` | The project's stable generated `.vercel.app` HTTPS hostname, with no trailing slash. |

Add these additional **production environment variables** only after the checks
are complete:

| Production variable | Required value |
| --- | --- |
| `REDIS_TLS_CONFIRMED` | `true`, after confirming that production has its own authenticated `rediss://` database and its Key Vault secret is referenced by the production Container App. |
| `RESTORE_EVIDENCE_URL` | HTTPS link to the approved production restore evidence. The drill must meet the recovery objectives in [the restore runbook](launch-hardening-restore.md). |

Add these **environment secrets** separately to both GitHub Environments:

| Environment secret | Purpose |
| --- | --- |
| `DATABASE_URL_UNPOOLED` | This environment's direct Neon connection URL, used only by the migration step. |
| `VERCEL_TOKEN` | Token for this environment's separate Vercel account. |

Use GitHub's secret form to add secret values. Do not put database URLs,
provider keys, or tokens into workflow files, command arguments, Bicep
parameters, artifacts, or logs.

## Vercel projects

Create two projects from the same repository, both with `apps/web` as the root
directory. Use a separate Vercel Hobby account, project, and token for staging
and production. Each account must be controlled by its authorized owner; do not
create duplicate accounts for one person to bypass provider limits. Connect
both accounts to the same public GitHub repository. Disable Vercel's Git
triggered deployments so only GitHub Actions can promote the web application.
In each project's Build and Deployment settings, enable **Include source files
outside of the Root Directory in the Build Step**. The web app imports workspace
packages from outside `apps/web`, so Vercel must include those files in the
build. Keep each project's generated `.vercel.app` hostname and use it as
`WEB_URL`.

Hobby does not provide project-level roles. A personal-account token can
administer every project owned by that account, so putting both projects in one
account would let the staging token reach production project settings and
deployments. The workflow stays disabled unless separate project-owning
accounts and tokens are confirmed in both GitHub Environments. If separate
authorized owners are unavailable, use a plan or host with project-level
deployment access before enabling releases.

Before deploying source code, use Vercel **Data Preferences** and each
project's settings to opt out of AI model training. Hobby is opted in by
default, and Vercel's terms allow the owner to disable future model training in
account and project settings. Confirm the settings for both projects, then set
`VERCEL_AI_TRAINING_OPT_OUT_CONFIRMED=true` in both GitHub Environments.
Vercel's terms still allow some non-training product improvement uses on Hobby;
review the current terms and privacy notice before serving real user content.
The workflow also requires `VERCEL_HOBBY_NONCOMMERCIAL_CONFIRMED=true` in both
environments while the Hobby use is personal and noncommercial, plus
`VERCEL_DEPLOYMENT_ACCOUNTS_ISOLATED_CONFIRMED=true` after verifying that each
environment token can access only its own project's account.

Set each project's **Production** variables to that project's environment
values, based on [the web environment example](../../apps/web/.env.example):

- `APP_ORIGIN` and `NEXT_PUBLIC_AUTH_URL` must use that project's stable HTTPS
  origin.
- `API_ORIGIN` must point to the same environment's Azure API URL.
- `BETTER_AUTH_SECRET` and `PUBLIC_MEDIA_PROXY_SECRET` must match the API
  environment's values exactly.
- `PUBLIC_SUPPORT_CONTACT_URL` must be the real support URL for the release.
- `TRUSTED_PROXY_COUNT` must match the trusted proxy setup.
- Leave `OAUTH_PROXY_PRODUCTION_URL` empty unless that supported development
  relay is explicitly in use; the API rejects it in production.

The workflow links to the project by ID using that environment's account token,
runs `vercel deploy --prod
--skip-domain`, requests the candidate URL, checks it, and then runs `vercel
promote`. Vercel documents that `--skip-domain` creates a staged production
deployment and `vercel promote` assigns the project domains after the smoke
check. [Vercel deployment CLI](https://vercel.com/docs/cli/deploying-from-cli)

## Azure resources and OIDC

### Staging Express prerequisites

Express requires a Microsoft Entra ID-backed sign-in. Personal Microsoft accounts without an Entra-backed identity are not supported. The Gmail address shown in Azure does not confirm whether the account meets this requirement. Before provisioning, sign in to https://containerapps.azure.com/ using the correct tenant. If it returns `tenant_not_allowed`, use an Entra-backed account or ask the tenant administrator to invite/create the correct identity.

Southeast Asia is an Express-supported region. The Azure quota view showed 0 of 450 Express environments used there on 2026-10-14, while the read-only `what-if` for `staging-express.bicep` failed with `MaxNumberOfRegionalEnvironmentsInSubExceeded`. The Express portal then successfully created environment `express-southeastasia-5shm2e8` and app `letterly-api-staging` in `rg-letterly-staging`. The portal accepted the current sign-in and subscription for this path, but the CLI/Bicep preflight discrepancy remains unresolved. The standard environment preview also failed for a subscription quota, so do not use `main.bicep` for staging.

Register `Microsoft.App`, `Microsoft.OperationalInsights`, and `Microsoft.ManagedIdentity` if they are not registered. `Microsoft.KeyVault` is registered already and is only needed for production.

### Staging Express resources

`infra/azure/staging-express.bicep` describes a new Express environment and `letterly-api-staging` app, a 31-day Log Analytics workspace, and a GitHub deployment identity with an environment-scoped federated credential and app-scoped custom role assignment. It creates no Key Vault or runtime identity. The portal-created app uses an Azure-managed HTTPS hostname, external ingress to port 3001, and zero-to-two replicas. Express is an app grouping, not a network isolation boundary; keep production workloads and credentials out.

The portal created the current app and environment; Bicep has not been applied. The full template's generated environment name (`cae-letterly-staging-...`) differs from `express-southeastasia-5shm2e8`. Do not run `staging-express.bicep` against this resource group because it would attempt to create another Express environment and update the existing app. The separate `infra/azure/staging-express-identity.bicep` template creates only the GitHub deployment identity, federated credential, custom role, and app-scoped role assignment. It references the existing app and does not update its configuration or secrets.

The portal reports the app as running, but its initial application log contains `Error: Cannot find module '@letterly/config'`. The pinned image was built with `pnpm deploy --legacy`, which left workspace dependency links pointing at `/workspace/packages` and their package dependencies at the workspace pnpm store; the runtime image copied only `/api-runtime`. The Dockerfile now copies the four API workspace dependency targets and links their pnpm store path to the deployed production dependencies. Publish a corrected image and update the app before treating it as operational. The current public API URL is `https://letterly-api-staging.wonderfulgrass-11c87508.southeastasia.azurecontainerapps.io`.

The app image must be a public Linux/amd64 GHCR image pinned by digest. Bootstrap by merging the approved deployment code to `staging` while `DEPLOY_STAGING` is unset. The workflow runs quality and publishes the image but skips deployment. Make the GHCR package public, then download the bootstrap manifest from that staging run. The artifact is named `letterly-api-staging-bootstrap-manifest-attempt-<attempt>`:

```powershell
$runId = "<staging-run-id>"
$attempt = gh run view $runId --json attempt --jq .attempt
gh run download $runId --name "letterly-api-staging-bootstrap-manifest-attempt-$attempt"
```

This bootstrap artifact is for provisioning only. Production uses `letterly-api-staging-release-manifest-attempt-<attempt>`, published only after a successful staging deployment. On a failed-job rerun, the successful image job may belong to an earlier attempt; the workflow records both attempts. A full rerun builds a new artifact.

For a future new Express deployment, copy `infra/azure/staging-express.parameters.example.json` to `infra/azure/staging-express.parameters.json`. Replace the Vercel origin, R2 endpoint, verified email sender, support URL, and image digest. Keep `runtimeEnvironment` non-secret. This local parameter file is ignored by Git. Create a new R2 token scoped only to `letterly-staging-media`. The existing Cloudflare token shown for bucket `letterly` is not valid for staging and must not be reused.

Do not apply the full `staging-express.bicep` template to the existing resource group. Its earlier `what-if` returned `MaxNumberOfRegionalEnvironmentsInSubExceeded`, and its environment name differs from the portal-created one. Use the identity-only template for the existing app. The Azure operator needs permission to create a user-assigned identity, federated credential, custom role definition, and role assignment in this resource group.

Compile and preview the identity-only deployment:

```powershell
az bicep build --file infra/azure/staging-express-identity.bicep
az deployment group what-if --resource-group rg-letterly-staging --template-file infra/azure/staging-express-identity.bicep --parameters githubRepository=kingsmark16/Letterly environmentName=staging containerAppName=letterly-api-staging
```

Review the plan. It should create the identity, GitHub federated credential, custom role, and role assignment scoped to the existing app. It should not update `Microsoft.App/containerApps`. If the plan includes an app update or a new managed environment, stop and reconcile the template before applying it.

```powershell
az deployment group create --resource-group rg-letterly-staging --template-file infra/azure/staging-express-identity.bicep --parameters githubRepository=kingsmark16/Letterly environmentName=staging containerAppName=letterly-api-staging
```

Outputs include the existing API URL, resource group, app name, GitHub client ID, tenant ID, and principal ID. Add the client ID as `AZURE_CLIENT_ID`, tenant ID as `AZURE_TENANT_ID`, subscription ID as `AZURE_SUBSCRIPTION_ID`, resource group as `RESOURCE_GROUP`, app name as `CONTAINER_APP_NAME`, and API URL as `API_BASE_URL` in GitHub Environment `staging`. Get the subscription ID with `az account show --query id --output tsv`. GitHub OIDC needs no Azure client secret. The app-scoped custom role allows Container App read and write and omits `Microsoft.App/containerApps/listSecrets/action`.

### Staging app secrets and configuration

After the app exists, enter runtime secrets in the Express portal at https://containerapps.azure.com/. For each secret, set its app secret alias and configure the matching API environment variable to reference that alias. Do not put values in this runbook, source control, Bicep parameters, shell commands, or GitHub settings. Aliases must be at most 20 characters.

| Express secret alias | API environment variable | Value source |
| --- | --- | --- |
| `database-url` | `DATABASE_URL` | Pooled staging Neon URL |
| `auth-secret` | `BETTER_AUTH_SECRET` | Unique staging value, at least 32 characters |
| `resend-api-key` | `RESEND_API_KEY` | Staging Resend key |
| `redis-url` | `REDIS_URL` | Authenticated staging Upstash URL using `rediss://` |
| `r2-access-key` | `R2_ACCESS_KEY_ID` | Token scoped only to `letterly-staging-media` |
| `r2-secret-key` | `R2_SECRET_ACCESS_KEY` | Secret paired with that R2 token |
| `media-proxy-key` | `PUBLIC_MEDIA_PROXY_SECRET` | Unique staging value, at least 32 characters |
| `page-password-key` | `PAGE_PASSWORD_ENCRYPTION_KEY` | Unique staging encryption key |
| `admin-bootstrap` | `ADMIN_BOOTSTRAP_SECRET` | Unique staging value |
| `admin-cursor-key` | `ADMIN_CURSOR_SIGNING_SECRET` | Unique staging signing value |

If OAuth is enabled, add complete pairs: `google-client-id` / `GOOGLE_CLIENT_ID`, `google-client-secret` / `GOOGLE_CLIENT_SECRET`, `fb-client-id` / `FACEBOOK_CLIENT_ID`, and `fb-client-secret` / `FACEBOOK_CLIENT_SECRET`. Add `youtube-api-key` / `YOUTUBE_DATA_API_KEY` only if `YOUTUBE_LINKS_ENABLED` is true; `sentry-dsn` / `SENTRY_DSN` only if staging Sentry is enabled; and `oauth-proxy-key` / `OAUTH_PROXY_SECRET` only if the supported relay is used outside production.

Set non-secret values in `runtimeEnvironment` in the local parameter file: `RESEND_FROM_EMAIL` (verified sender), `PUBLIC_SUPPORT_CONTACT_URL`, `R2_ENDPOINT`, `R2_BUCKET=letterly-staging-media`, `TRUSTED_PROXY_COUNT`, and `YOUTUBE_LINKS_ENABLED`. The template sets `NODE_ENV=production`, `PORT=3001`, `APP_ORIGIN`, `BETTER_AUTH_URL`, and `SENTRY_ENVIRONMENT=staging`. Keep the web project's `BETTER_AUTH_SECRET` and `PUBLIC_MEDIA_PROXY_SECRET` equal to the corresponding API values. Follow `apps/api/.env.example` for the rest.

After adding required secrets and mappings, restart or redeploy the app. Check Express logs, then request `GET /ready` at the HTTPS API URL. Leave `DEPLOY_STAGING` unset until readiness succeeds and staging GitHub/Vercel settings are checked. The workflow updates only the image; it never reads or writes app secrets. Rotate secrets manually through Express and restart or redeploy afterward.

### Production standard Container Apps and Key Vault

Production remains on `infra/azure/main.bicep` and its standard Consumption plus Key Vault design. The subscription rejected a standard staging environment for quota reasons; production stays blocked until its separate quota and resources are available. Do not switch production to Express.

The production template creates a standard Consumption environment and API app, a 31-day Log Analytics workspace, a Standard Key Vault with RBAC, soft delete, and purge protection, a runtime identity that reads only that vault, and a GitHub deployment identity scoped to that app. Its custom role omits the secret-list permission. Use a separate production resource group and parameter file. Copy `infra/azure/main.parameters.example.json` to a local production parameter file; set `environmentName` to `production` and use the production vault, web origin, and staged image digest.

Production setup needs rights to create resources, custom role definitions, and role assignments. Register `Microsoft.KeyVault` if needed; it is registered already. Deploy the production template once with `runtimeSecretUris` empty, add production values through the Key Vault secret form, then deploy again with versionless secret URIs. Never put values in the parameter file. Production uses its own Neon, authenticated TLS Redis, R2 bucket/token, OAuth and email settings, and Sentry environment. Never copy staging credentials or data.

`DATABASE_URL_UNPOOLED` is a separate GitHub Environment secret from pooled runtime `DATABASE_URL`. Migrations use the direct URL and fail if it is missing. Do not proceed with production until its quota, restore evidence, TLS Redis plan, Vercel project, and reviewer boundary are confirmed. Its API must pass `/ready` before web rollout.

Create or review Azure Cost Management budgets at subscription or resource-group level and alert the release owner. The existing budget is a notification, not a spending cap. Express scales to zero, but usage can still exceed the shared free grant and bill. Review Azure and provider usage after deployment and regularly afterward.

If production Redis uses Upstash Pay as You Go, set its database budget before traffic. Upstash rate-limits the database after the cap, trading availability for cost protection; monitor usage alerts.
## First staging release and production enablement

1. Create isolated staging Neon, Upstash, R2, OAuth, email, Sentry, Vercel, and
   Azure resources. Keep all staging data synthetic and restrict test email to
   controlled addresses.
2. Add staging GitHub Environment variables and secrets. Set repository
   variable `DEPLOY_STAGING` to `true` only after checking each value.
3. Push the next approved staging change. CI runs, migrations apply to staging,
   the API updates and passes `/ready`, then Vercel smoke checks and promotes
   the web project hostname.
4. Exercise staging authentication, catalog, page publishing, locked page
   unlock, media, and private response journeys. Complete and approve the
   staging restore drill with synthetic records.
5. Before enabling production, create its independent Neon project, authenticated
   TLS Redis database, R2 bucket, OAuth and email settings, Sentry environment,
   Vercel project, Key Vault, and Container App. Verify the production restore
   objective and record its evidence URL.
6. Configure the production GitHub Environment with `main` deployment
   restriction, a trusted reviewer, self-review prevention, its own variables
   and secrets, and `REDIS_TLS_CONFIRMED=true` only after the Redis resource and
   Key Vault reference exist.
7. Set repository variable `DEPLOY_PRODUCTION` to `true`. A push to `main`
   still stops unless it has an unexpired staging release manifest for the
   exact same Git tree. That artifact is published only after the staging API
   readiness and web smoke and promotion steps succeed. GitHub Environment
   approval occurs before migration or deployment steps can run.

GitHub artifacts retain bootstrap and validated release manifests for 30
days. If the validated release artifact expires, push or merge that exact tree
through staging again. Production fails closed if the release artifact is
missing, its source tree, workflow run, release attempt, or image build attempt
is invalid, the digest does not match, or GHCR cannot serve the public image.

## Rollback and cost controls

If a deployment fails, stop before promoting the Vercel candidate. Restore the
previous known good Azure Container Apps revision and Vercel deployment using
their deployment history. Keep successful additive database migrations in
place. Repair forward with a compatible migration; do not run destructive
rollback SQL while an older application version may still serve traffic.

Review Neon storage, compute and restore limits; Upstash staging command and
bandwidth totals; R2 storage and operation totals; Azure compute, request and
log ingestion; and pooled Vercel usage. Free-tier ceilings may change. Recheck
current provider consoles before a launch or when a limit alert fires.
