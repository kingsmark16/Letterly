# Catalog contract reconciliation, 2026-10-05

Spec 0009 described the initial two catalog requests. The later approved [catalog growth decision](../specs/0022-repository-structure/0022-catalog-growth-pagination.md) replaced that landing read with one grouped overview. The active acceptance criterion, value sources, build step, and verification checklist now describe the current contract. Historical rationale and reviews retain their original evidence.

This milestone changes documentation only. It adds no category, template, API route, database operation, dependency, or interface behavior. The original blueprint document comparison is skipped at your direction; the checked in working reference remains available.

## Evidence

The current server reader requests `/api/v1/catalog/overview`, sets `cache: "no-store"`, and validates `templateCatalogOverviewResponseSchema`. The shared schema limits each category to four family previews and validates category membership. Each preview carries `currentVersion`; choosing a template and opening its preview use that projected version. The server home route retains `force-dynamic`, calls the reader, and composes the existing safe error and empty states. Existing layout metadata is unchanged by this milestone.

The focused reader command passed all nine tests freshly:

```powershell
pnpm.cmd --filter web exec tsx --tsconfig tsconfig.test.json --experimental-test-module-mocks --test src/features/catalog/server/catalog.test.ts
```

Those tests cover the grouped overview and uncached request, one bounded retry for temporary network or gateway failure, permanent failures and invalid responses, exact version lookup, and bounded browse query construction. This run is mocked transport coverage, not live database or provider proof.

The existing production browser fixture passed both desktop and mobile Chromium cases for catalog loading, empty, and recovery states:

```powershell
$env:APP_ORIGIN='http://127.0.0.1:3103'
$env:API_ORIGIN='http://127.0.0.1:3003'
pnpm.cmd --filter web test:e2e:fixtures design-system-compatibility.spec.ts --grep 'AC-9 covers catalog'
```

The fixture build passed and the browser result was two passing cases in 6.2 seconds. The browser checks verify a busy loading surface, explanatory empty status, safe unavailable alert, and the existing `/` recovery link. Fixture query states do not prove a live API outage, nor do these two cases certify every state mentioned in AC-9. Wider hover, focus, disabled, reduced motion, and all consumer acceptance remain separate checks.

## Remaining shared UI ownership work

The [direct consumer inventory](2026-10-05-shared-ui-consumer-inventory.json) records 52 JSX uses across 15 production web files. It follows direct named imports from `@repo/ui` and its subpaths in tracked TSX, excluding tests and browser fixtures. It records class props and locations; it does not prove every transitive consumer or computed cascade. This corrects the earlier progress message's count of 16 files.

Landing links still use CSS Module classes that set primitive appearance and interaction declarations, including `signInLink`, `headerCta`, and `startPrompt`. The hero link also passes important utilities. These require a focused composition correction under the existing 0009 rule before the broader CSS ownership criterion can pass. Layout classes on a primitive are not automatically violations. Native links and controls using the same selectors must be inspected before changing or removing shared CSS rules.

Two additional owners need inspection in that correction: the preview route's `backLink` class sets color, typography, and decoration on the shared Link, while `site-footer.module.css` styles every supplied navigation anchor, including the landing's shared Links, through base, hover, and focus selectors. The footer also serves other features, so changing its generic selectors requires checking all callers. The landing cascade repeats older and later treatments and includes responsive changes; preserve the final computed appearance when transferring primitive declarations to explicit utility composition.

The normal environment `pnpm build` then passed all three tasks, with the database generation task cached and fresh API and web builds. This restored the normal production output after the fixture run. A fresh direct web `check-types` regenerated route types and passed. `git diff --check` passed.

Root `pnpm check:commit` passed lint, formatting, and workspace type checks. Lint and workspace type tasks used local Turbo cache entries; formatting ran freshly. [GPT-6 Luna approved the focused review](2026-10-05-catalog-contract-reconciliation-luna.md) without findings and independently reproduced every inventory row. The separate umbrella evidence pointer was added after that review; it introduces no additional contract claim.

The repository structure goal remains in progress. This correction closes the stale catalog contract description and its focused transport/state proof, while keeping the larger shared UI acceptance checklist open. Existing runtime limitations remain recorded in the [current repository audit](2026-10-05-repository-current-state.md).
