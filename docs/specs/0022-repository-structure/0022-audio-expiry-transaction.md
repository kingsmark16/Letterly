# 0022. Audio expiry transaction safety

Date: 2026-10-04

## Summary

Prevent cleanup from expiring or queuing a source that completed verification or renewed its lease after the first expiry query.

## Context

A deterministic PostgreSQL reproduction paused expiry after selection, committed audio verification, then resumed expiry. The audio changed from READY to EXPIRED. Expiry used IDs from a stale selection without coordinating with the Page lock held by completion and renewal.

## Requirements

1. Retain the 50 candidate limit, existing eligibility, deterministic ordering, and 30 second transaction limits.
2. Lock candidate Pages before PageAudio rows, both in ID order. Recheck eligibility within the original candidate IDs after acquiring locks. Queue only source keys from the eligible locked rows.
3. Completed or renewed audio remains usable and is not queued. If expiry commits first, later completion cannot attach the expired record.
4. State changes and durable cleanup records commit together. A cleanup write failure rolls back expiry.
5. Real isolated PostgreSQL tests prove completion and renewal interleavings, expiry winning, rollback, and a 75 record backlog draining in batches of 50 and 25. Existing API unit, composition, build, and repository gates pass.

## Decision

Reuse the existing Page before audio lock order. Acquire each bounded set with one parameterized SQL query, in ascending ID order, then reselect eligible audio from those candidate IDs. Keep all locks, state writes, and cleanup records in the same Prisma transaction. No new provider, public API, schema, or scheduling rule is needed.

The debug reproduction proves an implementation defect against the existing atomic attachment and cleanup rules. The user's autonomous repository audit authorizes this correction. This is a same model source cross check, not an independent review.

## Options considered

An eligibility recheck without shared locking still allows completion to read VERIFYING before expiry, then attach a source after cleanup queues it. Locking audio before Page would oppose the existing completion order. Serializing through Page first and then locking audio follows the current mutation convention and protects the rechecked values.

## Build plan

Reproduce with paused Prisma queries against disposable PostgreSQL, implement ordered locks and the recheck, verify both winners and transaction rollback, then reconcile cleanup evidence and context.

## Consequences

Expiry adds bounded lock acquisition and one bounded recheck query. Contention can defer cleanup through the existing transaction timeout and later scheduler runs. This proves concurrency correctness for the tested interleavings, not production throughput or physical scan cost. Image expiry remains a separate sibling audit.
