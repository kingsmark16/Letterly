# 0022. Public reading presentation ownership

**Date**: 2026-10-03
**Status**: Complete

## Requirements

- AC-1: Move the remaining public reading controller to `presentation/public-page-read.controller.ts` and rename it PublicPageReadController. Preserve the exact read handler, decorators, required/optional injection, route, template projection parsing, locked response, legacy response omission, cookie issuance, unlock reader, limits, errors, and headers.
- AC-2: Move the two public behavior cases into a colocated public suite. Move remaining owner CRUD/list/lifecycle cases beside OwnerPagesController. Split the existing combined dependency metadata case into owner and public checks, preserving assertions. Remove obsolete root controller and mixed test files without compatibility exports.
- AC-3: Register the renamed controller once, after specific public controllers; update maintained context references. Preserve module providers, services, repositories, web callers, contracts, and template behavior.
- AC-4: Verify anonymous projection paths, field filtering, legacy omission, trusted unlock reader, browser cookies, signed identity, optional injection, validation, rate/read failures, and cache/index headers through real HTTP. Pass repository gates and leave the parent migration In Progress.

## Decision and rationale

This records the ownership cleanup authorized by the user's next instruction. Reading is the last public route in the old root controller. Placing it beside the other feature controllers completes presentation ownership and removes the broad file name. The existing mixed test file is split by the same ownership boundary; owner behavior is unchanged.

All values retain their original sources: PageService supplies trusted projections, the request supplies slug and cookies, the existing identity resolver supplies the limiter identity, browser token helpers supply cookie values/options, the trusted page callback selects unlock proof, and shared schemas validate the applicable projections. Locked and legacy projection handling stays unchanged. No new provider, template dispatcher, cache policy, contract, or database migration is introduced.

## Verification

See [the public reading controller report](../../reviews/2026-10-03-public-read-controller.md). Exact source comparison confirms unchanged handler/decorators. The obsolete root files and old class/import references are removed from maintained source/context. The new HTTP suite passes 22 cases.
