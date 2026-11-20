# Admin analytics activation

Analytics capture is installed by the Prisma migration. It starts counting only after the activation command records the coverage boundary. Current workload and platform totals are available while coverage is absent. Earlier history remains unavailable.

Use Node 24 and the repository package manager. Select the intended database through the operations credential source and set `DATABASE_URL` explicitly. Check that the database will resolve the application schema. The command does not start the API or a scheduler.

Before activating production coverage, use an isolated staging database to rehearse the migration, the activation command, and the overview endpoint under representative signup, publish, and visit concurrency. Record the load, sample size, elapsed time, response timings, lock waits, and release ID in the restricted rollout evidence. Compare the baseline with capture enabled. In PostgreSQL, record activity waiting on the daily counter update through the existing database observability tools. Save time and counts only. Do not include queries with private bindings, browser identifiers, or page content.

When the release owner approves activation, run:

```powershell
pnpm --filter api admin:activate-analytics --confirm
```

The command returns only the original UTC coverage start. It takes the User, Page, and PageVisit table locks in that order. Each lock has a ten second timeout. The transaction verifies all three triggers before inserting the one coverage row. A blocked or unsuccessful attempt rolls back and can be retried. A repeat after success returns the existing start.

Record the UTC timestamp and successful result in the release evidence. Open the administrator overview and confirm that current totals still load, dates before coverage are unavailable, and the first day is partial. Run a small authorized staging write through each source and compare its committed change with the matching bucket.

User, Page, and PageVisit writes must use PostgreSQL `READ COMMITTED`. This includes Better Auth and page and visit repositories. The capture trigger rejects a source write from an older fixed snapshot rather than silently omitting it. Public page visits use the database UTC date. A write that crosses UTC midnight between deriving the visit date and capture may fail with a safe retryable response.

Keep the capture triggers and coverage row through rollback. Ordinary data removal does not change aggregate history. If capture was interrupted, stop serving trend history until the gap can be represented under an approved recovery decision. Do not reset coverage or reconstruct prior activity from current records.
