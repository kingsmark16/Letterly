# Contributor onboarding and runtime alignment

Date: 2026-10-04

**Status**: Accepted

## Decision

Replace the root and application starter READMEs with source verified contributor guidance. The root owns prerequisites, workspace navigation, environment setup, deliberate development database preparation, root commands, and links to detailed contribution and release guidance. App READMEs own their actual scripts, request responsibilities, and local troubleshooting. Add a concise contribution guide for feature ownership, version retention, checks, and milestone commits. Keep the detailed category/template registration checklist in its existing reference rather than duplicating it.

The project rules and CI already choose Node 24. Record the major in .node-version, consume that file through the existing setup-node v4 action, and narrow the private root manifest's declared support to >=24 <25. Keep pnpm 11.20.0 and all dependencies unchanged. Replace the generated private root name with letterly. No application workspace name or public export changes.

Comment out optional OAuth, R2, and Sentry fields whose blank or partial example values fail current validation. Keep complete configuration examples beside their explanations. Required secrets and database URLs remain explicit development setup inputs. Add a regression test against the checked in API example with only its required authentication secret supplied. Do not change validation or enable integrations by default.

Use placeholders only. Commands that migrate or seed describe the intended development database and are not executed as part of this documentation milestone. Keep launch category/template scope, source registration, deliberate activation, immutable identities, private data boundaries, and migration history intact. Describe implemented commands and distinguish test fixtures and local evidence from live providers, real databases, and remote CI.

The repository autopilot authorization covers this correction to finding 14. Wider spec status reconciliation, operational gaps, commit hooks, and the parent repository acceptance audit remain separate work.

## Acceptance

- Root and app guides describe actual scripts, environment files, ports, source ownership, template registration, and test boundaries. Relative links and documented workspace script names resolve.
- Node selection, manifest support, CI setup input, and contributor guidance agree. Frozen installation accepts the unchanged dependency lockfile.
- The development API example passes validation after filling its required secret, with optional integrations unset. Existing configuration behavior and repository gates pass.
- Record verification and known setup limits. Do not claim a clean machine live setup, database migration, OAuth/R2/Resend call, remote CI, or complete repository restructuring without corresponding evidence.
