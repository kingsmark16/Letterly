# Repository verification baseline

Date: 2026-10-02

Branch: `feat/repository-verification-baseline`

Starting integration revision: `origin/main` at `eebcb56`, freshly fetched before branch creation.

Contract: [Verification baseline milestone](../specs/0022-repository-structure/0022-verification-baseline.md).

## Result

The first tooling milestone passes its local acceptance checks. This records command verification and a read only configuration scout. It is not an independent model code review or certification of the complete NestJS and React rule sets.

| Criterion                | Evidence                                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1, branch isolation   | Created the new feature branch directly from freshly fetched `origin/main`. Preserved the preexisting `skills-lock.json` modification outside the milestone commit.                                                                     |
| AC-2, lint coverage      | `pnpm lint` passed seven tasks: API, web, UI, config, contracts, database, and templates. API lint no longer invokes `--fix`; `lint:fix` remains explicit.                                                                              |
| AC-3, formatting         | `pnpm format:check` passed maintained source and configuration. The API extensionless `.prettierrc` is included explicitly. Generated clients, reports, local output, and personal artifacts are excluded.                              |
| AC-4, unit coverage      | `pnpm exec turbo run test --force` passed 386 API tests in 56 suites, 15 UI tests in one suite, and six existing web tests. Total: 407 tests.                                                                                           |
| AC-5, cache propagation  | A temporary comment in `packages/templates/src/media.ts` changed the API test hash from `a5c46041b3396ab6` to `8b18b1d4c56e0668`. Restoring the exact original bytes restored `a5c46041b3396ab6`. The probe was removed.                |
| AC-6, delivery checks    | Inspected CI additions for formatting, Prisma validation, and root workspace tests. Existing isolated database preparation, API integration tests, and the single browser smoke test remain. GitHub execution is pending a future push. |
| AC-7, compiler and build | `pnpm exec turbo run check-types --force` passed seven tasks. `pnpm exec turbo run build --force` passed all three configured builds. `pnpm --filter @letterly/database validate` passed.                                               |

The frozen offline dependency installation succeeded. Unit tests needed execution outside the Windows filesystem sandbox because Vitest's configuration bundler could not traverse the sandbox's parent directory. This was a runner access limitation, not a failed assertion.

The initial cache probe overlapped type generation and did not restore its hash. It was rerun after generation finished, with no concurrent source writes, and passed. Cache verification must run against a stable input tree.

## Formatting evidence

Compared all 18 changed tracked TypeScript and TSX files against the starting revision by transpiling both versions and comparing their syntax trees. Seventeen matched after ignoring redundant parentheses and punctuation representation. The remaining file, `admin-report-console.tsx`, changed the JSX child `Internal note ` into adjacent `Internal note` and space children. The rendered text is preserved. All 18 match after normalizing that adjacent text split.

CSS and configuration formatting were inspected in the diff. This comparison and the builds provide evidence for mechanical changes; they do not replace visual browser verification for a future interface migration.

## Configuration scout

The `/develop` read only scout examined task coverage, manifest dependencies, Turbo transit tasks, formatter scope, lint configuration, and CI commands. It found that the extensionless API formatter configuration was missing from the root formatter glob. Both `format` and `format:check` now include it explicitly, and the corrected check passes. No other actionable configuration issue was reported.

## Skill alignment and remaining work

NestJS `test-use-testing-module` and `test-mock-external-services`: the existing Nest unit suites now run as part of a consistent root and CI gate. Their framework and provider patterns were preserved, rather than replaced during a tooling slice. `test-e2e-supertest` remains configured in CI, but was not executed locally in this milestone.

React `async-parallel`: the existing server catalog tests, including parallel catalog requests, now run in the owning web workspace and root gate. Existing Next configuration tests are included as well. No data fetching, component state, renderer registration, bundle loading, or performance behavior was optimized in this milestone.

Turborepo guidance is applied through package owned tasks and dependency transit hashes. The `sync` skill adds the new lint and test commands to existing context files and records the installed NestJS skill pointer.

Remaining structure work includes focused controller ownership, framework independent application boundaries, shared transport, UI ownership reconciliation, and typed category/template registration across definitions, API adapters, and web presentation. These remain covered by the broader proposal. No additional categories or templates were activated.

## Limits

No database migration, local integration suite, browser journey, deployment, push, or pull request was performed. CI and the retained integration/browser gates are not reported as passing. A formal independent code review remains pending before merge. The original product DOCX is absent from this checkout; the available blueprint summary governed this work.
