# Safe monitoring infrastructure

## Overview

This area provides the noncritical operational monitoring boundary for Sentry exceptions and allowlisted bounded metrics. It removes request data, identity, content, messages, breadcrumbs, extra fields, and stack contents before provider transmission.

## Key files

| File | Owns |
| --- | --- |
| `monitoring.module.ts` | Global NestJS provider registration |
| `safe-monitoring.ts` | Safe context filtering, Sentry redaction, exception capture, and metric logging |
| `safe-monitoring.spec.ts` | Redaction, field allowlist, route filtering, and bounded metric coverage |

## Conventions

* Monitoring failures never fail a user request or prevent application startup.
* Send only allowlisted operational tags with bounded lengths and values.
* Never send confession content, request bodies, identity, cookies, tokens, credentials, private routes, stack contents, or secrets.
* Accept only route templates that match safe API or health paths and contain no query or fragment.
* Add metric names to the fixed `safeMetricNames` list before recording them.
* Keep Sentry initialization optional through validated configuration.

## Gotchas

Exception values retain only the exception type and safe mechanism fields. A provider outage is intentionally swallowed after safe local logging.

## Related specs

* [Launch hardening and administration](../../../../../docs/specs/0011-launch-hardening-and-administration/index.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
