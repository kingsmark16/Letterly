# 0022. Public analytics controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Extract public visit, visit duration, and journey metric routes into `presentation/public-page-analytics.controller.ts`, with two colocated journey metric unit cases. Preserve all handler bodies/decorators, paths, contract validation, status codes, and headers. Visits/durations retain no store; journey metrics retains its current lack of an explicit cache decorator.
- AC-2: Preserve visit/duration cookie and identity secret requirements, page scoped browser hashing, UTC recording, trusted unlock token reader, page availability checks, public scope lookup, duration forwarding, and safe errors. Preserve independent optional metrics, template event checks, signed visitor identity, limiter ordering, and optional limiter behavior.
- AC-3: Register the new controller once before PublicPagesController. Remove old analytics handlers/imports/constructor inputs. Retain all remaining public handler bodies, application services, factories, repository predicates, metrics recording, template behavior, and provider decisions. Update the existing owner/public analytics composition suite to compose the extracted controller.
- AC-4: Verify real HTTP routes through the production analytics factory with mocked page availability, repository, metrics recorder, and limiter. Cover success, hashes, UTC dates, cookies, reader scoping, signed identity, optional services, locked/unavailable pages, rate limits, bounded input, template mismatch, missing scope, safe failures, and existing headers. Pass repository gates and keep the parent migration In Progress.

## Decision and rationale

This records the completed extraction authorized by the user's next instruction under the existing repository ownership decision. Visitor analytics is one presentation responsibility separate from public content and submissions. PageService still supplies the availability and password boundary; PageAnalyticsService retains identity scoped persistence and UTC day derivation. Journey metrics remains a bounded recorder behind its existing token. All transport inputs and results keep their prior sources.

No new provider, event policy, cache policy, session guard, template dispatch, or database migration is introduced. Existing duplicate error branches move unchanged; consolidation would need its own verification of their differing cases. Cache consistency remains separate parent work.

## Verification

See [the public analytics controller review](../../reviews/2026-10-03-public-analytics-controller.md). Exact source comparison confirms unchanged extracted handlers/decorators and remaining public handlers. Forty eight new HTTP cases and the two relocated unit cases pass.
