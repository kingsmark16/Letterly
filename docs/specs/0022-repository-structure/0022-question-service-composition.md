# 0022. Question service composition boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

* AC-1: PageQuestionService has a plain repository constructor and no NestJS imports or decorators. Preserve all errors, result mapping helpers, mutation methods, and public exports.
* AC-2: PagesModule registers one typed factory under the existing PageQuestionService class token. PAGE_QUESTIONS_REPOSITORY remains required and its Prisma alias remains unchanged. Preserve singleton resolution and repository/service overrides.
* AC-3: Test the production factory with the real HTTP controller, mocked repository, and fixture authentication. Verify mutation input identity, success, validation failure, stale version details, response impact details, and unavailable page errors. Test required dependency failure and service overrides in isolated containers.
* AC-4: Extend the migrated service lint boundary without affecting unmigrated services. Root lint, formatting, type checks, unit tests, build, and API integration checks pass. Keep the parent migration In Progress.

## Sources and implementation

The existing constructor and PAGE_QUESTIONS_REPOSITORY alias supply the service dependency. Existing request schemas, authenticated request identity, repository result unions, and controller response/error adapters supply all HTTP values. Keep those sources unchanged. The named module factory follows the established password service composition pattern, with no additional application factory or service locator.

This slice implements the parent specification's inward dependency rule. It does not move ownership queries or transactions, alter question capabilities, change mutation/version semantics, add a category or template, or modify routes, schema, or deployment.
