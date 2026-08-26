# Neon restore drill — `<UTC-date>` / `<run-id>`

## Status

- Result: `PENDING` | `PASSED` | `BLOCKED`
- Source environment: `staging`
- Restored branch: `<isolated-branch-name>`
- Commit: `<commit-sha>`
- Prisma migration version: `<migration-name-or-version>`
- Fixture: synthetic only (`<fixture-id>`)

## Timing

- Restore point UTC: `<timestamp>`
- Restore started UTC: `<timestamp>`
- Migrations complete UTC: `<timestamp>`
- Smoke checks complete UTC: `<timestamp>`
- RPO: `<minutes>` (target ≤ 5)
- RTO: `<minutes>` (target ≤ 60)

## Smoke results

| Check                       | Result          | Evidence reference          |
| --------------------------- | --------------- | --------------------------- |
| API health                  | `PASS` / `FAIL` | `<redacted-link-or-log-id>` |
| Public synthetic page       | `PASS` / `FAIL` | `<reference>`               |
| Non-admin denied            | `PASS` / `FAIL` | `<reference>`               |
| Admin report projection     | `PASS` / `FAIL` | `<reference>`               |
| Moderation action and audit | `PASS` / `FAIL` | `<reference>`               |
| Stale version conflict      | `PASS` / `FAIL` | `<reference>`               |
| Retention worker metric     | `PASS` / `FAIL` | `<reference>`               |

## Notes and remediation

`<Record only operational facts. Do not include private content or secrets.>`

## Approvals

- API owner: `<name>`, `<UTC timestamp>`, `<approved / blocked>`
- Security or privacy reviewer: `<name>`, `<UTC timestamp>`, `<approved / blocked>`
- Temporary branch removed after approval: `<UTC timestamp>`
