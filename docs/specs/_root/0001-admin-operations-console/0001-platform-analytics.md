# Platform analytics

## Summary

Show moderation workload, current platform totals, and trustworthy activity trends. Daily history begins at rollout and survives deletion without retaining names, content, or visitor identifiers. Distinguish page views from daily page visits.

## Requirements

Implements parent AC-7 through AC-11. Periods are 7, 30, and 90 UTC calendar days, including today. Today and the first coverage day can be partial and must be labeled.

## Decision

Use PostgreSQL transactional daily counters rather than rebuilding history from surviving entities or adding an analytics provider. Capture successful events using database triggers so Better Auth signup, page changes, and visit writes share their commit boundary with the count. Application services must not also increment those counters. (basis: confirmed aggregate model, existing Prisma/PostgreSQL persistence, atomic database transactions.)

## Feature design

### Data and event sources

`DailyAdminMetrics` has a UTC date primary key and required nonnegative BigInt fields defaulting to zero: creatorSignups, pagesCreated, publishActions, pageViews, dailyPageVisits. Add a check for nonnegative values. `AnalyticsCoverage` has one fixed primary key `platform` and required startedAt UTC timestamp. No entity foreign keys, identity fields, content, browser hashes, or IP fields are allowed in either record. Retain these numeric daily aggregates indefinitely; this does not extend retention for underlying personal records.

| Metric | Successful source event | Bucket and increment |
| --- | --- | --- |
| Creator signups | Insert User initially in role CREATOR | Database event UTC day, +1 |
| Pages created | Insert Page | Database event UTC day, +1 |
| Publish actions | Page status changes from any other state into PUBLISHED | Database event UTC day, +1 |
| Total page views | Insert PageVisit, or increase its viewCount | Insert contributes viewCount; update contributes positive difference, bucket PageVisit.visitedOn |
| Daily page visits | First PageVisit insert for its existing unique page/browser/day key | PageVisit.visitedOn, +1 |

Triggers run only when coverage exists and the successful event is at or after startedAt. Insert/update guards preserve existing unique and idempotent event behavior. A repeated same state publish or rolled back transaction contributes nothing. Deletion does not decrement aggregates. A User later promoted to ADMIN remains part of its original signup count. Current creator totals, in contrast, exclude current ADMIN accounts. Never label any of these measures unique people.

Use database UTC time explicitly for event days. For PageVisit, assert the existing UTC day contract and reject unsupported backdated ingestion before coverage. Counts use atomic `INSERT ... ON CONFLICT ... DO UPDATE` increments in the same transaction. Install all triggers before inserting the coverage row in one controlled transaction. A missing coverage row returns `coverageStartedAt: null` and no trend data, not fictional zeros. The first coverage day is labeled partial even if historical records exist for it. A visit row created before activation and updated later contributes postactivation views but no new daily visit; that limitation is confined to the labeled partial first day.

### Activation boundary and event clock

Activation is a controlled database operation, not an ordinary startup hook. Source tables are the mapped User table, Page, and PageVisit. After installing the capture functions, begin one activation transaction and acquire SHARE ROW EXCLUSIVE table locks on those three tables in that fixed order. This drains previous source writers and holds new writes until activation commits. Use a ten second lock timeout; on timeout or deadlock, roll back the entire activation, leave coverage absent, and retry the operation after writers drain. Never partially activate one metric. The command is idempotent when the fixed coverage row already exists and must not move its start date.

Only after all source locks are held, set startedAt from PostgreSQL `clock_timestamp()` and insert the coverage row, then commit and release the writers. All capture functions use `clock_timestamp()` at trigger execution, not transaction_timestamp(), now(), or an application clock. Derive event UTC dates from that captured value; PageVisit still supplies its authoritative visitedOn bucket. Source writes preceding the barrier commit before activation and are outside coverage. Writes released after it see coverage and count even if their transaction began earlier.

Capture functions are VOLATILE and read coverage at execution. Source write transactions use READ COMMITTED; capture must reject a source mutation under REPEATABLE READ or SERIALIZABLE once these triggers are installed, with a safe database error mapped by its owning adapter. This prevents an old transaction snapshot from silently omitting the new coverage row. Document the isolation requirement for Better Auth and the page/visit repositories. Do not change isolation globally as a workaround. Test a source transaction begun before activation, both with a write already made and with its first write delayed until afterward. A successful preactivation source write is drained before the barrier; a postactivation statement either counts or fails explicitly, never commits uncounted.

The activation command and migration must not hold daily counter locks before acquiring source locks. Record its start timestamp and success safely in the release evidence. A failed attempt serves workload/current totals with null coverage, not partial chart history.

### Overview endpoint

GET `/api/v1/admin/overview?period=7|30|90` requires current administrator access, uses the read limit, and returns private 200 data or safe 503 `ANALYTICS_UNAVAILABLE`. Default period is 30. Return database generated `asOf`, `periodStart`, `periodEndExclusive`, coverageStartedAt, and ordered daily buckets. Bucket boundaries are UTC midnight; end is midnight after today. A bucket before coverage has `available:false` and null metrics; after coverage, an absent aggregate row means real zeros. Mark current and first coverage bucket `partial:true`.

Response also contains workload and current totals, independently of trend coverage. Workload counts are PageReport.status OPEN, Appeal.status REQUESTED, and DeletionJob.state other than COMPLETED, with a separate NEEDS_ATTENTION count. Current creators count role CREATOR rows without a deletion barrier, split by moderationStatus. Current pages count rows without their own or their creator's deletion barrier, split by publication status and moderationStatus. Include disabled records in the appropriate disabled totals, not in active totals. Names and emails are never selected. These are current totals rather than historical signup/publishing counts.

Return daily BigInt values as decimal strings validated by contracts, not lossy JSON numbers. UI formats integers without leading zeros; abbreviations have an accessible exact value. Sum strings through BigInt for totals; chart geometry uses finite normalized numbers with exact textual values retained. Avoid percentage growth until a separate comparison period is defined. Do not imply that trends show unavailable prior history.

### Presentation and operation

Overview order is work needing attention, current totals, then trends for signups, creation/publishing, and views/visits. Use labeled lines or bars with legends, UTC date labels, exact tooltips, and accessible data tables. Scope charts to admin and lazy load their heavy client implementation. Use the existing installed chart library through a feature owned adapter, not the creator editor's component. Do not fetch visitor identity or response bodies to build a chart.

Query workload/totals through database aggregate queries and the indexed daily date range. Do not fetch entity arrays into Node to count them. Refresh overview every 60 seconds while visible, pause when hidden, show asOf, and retain data only in the administrator's memory. No shared response cache or persisted client cache. A workload subquery failure returns a safe unavailable response rather than mixing unknown counts with zeros. Daily counters add one hot row per day; record update contention and query timing in staging before enabling coverage. No new Redis counter or provider is introduced.

## Build plan

1. Add aggregate/coverage schema and trigger migrations, prove event capture with committed and rolled back database operations, parent AC-8, AC-9, AC-11.
2. Implement overview API with real workload and current totals, range and coverage behavior, and validated decimal count contracts, parent AC-7 through AC-9.
3. Complete charts, UTC period state, partial coverage labels, accessible alternatives, and visible refresh, parent AC-7, AC-8, AC-10, AC-11.

## Critical test scenarios

1. User/page creation, publish/republish, repeated publish, repeat visit increments, concurrent first visits, and rollback produce exact counts, AC-7 and AC-8.
2. Delete a creator/page and verify current totals fall while aggregate history stays intact. Neither aggregate schema contains identifiers, AC-8 and AC-9.
3. Test activation midday, missing coverage, days before coverage, UTC midnight, empty valid days, all period options, and counts above JavaScript safe integer range, AC-7 and AC-8.
4. Browser proves period changes, partial labels, exact chart alternatives, hidden tab pause, safe failures, and desktop/mobile accessibility, AC-7, AC-10, AC-11.
5. Race activation against open signup, page create/publish, and visit transactions, including a transaction begun earlier and a rejected old snapshot isolation level. Assert that each successful write belongs unambiguously before or after coverage and lock timeout leaves coverage absent, AC-8 and AC-11.

## Consequences

Database triggers need migration coverage and explicit operational ownership. A daily hot row can add contention, so its cost must be measured before enabling history. Historic activity before rollout is deliberately unavailable.

## Rationale

Transactional capture avoids a gap between an auth or page commit and an asynchronous analytics hook. Keeping numeric aggregates separate from source rows meets the confirmed deletion and history behavior without retaining visitor identity.
