# Review, feat/express-staging-aca, 2026-10-14

**Reviewed by**: GPT-5.6 Terra (author on GPT-6)
**Scope**: 10 files, branch vs base
**Verdict**: Approve

## Summary

The revised branch repairs the production image's workspace dependency graph and adds a pull-request Linux/amd64 build plus import check for all four affected packages. It also separates the safe, identity-only bootstrap for the portal-created Express app from the full-template path for a new environment. The replacement identity validator proves the expected compiled-template graph with named failures, and it now meets the repository formatting gate.

## Strengths

- Pull-request CI now builds the Linux/amd64 production image and imports all four affected workspace packages from inside it, directly covering the previous startup failure.
- `staging-express-identity.bicep` treats the existing app as a reference and creates the OIDC identity and app-scoped assignment without declaring an app update or secrets.
- The runbook clearly separates the existing portal-created environment from the full-template path and keeps deployment disabled until secret mapping and `/ready` succeed.
- The identity validator uses explicit, named failures and passed against the `az bicep build --outfile` JSON, proving the precise least-privilege role actions and nested assignment scope.

## Test coverage

The updated quality workflow compiles all three Bicep templates, validates the Express template's no-secret and bounded-scale shape, and builds and imports the production image on pull requests. Both staging Bicep templates compiled successfully in this review, and the identity validator passed against the Bicep `--outfile` artifact. Docker execution remains delegated to the new GitHub Actions pull-request check because Docker Desktop is unavailable locally.
