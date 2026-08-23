# 0011. Operational readiness

## Summary

Operational readiness makes moderation safe to run in production. Sentry receives only redacted events, a claimed daily task handles retention, and Neon point in time restore is verified in an isolated staging branch. Policy and review evidence are part of the launch gate.

## Requirements

1. Sentry and structured logs use an allowlist that excludes private content, raw identity, credentials, cookies, and tokens.
2. Monitoring failure does not fail user requests.
3. Retention tasks use bounded claims, transactions, retries, and safe failure metrics.
4. Reports, moderation actions, appeals, and audit events have a 730 day retention target. Idempotency records expire after 24 hours.
5. Retention claims use `FOR UPDATE SKIP LOCKED`, a 15 minute claim expiry, a five minute scheduler lease, a maximum batch of 100, and failure codes `DB_TIMEOUT`, `SERIALIZATION_RETRY_EXHAUSTED`, `CONSTRAINT_CONFLICT`, or `UNKNOWN`. A failed batch rolls back as one transaction.
6. The restore runbook and quarterly staging drill prove migrations, health, public availability, reports, and moderation state. The target is RPO at most 5 minutes and RTO at most 60 minutes.
7. Security, accessibility, privacy, acceptable use, copyright, and child safety review are recorded before public launch.

## Decision

Reuse the existing NestJS lifecycle scheduler with a daily interval, a five minute `JobLease`, and database retention claims. Delete reports, moderation actions, appeals, audit events, and expired idempotency records only after a claimed batch is ready; any failure rolls back the full batch and is retried by the next run. Use Sentry as the external error monitor with 100 percent error sampling, 10 percent trace sampling, and redaction before transport. Use Neon point in time restore and isolated branches rather than adding an external backup service. Store operational values in validated environment configuration and deployment secret storage. Liveness checks only the process. Readiness checks the database, Redis, configuration, and migration version, but never Sentry.

Sentry and metrics use only route, operation, outcome, stable error code, provider, release, and environment. Browser events remove URLs, query strings, hashes, form values, DOM text, breadcrumbs, user identity, slugs, and report identifiers. Metrics are `admin_request_total`, `admin_mutation_total`, `public_report_total`, `moderation_purge_total`, `moderation_purge_age_seconds`, and `restore_drill_total`. Alerts cover API 5xx above 1 percent for five minutes, any protected write denied because Redis is unavailable, two consecutive purge failures, purge age above 48 hours, and a missed quarterly restore drill.

The restore fixture uses synthetic users, pages, reports, actions, and an appeal. Evidence is written to `docs/runbooks/evidence/launch-hardening/<UTC-date>-<run-id>.md` with the restored Neon branch name, migration version, smoke results, timestamps, RPO and RTO measurements, and approvals from the API owner and security or privacy reviewer. The temporary branch is deleted after approval and the evidence keeps no production content.

## Build plan

1. Add configuration validation, Sentry redaction, metrics, and allowlisted logs. Satisfies **AC-17** and **AC-19** of the umbrella.
2. Add retention claims, bounded purge, retry behavior, and alerts. Satisfies **AC-10**, **AC-16**, and **AC-17**.
3. Write the restore runbook, automate the isolated staging drill, and record launch review evidence. Satisfies **AC-18**, **AC-19**, and **AC-20**.

## Rationale

The existing application already has a lifecycle cleanup pattern and shared configuration package. Reusing those patterns keeps the private beta inexpensive and understandable, while Neon restore branches provide evidence that backups can actually recover the new moderation state.
