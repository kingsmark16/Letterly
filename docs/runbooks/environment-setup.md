# Development, staging, and production setup

This runbook turns the approved environment design into provider settings. The
repository contains the workflow and infrastructure templates, but it does not
create cloud resources or store provider credentials. Keep deployment disabled
until the matching environment is complete.

## Environment boundaries

| Environment | Web and API | Data and provider settings |
| --- | --- | --- |
| Development | Local Next.js and NestJS processes | Docker Compose PostgreSQL; optional local Redis; local `.env` files; synthetic developer data. |
| Staging | One Vercel Hobby project and one Azure Container App | A dedicated Neon Free project, a dedicated Upstash Redis database, a separate R2 bucket and token, staging OAuth credentials, controlled email delivery, and staging monitoring. Use synthetic records only. |
| Production | A separate Vercel Hobby project and Azure Container App | A separate Neon project, a separate authenticated TLS Redis database, a separate R2 bucket and token, production OAuth credentials, verified email settings, and production monitoring. No staging credential or dataset is reused. |

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

In the public GitHub repository, create rules for both `staging` and `main`:

1. Require a pull request before merging.
2. Require the successful `quality` check from the `CI` workflow.
3. Require one approving review and dismiss stale approvals when new commits
   are pushed.
4. Require conversation resolution before merging.
5. Block force pushes and branch deletion.
6. Keep `main` protected and have the release owner review the staging to main
   pull request.

GitHub branch rules do not prove that a pull request came from `staging`. The
production workflow therefore compares the exact Git tree on `main` with an
unexpired successful staging image manifest. If the trees differ, the
production workflow stops before the migration. Keep staging and main branch
history intact so this check can find the matching run.

## GitHub environments and settings

Create GitHub Environments named exactly `staging` and `production`.

For `staging`, allow deployment from the `staging` branch. For `production`,
allow deployment from `main`, require a trusted reviewer, and enable prevention
of self review. A second trusted account is required to approve production; a
single maintainer cannot approve their own deployment. Configure environment
protection before turning on production deployment.

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
Keep each project's generated `.vercel.app` hostname and use it as `WEB_URL`.

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

Use one Azure resource group for staging and another for production. Choose a
region where Azure Container Apps Consumption is available. Register the
`Microsoft.App`, `Microsoft.OperationalInsights`,
`Microsoft.ManagedIdentity`, and `Microsoft.KeyVault` resource providers in the
subscription. Create the staging Vercel project first so its stable web origin
is available for the API settings.

The Bicep template creates, per resource group:

- A Container Apps Consumption environment and API app, with external HTTPS
  ingress, zero minimum and two maximum replicas, and `/health` and `/ready`
  probes.
- A Log Analytics workspace with 31 day retention.
- A Standard Key Vault with RBAC, soft delete, and purge protection.
- One runtime managed identity that can read secrets from only this
  environment's vault.
- One GitHub deployment managed identity with a federated credential bound to
  this repository and this GitHub Environment. A custom role scoped to this
  environment's API app grants only Container App read and update actions; it
  omits the secret-list permission and cannot read Key Vault secrets.

To bootstrap staging, first merge the approved code into `staging` while
`DEPLOY_STAGING` is unset. The workflow runs quality and publishes the API
image, but skips deployment. Make the new GHCR package public in its GitHub
package settings, then download the image manifest from that successful
staging run. Copy
[`main.parameters.example.json`](../../infra/azure/main.parameters.example.json)
to a local parameter file, and replace the example repository, vault name,
staging origin, and image digest. On Windows, copy it with
`Copy-Item infra/azure/main.parameters.example.json infra/azure/staging.parameters.json`.
The local parameter file is ignored by Git.

The person doing the Azure bootstrap needs permission to create resources and
custom role definitions, and to create role assignments, in the target
subscription. Register the resource providers and create a separate resource
group for each environment:

```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.ManagedIdentity
az provider register --namespace Microsoft.KeyVault
az group create --name letterly-staging --location eastus
az deployment group create --resource-group letterly-staging --template-file infra/azure/main.bicep --parameters "@infra/azure/staging.parameters.json"
```

Replace `eastus` with a region where Container Apps Consumption is available.
Copy the example parameter file to `production.parameters.json` for production,
then set `environmentName` to `production` and use its separate vault, web
origin, and image digest. The same deployment command applies to that resource
group and parameter file.

Use the equivalent `production` resource group and a separate parameter file
for production. Deploy the template once with `runtimeSecretUris` empty. This
creates the isolated Azure resources and returns the OIDC client ID, tenant ID,
API URL, resource group, Container App name, and Key Vault name. The API will
not become ready until its runtime values have been added to Key Vault and its
secret references have been applied.

Add the API's runtime secret values to the matching Key Vault using the Azure
Portal's secret form. Include the pooled `DATABASE_URL`, Better Auth secret,
Resend API key, authenticated Redis URL, R2 access key and secret, media proxy
secret, page password encryption key, and required administrator secrets.
Include complete OAuth credential pairs, YouTube key, Sentry DSN, or OAuth
relay values only when those integrations are enabled. Secret names should be
lowercase hyphenated versions of the API environment variable names, such as
`database-url`, `redis-url`, and `better-auth-secret`. Use versionless secret
URIs in `runtimeSecretUris`; never place secret values in the parameter file.

Set non-secret API values in `runtimeEnvironment`, including
`RESEND_FROM_EMAIL`, `PUBLIC_SUPPORT_CONTACT_URL`, and any deliberate feature
settings. Staging must use `NODE_ENV=production` and
`SENTRY_ENVIRONMENT=staging`; production uses `production` for both. Bicep
sets `APP_ORIGIN`, `BETTER_AUTH_URL`, and `PORT` for you. Follow
[the API environment example](../../apps/api/.env.example) and validated
configuration when populating the rest.

Deploy Bicep again with the secret URI map filled in. Add the Bicep outputs as
that environment's GitHub variables. Get `AZURE_SUBSCRIPTION_ID` from the
selected subscription with `az account show --query id --output tsv`.
The managed identity and
role assignments use Azure RBAC; allow time for role changes to take effect
before expecting the first readiness check to pass. The Azure login action
uses GitHub OIDC, so no Azure client secret is stored in GitHub.

The `DATABASE_URL_UNPOOLED` GitHub Environment secret is required separately
from the pooled runtime `DATABASE_URL` Key Vault secret. The migration step
fails before connecting if the direct URL is missing.

Repeat the process in a separate production resource group, using the
production Vercel origin, production Key Vault, production database, production
Redis endpoint, and production GitHub Environment. Do not copy staging values
or data. Add production's authenticated `rediss://` URL as its own `REDIS_URL`
Key Vault secret reference before enabling deployment. The API rejects an
insecure production Redis URL at startup, and `/ready` must pass before the
web release proceeds.

Create Azure Cost Management budgets at the subscription or resource-group
level and send alerts to the release owner. Review the shared Azure Container
Apps and Log Analytics allowance monthly. The allowance and budget notifications
do not stop usage or guarantee a zero bill.

If production Redis uses Upstash Pay as You Go, set its database budget in the
Upstash console before adding traffic. Upstash rate limits the database after
the cap is reached, so treat the cap as cost protection with an availability
tradeoff and monitor usage alerts.

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
   still stops unless it has a successful, unexpired staging manifest for the
   exact same Git tree. GitHub Environment approval occurs before migration or
   deployment steps can run.

GitHub artifacts retain the staged image manifest for 30 days. If it expires,
push or merge that exact tree through staging again. Production fails closed if
the manifest is missing, the digest does not match, or GHCR cannot serve the
public image.

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
