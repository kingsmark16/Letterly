# Review, feat/milestone-05-template-versioning, 2026-10-11

**Reviewed by**: GPT-5.6 Terra (author on GPT-6)
**Scope**: 153 files, branch vs origin/staging
**Verdict**: Approve

## Summary

This change establishes exact immutable template-version dispatch across the catalog, API, persistence, and web layers, while preserving the two launch templates. The provisioning plan retains inactive versions, prevents registry-key replacement, and seeds catalog updates in a bounded transaction; page operations resolve saved registry key and version rather than selecting the newest definition. I found no correctness, security, resilience, contract, or convention issue in the supplied base-to-head diff. The matching completed **Data model** scope row explicitly includes template versioning, and its **Review it** checkbox is already ticked, so no scope row was duplicated or altered.

## Strengths

- The shared implementation registry rejects incomplete, unknown, and key/version-mismatched bindings at construction, and every API and web dispatch point resolves exact retained identities rather than falling back to a newer version.
- Catalog provisioning groups families, keeps all retained version rows, detects identity conflicts before a guarded status update, and uses the transactional seed entry point so partial catalog writes roll back.
- Coverage is substantial and targeted: coexistence fixtures exercise page creation, update, publication, owner/public projections, seed conflict handling, scaffolding safety, and editor, preview, and public web dispatch.

## Test coverage

Assessed without execution, per review scope. The configured Jest, Vitest, Node/tsx, and Playwright coverage added or updated by this PR meaningfully covers the new branching and failure behavior, including inactive-version retention, ambiguous identities, identity-conflict rollback, fixture provisioning, and version-specific API/web dispatch. No material untested changed logic was identified from the diff.
