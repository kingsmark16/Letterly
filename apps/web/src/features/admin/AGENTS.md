# Administration web feature

## Overview

This feature owns the protected administrator report queue, report detail actions, appeal controls, audit history, and their accessible recovery states. Server route entries check access before client consoles hydrate. The API remains the authorization and privacy boundary.

## Key files

| File | Owns |
| --- | --- |
| `../../../app/admin/moderation/reports/page.tsx` | Protected report queue entry and unavailable state |
| `../../../app/admin/moderation/reports/[reportId]/page.tsx` | Protected report detail entry |
| `../../../app/admin/moderation/audit/page.tsx` | Protected audit history entry |
| `admin-report-console.tsx` | URL backed filters, cursor queue, detail, actions, appeals, and confirmation dialog |
| `admin-audit-console.tsx` | URL backed audit filters and cursor pagination |
| `../../../lib/server-admin-auth.ts` | Server side access probe without exposing private data |
| `../../../lib/api-client.ts` | Validated admin query and mutation requests |

## Conventions

- Keep administrator pages dynamic and out of search indexes. Use the server access probe before rendering interactive consoles.
- Keep filters, selected reports, and cursors in URL search parameters so reviews can be resumed and shared safely.
- Use TanStack Query for remote data and invalidate only the affected report, queue, and audit queries after mutations.
- Require explicit confirmation for state changing actions, preserve idempotency keys and exact payloads on retry, and restore focus to the triggering control after dialogs close.
- Do not render page content or private response text in the administrator console. Show only safe report messages and moderation metadata returned by the API.
- Keep keyboard access, focus trapping, Escape close, status announcements, and responsive layouts at the WCAG AA baseline.

## Related specs

- [Launch hardening and administration](../../../../../docs/specs/0011-launch-hardening-and-administration/index.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
