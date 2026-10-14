# Review, feat/express-staging-aca, 2026-10-14

**Reviewed by**: GPT-5.6 Terra (author on GPT-6)
**Scope**: 5 files, uncommitted
**Verdict**: Approve

## Summary

This follow-up replaces the legacy deployment workaround with portable `pnpm deploy` and removes the runtime image's external workspace and pnpm-store links. The inspected portable artifact resolves all four `@letterly/*` packages within its own `node_modules` tree, while the pull-request Linux/amd64 build and import check covers the final target platform. The staging specification and runbook now accurately describe this deployment layout and both observed missing-module failures.

## Strengths

- The final Docker image copies a self-contained deployment artifact and no longer relies on paths outside `/app`.
- The inspected portable artifact resolves config, contracts, database, and templates under its own dependency tree; the reported local import checks cover all four packages.
- Pull-request CI builds the Linux/amd64 production image and imports the four workspace packages from inside it.
- The API context, deployment specification, and operator runbook consistently describe the portable deployment mechanism.
- The earlier identity-only Bicep provisioning path and its explicit validator remain intact.

## Test coverage

Portable `pnpm deploy` and imports for all four workspace packages passed locally. The quality workflow separately builds the Linux/amd64 image and performs the same imports on pull requests, which covers the runtime platform because Docker Desktop is unavailable locally. No new runtime or deployment risk was found in the follow-up.
