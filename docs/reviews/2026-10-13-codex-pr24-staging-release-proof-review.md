# Review, feat/m12-staging-release-proof, 2026-10-13

**Reviewed by**: GPT-5.6 Terra (author on GPT-6 Luna)
**Scope**: 3 files, feat/m12-staging-release-proof vs origin/feat/milestone-12-deployment-workflow
**Verdict**: Changes requested

## Summary

This change correctly separates the bootstrap image manifest from a staging release manifest and makes the production job search only for a release proof that names the expected tree, image digest, run, and attempt. The documentation also records the Vercel workspace-source setting and the intended failure-closed behavior. However, the attempt-specific bootstrap lookup breaks the supported failed-job rerun path, so a transient post-build failure can leave a successfully deployed staging candidate permanently unable to produce its release proof. The new release-gate control flow also has no executable coverage despite the configured test signal.

## Major

### 🟠 Failed-job reruns cannot recover the staging release proof, `.github/workflows/ci.yml:356`

**Problem**: The bootstrap artifact is uploaded under the attempt that ran `publish-staging-api` (`:192`), but `publish-staging-release-manifest` always downloads the name for the current `github.run_attempt`. A GitHub Actions “Re-run failed jobs” increments that context while preserving successful upstream jobs. If staging deployment or release-manifest publication fails after the bootstrap upload succeeds, the rerun looks for `...bootstrap-manifest-attempt-2` even though only attempt 1 uploaded it, and the release-manifest job fails before it can publish the proof.

**Why it matters**: A transient deployment, network, or artifact-publication failure requires a new staging push or a full rerun instead of recovering the existing successful deployment. Until then, production correctly rejects the tree because no validated release manifest exists, but the release workflow is needlessly unavailable in an ordinary operational recovery path.

**Suggested fix**: Keep the release proof attempt-specific, but resolve the bootstrap artifact by the attempt that actually published it, such as by enumerating the current run's artifacts and selecting its valid bootstrap manifest. Cover both a failed-job rerun and a full rerun so the selected bootstrap manifest and the resulting release-proof attempt remain coherent.

### 🟠 The changed deployment gate has no executable regression coverage, `.github/workflows/ci.yml:345`

**Problem**: No test or workflow fixture was added for the new manifest-generation and production-selection branches. The configured lint, formatting, and TypeScript gates cannot evaluate GitHub Actions rerun semantics, artifact availability, or the `gh`/`jq` matching conditions.

**Why it matters**: This gate controls whether production is allowed to migrate and deploy. The retry defect above is exactly the kind of behavior that static validation will miss, and it will first be observed only after staging infrastructure and credentials are active.

**Suggested fix**: Add an executable workflow-helper or fixture test that exercises successful staging proof creation, bootstrap-proof rejection, stale or mismatched tree rejection, and the failed-job rerun path. Keep GitHub-context interpolation thin so the matching logic can be run in the repository test suite.

## Strengths

- The new release-manifest job depends on a successful staging deployment, which prevents the bootstrap artifact from serving as production evidence.
- Production verifies the source tree, digest form, run and attempt fields, and recorded API/web checks before accepting a manifest; the updated runbook explains the distinct bootstrap and release artifacts.

## Test coverage

The supplied signal reports local lint, formatting, and type-check gates passing, including YAML formatting; I did not rerun them during this read-only review. No live PR CI run has exercised this commit, and deployment jobs are unavailable on pull-request events. No automated test covers the new GitHub Actions artifact and rerun behavior.
