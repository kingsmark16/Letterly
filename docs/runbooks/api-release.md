# API release runbook

Use this sequence for controlled staging and production releases. Apply database
migrations before deploying application code, then route traffic only to API
instances that pass readiness. The production deployment platform is not yet
selected, so these steps define release gates without assuming a particular
hosting provider.

## Before the release

1. Confirm the exact commit, target environment, release owner, and rollback
   version. Verify the database, Redis or Valkey, authentication, and storage
   resources belong to that environment.
2. Create or confirm the approved database restore point. Review the migration
   diff and verify every additive change remains compatible with all active API
   versions and the rollback version.
3. Run the repository CI checks against the release commit. Use a synthetic
   staging account and page for application smoke tests; do not use private
   production content as a fixture.

## Apply migrations and deploy

Run the migration command once from the release commit against the target
environment's `DATABASE_URL`:

```bash
pnpm install --frozen-lockfile
pnpm --filter @letterly/database exec prisma migrate deploy
```

Keep the connection string in the deployment secret store; do not print it or
paste it into release evidence. Stop the rollout if migration deployment
fails. Do not route traffic to the new API version until the migration command
has succeeded.

Deploy the API after the migration gate passes. Configure the hosting platform
to use these unauthenticated endpoints:

| Probe | Endpoint | Meaning |
| --- | --- | --- |
| Liveness | `GET /health` | The API process can answer HTTP requests. It does not contact PostgreSQL or Redis. |
| Readiness | `GET /ready` | The shared PostgreSQL client completes `SELECT 1` and the critical Redis rate-limit client connects and receives exact `PONG` from `PING`. |

Both routes return `Cache-Control: no-store` and a request ID. Readiness checks
run concurrently, have a five-second caller deadline per dependency, and do not
retry. Set the platform's request timeout above five seconds and allow a
startup grace period appropriate for database cold starts. A failed readiness
check returns the same generic HTTP 503 for either dependency. The endpoint
does not report migration status; that remains the pre-deployment release
gate. Startup configuration validation remains a separate gate before the API
listens.

Wait for all new API instances to pass readiness before deploying the web
application. Keep the previous API and web versions available until smoke
checks pass and the rollback window closes.

## Backfill submission journey summaries

The additive `submission_journey_summary` migration leaves existing submission
counts null so old API writers and rollback versions remain compatible. New
writers store a validated journey count. Summary reads retain the previous
snapshot validation for selected legacy rows until this backfill completes.

After older API writers retire, explicitly set `DATABASE_URL` from the intended
environment's secret store and run:

```bash
pnpm --filter api submissions:backfill-counts --confirm
```

Each invocation processes at most 100 live rows and reports only selected and
updated counts. Repeat until `selected` is zero. A concurrent deletion or count
update can reduce `updated`; the next invocation safely resumes. The command
validates snapshots with the shared schema, records zero for missing or invalid
snapshots, skips deleted submissions, and never logs their content. Do not route
these private records through a shared cache. The backfill is optional for
correctness but needed to eliminate legacy snapshot reads from summary queries.
Keep the nullable column during rollback. An old writer can introduce new null
counts, so rerun the backfill after a subsequent upgrade retires those writers.

## Smoke checks

After API deployment, verify from the deployment network:

1. `GET /health` returns HTTP 200 with `{ "status": "ok", "service": "api" }`.
2. `GET /ready` returns HTTP 200 with the same body, and both health responses
   include `Cache-Control: no-store` and `X-Request-ID`.
3. In staging, complete the approved authentication, catalog, published page,
   private media, and submission journeys against synthetic data. Confirm the
   production build uses the intended database and Redis resources before
   promoting it.
4. Confirm API 5xx rates, Redis fail-closed behavior, database connection
   health, and deployment probe status in the operational dashboards. Expected
   dependency-unavailable readiness responses use the generic 503 envelope and
   are not sent to Sentry as application exceptions.

The health probe checks connectivity and the Redis `PING` permission. API tests
cover the atomic rate-limit command; run the approved staging rate-limit smoke
path after Redis ACL changes to verify the deployed command permissions.

## Rollback and migration cleanup

If the new version fails smoke checks, stop promotion and roll application code
back to the recorded compatible version. Keep the successful additive
migration in place; use a forward repair migration for database changes instead
of an ad hoc destructive rollback. If a destructive contraction has already
run, stop and assess schema compatibility before rolling application code
back.

Run destructive contraction only in a later release, after all older API
instances and the rollback window have retired. Preserve the migration-first
order for each subsequent release and record the commit, migration version,
probe results, smoke outcome, and rollback decision without including secrets
or user content.
