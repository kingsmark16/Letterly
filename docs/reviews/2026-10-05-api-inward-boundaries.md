# API inward boundary review

Date: 2026-10-05

## Scope and evidence

A TypeScript syntax tree scan inspected static imports and exports in all 68 production files under feature `application` and `domain` directories. Across 138 module edges, it found no NestJS, Express, database, Prisma, Sharp, AWS SDK, infrastructure, or presentation dependencies. Relative paths were resolved before checking their layer. Tests were excluded because integration and composition fixtures intentionally import adapters.

This is evidence for direct static layer dependencies. It does not prove absence of transitive dependencies, computed dynamic imports, runtime injection cycles, or every possible external library violation. The initial shell search used overlapping globs and included unrelated files; the recorded counts come from the subsequent filtered syntax tree scan.

## Enforcement repair

The pages lint configuration previously blocked specific infrastructure groups, including database, HTTP, storage, and image processing. It now blocks every infrastructure and presentation path in application/domain imports and exports, including type imports. Existing framework, database, provider SDK, and specialized template restrictions remain in place. Catalog and admin retain their stricter plain dependency allowlists.

Four actual ESLint `lintText` probes used the existing page service as their project file and appended an infrastructure type import, presentation reexport, Nest type import, or database type import. All four were rejected by the expected restricted import rule. API lint passed against the unchanged production source. These probes ran in memory and left no fixture source behind.

This implements the existing inward boundary in AGENTS.md and spec 0022. No runtime behavior, dependency, or architecture choice changed. The applicable Nest rules are `arch-feature-modules`, `arch-use-repository-pattern`, and `di-use-interfaces-tokens`; provider factories and ports remain the composition convention.

## Auth ownership review

The auth module is deliberately smaller than pages. Its module owns controller and guard registration and exports the guard. The controller owns request handoff, trusted client IP normalization, request IDs, and response cache headers. The guard owns session verification, bounded transient recovery, and disabled account enforcement at the HTTP boundary. Better Auth configuration, Prisma integration, email policy hooks, and mail delivery remain infrastructure adapters.

No empty application or domain folders are warranted for this provider integration. There is no independent auth use case duplicated in the transport files. The Better Auth singleton is an existing composition boundary shared by the controller and guard; converting it to a new injection scheme is not required by the original finding. The source review covers all five production auth files and does not claim a new live provider verification.

All 51 tests in the five existing auth suites passed. They cover controller handoff, session guards, provider options, request validation, and mail delivery. Expected safe failure logs appeared in the failure cases. Providers were mocked; no live account or mail action was performed.

## Remaining work

The original application dependency finding is now supported by a current cross feature static scan and stricter pages enforcement. The final repository audit still needs package and transitive graph review. The original small module finding has a documented auth ownership rationale rather than a mechanical directory expansion. The broader repository restructuring remains in progress.
