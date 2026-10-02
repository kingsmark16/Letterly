# 0022. Owner question controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Move question create, list, reorder, update, and delete handlers into `presentation/owner-page-questions.controller.ts`, with the existing error mapper and colocated controller unit tests. Preserve routes, order route precedence, guard, UUID/body validation, response schemas, status codes, and existing headers.
- AC-2: Preserve session supplied owner identity, optional question service/rate limit injection, mutation limits before persistence, expected version forwarding, confirmation defaults/explicit values, and all safe errors and details. PagesModule registers the controller once. Remove old handlers/imports/dependency and adjust affected positional test constructors.
- AC-3: HTTP tests use the production service factory and mocked repository to cover success on every route, unknown identity fields, private list projection, order routing, confirmations, guards, malformed inputs, unavailable optional providers, mutation limits, service result mappings, and safe unexpected errors. Retain all existing unit and composition cases.
- AC-4: Root lint, formatting, type checks, unit tests, production builds, and API integration checks pass. Public controller, application service/factory, persistence, and web source remain unchanged. Record verification limits and keep the parent migration In Progress.

## Decision and rationale

This records the implemented extraction authorized by the user's next instruction under the existing repository ownership decision. The five routes share one application service and one HTTP error mapper. Keeping them together gives question transport behavior a clear feature owner without introducing redundant adapters or changing business rules. The focused controller has only question service and creator rate limit inputs. Response impact confirmation remains an API contract, and persistence continues to enforce ownership and version rules.

## Verification

See [the owner question controller review](../../reviews/2026-10-03-owner-questions-controller.md). All five handler bodies and the mapper match the prior source exactly. Public controller source is unchanged. Seven relocated unit cases and thirty eight HTTP/factory cases pass.
