# 0022. Submissions service composition boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

* AC-1: PageSubmissionsService has a plain repository constructor and no NestJS imports or decorators. Preserve payload hashing, idempotency result mapping, owner query inputs, deletion confirmation, errors, and exported paths.
* AC-2: PagesModule registers one typed factory under the same class token, requiring PAGE_SUBMISSIONS_REPOSITORY. Preserve the Prisma alias, singleton resolution, and repository/service overrides.
* AC-3: Exercise the production factory through a real Nest container with mocked persistence. Verify the known canonical payload hash, owner scope forwarding and unavailable owner error, deletion confirmation before persistence, required dependency failure, and service overrides. Existing protected HTTP and service unit suites continue to pass.
* AC-4: Extend migrated service lint enforcement. Root lint, formatting, type checks, unit tests, build, and API integration checks pass. Keep the parent migration In Progress.

## Sources and implementation

The existing constructor and repository token supply the dependency. Payload hash inputs remain the existing canonical sorted/trimmed answer and visitor message JSON. Repository result unions remain the source of idempotency and safe failure results. Owner query fields and deletion confirmation remain their existing method inputs. The module factory follows the established composition pattern without a new application wiring file.

No response policy, hashing algorithm, ownership predicate, password guard, transaction, route, schema, provider, or deployment change is part of this slice.
