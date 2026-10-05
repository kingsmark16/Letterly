# Administration web feature

## Overview

This feature owns the protected administrator report queue, report detail actions, appeal controls, audit history, and their accessible recovery states. Server route entries check access before client consoles hydrate. The API remains the authorization and privacy boundary.

## Key files

| File | Owns |
| --- | --- |
| `../../../app/admin/moderation/reports/page.tsx` | Protected report queue entry and unavailable state |
| `../../../app/admin/moderation/reports/[reportId]/page.tsx` | Protected report detail entry |
| `../../../app/admin/moderation/audit/page.tsx` | Protected audit history entry |
| `admin-report-console.tsx` | URL backed filters, queries, mutations, appeal intake, confirmation snapshots, and focus coordination |
| `admin-confirmation-dialog.tsx` | Confirmation fields, pending controls, keyboard trap, and cancellation callbacks |
| `admin-report-detail.tsx` | Safe report metadata, available actions, appeal controls, and history presentation |
| `moderation-presentation.ts` | Shared moderation presentation types, reason labels, formatters, and filter predicates |
| `admin-audit-console.tsx` | URL backed audit filters and cursor pagination |
| `../../../lib/server-admin-auth.ts` | Server side access probe without exposing private data |
| `api.ts` | Admin query and mutation requests through shared validated browser transport |

## Conventions

- Keep administrator pages dynamic and out of search indexes. Use the server access probe before rendering interactive consoles.
- Keep filters, selected reports, and cursors in URL search parameters so reviews can be resumed and shared safely.
- Use TanStack Query for remote data and invalidate only the affected report, queue, and audit queries after mutations.
- Report, detail, and audit query functions pass their TanStack Query signal to the feature endpoint, which forwards it to Axios. Canceled reads retain cancellation identity through the shared transport.
- Require explicit confirmation for state changing actions and preserve idempotency keys and exact payloads on retry. After mutation completion, restore focus once pending state and the selected detail refresh settle, using the heading if the trigger cannot receive focus. Cancellation restores focus without waiting for a detail refresh.
- Keep remote state and mutation attempts in the report console. Detail and confirmation presentation receive typed props and callbacks through direct imports.
- Use `@repo/ui/button` for standard moderation, filter, retry, and pagination actions, and `@repo/ui/input` for ordinary text fields. Keep custom report selection cards in this feature because their content layout is specific to the queue.
- Let shared Input own its normal, hover, invalid, and focus borders; compose layout classes without repeating `border-border`, which overrides the accessible default boundary.
- Do not render page content or private response text in the administrator console. Show only safe report messages and moderation metadata returned by the API.
- Keep keyboard access, focus trapping, Escape close, status announcements, and responsive layouts at the WCAG AA baseline.

## Related specs

- [Launch hardening and administration](../../../../../docs/specs/0011-launch-hardening-and-administration/index.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
