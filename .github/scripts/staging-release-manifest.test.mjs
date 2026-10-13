import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  bootstrapArtifactName,
  createStagingReleaseManifest,
  matchesStagingReleaseManifest,
} from "./staging-release-manifest.mjs";

const imageName = "ghcr.io/kingsmark16/letterly-api";
const image = `${imageName}@sha256:${"a".repeat(64)}`;
const tree = "f".repeat(40);
const bootstrapManifest = { tree, image };
const scriptPath = fileURLToPath(
  new URL("./staging-release-manifest.mjs", import.meta.url),
);

function createReleaseManifest(releaseAttempt, imageBuildAttempt) {
  return createStagingReleaseManifest({
    bootstrapManifest,
    expectedImage: image,
    expectedTree: tree,
    runId: "1234567890",
    releaseAttempt,
    imageBuildAttempt,
  });
}

function matches(manifest, overrides = {}) {
  return matchesStagingReleaseManifest(manifest, {
    expectedTree: tree,
    imageName,
    runId: "1234567890",
    runAttempt: "2",
    ...overrides,
  });
}

test("selects the bootstrap artifact from the attempt that built the image", () => {
  assert.equal(
    bootstrapArtifactName("1"),
    "letterly-api-staging-bootstrap-manifest-attempt-1",
  );
  assert.equal(
    bootstrapArtifactName("2"),
    "letterly-api-staging-bootstrap-manifest-attempt-2",
  );
  assert.throws(() => bootstrapArtifactName("0"), /positive integer/);
});

test("creates a release proof after a failed-job rerun reuses the successful image build", () => {
  const manifest = createReleaseManifest("2", "1");

  assert.deepEqual(manifest.staging, {
    run_id: "1234567890",
    run_attempt: "2",
    image_build_attempt: "1",
    api_readiness: "passed",
    web_smoke: "passed",
  });
  assert.equal(matches(manifest), true);
});

test("creates a release proof when a full rerun rebuilds the image", () => {
  const manifest = createReleaseManifest("2", "2");

  assert.equal(manifest.staging.image_build_attempt, "2");
  assert.equal(matches(manifest), true);
});

test("rejects the bootstrap image manifest as production staging evidence", () => {
  assert.equal(matches(bootstrapManifest), false);
});

test("rejects a release proof for a different source tree", () => {
  assert.equal(
    matches(createReleaseManifest("2", "1"), { expectedTree: "e".repeat(40) }),
    false,
  );
});

test("rejects stale run attempts and incomplete staging checks", () => {
  const manifest = createReleaseManifest("2", "1");
  const staleAttempt = {
    ...manifest,
    staging: { ...manifest.staging, run_attempt: "1" },
  };
  const wrongRun = {
    ...manifest,
    staging: { ...manifest.staging, run_id: "1234567891" },
  };
  const missingReadiness = {
    ...manifest,
    staging: { ...manifest.staging, api_readiness: "pending" },
  };

  assert.equal(matches(staleAttempt), false);
  assert.equal(matches(wrongRun), false);
  assert.equal(matches(missingReadiness), false);
});

test("rejects images that are not the expected repository digest", () => {
  const manifest = createReleaseManifest("2", "1");
  const wrongImage = {
    ...manifest,
    image: `${imageName}-other@sha256:${"b".repeat(64)}`,
  };
  const tagOnlyImage = { ...manifest, image: `${imageName}:latest` };

  assert.equal(matches(wrongImage), false);
  assert.equal(matches(tagOnlyImage), false);
});

test("rejects a build attempt newer than the release attempt", () => {
  assert.throws(() => createReleaseManifest("1", "2"), /cannot be newer/);
});

test("CLI creates and validates a release artifact from its bootstrap file", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "letterly-staging-manifest-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const bootstrapPath = join(directory, "bootstrap.json");
  const releasePath = join(directory, "release.json");
  await writeFile(bootstrapPath, JSON.stringify(bootstrapManifest));

  const create = spawnSync(
    process.execPath,
    [scriptPath, "create", bootstrapPath, releasePath],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        EXPECTED_IMAGE: image,
        EXPECTED_TREE: tree,
        GITHUB_RUN_ID: "1234567890",
        GITHUB_RUN_ATTEMPT: "2",
        IMAGE_BUILD_ATTEMPT: "1",
      },
    },
  );
  assert.equal(create.status, 0, create.stderr);

  const createdManifest = JSON.parse(await readFile(releasePath, "utf8"));
  assert.equal(createdManifest.staging.image_build_attempt, "1");

  const validate = spawnSync(
    process.execPath,
    [scriptPath, "validate", releasePath, tree, imageName, "1234567890", "2"],
    { encoding: "utf8" },
  );
  assert.equal(validate.status, 0, validate.stderr);
  assert.equal(validate.stdout.trim(), image);

  const rejectWrongTree = spawnSync(
    process.execPath,
    [
      scriptPath,
      "validate",
      releasePath,
      "e".repeat(40),
      imageName,
      "1234567890",
      "2",
    ],
    { encoding: "utf8" },
  );
  assert.equal(rejectWrongTree.status, 1);
});
