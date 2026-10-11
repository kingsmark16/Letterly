# 0022. Public reports controller boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Extract the public report route into `presentation/public-page-reports.controller.ts` with its existing unit case colocated. Preserve the exact handler/decorators, route, shared contracts, created status, no store and no index headers, and shared error mapper.
- AC-2: Preserve optional report service, limiter, and identity secret injection; public scope before rate limiting; decoded browser hash when cookie and secret exist; signed visitor identity or transport IP fallback; normalized scope/create inputs in PageReportsService; safe receipts and errors; and availability rechecking during creation.
- AC-3: Register PublicPageReportsController once before PublicPagesController. Remove its old handler, imports, and report service constructor input. Migrate the existing production factory HTTP suite to the focused controller. Keep read/unlock handlers, services, factories, repository predicates, and contracts unchanged.
- AC-4: Extend factory HTTP verification for identity precedence/fallback, optional providers, rate failures, bounded inputs, reason values, malformed receipts, and redaction. Pass repository gates and keep the parent structure migration In Progress.

## Decision and rationale

This records the extraction authorized by the user's next instruction under the existing feature ownership decision. Reporting is a public presentation responsibility separate from content reading, password unlock, submissions, media, and analytics. The application service retains normalized slug lookup, repository availability, creation, and safe provider failure mapping.

The validated slug and body supply request values. The service supplies trusted page scope. The request cookie and injected secret supply the browser hash; otherwise the existing visitor identity resolver supplies the limit identity. The repository supplies the receipt, and the response schema validates it. No new provider, reporting policy, password requirement, cookie requirement, template dispatch, or database migration is introduced.

## Verification

See [the public reports controller report](../../reviews/2026-10-03-public-reports-controller.md). Exact source comparison confirms unchanged extracted and remaining handlers. One unit case moved, and the factory HTTP suite now has 33 passing cases, including 25 additional cases.
