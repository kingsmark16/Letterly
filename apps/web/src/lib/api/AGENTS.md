# Browser HTTP transport

This area owns the shared Axios clients, response validation, and safe error conversion for browser API calls. Feature modules own endpoint paths and their input/output contracts.

## Files

- `transport.ts` exports the credentialed `/api/v1` client, same origin public action client, and schema validated `request` helper. Both clients use the existing 35 second timeout.
- `errors.ts` owns `WebApiError` and safe normalization of API envelopes, timeouts, network failures, and malformed responses.
- `transport.test.ts` verifies error preservation, privacy of diagnostics, response validation, and cancellation.

## Conventions

- Import transport and error types directly. Do not import feature endpoint functions into this area.
- Feature endpoints validate inputs before dispatch and pass their shared response schema to `request`.
- Preserve Axios cancellation errors so canceled query work is not presented as an offline failure.
- Pass TanStack Query signals to Axios in migrated query endpoints. Keep request state and credentials out of shared mutable caches or local storage.
- Server readers and signed proxy handlers remain separate from browser transport.
- Administrator requests live in `src/features/admin/api.ts`; page requests and query keys live in `src/features/pages/api/`. Import `WebApiError` from this area's `errors.ts`; there is no central endpoint or error compatibility barrel.

_Drafted by /sync from the introducing change, worth a quick human pass._
