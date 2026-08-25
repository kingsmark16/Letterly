# Administration module

## Overview

This module owns protected administrator bootstrap, access checks, report moderation, page and creator moderation, appeals, and audit history. It is the API boundary for safety actions. It never returns confession content, visitor responses, secrets, raw network identity, or provider credentials.

## Key files

| File | Owns |
| --- | --- |
| `admin.module.ts` | NestJS module composition and provider bindings |
| `admin.controller.ts` | Protected report, moderation, appeal, and audit routes |
| `admin.guard.ts` | Authenticated administrator role checks |
| `admin-origin.guard.ts` | Trusted origin and mutation protection |
| `admin-reports.service.ts` | Report listing, detail, and report state use cases |
| `admin-moderation.service.ts` | Page and creator disable or restore actions |
| `admin-reports.repository.ts` | Safe report projections, version selection, and action history |
| `admin-audit.repository.ts` | Private audit event queries and cursor pagination |
| `admin-bootstrap.ts` | Explicit administrator bootstrap command |

## Conventions

- Keep administrator authorization, trusted origin checks, and mutation validation on the server. Browser guards only improve navigation and recovery states.
- Require expected moderation versions and idempotency keys for state changing actions so retries are safe and stale updates are rejected.
- Keep report and audit responses private and uncached. Do not add content, response text, secrets, or raw identity fields to administrator projections or audit metadata.
- Preserve stable error envelopes and request IDs for authorization, rate limit, unavailable, and conflict outcomes.
- Keep page and creator moderation changes transactional with their audit records, and expose only the safe moderation status and version needed by the console.

## Related specs

- [Launch hardening and administration](../../../../../docs/specs/0011-launch-hardening-and-administration/index.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
