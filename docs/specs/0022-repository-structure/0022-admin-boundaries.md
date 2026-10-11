# 0022. Administration feature boundaries

**Date**: 2026-10-03
**Status**: Complete

## Decision

Separate administration by responsibility using the existing catalog and pages factory pattern. Application owns plain repository ports, safe error classes, access policy, and bootstrap, report, audit, and moderation use cases. Infrastructure owns Prisma implementations, signed cursor encoding, and the existing retention lifecycle worker. Presentation owns controllers, guards, and the explicit bootstrap command. AdminModule remains the composition root.

You authorized automatic progression through the repository review. Preserve the existing administrator role checks, disabled account precedence, trusted origin and CSRF checks, query and action validation, rate limits, request IDs, private cache headers, signed pagination, moderation versions, idempotency, transactions, audit metadata, retention lease and batching, and bootstrap confirmation and secret handling. No new provider, package, launch content, database schema, or live operation is introduced.

Cursor consumers use an application owned interface with filter hashing, encode, and decode operations. Node crypto and signing secret injection remain in the existing infrastructure implementation. Hash inputs, cursor format and validation, and error identity remain unchanged. Access policy reads role and moderation status through a port, returns allowed, disabled, or administrator required, and leaves HTTP envelope mapping to the guard. Repository errors propagate to the existing shared error boundary.

Retention scheduling, configuration reads, metrics, logging, and its repository remain infrastructure responsibilities in this ownership milestone. Its plain repository contract belongs to application. Extraction of a pure retention operation or moderation transition policies may follow when it separates cohesive behavior; this milestone does not relocate transaction dependent invariants outside their lock and write sequence.

## Requirements

- AC-1: Move all existing admin source files and colocated tests to application, infrastructure, or presentation as appropriate. Keep only AdminModule and durable context at the feature root. Split all five existing repository contracts from their Prisma implementations, retaining error and result types at the plain boundary. Update callers and the bootstrap script, remove obsolete flat paths, and preserve historical review inventories.
- AC-2: Bootstrap, reports, audit, moderation, and access services are plain classes. Module factories bind their repository and cursor ports using the existing singleton implementations. Application imports cannot reference Nest, Prisma, database, configuration, provider libraries, infrastructure, or presentation, including type imports. Crypto signing stays behind the cursor port.
- AC-3: Preserve exact persistence and public behavior. Guards query access through the service instead of constructing Prisma queries. Existing moderation and retention adapter tests, cursor tests, and bootstrap tests pass at their new locations. Add focused access policy and cursor consumer tests, including failure paths and filter binding.
- AC-4: Add HTTP integration coverage using the actual AdminModule with fixture authentication and database providers. Verify singleton aliases and factories; allow active administrators, reject missing sessions, creators, missing accounts, and disabled administrators before feature queries; retain private read headers, signed cursor errors, safe not found and conflict envelopes, validation, origin rejection, request IDs, and rate limit failures. Exercise report, audit, and mutation paths without live administrator changes.
- AC-5: Repository lint, formatting, type checks, unit tests, build, and API integration pass. Reconcile context and parent spec pointers, record verification limitations, and commit only this milestone on the authorized branch.

## Input and output sources

All repository inputs and results retain the existing contracts and selected database fields. Access receives authenticated session user ID and reads user role and moderation status. Report and audit filters and page size come from current contract schemas; cursor positions come from repository pagination results, signed with the configured secret or existing Better Auth fallback. Mutation actor ID comes from the authenticated request; request IDs come from request context with the current UUID fallback. Bootstrap user ID, confirmation, and supplied secret remain command arguments, and expected secret remains validated environment configuration.

## Build plan

1. Extract ports and move source and tests with exact import updates.
2. Add cursor and access ports, plain service factories, and enforced application boundaries.
3. Add focused service and real module HTTP integration coverage, then run repository gates.
4. Update durable context and record verified results before committing.

## Verification

All five criteria are implemented. See [administration boundary verification](../../reviews/2026-10-03-admin-boundaries.md) for behavior and composition coverage, repository checks, and limitations. The wider restructuring remains in progress. Version coexistence and retention of published template behavior is the next priority, as requested during this milestone.
