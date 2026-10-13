import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const bootstrapArtifactPrefix =
  "letterly-api-staging-bootstrap-manifest-attempt-";
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const attemptPattern = /^[1-9]\d*$/;

export function bootstrapArtifactName(attempt) {
  if (!attemptPattern.test(String(attempt))) {
    throw new Error("The image build attempt must be a positive integer.");
  }

  return `${bootstrapArtifactPrefix}${attempt}`;
}

export function createStagingReleaseManifest({
  bootstrapManifest,
  expectedImage,
  expectedTree,
  runId,
  releaseAttempt,
  imageBuildAttempt,
}) {
  if (!expectedTree || bootstrapManifest.tree !== expectedTree) {
    throw new Error(
      "The bootstrap manifest does not match the expected source tree.",
    );
  }

  if (!expectedImage || bootstrapManifest.image !== expectedImage) {
    throw new Error(
      "The bootstrap manifest does not match the published API image.",
    );
  }

  const imageDigest = expectedImage.slice(expectedImage.lastIndexOf("@") + 1);
  if (!digestPattern.test(imageDigest)) {
    throw new Error("The published API image must use a sha256 digest.");
  }

  if (!attemptPattern.test(String(runId))) {
    throw new Error("The staging workflow run ID must be a positive integer.");
  }

  if (!attemptPattern.test(String(releaseAttempt))) {
    throw new Error("The staging release attempt must be a positive integer.");
  }

  if (!attemptPattern.test(String(imageBuildAttempt))) {
    throw new Error("The API image build attempt must be a positive integer.");
  }

  if (Number(imageBuildAttempt) > Number(releaseAttempt)) {
    throw new Error(
      "The API image build attempt cannot be newer than the staging release attempt.",
    );
  }

  return {
    ...bootstrapManifest,
    staging: {
      run_id: String(runId),
      run_attempt: String(releaseAttempt),
      image_build_attempt: String(imageBuildAttempt),
      api_readiness: "passed",
      web_smoke: "passed",
    },
  };
}

export function matchesStagingReleaseManifest(
  manifest,
  { expectedTree, imageName, runId, runAttempt },
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return false;
  }

  const staging = manifest.staging;
  if (!staging || typeof staging !== "object" || Array.isArray(staging)) {
    return false;
  }

  const imagePrefix = `${imageName}@`;
  const image = manifest.image;
  const manifestRunId = String(staging.run_id);
  const manifestRunAttempt = String(staging.run_attempt);
  const imageBuildAttempt = String(staging.image_build_attempt);
  if (
    typeof image !== "string" ||
    !image.startsWith(imagePrefix) ||
    !digestPattern.test(image.slice(imagePrefix.length)) ||
    !attemptPattern.test(manifestRunId) ||
    !attemptPattern.test(manifestRunAttempt) ||
    !attemptPattern.test(imageBuildAttempt)
  ) {
    return false;
  }

  return (
    manifest.tree === expectedTree &&
    manifestRunId === String(runId) &&
    manifestRunAttempt === String(runAttempt) &&
    Number(imageBuildAttempt) <= Number(runAttempt) &&
    staging.api_readiness === "passed" &&
    staging.web_smoke === "passed"
  );
}

async function runCli(args) {
  const [command, ...parameters] = args;

  if (command === "artifact-name" && parameters.length === 1) {
    process.stdout.write(`${bootstrapArtifactName(parameters[0])}\n`);
    return;
  }

  if (command === "create" && parameters.length === 2) {
    const [bootstrapPath, outputPath] = parameters;
    const bootstrapManifest = JSON.parse(await readFile(bootstrapPath, "utf8"));
    const releaseManifest = createStagingReleaseManifest({
      bootstrapManifest,
      expectedImage: process.env.EXPECTED_IMAGE,
      expectedTree: process.env.EXPECTED_TREE,
      runId: process.env.GITHUB_RUN_ID,
      releaseAttempt: process.env.GITHUB_RUN_ATTEMPT,
      imageBuildAttempt: process.env.IMAGE_BUILD_ATTEMPT,
    });

    await writeFile(
      outputPath,
      `${JSON.stringify(releaseManifest, null, 2)}\n`,
    );
    return;
  }

  if (command === "validate" && parameters.length === 5) {
    const [manifestPath, expectedTree, imageName, runId, runAttempt] =
      parameters;
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      !matchesStagingReleaseManifest(manifest, {
        expectedTree,
        imageName,
        runId,
        runAttempt,
      })
    ) {
      process.exitCode = 1;
      return;
    }

    process.stdout.write(`${manifest.image}\n`);
    return;
  }

  throw new Error(
    "Usage: staging-release-manifest.mjs artifact-name <attempt> | create <bootstrap.json> <release.json> | validate <release.json> <tree> <image-name> <run-id> <run-attempt>",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
