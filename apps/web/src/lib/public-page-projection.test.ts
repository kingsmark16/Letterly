import assert from "node:assert/strict";
import test from "node:test";
import {
  parsePublicPageProjection,
  PublicPageUnavailableError,
} from "./public-page-projection";

const letter = {
  displaySlug: "test",
  canonicalUrl: "https://letterly.test/p/test",
  template: {
    key: "secret-letter",
    version: 1,
    registryKey: "confession.secret-letter",
  },
  recipientName: "Reader",
  mainMessage: "A private letter",
  sections: [],
};
const journey = {
  displaySlug: "test",
  canonicalUrl: "https://letterly.test/p/test",
  template: {
    key: "choose-your-heart",
    version: 1,
    registryKey: "confession.choose-your-heart",
  },
  publishedGraphVersion: 1,
  rootQuestionKey: "first",
  maxDepth: 1,
  questions: [],
  outcomes: [],
};

test("public parsing preserves exact registry identity for both registered templates", () => {
  for (const payload of [letter, journey])
    assert.deepEqual(
      parsePublicPageProjection(payload).template,
      payload.template,
    );
});
test("legacy public identity remains compatible when renderer and version resolve uniquely", () => {
  for (const payload of [letter, journey]) {
    const legacy = {
      ...payload,
      template: { key: payload.template.key, version: 1 },
    };
    assert.equal(
      parsePublicPageProjection(legacy).template.key,
      payload.template.key,
    );
  }
});
test("explicit mismatched, unknown, malformed, or unsupported identities have no fallback", () => {
  for (const template of [
    { ...letter.template, registryKey: "confession.choose-your-heart" },
    { ...letter.template, registryKey: "unknown" },
    { ...letter.template, registryKey: "" },
    { ...letter.template, registryKey: undefined },
    { ...letter.template, registryKey: null },
    { ...letter.template, version: 999 },
  ])
    assert.throws(
      () => parsePublicPageProjection({ ...letter, template }),
      PublicPageUnavailableError,
    );
});
test("locked parsing retains identity and strips private body fields", () => {
  const locked = parsePublicPageProjection({ ...letter, state: "LOCKED" });
  assert.deepEqual(locked.template, letter.template);
  assert.ok("state" in locked);
  assert.ok(!("mainMessage" in locked));
  assert.throws(
    () =>
      parsePublicPageProjection({
        ...letter,
        state: "LOCKED",
        template: { ...letter.template, registryKey: "unknown" },
      }),
    PublicPageUnavailableError,
  );
});
test("malformed public content is unavailable even with trusted identity", () => {
  assert.throws(
    () => parsePublicPageProjection({ ...letter, mainMessage: "" }),
    PublicPageUnavailableError,
  );
});
