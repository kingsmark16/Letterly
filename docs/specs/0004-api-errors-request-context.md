# 0004. API error envelopes and request context

**Date**: 2026-08-09
**Status**: Accepted

## Summary

Letterly needs one safe error response shape for NestJS API routes. Each applicable request receives a server generated request ID that clients can use when reporting a failure. Better Auth keeps its own raw response handling so OAuth and session behaviour remain unchanged.

## Context

The API currently has three incompatible failure patterns. Catalog code throws plain Nest exceptions, page code maps a small set of domain errors in its controller, and the Zod pipe returns a custom body with a 400 status. None of these paths consistently include a request ID or prevent accidental exposure of internal error text.

Creator drafts contain sensitive writing. The web client needs stable error codes for validation, authentication recovery, stale edits, and safe retry states. The API also needs a format that later modules can adopt without each controller inventing its own error body.

Better Auth is mounted through a raw Node handler. Its request and response handling must remain outside this NestJS standard so the existing authentication integration is not changed by an API envelope wrapper.

## Requirements

**User stories**:

1. As a web client developer, I want every applicable API error to have one safe shape so recovery behaviour does not depend on controller specific text.
2. As a creator, I want a request ID on an API failure so I can report a problem without sharing my private letter content.
3. As an API developer, I want one typed way to create expected errors so status codes never depend on parsing messages.

**Standard requirements**:

1. Every NestJS response except `/api/auth/*` receives a fresh server generated UUID request ID in `X-Request-ID`. The API ignores any client supplied `X-Request-ID`.
2. Every handled error outside `/api/auth/*` returns JSON with `statusCode`, `code`, `message`, `requestId`, and optional code specific `details`.
3. Expected failures use `ApiException`, which carries an explicit HTTP status, stable code, safe message, and optional safe details. Controllers, guards, and pipes do not infer codes from exception text.
4. Contract validation returns `422 VALIDATION_FAILED` with `details.issues`, where each issue has only a path and Zod issue code. Submitted values never appear in the body.
5. A stale page save returns `409 STALE_VERSION` with only `currentContentVersion` and `currentUpdatedAt` in its details. Missing and non owned pages can return the same safe `404 PAGE_NOT_FOUND` response.
6. Unexpected failures return `500 INTERNAL_SERVER_ERROR` with a fixed safe message and no details. The response never expose error messages, stacks, database information, request bodies, cookies, credentials, or letter content.
7. Better Auth routes preserve their existing raw handler responses and are excluded from the envelope standard.
8. Malformed JSON and a body larger than 128 KiB return safe envelopes before NestJS routing. Rate limited responses include an allowlisted retry value in both `details` and `Retry-After`.

## Options considered

### Option 1: Ingress middleware, global filter, and typed errors

Middleware creates the request context before guards run. A global exception filter serializes safe envelopes, while expected failures use one typed exception.

**Pros**:

1. Guard, pipe, controller, and database errors all receive the same request ID and body shape.
2. Error codes are explicit and do not depend on fragile message matching.

**Cons**:

1. Existing controllers and the validation pipe must be migrated together.
2. Developers must use the typed error class for expected failures.

### Option 2: Request ID interceptor only

An interceptor generates the request ID and formats responses after the NestJS route begins.

**Pros**:

1. It keeps request concerns in an interceptor.

**Cons**:

1. NestJS guards run before interceptors, so unauthenticated responses cannot reliably receive the request ID.
2. It needs special paths for the most important authorization failure.

### Option 3: Controller specific Nest exceptions

Each controller continues to throw its own NestJS exception bodies.

**Pros**:

1. It has the smallest immediate code change.

**Cons**:

1. Clients receive inconsistent status bodies and codes.
2. Privacy review must find every controller error path manually.

## Decision

**Chosen option**: Option 1: Ingress middleware, global filter, and typed errors.

Generate a fresh request ID in Express middleware, serialize errors through one global NestJS exception filter, and require an `ApiException` for every expected application failure. Use generic shared codes for common HTTP conditions and feature codes only when the client has distinct recovery behaviour.

## Rationale

The creator draft flow needs request correlation for a 401 from the guard and a 409 from optimistic concurrency. Middleware is the only selected pattern that creates context before both guards and pipes. A global filter then keeps response serialization out of business code, while typed expected errors make the safe information visible at the call site.

The alternative interceptor only approach conflicts with NestJS execution order. Controller specific exceptions would make the new Axios client depend on unstable text, which is unsafe and difficult to maintain.

## Standard definition

**Canonical pattern**:

```ts
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMIT_UNAVAILABLE'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_SERVER_ERROR'
  | 'PAGE_NOT_FOUND'
  | 'STALE_VERSION'
  | 'TEMPLATE_UNAVAILABLE'
  | 'TEMPLATE_DEFINITION_UNAVAILABLE'
  | 'SLUG_ALLOCATION_FAILED';

export class ApiException extends HttpException {
  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetails,
  ) {
    super({ statusCode, code, message, details }, statusCode);
  }
}

app.use((request, response, next) => {
  if (request.path === '/api/auth' || request.path.startsWith('/api/auth/')) {
    next();
    return;
  }

  request.requestId = randomUUID();
  response.setHeader('X-Request-ID', request.requestId);
  next();
});

app.use((request, response, next) => {
  if (request.path === '/api/auth' || request.path.startsWith('/api/auth/')) {
    next();
    return;
  }

  jsonBodyParser(request, response, (error?: unknown) => {
    if (isMalformedJson(error)) {
      writeApiError(request, response, {
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Request cannot be processed',
      });
      return;
    }

    if (isBodyTooLarge(error)) {
      writeApiError(request, response, {
        statusCode: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
      });
      return;
    }

    next(error);
  });
});

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly baseExceptionFilter: BaseExceptionFilter;

  constructor(adapterHost: HttpAdapterHost) {
    this.baseExceptionFilter = new BaseExceptionFilter(
      adapterHost.httpAdapter,
    );
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext>();
    const response = context.getResponse<Response>();

    if (
      request.path === '/api/auth' ||
      request.path.startsWith('/api/auth/')
    ) {
      this.baseExceptionFilter.catch(exception, host);
      return;
    }

    const error = toSafeApiError(exception);
    writeApiError(request, response, error);
  }
}
```

`writeApiError` is the only serializer for standard API errors. It sets the HTTP status, `X-Request-ID`, optional `Retry-After`, and the JSON envelope. `ApiErrorDetails` is a strict union. `VALIDATION_FAILED` uses `{ issues: Array<{ path: string[]; code: string }> }`. `STALE_VERSION` uses `{ currentContentVersion: number; currentUpdatedAt: string }`. `RATE_LIMITED` uses `{ retryAfterSeconds: number }`. Other codes omit details unless a future feature adds an allowlisted schema and test.

**Replaces**:

1. Throwing plain `BadRequestException`, `NotFoundException`, or `ServiceUnavailableException` from application HTTP boundaries.
2. Returning validation issues as a bare array with status 400.
3. Mapping stable client codes from NestJS messages or unknown exception messages.

**Enforcement**:

Use the `ApiException` type and shared error schemas in `@letterly/contracts`. Add an API scoped `no-restricted-imports` rule that rejects direct expected NestJS HTTP exception imports outside shared HTTP infrastructure. Unit and API integration tests verify response bodies and headers.

**Rollout**:

Use one migration milestone for all current NestJS routes. New API code must use the standard immediately. Better Auth routes are excluded.

**Exceptions**:

Only `/api/auth/*` is excluded because Better Auth owns its raw Node request and response protocol. Health and catalog endpoints are included.

## API contract

**Shared error codes**:

| Code | HTTP status | Safe message | Details |
|---|---:|---|---|
| `BAD_REQUEST` | 400 | Request cannot be processed | None |
| `VALIDATION_FAILED` | 422 | Invalid request | `{ issues }` |
| `UNAUTHENTICATED` | 401 | Authentication required | None |
| `FORBIDDEN` | 403 | Access denied | None |
| `NOT_FOUND` | 404 | Resource not found | None |
| `CONFLICT` | 409 | Request conflicts with current state | None |
| `RATE_LIMITED` | 429 | Too many requests | Safe retry metadata when defined |
| `PAYLOAD_TOO_LARGE` | 413 | Request body is too large | None |
| `RATE_LIMIT_UNAVAILABLE` | 503 | Request service temporarily unavailable | None |
| `SERVICE_UNAVAILABLE` | 503 | Request service temporarily unavailable | None |
| `INTERNAL_SERVER_ERROR` | 500 | An unexpected error occurred | None |
| `PAGE_NOT_FOUND` | 404 | Page not found | None |
| `STALE_VERSION` | 409 | This draft changed elsewhere | `{ currentContentVersion, currentUpdatedAt }` |
| `TEMPLATE_UNAVAILABLE` | 404 | Template unavailable | None |
| `TEMPLATE_DEFINITION_UNAVAILABLE` | 503 | Template definition unavailable | None |
| `SLUG_ALLOCATION_FAILED` | 503 | Letter creation is temporarily unavailable | None |

**Envelope schema**:

```text
{
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details?: ApiErrorDetails
}
```

**Value sourcing**:

| Action | Value produced | Source |
|---|---|---|
| Request ingress | `requestId` | `randomUUID()` in API middleware, never request headers |
| Any handled error | `statusCode`, `code`, `message`, `details` | Explicit `ApiException` values or the safe unexpected error fallback |
| Validation failure | `details.issues` | Zod issue paths and codes only |
| Stale draft save | stale details | Owner scoped repository metadata read |
| Rate limit response | `details.retryAfterSeconds` and `Retry-After` | Rate limit policy retry calculation |
| JSON parser error | safe code and message | Express parser error classification, never its message |
| Error response | `X-Request-ID` | Request context middleware |

**Key invariants**:

1. A client supplied request ID is never accepted as the server request ID.
2. Every handled NestJS error outside Better Auth includes the same request ID in its header and JSON body.
3. Error messages and details are safe constants or allowlisted metadata. They never include user input or caught exception text.
4. A page ownership denial and an absent page use the same `PAGE_NOT_FOUND` response.
5. Error response serialization never logs or returns request bodies, cookie values, credentials, OAuth tokens, database details, or letter content.
6. Express parser errors use the same safe serializer as NestJS errors and never bypass the request ID requirement.

**Security model**:

This standard applies to all NestJS endpoints except the Better Auth raw handler. The API remains the authorization boundary. Authentication and ownership code throws only safe expected errors. Unexpected exceptions are converted to the fixed 500 response. Error monitoring and structured logging may record request ID, method, route, status, and stable code only.

**Configuration required**:

No new environment variables are required.

**Critical test scenarios**:

1. An unauthenticated creator page request returns `401 UNAUTHENTICATED` with one server generated request ID in both header and body.
2. An invalid page request returns `422 VALIDATION_FAILED` with issue paths and codes only.
3. A stale save returns `409 STALE_VERSION` with current version and timestamp only.
4. Malformed JSON returns `400 BAD_REQUEST` and a payload over 128 KiB returns `413 PAYLOAD_TOO_LARGE`, both with the request ID and no parser message.
5. A rate limited request returns `429 RATE_LIMITED`, `details.retryAfterSeconds`, and the matching `Retry-After` header.
6. An unexpected exception returns the fixed 500 body without exception text or request data.
7. A request with a forged `X-Request-ID` receives a different server UUID.
8. A Better Auth callback retains its raw provider response rather than the standard envelope.

## Consequences

**Positive**:

1. The web client can normalize errors without parsing messages.
2. Support can use request IDs without asking creators to share private content.
3. Future feature modules inherit one tested safety boundary.

**Negative and tradeoffs**:

1. Existing routes need a coordinated migration instead of keeping their default NestJS responses.
2. Typed errors add a small amount of code at each expected failure site.
3. Better Auth remains a deliberately separate error protocol.

**Neutral**:

1. No database migration or new environment value is required.
2. The current Pino logging choice from spec 0001 remains a separate implementation concern. Until it is configured, this standard must not log caught error text or request data.

## Follow-up

1. Configure the Pino logging choice from spec 0001 with redaction before production monitoring is enabled.
2. Add protected API OpenAPI documentation after the error envelope is registered, so every endpoint documents its stable error codes.

## References

**Project sources**:

1. [Letterly blueprint reference](../references/letterly-blueprint.md), sections 14 and 15 require exception filters, request IDs, stable safe errors, and protected API contracts.
2. [0001 stack and architecture](0001-stack-and-architecture.md), the selected NestJS API and Pino logging foundation.
3. [0003 authenticated Secret Letter draft loop](0003-authenticated-secret-letter-draft-loop.md), the page error envelope, validation, stale version, and privacy requirements.
4. [API conventions](../../apps/api/AGENTS.md), the current API boundary and privacy rules.
