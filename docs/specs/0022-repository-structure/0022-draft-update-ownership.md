# 0022. Template owned draft updates

**Date**: 2026-10-03
**Status**: Complete

## Summary

Move letter content parsing and merge rules out of the generic Prisma pages repository into the existing registered application draft policies. Keep the same HTTP contract, owner authorization, locked transaction, optimistic concurrency, image operations, and response behavior.

## Context and decision

The repository currently parses every stored content object with `secretLetterContentSchema` and writes letter fields inline. Both launch templates currently use this compatibility envelope; Choose Your Heart stores its graph separately. Their existing draft initialization policies are already registered with exact identity/version coverage.

Extend those policies with a pure update operation. PageService selects the policy from the trusted owned page identity and passes a plain callback to the repository. The repository invokes that callback against the freshly locked stored content, after the existing not found, stale, and image shape checks, at the same point where it currently parses content. It persists the prepared content without naming template fields.

This reuses existing registrations instead of adding another adapter map. Preparing content outside the transaction risks merging against a stale snapshot. Moving the whole transaction into each policy would duplicate ownership and media lifecycle rules. The chosen callback preserves transaction ownership while moving business rules inward.

Authorized through automatic continuation on 2026-10-03. Implementation skills: architect, develop, NestJS best practices, and Turborepo. No new dependency or provider is introduced.

## Requirements

- AC-1: The existing draft policy interface owns update behavior. Both launch policies preserve stored schema parsing, editable field merge behavior, omitted optional field retention, explicit empty values, and existing sections. No input mutation or new template activation.
- AC-2: PageService resolves the trusted exact policy before persistence, rejecting missing/unsupported identity with the existing safe unavailable error. The repository port contains lifecycle/owner/version/image inputs plus a pure content updater, with no letter fields.
- AC-3: Persistence invokes the updater using current locked content at the existing parse point. Preserve page lock, ownership/status predicates, stale detection, image checks and limits, write order, version increment, cleanup, rollback, and owner projection. Missing/stale/invalid image shape exits must not invoke content preparation.
- AC-4: Preserve the current route and request/response schemas. Test policy merges, malformed stored content, full registration coverage, exact service wiring, locked current content, preparation error propagation, and existing saves/media/concurrency. Run repository gates and API integration checks.

## Input and output ownership

Editable fields come from the existing validated update command. Policy identity comes from the owned page and trusted registry. Stored content comes from the locked repository read. Optional field omission retains stored values; explicit empty values overwrite them. Prepared content remains the current typed owner content envelope; widening content contracts is a separate product/data decision. The updater is supplied by application code, never by HTTP input, and must remain pure and synchronous.

Secret Letter and Choose Your Heart share a small letter envelope helper because their present update behavior is identical. Each policy explicitly chooses that operation. No generic template dispatcher assumes that future templates use the helper.

## Build plan

1. Extend existing policies and add the shared pure merge helper with edge tests (AC-1).
2. Change service/repository port wiring and replace inline repository field logic, keeping transaction ordering (AC-2, AC-3).
3. Update repository/service coverage, verify integration and repository gates, and reconcile contribution guidance (AC-4).

## Consequences and follow-up

Generic persistence no longer requires knowledge of letter fields. Additional template behavior can supply its own update operation without copying the page transaction. Existing owner content types and transport commands still describe launch content, and broader schemas remain deliberate follow-up work. The parent repository migration remains In Progress.

## Verification

All 629 repository unit tests passed, including 13 new policy/service/repository cases. The targeted save suite has 140 passing tests. Lint, formatting, type checks, and production build passed. API integration has 568 passing tests and 7 database dependent skips. No migration, live provisioning, new template, or HTTP schema change ran. Implementation self verification is recorded in [the draft update review](../../reviews/2026-10-03-draft-update-ownership.md); no independent review ran.
