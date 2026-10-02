import assert from "node:assert/strict";
import process from "node:process";
import { test } from "node:test";

test("allows development assets from the configured app hostname", async (t) => {
  const originalOrigin = process.env.APP_ORIGIN;
  t.after(() => {
    if (originalOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = originalOrigin;
  });
  process.env.APP_ORIGIN = "http://letterly-dev.local:3000";
  const { default: config } = await import("./next.config.js");
  assert.ok(config.allowedDevOrigins.includes("letterly-dev.local"));
  assert.ok(config.allowedDevOrigins.includes("127.0.0.1"));
  assert.ok(!config.allowedDevOrigins.includes("*"));
});
