# 0022. Catalog SQL bounds

Date: 2026-10-04

## Summary

Move catalog relation limits into PostgreSQL and seek directly through the existing cursor ordering indexes. Preserve the application and HTTP contracts.

## Context

The actual SQL baseline in commit 6b37a5b shows overview fetching all 602 families, current version queries fetching all active history, and deep cursors filtering earlier rows. Nested Prisma `take` protects returned shapes but does not impose these relation bounds in the captured SQL.

## Requirements

1. Overview returns every active category, including empty categories, in display order and ID order. Each category reads at most the requested preview count of eligible active families, each with one highest active version.
2. Collection reads apply category, case insensitive search, and active category/family/version filters before a size plus one limit. Cursor comparisons use the `(displayOrder, id)` tuple, with ascending after and descending before ordering. A removed cursor anchor remains usable.
3. Focused lookup preserves the two family ambiguity bound, optional category and exact version filtering, and null selected version when no active version matches. Legacy category and template reads remain compatible.
4. PostgreSQL specific SQL stays in catalog infrastructure. Query text contains only trusted source fragments. Every external value uses positional parameters with explicit UUID and integer casts. Preserve safe response validation and error mapping in the existing application and presentation owners.
5. Verify actual PostgreSQL plans against the previous 24 category, 600 family, 1,800 version fixture. Prove physical per category and per version limits and tuple index conditions. Cover empty and inactive records, exact lookup, removed anchors, ordering ties, and adversarial search values. API units, module HTTP tests, type, lint, formatting, and build gates pass.

## Decision

Use parameterized PostgreSQL LATERAL subqueries in the existing injected Prisma repository. The overview aggregates bounded per category family rows in one query. Collection and lookup queries select plain port records with JSON category/version objects. A small model specific SQL file owns fixed columns, bounded version reads, and the two query builders. Values are never interpolated into SQL text. `$queryRawUnsafe` is used only with trusted statement fragments and separately supplied positional arguments, the parameterized form documented by Prisma.

The parent autonomous repository instruction authorizes the engineering correction. This is a same model design cross check. No new provider, dependency, public contract, source template, index, or migration is introduced.

## Options considered

Keeping nested Prisma takes contradicts the measured bounds. Loading and trimming all rows preserves response shape but scales with catalog and version history. Enabling a preview Prisma relation strategy would add a dependency configuration decision across unrelated repositories. Model specific SQL applies the required limits explicitly with the existing schema and client.

## Build plan

Implement overview and latest version LATERAL limits, parameterized filtered collection and lookup reads, then replace obsolete Prisma argument fixtures with SQL value separation and behavioral checks. Remeasure physical plans and reconcile evidence and context.

## Consequences

Catalog read SQL is coupled to the existing PostgreSQL column names, so schema changes must update its tests. Search remains substring matching without a specialized text index. Inactive or versionless families can still require scanning candidates to find eligible rows. This correction bounds returned relation rows and removes prior tuple filtering; it does not claim constant cost for all filters or production capacity.

## References

[PostgreSQL LATERAL subqueries](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-LATERAL) describes correlated reads and retaining empty parents. [Prisma parameterized raw queries](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/raw-queries#parameterized-queries) documents value binding and PostgreSQL casts.
