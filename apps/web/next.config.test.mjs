/* eslint turbo/no-undeclared-env-vars: off -- The tests set this fixture-only value before loading Next config. */
import assert from "node:assert/strict";
import process from "node:process";
import { test } from "node:test";

test("allows development assets from the configured app hostname", async (t) => {
  const originalOrigin = process.env.APP_ORIGIN;
  const originalDistDir = process.env.LETTERLY_NEXT_DIST_DIR;
  t.after(() => {
    if (originalOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = originalOrigin;
    if (originalDistDir === undefined)
      delete process.env.LETTERLY_NEXT_DIST_DIR;
    else process.env.LETTERLY_NEXT_DIST_DIR = originalDistDir;
  });
  process.env.APP_ORIGIN = "http://letterly-dev.local:3000";
  delete process.env.LETTERLY_NEXT_DIST_DIR;
  const { default: config } = await import("./next.config.js");
  assert.ok(config.allowedDevOrigins.includes("letterly-dev.local"));
  assert.ok(config.allowedDevOrigins.includes("127.0.0.1"));
  assert.ok(!config.allowedDevOrigins.includes("*"));
  assert.equal(config.distDir, ".next");
});

test("uses the isolated output directory configured by browser fixtures", async (t) => {
  const originalDistDir = process.env.LETTERLY_NEXT_DIST_DIR;
  t.after(() => {
    if (originalDistDir === undefined)
      delete process.env.LETTERLY_NEXT_DIST_DIR;
    else process.env.LETTERLY_NEXT_DIST_DIR = originalDistDir;
  });
  process.env.LETTERLY_NEXT_DIST_DIR =
    ".next-fixtures-00000000-0000-0000-0000-000000000000";

  const { default: config } = await import(
    `./next.config.js?distDir=${Date.now()}`
  );
  assert.equal(
    config.distDir,
    ".next-fixtures-00000000-0000-0000-0000-000000000000",
  );
});

test("rejects an output directory outside the browser fixture namespace", async (t) => {
  const originalDistDir = process.env.LETTERLY_NEXT_DIST_DIR;
  t.after(() => {
    if (originalDistDir === undefined)
      delete process.env.LETTERLY_NEXT_DIST_DIR;
    else process.env.LETTERLY_NEXT_DIST_DIR = originalDistDir;
  });
  process.env.LETTERLY_NEXT_DIST_DIR = "../outside";

  await assert.rejects(
    import(`./next.config.js?invalidDistDir=${Date.now()}`),
    /LETTERLY_NEXT_DIST_DIR must name a browser fixture directory inside apps\/web/u,
  );
});
