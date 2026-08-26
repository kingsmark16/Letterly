# Letterly launch-hardening restore drill

This runbook verifies that a Neon point-in-time restore can recover the
moderation state needed for the private beta. It is a staging-only procedure.
Never point a local shell, fixture, or smoke test at the production database or
production R2 prefix.

## Targets and ownership

- Recovery point objective: at most 5 minutes.
- Recovery time objective: at most 60 minutes.
- Run before launch and at least quarterly afterward.
- The API owner runs the drill. A security or privacy reviewer approves the
  evidence before the temporary branch is removed.

Record the UTC restore point, the source environment, the isolated branch name,
the migration version, and the run ID before starting. Use synthetic records
only; never copy production page text, media keys, visitor responses, emails,
tokens, or report messages into the fixture.

## Preconditions

1. Confirm the Neon project has a point-in-time window that includes the target
   restore point and that staging has separate database, R2, OAuth, Redis, and
   monitoring resources.
2. Create an isolated Neon branch from the selected restore point using the
   Neon Console or the approved Neon CLI workflow. Restrict its connection
   string to the drill operator and store it only in the shell environment.
3. Set `DATABASE_URL` to the isolated branch and confirm its hostname and
   database name before running any migration or fixture command.
4. Set `NODE_ENV=staging`, a staging `APP_ORIGIN`, a staging `R2_BUCKET`, and
   staging Better Auth, Redis, and Sentry settings. Do not reuse production
   secrets or prefixes.

## Restore procedure

Run the following from the commit being verified:

```bash
pnpm install --frozen-lockfile
pnpm --filter database exec prisma migrate deploy
pnpm --filter api check-types
pnpm --filter api test:e2e
```

Load a small synthetic fixture containing one creator, one administrator, one
published page, one report, one moderation action, and one appeal. The fixture
must use clearly synthetic values such as `restore-drill-<run-id>` and must not
include real user content. Keep the fixture loader outside the application
runtime and remove the fixture after the smoke checks complete.

Start the API and web applications with the isolated environment. Verify:

1. `GET /health` returns `200` and `{ "status": "ok", "service": "api" }`.
2. The public synthetic page is available and keeps `no-store` and no-index
   headers where applicable.
3. A non-administrator session receives the safe administrator denial response.
4. The administrator can read the synthetic report summary and detail without
   receiving page content, images, visitor responses, credentials, or raw
   network identity.
5. The administrator can perform one synthetic review or dismiss action, and
   the action, version, idempotency replay, and audit event are consistent.
6. A stale moderation version is rejected without changing the synthetic page
   or report.
7. The retention worker can acquire its lease and records a bounded success or
   failure metric. Do not create records old enough for deletion unless the
   purge test is explicitly isolated from the restore smoke fixture.

Capture timestamps immediately before restore, after migrations, and after the
final smoke check. Calculate RPO from the selected restore point and source
write timestamp, and calculate RTO from restore start to the final successful
smoke check.

## Evidence and cleanup

Copy `docs/runbooks/evidence/launch-hardening/template.md` to a new file named
`<UTC-date>-<run-id>.md`. Record only branch names, migration versions,
synthetic identifiers, status codes, timestamps, RPO/RTO measurements, and
links to redacted screenshots or logs. Do not paste database URLs, secrets,
cookies, report text, page content, or visitor responses.

The API owner and security or privacy reviewer must sign the evidence. Only
after both approvals are recorded may the operator delete the temporary Neon
branch and remove the synthetic fixture. If any target fails, keep the branch
for investigation, mark the evidence `blocked`, and open a remediation issue.
