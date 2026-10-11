# Local commit tooling

Date: 2026-10-04

## Summary

The selected commit gate is lint, formatting, and types, but contributors currently run it manually. Conventional messages are a documented rule without local validation. Implement both through standard tools under the repository autopilot authorization.

## Context

The repository already owns complete root checks and uses conventional milestone commits. This checkout has no existing hook path. Installation must work on Windows and skip environments where development tools are deliberately absent.

## Requirements

- AC-1: Development installation registers local hooks. CI, production, explicitly disabled hooks, and source archives without Git metadata skip installation.
- AC-2: Pre commit runs the existing root lint, formatting check, and type check sequentially, stops on failure, and does not fix or stage files. Next route type generation must not overlap another build.
- AC-3: Commit message validation uses the conventional preset and receives the actual quoted message file path. Valid feature, maintenance, scoped, breaking, and coauthor messages pass; malformed messages fail. Merge and revert handling follows the preset defaults.
- AC-4: Verify real hook execution, fail fast behavior, installation skip paths, frozen dependency installation, and repository gates. Preserve unrelated user changes and update contributor guidance.

## Decision

Choose Husky 9.1.7 and commitlint CLI/config-conventional 21.2.3 as root development tools. Root prepare invokes a small installer that skips CI, production, HUSKY=0, or missing .git before importing Husky. A root check:commit command delegates sequentially to the three existing scripts. The two POSIX hook files invoke that command and commitlint respectively. A CommonJS configuration extends the conventional preset without custom rules.

**Implementation skills**: architect and develop record and build the decision; turborepo preserves package owned tasks and caching. No new application pattern or product behavior is introduced.

## Options considered and rationale

Manual instructions alone leave the selected gate easy to miss. Custom Git hook management and a custom message parser would duplicate established tools. Staged file linting is unsuitable for the full workspace type gate and would create a second check definition. Retain complete checks and use Turborepo's existing valid cache behavior.

## Standard definition

The canonical pre commit hook runs `pnpm check:commit`; the commit message hook runs `pnpm exec commitlint --edit "$1"`. This replaces manually remembered commit checks. Installation rolls out immediately to development checkouts, with explicit skips for the environments named in AC-1. Source archives and skipped lifecycle scripts can use the documented root prepare command when returning to development.

## Consequences

Local commits run checks without writing fixes. Hooks are contributor feedback, not a replacement for CI; Git supports explicit bypasses, and CI continues to run its independent broader verification. Existing history is not rewritten or retroactively rejected. No push hook or automatic test/build gate is added. Contributors must have Node 24 and pnpm available in their Git client's environment.

Commit tooling files remain at the root, with generated Husky launchers ignored. Root formatting explicitly includes maintained installer code and commitlint configuration. The installer selects the standard .husky path; this checkout has no existing core.hooksPath configuration to preserve.

## Build plan

1. Add root tooling dependencies, installer, hook files, configuration, and root commands (AC-1, AC-2, AC-3).
2. Prove installation skips, message acceptance/rejection, actual pre commit success and failure, and unchanged staged/user content (AC-1, AC-2, AC-3, AC-4).
3. Run applicable gates, document actual evidence and limits, and commit the milestone through enabled hooks (AC-4).

## References

The [Husky installation guidance](https://typicode.github.io/husky/how-to.html) documents prepare installation, CI/production skips, POSIX hooks, and GUI environment considerations. The [commitlint local guide](https://commitlint.js.org/guides/local-setup) documents conventional message validation through the commit-msg hook. Package versions were checked against the package registry before installation.
