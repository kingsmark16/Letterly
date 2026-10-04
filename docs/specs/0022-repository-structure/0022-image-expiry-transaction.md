# 0022. Image expiry transaction safety

Date: 2026-10-04

## Summary

Make image expiry use locked, current eligibility and storage keys. Prevent stale selections from queuing attached media or orphaning a newly sanitized output.

## Context

Two deterministic PostgreSQL reproductions exposed stale selection behavior. Sanitization after the first expiry query changed the output key, but cleanup deleted the row and queued only the old source. A draft attachment using a different caller clock cutoff preserved its image row but cleanup still queued its output.

## Requirements

1. Preserve the 50 candidate limit, expiry then ID ordering, unattached and expired predicate, selected key fields, and 30 second transaction limits.
2. Lock candidate Pages before PageImage rows, in ascending ID order at each level. Recheck eligibility within the original candidate IDs and derive cleanup keys only from these current locked records.
3. Skip attached or renewed candidates. If sanitization changes keys before locks are acquired and the image remains eligible, queue its current output before deleting the row. If expiry wins, later completion cannot mark a deleted record ready.
4. Cleanup records and image deletion commit together or roll back together.
5. Verify actual sanitization, draft attachment, retry, expiry winning, rollback, and 75 record backlog behavior in isolated PostgreSQL. Preserve existing unit, Nest composition, transport, build, and repository gates.

## Decision

Use the same ordered parent then media locking sequence as audio expiry. Keep model specific SQL and selections in the image repository. Acquire two bounded sets with parameterized SQL, reselect at most 50 original candidates, then retain the existing cleanup deduplication and conditional deletion inside the same transaction.

The debug reproductions establish defects against existing media lifecycle invariants. The user's autonomous repository audit authorizes the correction. This is a same model source cross check, not an independent review.

## Options considered

The existing conditional delete protects a row that has become attached, but does not protect its storage key because cleanup is queued first. A recheck without row locks still allows keys to change between the recheck and deletion. Image row locks alone would conflict with the Page first order used by draft attachment. Ordered parent and image locks protect both boundaries without a migration or new service.

## Build plan

Reproduce the two stale selection cases, implement the ordered lock and recheck, verify retries and transactional rollback, measure bounded backlog results, then reconcile context and review evidence.

## Consequences

Expiry adds two bounded locking queries and one bounded recheck. Contention can defer cleanup through the existing timeout. No storage provider call occurs while locks are held. This does not establish physical scan cost or production throughput. Sanitization and attachment policies remain at their existing owners.
