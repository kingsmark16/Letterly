# 0022. Bounded media cleanup

**Date**: 2026-10-04

## Summary

Bound each cleanup run regardless of the number of abandoned uploads. Retain the current schedule, expiry conditions, transactional cleanup records, leases, and safe failure codes.

## Context

Image and audio expiry currently read every eligible upload in one transaction. Cleanup task claims already have a limit of 50, but the service starts all claimed storage deletions at once. Scheduled and immediate calls can overlap on the same singleton service. These gaps contradict the parent requirement to demonstrate bounded media work before catalog growth.

## Requirements

- AC-1: Each image expiry transaction reads at most 50 eligible rows, ordered by expiry then ID. Each audio expiry transaction reads at most 50 eligible rows, ordered by creation time then ID. Preserve the existing eligibility predicates, selected columns, cleanup writes, state changes, and 30 second transaction bounds. Leave excess eligible rows for a later run.
- AC-2: Claim at most 50 cleanup tasks per run in groups of at most four, with the existing worker identity and five minute lease. Claim each group immediately before processing it; extend later group leases by the monotonic elapsed run time so waiting tasks are not leased upfront. Use the initial run timestamp for the eligibility and retry snapshot. Keep image expiry before optional audio expiry before task claims. Share the batch limit through a plain application policy constant.
- AC-3: Run at most four storage deletions concurrently per API instance. Complete the current group before starting another. Preserve success and safe failure recording. If retry recording fails, wait for all operations in that active group to settle before rejecting the run.
- AC-4: Concurrent calls on the same service share one active run. Release the active run after success or failure so a later invocation can retry. The first caller supplies the run timestamp. Keep the 15 minute interval, optional immediate cleanup, optional audio adapter, and existing cross instance task lease behavior.
- AC-5: Tests prove query limits and deterministic ordering, transaction preservation, 50 task processing with maximum concurrency four, overlap coalescing, failure settlement, and recovery. Record quantitative fixture evidence and distinguish it from physical PostgreSQL plans or production throughput. API unit, composition, build, lint, formatting, and type gates pass.

## Options considered

1. Keep unbounded expiry reads and rely on the transaction timeout. This caps duration but does not cap returned rows, memory, or the number of cleanup writes.
2. Reuse the existing 50 item batch with four deletion slots and one active run. This bounds application work without a new queue, provider, configuration, or database migration.
3. Introduce a separate worker deployment and a new queue. This adds operational machinery outside the current repository objective.

## Decision

Use option 2. Export the batch and concurrency policy from `application/media-cleanup.ts`. Infrastructure repositories apply the batch bound to their existing expiry queries. The plain service coalesces overlapping invocations and claims and processes settled groups of four, up to 50 tasks in total. Later groups receive leases adjusted by monotonic elapsed time. Database expiry transactions and task leases remain at their current owners.

Implementation skills: `nestjs-best-practices`, rules `perf-optimize-database`, `db-use-transactions`, and `arch-use-repository-pattern`; `develop` for the approved application and infrastructure boundaries.

This enhancement replaces only the earlier cleanup scheduling slice's requirement to preserve unbounded task concurrency and its absence of an overlap policy. The scheduler's ownership and timing decision remains in force. Automatic implementation of the parent repository objective authorizes these engineering choices; no product capability or launch record changes.

## Rationale

The existing task batch is a suitable shared upper bound. Four concurrent deletes avoid a burst of 50 provider operations while still allowing independent cleanup work. Waiting for the active group to settle prevents a failed retry write from releasing the overlap guard while another deletion is still active. Pending uploads are already inaccessible after their expiry condition, so deferring their database cleanup does not extend access to content.

## Migration plan

Strategy: deploy application code only. Add bounds to the existing queries and service without changing interfaces or stored data.

Phases: record the decision, implement the bounded path, verify query and concurrency behavior through the existing adapters and Nest factory, then reconcile operational context.

Rollback: revert the application milestone. Existing records, cleanup leases, and historical database migrations remain compatible.

Risks: a large backlog now spans more runs. One instance still claims at most 50 object deletions per scheduled interval; batch bounds do not establish production capacity. Existing expiry indexes are unchanged. PostgreSQL scan cost and query plans require an isolated database before stronger performance claims. The timestamp of a coalesced later call is ignored until its next independent run.

## Build plan

1. Add shared policy constants, bounded repository selections, and the service overlap and concurrency rules (AC-1 through AC-4).
2. Extend existing unit and Nest composition coverage, record operation counts and concurrency, and run API and repository gates (AC-5).
3. Reconcile the earlier scheduling spec and durable context from verified behavior (AC-4 and AC-5).

## Consequences

Application memory and provider concurrency stay bounded as expired uploads grow. Cleanup remains eventual and uses the existing durable task queue. This work does not claim bounded physical database scan cost, change multi instance task leases, or prove production throughput.

The subsequent [audio expiry transaction correction](0022-audio-expiry-transaction.md) adds ordered locks and an eligibility recheck before state and cleanup writes. It supersedes the instruction to preserve the original query sequence while retaining the batch, predicates, transaction limits, and scheduling policy.
