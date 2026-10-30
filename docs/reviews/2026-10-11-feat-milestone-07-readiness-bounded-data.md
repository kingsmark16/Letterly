# Review, feat/milestone-07-readiness-bounded-data, 2026-10-11

**Reviewed by**: GPT-5.6 Terra, author on GPT-6
**Scope**: 162 files from merge base `bc8a9f38ecde0634ddc734a6d1a99d07e25c2a56` to `origin/feat/milestone-07-readiness-bounded-data` at `6a2045050a63b24fe2f5dd597fbd75133726376e`. The merge base is an ancestor of `origin/staging` at `0f49ec11f7447dbb17fd17bf583f024fa3ad7024`, so this comparison isolates the milestone 7 increment despite the branch's stale staging ancestry.
**Verdict**: Approve
**Scope status**: `Review it` is already ticked in `docs/scope/scope.md`.

## Summary

The milestone adds a process only health endpoint and a dependency readiness endpoint. Readiness reuses the injected Prisma and Redis rate limit clients, keeps one in flight probe per dependency, returns a generic expected 503 for expected dependency failures, and leaves unexpected failures observable. The documented migration first release order keeps schema compatibility outside the runtime probe.

The OpenAPI work uses the same Zod contracts as the HTTP boundaries, excludes Better Auth routes, limits the documentation routes to nonproduction environments, and generates a deterministic artifact. Media expiry now locks Page rows before media rows, rechecks eligibility while locked, and writes cleanup records in the same transaction as the state change. Catalog SQL applies limits in PostgreSQL, uses bound values for external inputs, and preserves the existing public contracts.

## Findings

Blockers: 0.

Major: 0.

Minor: 0.

Nits: 0.

## Strengths

1. The readiness design keeps liveness separate from dependency readiness and preserves the established safe HTTP error envelope.
2. The media cleanup changes handle the stale selection races that could otherwise expire completed audio, delete a newly attached image, or queue an obsolete storage key.
3. The catalog queries bound overview previews, active versions, and page size in PostgreSQL while preserving tuple cursor ordering and parameter binding.
4. The OpenAPI document covers Letterly owned routes with shared Zod metadata and keeps provider managed Better Auth endpoints out of the generated contract.

## Test evidence and limits

The diff includes focused Jest and Supertest coverage for readiness success, dependency failures, privacy, draining, and OpenAPI output. It also includes isolated database test files for media expiry interleavings and catalog and submission growth behavior, guarded by explicit real database environment flags. I reviewed those tests and the surrounding source, but did not run repository checks or database fixtures during this independent source review. The generated SQL plan evidence is scoped to the disposable fixture database, so it does not certify production capacity.
