# Owner image controller verification

**Date**: 2026-10-03
**Branch**: `feat/repository-verification-baseline`
**Type**: Implementing agent verification, no independent review

## Change and request flow

The six owner image endpoints now live in `presentation/owner-page-images.controller.ts`. Their two existing unit cases live beside the controller. PagesModule registers it once, before the generic owner page controller. The old controller loses its owner media dependency; affected positional audio test constructors were updated.

The session guard supplies creator identity. Contract pipes validate page/image UUIDs and upload MIME type, byte size, checksum, and optional replacement UUID. Upload authorization consumes the existing creator image limit before calling PageMediaService. The application service uses repository, storage, processor, and logger ports through the unchanged production factory. Ownership remains a persistence predicate. Responses are validated safe projections or exact buffered WebP bytes.

Owner and public image routes share the original mapper in `presentation/page-media-error.mapper.ts`. Known failures retain their codes and messages; public unexpected failures retain their safe unavailable fallback. The public controller class, application code, storage adapters, processing limits, repository implementation, and database schema are unchanged.

## Evidence

- Exact source comparison against HEAD before this milestone confirms unchanged bodies and decorators for all six image handlers, unchanged mapper body except its export, unchanged public controller class, old owner image handler removal, and one controller registration.
- `pnpm lint` passes across the repository.
- `pnpm check-types` passes across the repository.
- `pnpm test` passes: API 499 tests in 66 suites, web 33, database 6, shared UI 15, 553 total. Two owner unit cases were relocated rather than added.
- `pnpm --filter api test:e2e --runInBand` passes: 327 tests, seven skipped, 19 passing suites and four skipped suites. The new owner image suite contains 51 passing cases.
- `pnpm build` passes. The API was rebuilt; unchanged web/database work used valid Turborepo cache entries.
- `pnpm format:check` passes for maintained source and configuration. The child contract, parent index, and review were formatted explicitly. `git diff --check` passes.

HTTP checks compose the real controller and production factory with fixture authentication and mocked repository/storage ports. They cover every route's guard, missing service/resource behavior, and page UUID validation; image UUID validation on all four image ID routes; replacement forwarding; upload size/type/checksum limits; limiter ordering and retry details; optional limiter; persisted retry metadata; ready completion; safe private list projections; empty deletion response; exact WebP bytes; lifecycle conflict mapping; storage failure redaction; and unexpected persistence failures.

The first test run caught incorrect new test assumptions about a nested error object and a list error cache header. The API uses a flat error envelope and preserves the list's private/no-store header. Those assertions were corrected, with shared contract parsing used for error and upload responses. Typed storage fixtures also needed their required key, content length, and checksum fields. No production behavior was changed to satisfy these tests.

## Limits and follow-up

This is a structural change verified by the implementing agent. No fresh model review, browser journey, live R2 upload, live authenticated provider, or database ownership transaction was exercised. Seven database tests remain skipped. Fixture ownership forwarding is not proof of live cross creator isolation. Existing repository and service tests retain their coverage.

The broad controller still contains owner audio and anonymous public endpoints. Existing mutation cache header consistency, assumed draft decisions, compatibility types, future template scaffolding, and a visible no JavaScript fallback remain parent work. Product scope completion statuses are unchanged. The parent structure migration remains In Progress.

Next: extract owner audio upload/link/metadata/complete/retry/delete/read endpoints and keep their stream/range helpers and shared public error policy cohesive. Preserve optional providers, feature flags, upload limits, link status codes, safe projections, range headers, and stream failure handling.
