# Local commit tooling verification

Date: 2026-10-04

Development installation now registers Husky hooks at .husky/_. Pre commit delegates to the root check:commit script, which runs the existing lint, formatting check, and type commands sequentially. The checks do not write fixes or stage files. Commit message validation extends commitlint's conventional preset and quotes the actual message file path. Maintained hook files use LF line endings through .gitattributes; generated launchers are ignored.

The root development dependencies are pinned to Husky 9.1.7 and commitlint CLI/config-conventional 21.2.3, checked against the registry before installation. The lockfile adds only the selected tools and their dependency graph, with 406 additions and no removals. Runtime dependencies and existing workspace versions are unchanged.

The installer skips CI=true, production, HUSKY=0, and source archives without Git metadata before importing Husky. CI explicitly sets HUSKY=0 and continues running its existing independent verification. Contributor guidance covers skipped lifecycle installation, desktop Git client environments, and sequential builds/commits.

See [the recorded decision](../specs/0022-repository-structure/0022-commit-tooling.md). The design follows [Husky's installation and environment guidance](https://typicode.github.io/husky/how-to.html) and [commitlint's local hook guide](https://commitlint.js.org/guides/local-setup).

## Verification

- Dependency installation and a subsequent frozen offline installation passed. Prepare completed and git config core.hooksPath reports .husky/_. No previous local hook path was configured.
- Six valid messages passed through actual git hook run commit-msg invocations: plain feature, scoped fix, maintenance with coauthor footer, breaking change, merge, and revert. Two malformed messages failed. Every supplied message path contained spaces, exercising quoting through the real launcher and CLI.
- Four isolated installer cases passed for CI, production, explicit disable, and source archives. These copies had no installed Husky dependency, proving skipped environments do not need the development package. No hook output was generated there.
- Four actual pre commit launcher invocations used a controlled pnpm shim to exercise the exact root command. Lint failure stopped after lint; formatting failure stopped before types; type failure propagated; all passing commands ran in the expected order. Failures returned status 37, proving they were preserved. These controlled cases establish orchestration, not actual checker correctness.
- The real root check:commit passed lint, formatting, and types sequentially. All seven lint and type tasks executed without cache hits. Maintained installer code is included in the root format selection.
- All 835 workspace unit cases passed across five tasks without cache hits: 582 API, 98 templates, 14 database seed, 103 web, and 38 shared UI.
- The normal production build passed all three tasks without cache hits, including Prisma generation, NestJS compilation, and Next.js compilation. The milestone is committed through enabled hooks; its Git command output records the actual successful commit gate and message check.

## Limits and remaining work

Focused hook probes are local verification artifacts under ignored output/commit-tooling, not a new maintained test runner. No browser suite or live database/provider test was run for this development tooling change. Remote CI and other operating systems remain unobserved. Hooks require Node and pnpm on the Git client's path and can be explicitly bypassed through Git; they are not server enforcement.

The user's skills-lock.json change remains outside the milestone. Shared UI ownership, cohesive source/style splits, accessibility acceptance, bounded cleanup, readiness/API contract gaps, and the final requirement and finding audit remain open. Overall repository restructuring remains In Progress.
