# Administration web feature

## Overview

This feature owns the protected administrator report queue, report detail actions, appeal controls, audit history, and their accessible recovery states. Server route entries check access before client consoles hydrate. The API remains the authorization and privacy boundary.

## Key files

| File | Owns |
| --- | --- |
| `../../app/admin/layout.tsx` | Server access probe, `[data-admin-root]` theme scope, and `AdminShell` boundary |
| `../../app/admin/overview/page.tsx` | Protected platform overview entry |
| `../../app/admin/creators/page.tsx` and `[creatorId]/page.tsx` | Protected creator directory, POST search, and safe detail entries |
| `../../app/admin/pages/page.tsx` and `[pageId]/page.tsx` | Protected page directory, search, and safe detail entries |
| `../../app/admin/moderation/appeals/page.tsx` and `[appealId]/page.tsx` | Protected appeal inbox, support intake, and detail entries |
| `../../app/admin/deletions/page.tsx` and `[jobId]/page.tsx` | Protected deletion progress queue and detail entries |
| `../../app/admin/moderation/reports/page.tsx` | Protected report queue entry and unavailable state |
| `../../app/admin/moderation/reports/[reportId]/page.tsx` | Protected report detail entry |
| `../../app/admin/moderation/audit/page.tsx` | Protected audit history entry |
| `admin-shell.tsx` | Graphite sidebar, mobile sheet portal, query client cache clearing on access loss |
| `admin-directory.tsx` | Bounded URL filtered directories, in memory POST identity search, and responsive table/list rendering |
| `admin-creator-console.tsx` and `admin-operation-detail.tsx` | Safe creator, page, and appeal detail screens with retained deletion lookups |
| `admin-action-panel.tsx` and `admin-appeal-intake.tsx` | Confirmed disable/restore, appeal decision, and appeal intake mutations with frozen retry snapshots |
| `admin-page-deletion.tsx` and `admin-deletions-console.tsx` | Typed permanent deletion confirmation, 5 second visible polling, child job listing, and confirmed retry |
| `admin-overview-console.tsx` and `admin-overview-chart.tsx` | 60 second visible overview refresh, lazy loaded normalized Recharts lines, and exact `BigInt` daily tables |
| `operations-api.ts` and `deletions-api.ts` | Validated directory, search, deletion preview/accept, progress, and retry transport helpers |
| `admin-report-console.tsx` | URL backed filters, queries, mutations, appeal intake, confirmation snapshots, and focus coordination |
| `admin-confirmation-dialog.tsx` | Confirmation fields, pending controls, keyboard trap, and cancellation callbacks |
| `admin-report-detail.tsx` | Safe report metadata, available actions, appeal controls, and history presentation |
| `moderation-presentation.ts` | Shared moderation presentation types, reason labels, formatters, and filter predicates |
| `admin-audit-console.tsx` | URL backed audit filters and cursor pagination |
| `../../../lib/server-admin-auth.ts` | Server side access probe without exposing private data |
| `api.ts` | Admin query and mutation requests through shared validated browser transport |

## Conventions

- The admin operations console spec at `docs/specs/_root/0001-admin-operations-console/` replaces the creator visual system for admin routes. `admin-theme.module.css` owns scoped light tokens and the graphite shell. Apply the same theme marker to portaled content. Shared primitive defaults and public or creator styles remain unchanged.
- The implementation uses ui-styling, ui-ux-pro-max, antislop with its UI, human, and mobile guidance, and vercel-react-best-practices. Creator management alone may display the approved name and email projection. Keep it out of report/audit records, URL searches, logs, and persistent storage.

- Keep administrator pages dynamic and out of search indexes. Use the server access probe before rendering interactive consoles.
- Keep filters, selected reports, and cursors in URL search parameters so reviews can be resumed and shared safely.
- Use TanStack Query for remote data and invalidate only the affected report, queue, and audit queries after mutations.
- Report, detail, and audit query functions pass their TanStack Query signal to the feature endpoint, which forwards it to Axios. Canceled reads retain cancellation identity through the shared transport.
- Require explicit confirmation for state changing actions and preserve idempotency keys and exact payloads on retry. After mutation completion, restore focus once pending state and the selected detail refresh settle, using the heading if the trigger cannot receive focus. Cancellation restores focus without waiting for a detail refresh.
- Keep confirmation dialogs within the viewport height and let the dialog panel scroll internally, so every action stays reachable on short screens.
- Keep remote state and mutation attempts in the report console. Detail and confirmation presentation receive typed props and callbacks through direct imports.
- Use `@repo/ui/button` for standard moderation, filter, retry, and pagination actions, and `@repo/ui/input` for ordinary text fields. Keep custom report selection cards in this feature because their content layout is specific to the queue.
- Let shared Input own its normal, hover, invalid, and focus borders; compose layout classes without repeating `border-border`, which overrides the accessible default boundary.
- Do not render page content or private response text in the administrator console. Show only safe report messages and moderation metadata returned by the API.
- Keep keyboard access, focus trapping, Escape close, status announcements, and responsive layouts at the WCAG AA baseline.

## Related specs

- [Admin operations console](../../../../../docs/specs/_root/0001-admin-operations-console/index.md)
- [Launch hardening and administration](../../../../../docs/specs/0011-launch-hardening-and-administration/index.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
