# Owner page controller milestone

Date: 2026-10-02

Branch: `feat/repository-verification-baseline`

Starting revision: `056f232`. A fresh fetch of `origin/main` showed no missing integration commits. The user authorized the next slice with `next` after the proposed owner controller extraction.

Governing decision: [Repository structure and ownership](../specs/0022-repository-structure/index.md), API ownership and rollout milestone 4. The umbrella status is now In Progress. No matching restructuring feature exists in the product scope, so no scope boxes were changed. This report records implementation and verification, not a formal independent review.

## Ownership and request flow

`presentation/owner-pages.controller.ts` owns ten authenticated owner endpoints: list, create, update, detail, delete, publish, unpublish, archive, restore, and slug change. Their HTTP methods, paths, session guard, contract validation, status codes, cache headers, creator identity, projection configuration, lifecycle rate limits, and safe error mapping remain unchanged.

`pages.controller.ts` keeps the other 26 owner endpoints and ten public endpoints. The module registers these controllers before the owner lifecycle controller to preserve specific path precedence. Shared providers are not duplicated.

`application/list-owner-pages.ts` owns the extracted page list use case. It receives only the repository listing interface, forwards the authenticated creator and pagination values, and checks every returned template registry key and pinned version against the existing trusted registry. It contains no NestJS, Prisma, or infrastructure imports. The Nest module constructs it through `useFactory` with `PAGES_REPOSITORY`, consistent with [Nest custom provider documentation](https://docs.nestjs.com/fundamentals/custom-providers).

Flow: browser dashboard query, authenticated Nest owner controller, validated size/status/cursor, plain listing use case, existing owner scoped Prisma repository, trusted template check, safe HTTP summary mapper, browser response validation. The repository implementation and persistence predicates are unchanged. This extraction adds no database writes or migrations.

`TemplateDefinitionUnavailableError` now has a plain application module. The existing service reexports the same class so its remaining callers and tests retain error identity. The controller calls the new use case directly. The old service list implementation and unused `listDrafts` method and command alias were removed after searching all callers.

The broader PageService still has Nest decorators, logging, and database recovery dependencies. Its other operations, and the remaining page services, are not reported as framework independent. The old feature controller constructor remains compatible with existing feature tests; further controller extraction can remove its remaining obsolete configuration parameters as callers are migrated.

## Verification

| Check                        | Result                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API unit gate                | 391 tests across 57 suites pass. Six dedicated listing tests replace the previous single service delegation test. Existing controller, lifecycle, repository ownership, cursor, and safe projection coverage passes. |
| HTTP integration             | 33 tests across the draft and publishing suites pass using the real Nest module and mocked provider boundaries. Listing uses the real extracted use case and repository token factory.                               |
| Additional HTTP coverage     | Anonymous listing, creator forwarding, cursor pagination, invalid size/status/cursor, unknown template versions, archive/restore/unpublish/slug routing, and all five lifecycle rate limit rejections.               |
| Static checks                | API lint and type checks pass. Root formatting and Git whitespace checks are run before commit.                                                                                                                      |
| Build                        | API production build passes.                                                                                                                                                                                         |
| Mechanical source comparison | All ten moved methods retain decorators and bodies except the list dependency rename. All 26 remaining owner methods and ten public methods match their originals after whitespace normalization.                    |

The new slug assertion first expected `canonicalUrl`, but the existing lifecycle contract uses `publicUrl`. The assertion was corrected and the complete selected HTTP suites passed. An initial lint failure for an untyped Jest matcher was also corrected without weakening the lint rule.

NestJS skill guidance applied: cohesive feature controllers, constructor injection, interface segregation, existing repository abstraction, session guards, shared boundary validation, centralized error envelopes, and module based HTTP tests with mocked external services. The development skill's read only scout mapped the controller and use case dependencies. Sync guidance updates the existing pages ownership context without creating empty feature folders or rewriting curated project guidance.

## Limits and remaining work

HTTP tests replace the auth provider and persistence provider. They do not prove live Neon persistence or real provider login. Existing Prisma repository unit tests verify unchanged owner predicates and stable cursor queries with mocked Prisma. No live database migration or deployment was needed or performed.

Web source, contracts, template activation, and database source were unchanged. Browser regression, full API integration, GitHub CI, deployment, push, pull request, and formal independent review are not reported as completed. The previous policy rendering issue with JavaScript disabled remains open.

The user's existing `skills-lock.json` change stays outside this milestone. Future slices can group web editor and dashboard files with their styles/tests, continue cohesive API controller and application extraction, and then prove extensible template registration with the two existing templates.
