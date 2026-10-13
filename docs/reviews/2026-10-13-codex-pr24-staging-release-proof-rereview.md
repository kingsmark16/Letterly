# Review, feat/m12-staging-release-proof, 2026-10-13

**Reviewed by**: GPT-5.6 Terra (author on GPT-6 Luna)
**Scope**: 5 files, uncommitted feat/m12-staging-release-proof worktree vs origin/feat/milestone-12-deployment-workflow
**Verdict**: Changes requested

## Summary

The update correctly carries the successful image job's artifact name and build attempt through a failed-job rerun, while a full rerun creates and records a new artifact. The helper validates the recorded run ID and attempt fields, its nine tests exercise both its API and actual CLI create/validate path, and the documentation describes the two attempt values consistently. The staging release-manifest job, however, invokes that helper on a fresh runner without checking out the repository, so it will fail before the validated proof can be uploaded.

## Major

### 🟠 The release-manifest job cannot find its checked-in helper, `.github/workflows/ci.yml:375`

**Problem**: `publish-staging-release-manifest` downloads only the bootstrap artifact, then runs `node .github/scripts/staging-release-manifest.mjs`. Unlike the quality, image, staging-deploy, and production jobs, this job has no `actions/checkout` step. GitHub Actions jobs run on separate fresh runners, and downloading the manifest artifact does not populate the repository's `.github/scripts` directory.

**Why it matters**: Every successful staging deployment reaches this job and fails with a missing-module error instead of uploading its release manifest. Production therefore has no eligible staging proof and is blocked even after API readiness and web promotion complete.

**Suggested fix**: Check out the repository before invoking the helper in `publish-staging-release-manifest`, then add a workflow-level assertion or disposable-run check that proves the job has both the downloaded artifact and the helper source available.

## Strengths

- The image job exposes its original attempt and artifact name, allowing a failed-job rerun to reuse the correct bootstrap artifact while recording a newer release attempt.
- The helper tests pass (9/9) and cover failed-job and full-rerun manifest construction, bootstrap rejection, stale attempt and wrong-run rejection, source-tree matching, digest validation, and the actual CLI create/validate commands.

## Test coverage

`node --test .github/scripts/staging-release-manifest.test.mjs` passed all nine tests. The unit and CLI integration tests give the manifest rules meaningful direct coverage and run from the quality job on pull requests, but they do not execute the multi-job Actions workspace boundary that exposes the missing checkout. No live deployment job was run in this review.
