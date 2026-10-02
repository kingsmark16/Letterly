# Registered application publishing policies

Date: 2026-10-02
Branch: `feat/repository-verification-baseline`
Contract: [publishing template policies](../specs/0022-repository-structure/0022-publish-template-policies.md)

## Result

PageService no longer selects publication requirements by template name. It resolves an explicitly registered policy by trusted registry key and exact immutable version. Each existing template owns a plain policy beside its draft policy. Secret Letter requires nonblank recipient and message; Choose Your Heart requires the existing owned journey lookup and accepts its blank compatibility letter fields.

The service retains confirmation, owner lookup, trusted definition lookup, generic audio requirements, owned journey lookup, slug normalization/validation, expected content version writes, repository result mapping, and bounded publication metrics. Existing metric boundaries are preserved: confirmation, owner, definition, and audio failures remain outside the journey metric try/catch. Metrics inside that boundary use the resolved trusted renderer key. Missing journey services, rejected lookup, and transaction failures retain their existing outcomes.

API ESLint restricts production template policy imports to shared template definitions and local policy files. Policies cannot import NestJS, database packages, application services, or infrastructure. Test files are excluded so they can verify orchestration. The registration map requires compile time coverage of trusted catalog keys.

## Verification

* Targeted publishing policy and PageService tests: 46 passed across two suites.
* Full API unit suite: 414 passed across 59 suites, including 18 additional publication regressions. Web unit tests: 28 passed. Database catalog tests: 5 passed. Shared UI tests: 15 passed.
* API integration suite: 39 passed, 7 skipped across four passing and four skipped suites. The publishing HTTP suite uses a mocked PageService; it verifies the HTTP boundary, not real database publication.
* Root lint, type checks, unit tests, formatting checks, and build pass. After adding the import boundary, API lint was rerun successfully and formatting was checked again. The root production build includes both API and web plus Prisma client generation.
* ESLint probes reject five forbidden import paths and permit three intended shared/local imports. The initial negated glob version also rejected allowed imports; it was replaced with the verified regular expression rule before commit.
* `git diff --check` passes.

Existing tests retain incomplete content, required audio, normalized/reserved slugs, successful journey publication, and rejected journey lookup coverage. New service checks cover both unsupported pinned versions, unknown registry identity, missing journey service, confirmation before ownership lookup, absent owner pages, Secret Letter avoiding journey work, exact journey lookup scope and expected version, and all failure result/metric mappings. Policy checks cover empty and whitespace fields, unchanged input, and journey compatibility content.

## Ownership documentation

Updated the API pages context and template registration guide, and linked the bounded implementation contract and this report from the parent structure spec. The overall structure migration remains In Progress. No unrelated scope features were marked complete. Historical reports were preserved.

## Limits and next work

The existing getOwned call checks for an owned journey; it does not independently revalidate graph content. Revision persistence and locked publication checks remain in the repository. This milestone does not replace those infrastructure branches or generalize the Secret Letter shaped stored content types. The seven skipped integration cases were not run, so this is not live database concurrency verification.

No web source, route, schema, migration, live catalog seed, provider, or dependency changed. Browser journeys were not rerun for this API policy extraction; the previous milestone's 70 passing checks remain historical evidence. No independent fresh model review, push, pull request, or deployment ran. The preexisting `skills-lock.json` edit is excluded.

Next: extract locked persistence template publication behavior without weakening ownership/version checks or changing Page-before-PageJourney lock ordering. Then carry full trusted identity through public projections before wider category/template growth. The earlier visible no JavaScript fallback problem remains unresolved.
