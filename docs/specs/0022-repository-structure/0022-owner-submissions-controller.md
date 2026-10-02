# 0022. Owner response controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Move owner response list/detail/read/delete endpoints into `presentation/owner-page-submissions.controller.ts`, with their cursor schema/helpers and colocated owner unit cases. Preserve paths, guards, UUID/query/body validation, safe projections, timestamp/cursor serialization, status codes, and no-store headers.
- AC-2: Preserve session supplied owner identity, list defaults and bounds, optional service behavior, deletion confirmation defaults/explicit values, both template detail shapes, legacy list behavior without unread count, and existing error mapping. Register the controller once, remove old owner handlers/service input, and adjust affected positional test constructors.
- AC-3: Export the existing mapper once from `presentation/page-submission-error.mapper.ts`. Owner responses, public submissions, and public reports use that shared implementation. Preserve the mapper body, public controller class, application service/factory, and persistence. No new mutation limiter or template dispatch is introduced.
- AC-4: HTTP tests use the real production service factory with fixture sessions and mocked persistence. Cover every owner route, both template detail shapes, cursor round trip/rejection, query bounds, guards, missing ownership/services, confirmation before deletion, malformed inputs, private errors, and no-store. Root lint, formatting, type checks, unit tests, builds, and integration checks pass. Keep the parent migration In Progress.

## Decision and rationale

This records the implemented extraction authorized by the user's next instruction under the existing repository ownership decision. Both templates' owner responses already use PageSubmissionsService, with an optional journey snapshot at the contract boundary. A single focused controller needs only that service. Cursor encoding belongs with the HTTP list boundary. Reusing one error mapper prevents duplication across owner responses, public submissions, and the existing report route. Existing report mappings remain intact rather than being redesigned in this slice.

## Verification

See [the owner response controller review](../../reviews/2026-10-03-owner-submissions-controller.md). Handler bodies, cursor schema/helpers, and exported mapper body match their prior source exactly. Public controller class is unchanged. Thirty new HTTP cases and all existing owner/public unit cases pass.
