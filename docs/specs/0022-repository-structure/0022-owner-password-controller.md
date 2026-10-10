# 0022. Owner password controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Move the owner password PATCH handler into `presentation/owner-page-password.controller.ts` with its owner unit case. Preserve path, authentication guard, UUID/body and response validation, HTTP status, session supplied owner identity, optional service/limiter injection, and existing headers.
- AC-2: Move the existing password error mapper into `presentation/page-password-error.mapper.ts` as a named export. Both the owner controller and public unlock controller use that single implementation. Preserve mapper body, safe codes/messages, retry details, public handler body, proof creation, and cookie behavior. Register the owner controller once and remove its old handler/dependency.
- AC-3: HTTP tests use the production password service factory with mocked repository/proof store and fixture sessions. Cover set/clear, ownership forwarding, validation and limiting before persistence, missing ownership, unavailable service/key, optional limits, proof revocation failure, unexpected failure, anonymous public unlock, incorrect passwords, missing public data, public limits, and no proof/cookie on failure. Retain all existing unit and factory cases and adjust affected constructor placeholders.
- AC-4: Root lint, formatting, type checks, unit tests, builds, and API integration checks pass. Application service/factory, persistence, encryption/proof policy, and web source remain unchanged. Record verification limits and keep the parent migration In Progress.

## Decision and rationale

This records the implemented extraction authorized by the user's next instruction under the existing repository ownership decision. Owner password mutations need only the password service and creator limiter. Public unlock continues to use the same safe password error translation. A shared presentation mapper prevents duplication while keeping HTTP errors out of the plain application service. The mapper's only functional change is becoming an exported function in its own file.

## Verification

See [the owner password controller review](../../reviews/2026-10-03-owner-password-controller.md). Owner handler and mapper bodies match their prior source exactly, and the public controller body is unchanged. Twenty six factory/HTTP cases and all existing password controller unit cases pass.
