import assert from "node:assert/strict";
import { test } from "node:test";
import { createTemplateImplementationRegistry } from "@letterly/templates/implementation-registry";

const v1 = { registryKey: "confession.letter", version: 1 } as const;
const v2 = { registryKey: "confession.letter.v2", version: 2 } as const;
function implementation(
  identity: { registryKey: string; version: number },
  prefix: string,
) {
  return { ...identity, project: (content: string) => `${prefix}:${content}` };
}

test("retains v1 and v2 behavior without selecting latest for a saved identity", () => {
  const first = implementation(v1, "original");
  const second = implementation(v2, "new");
  const resolve = createTemplateImplementationRegistry([v2, v1], {
    [v2.registryKey]: second,
    [v1.registryKey]: first,
  });
  assert.equal(resolve(v1), first);
  assert.equal(resolve(v1)?.project("saved body"), "original:saved body");
  assert.equal(resolve(v2)?.project("new body"), "new:new body");
  assert.equal(resolve({ registryKey: v1.registryKey, version: 2 }), undefined);
  assert.equal(resolve({ registryKey: v2.registryKey, version: 1 }), undefined);
  assert.equal(resolve({ registryKey: "unknown", version: 2 }), undefined);
});

test("retains independent bindings across categories that share renderer names", () => {
  const other = { registryKey: "celebration.letter", version: 1 };
  const resolve = createTemplateImplementationRegistry([v1, other], {
    [v1.registryKey]: implementation(v1, "confession"),
    [other.registryKey]: implementation(other, "celebration"),
  });
  assert.equal(resolve(v1)?.project("body"), "confession:body");
  assert.equal(resolve(other)?.project("body"), "celebration:body");
});

test("requires complete canonical coverage", () => {
  assert.throws(
    () =>
      createTemplateImplementationRegistry([v1, v2], {
        [v1.registryKey]: implementation(v1, "first"),
      }),
    /Missing.*confession.letter.v2/,
  );
});

test("rejects unknown registrations", () => {
  assert.throws(
    () =>
      createTemplateImplementationRegistry([v1], {
        [v1.registryKey]: implementation(v1, "first"),
        [v2.registryKey]: implementation(v2, "second"),
      }),
    /Unknown.*confession.letter.v2/,
  );
});

test("rejects a binding under the wrong key or version before resolution", () => {
  assert.throws(
    () =>
      createTemplateImplementationRegistry([v1], {
        [v1.registryKey]: implementation(v2, "second"),
      }),
    /identity mismatch/,
  );
  assert.throws(
    () =>
      createTemplateImplementationRegistry([v1], {
        [v1.registryKey]: implementation({ ...v1, version: 2 }, "second"),
      }),
    /identity mismatch/,
  );
});

test("rejects duplicate canonical keys rather than overwriting earlier bindings", () => {
  assert.throws(
    () =>
      createTemplateImplementationRegistry([v1, { ...v1, version: 2 }], {
        [v1.registryKey]: implementation(v1, "first"),
      }),
    /Duplicate/,
  );
});

for (const version of [
  0,
  -1,
  1.5,
  NaN,
  Infinity,
  Number.MAX_SAFE_INTEGER + 1,
]) {
  test(`rejects invalid canonical version ${version}`, () => {
    assert.throws(
      () => createTemplateImplementationRegistry([{ ...v1, version }], {}),
      /Invalid/,
    );
  });
}

test("rejects empty canonical keys", () => {
  assert.throws(
    () =>
      createTemplateImplementationRegistry(
        [{ registryKey: " ", version: 1 }],
        {},
      ),
    /Invalid/,
  );
});

test("copies key bindings so later source map replacement cannot retarget saved pages", () => {
  const first = implementation(v1, "original");
  const source = { [v1.registryKey]: first };
  const resolve = createTemplateImplementationRegistry([v1], source);
  source[v1.registryKey] = implementation(v1, "replacement");
  assert.equal(resolve(v1), first);
  assert.equal(resolve(v1)?.project("saved body"), "original:saved body");
});

test("fails closed if a retained implementation identity is mutated after registration", () => {
  const first = implementation(v1, "original");
  const resolve = createTemplateImplementationRegistry([v1], {
    [v1.registryKey]: first,
  });
  first.version = 2;
  assert.equal(resolve(v1), undefined);
  assert.equal(resolve({ ...v1, version: 2 }), undefined);
});

test("supports an empty registry and treats prototype names as ordinary exact keys", () => {
  assert.equal(createTemplateImplementationRegistry([], {})(v1), undefined);
  const identity = { registryKey: "constructor", version: 1 };
  const resolve = createTemplateImplementationRegistry([identity], {
    constructor: implementation(identity, "safe"),
  });
  assert.equal(resolve(identity)?.project("body"), "safe:body");
  assert.equal(resolve({ registryKey: "toString", version: 1 }), undefined);
});
