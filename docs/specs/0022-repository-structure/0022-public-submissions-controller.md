# 0022. Public submissions controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Extract the shared public submission route into `presentation/public-page-submissions.controller.ts`, with its four existing unit cases colocated. Preserve its handler body, decorators, path, contract validation, created status, no store header, and error mapper.
- AC-2: Preserve both response paths, normalized slug, browser cookie and identity secret requirements, page scoped browser hash, body idempotency for letters, header idempotency for journeys, public scope lookup, password proof and observed password version, optional services, submission limits, response validation, and safe errors.
- AC-3: Register PublicPageSubmissionsController once before PublicPagesController. Remove old submission imports, handler, and constructor inputs. Update positional constructors in password/report unit tests without changing their assertions. Keep other handlers, module factories, application services, repositories, contracts, and template rules unchanged.
- AC-4: Verify both paths through the real HTTP boundary, including optional provider composition, input/output filtering, invalid inputs, missing cookie/header/scope, locked pages, scoped unlock cookies, error mapping, rate limits, redaction, and response contracts. Pass repository gates, retain existing full module submission checks, and keep the parent migration In Progress.

## Decision and rationale

This records the extraction authorized by the user's next instruction under the existing repository ownership decision. Visitor responses form one presentation responsibility separate from public reading, reporting, media, and analytics. Application services retain template capability checks, persistence, duplicate response handling, and idempotency semantics. The controller continues to coordinate existing HTTP identity, proof, and limit concerns.

All values retain their sources: the validated slug/body and request header supply inputs, the trusted scope supplies page identity, the browser cookie and injected secret supply its hash, the password service supplies protection/version/proof, and the selected submission service supplies the response. This extraction introduces no provider, policy, database migration, framework dependency in application code, or new template dispatcher.

The shared request union currently tries the letter contract first. A payload with journey fields, empty answers, and a body key can match that contract after extra fields are stripped. Preserve this existing fallback in a regression case; stricter discrimination belongs to a separate contract milestone with compatibility checks. Missing the selected optional service while the other exists retains the current safe 404 scope failure.

## Verification

See [the public submissions controller report](../../reviews/2026-10-03-public-submissions-controller.md). Exact source comparison confirms unchanged extracted and remaining handlers. The four relocated unit cases and 34 new HTTP cases pass.
