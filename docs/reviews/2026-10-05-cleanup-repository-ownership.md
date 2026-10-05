# Cleanup repository ownership, 2026-10-05

The cleanup worker now consumes a focused `MediaCleanupRepository` port for queue claims and outcomes. `PrismaMediaCleanupRepository` implements it using the existing injected Prisma client. Image operations no longer expose queue methods, and the worker depends only on the image expiration operation. This resolves the first minor finding from [the large owner review](2026-10-05-large-owner-cohesion-luna.md) under the parent 0022 inward dependency and responsibility standard.

Image expiration, Page lock ownership, image updates, and enqueueing storage keys remain together in their original transactions. Audio expiration remains optional and retains its ordering. The new adapter owns unchanged task claim predicates, optimistic lease acquisition, owner guarded success/failure updates, exponential backoff, and review status after five attempts. `media-cleanup-persistence.ts` owns the unchanged 30 second transaction deadline shared by image expiration and cleanup outcome writes. There is no new schema, client, pool, queue provider, or deployment.

## Preservation and tests

[The TypeScript comparison](2026-10-05-cleanup-repository-preservation.json) confirms all three moved queue methods and all ten retained image methods are identical after CRLF/LF normalization. The first retained comparison detected raw SQL line ending differences; normalization changes only line endings before parsing. The queue task type and method signatures move to the focused port. The Nest factory requires its dedicated token and binds the adapter through `useExisting`, preserving the existing worker service token and optional audio input.

The existing queue claim test moves to its adapter owner. Five additional cases cover a lost lease claim, owner guarded successful deletion, stale failure handling, first retry timing, and fifth failure review state. Existing worker cases retain batch/concurrency/overlap/failure assertions with only four mock methods. Nest composition uses different image and queue doubles so a wrong binding cannot pass through a combined mock.

- API unit suites: 87 passed, 665 tests passed in 20.429 seconds.
- Cleanup Nest factory and scheduler integration: ten cases passed in 3.182 seconds.
- OpenAPI/full application composition integration: four cases passed in 11.005 seconds, including production modules without provider overrides. This proves lazy application wiring, not healthy live database or storage operations.
- The first `pnpm --filter api test -- --runInBand` invocation passed a literal separator to Jest and found no tests. The corrected `pnpm --filter api exec jest --runInBand` ran the full unit gate above.

The API build passed freshly, including a repeat before commit. Root `pnpm check:commit` passed lint, formatting, and type checks, with fresh API lint/types and six cached tasks in each graph. A followup focused run passed all 12 queue adapter and worker cases in 0.855 seconds, and the ten Nest cleanup composition cases passed again in 3.195 seconds. [GPT-6 Luna approved all 15 task files](2026-10-05-cleanup-repository-ownership-luna.md) with no findings, inspecting the source and tests independently without claiming to rerun the reported gates. Browser tests are not required for this API internal ownership move, which changes no transport contract or web source.

Applicable NestJS skill rules: `di-interface-segregation`, `di-use-interfaces-tokens`, `arch-use-repository-pattern`, and `db-use-transactions`. The stronger project rule keeps all Nest and Prisma code outside the application port and service.
