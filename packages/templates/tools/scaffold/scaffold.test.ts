import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { test, type TestContext } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import {
  categoryDefinitions,
  templateDefinitions,
} from "@letterly/templates/catalog";
import { parseOptions, planScaffold, type ScaffoldOptions } from "./plan.ts";
import {
  registrationChecklist,
  renderScaffold,
  scaffoldReport,
} from "./render.ts";
import {
  nodeFileSystem,
  writeScaffold,
  type ScaffoldFileSystem,
} from "./write.ts";

const repository = fileURLToPath(new URL("../../../../", import.meta.url));
const catalog = {
  categories: categoryDefinitions.map((entry) => entry.key),
  templates: templateDefinitions,
};
const args = [
  "--category",
  "celebration",
  "--template",
  "birthday-note",
  "--version",
  "1",
];
function options(overrides: Partial<ScaffoldOptions> = {}): ScaffoldOptions {
  return {
    category: "celebration",
    template: "birthday-note",
    version: 1,
    dryRun: false,
    ...overrides,
  };
}

async function workspace(t: TestContext): Promise<string> {
  const temporaryRoot = await fs.realpath(tmpdir());
  const root = await fs.mkdtemp(join(temporaryRoot, "letterly-scaffold-"));
  t.after(async () => {
    const absolute = resolve(root);
    assert.equal(dirname(absolute), temporaryRoot);
    assert.ok(absolute.startsWith(join(temporaryRoot, "letterly-scaffold-")));
    await fs.rm(absolute, { recursive: true, force: true });
  });
  for (const [path, name] of [
    ["packages/templates", "@letterly/templates"],
    ["apps/web", "web"],
  ] as const) {
    await fs.mkdir(join(root, path), { recursive: true });
    await fs.writeFile(
      join(root, path, "package.json"),
      JSON.stringify({ name, type: "module" }),
    );
  }
  await fs.writeFile(
    join(root, "pnpm-workspace.yaml"),
    "packages: [apps/*, packages/*]\n",
  );
  return root;
}

async function tree(root: string): Promise<Record<string, string>> {
  const entries: Record<string, string> = {};
  async function visit(directory: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const key = relative(root, path).split(sep).join("/");
      if (entry.isDirectory()) {
        entries[`${key}/`] = "";
        await visit(path);
      } else
        entries[key] = entry.isSymbolicLink()
          ? await fs.readlink(path)
          : (await fs.readFile(path)).toString("utf8");
    }
  }
  await visit(root);
  return entries;
}

test("help and canonical options", () => {
  assert.equal(parseOptions(["--help"]), "help");
  assert.deepEqual(parseOptions(args), options());
  assert.deepEqual(
    parseOptions([...args, "--dry-run"]),
    options({ dryRun: true }),
  );
});

for (const invalid of [
  [],
  args.slice(0, -1),
  [...args, "--version", "2"],
  [...args, "--force"],
  [...args, "--dry-run", "--dry-run"],
  [...args, "--help"],
  ["--category", "--template"],
]) {
  test(`reject invalid options ${JSON.stringify(invalid)}`, () =>
    assert.throws(() => parseOptions(invalid)));
}
for (const key of [
  "../escape",
  "a/b",
  "A",
  "a_b",
  "a--b",
  "a-",
  "a.",
  "a ",
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "lpt9",
  "a".repeat(65),
]) {
  test(`reject unsafe key ${JSON.stringify(key)}`, () => {
    assert.throws(() =>
      parseOptions(["--category", key, "--template", "note", "--version", "1"]),
    );
    assert.throws(() =>
      parseOptions([
        "--category",
        "celebration",
        "--template",
        key,
        "--version",
        "1",
      ]),
    );
  });
}
for (const version of [
  "0",
  "-1",
  "01",
  "1.5",
  "1e2",
  "Infinity",
  "9007199254740992",
  " 1",
  "1 ",
]) {
  test(`reject unsafe version ${JSON.stringify(version)}`, () =>
    assert.throws(() => parseOptions([...args.slice(0, -1), version])));
}

test("registered exact versions are rejected while sibling versions and categories remain distinct", () => {
  for (const entry of templateDefinitions) {
    assert.throws(
      () =>
        planScaffold(
          options({
            category: "confession",
            template: entry.definition.renderer.key,
            version: entry.definition.version,
          }),
          catalog,
        ),
      /already registered/,
    );
  }
  for (const version of [2, Number.MAX_SAFE_INTEGER]) {
    const plan = planScaffold(
      options({ category: "confession", template: "secret-letter", version }),
      catalog,
    );
    assert.equal(plan.registryKey, `confession.secret-letter.v${version}`);
    assert.equal(plan.categoryExists, true);
  }
  const plan = planScaffold(options({ template: "secret-letter" }), catalog);
  assert.equal(plan.registryKey, "celebration.secret-letter");
  assert.equal(plan.categoryExists, false);
  assert.equal(
    planScaffold(options({ category: "confession" }), catalog).categoryExists,
    true,
  );
});

test("dry run creates nothing and reports the complete checklist", async (t) => {
  const root = await workspace(t);
  const before = await tree(root);
  const plan = planScaffold(options({ dryRun: true }), catalog);
  await writeScaffold(root, plan);
  assert.deepEqual(await tree(root), before);
  const report = scaffoldReport(plan);
  for (const path of plan.files) assert.ok(report.includes(path));
  assert.ok(report.includes(registrationChecklist(plan)));
  assert.match(report, /Category metadata draft: key=celebration/);
  assert.match(report, /8\. Run repository gates/);
  assert.match(
    registrationChecklist(
      planScaffold(options({ category: "confession" }), catalog),
    ),
    /No new category record/,
  );
});

test("rejects derived key conflicts and exact registered tuples even with nonstandard keys", () => {
  const identity = {
    categoryKey: "confession",
    definition: {
      registryKey: "custom.immutable",
      version: 2,
      renderer: { key: "secret-letter" },
    },
  };
  assert.throws(
    () =>
      planScaffold(
        options({
          category: "confession",
          template: "secret-letter",
          version: 2,
        }),
        { categories: ["confession"], templates: [identity] },
      ),
    /already registered/,
  );
  assert.throws(
    () =>
      planScaffold(options({ version: 2 }), {
        categories: [],
        templates: [
          {
            ...identity,
            categoryKey: "other",
            definition: {
              ...identity.definition,
              registryKey: "celebration.birthday-note.v2",
              renderer: { key: "other" },
            },
          },
        ],
      }),
    /already registered/,
  );
});

test("retains generated v1 and legacy launch files while creating an unregistered v2", async (t) => {
  const root = await workspace(t);
  const v1 = planScaffold(options(), catalog);
  await writeScaffold(root, v1);
  await fs.mkdir(join(root, "apps/web/src/templates/secret-letter"), {
    recursive: true,
  });
  await fs.writeFile(
    join(root, "apps/web/src/templates/secret-letter/renderer.tsx"),
    "legacy launch renderer",
  );
  const before = await tree(root);
  const v2 = planScaffold(options({ version: 2 }), catalog);
  await writeScaffold(root, { ...v2, dryRun: true });
  assert.deepEqual(await tree(root), before);
  await writeScaffold(root, v2);
  const after = await tree(root);
  for (const [path, content] of Object.entries(before))
    assert.equal(after[path], content);
  assert.deepEqual(
    Object.keys(after)
      .filter((path) => !(path in before) && !path.endsWith("/"))
      .sort(),
    [...v2.files].sort(),
  );
  const source = after[v2.files[0]!]!;
  assert.match(source, /registryKey: "celebration.birthday-note.v2"/);
  assert.match(source, /renderer: \{ key: "birthday-note" \}/);
  assert.match(source, /version: 2/);
  assert.match(source, /scaffoldStatus = "unregistered"/);
  await assert.rejects(writeScaffold(root, v2), /already exists/);
  assert.deepEqual(await tree(root), after);
});

test("partial exact version directories and checklist collisions reject before any write", async (t) => {
  for (const target of [
    "packages/templates/src/celebration/birthday-note/v2",
    "apps/web/src/templates/celebration/birthday-note/v2",
    "docs/templates/celebration/birthday-note/v2.md",
  ]) {
    const root = await workspace(t);
    if (target.endsWith(".md")) {
      await fs.mkdir(dirname(join(root, target)), { recursive: true });
      await fs.writeFile(join(root, target), "existing checklist");
    } else await fs.mkdir(join(root, target), { recursive: true });
    const before = await tree(root);
    await assert.rejects(
      writeScaffold(root, planScaffold(options({ version: 2 }), catalog)),
      /already exists/,
    );
    assert.deepEqual(await tree(root), before);
  }
});

test("v2 case and linked ancestor collisions preserve retained sibling output", async (t) => {
  for (const linked of [false, true]) {
    const root = await workspace(t);
    const v1 = planScaffold(options(), catalog);
    await writeScaffold(root, v1);
    const parent = dirname(dirname(join(root, v1.files[0]!)));
    const target = join(parent, linked ? "v2" : "V2");
    if (linked) await fs.symlink(await workspace(t), target, "junction");
    else await fs.mkdir(target);
    const before = await tree(root);
    await assert.rejects(
      writeScaffold(root, planScaffold(options({ version: 2 }), catalog)),
      linked ? /Symlink or junction/ : /Case insensitive/,
    );
    assert.deepEqual(await tree(root), before);
  }
});

test("failed v2 creation removes only its owned output and preserves v1", async (t) => {
  const root = await workspace(t);
  await writeScaffold(root, planScaffold(options(), catalog));
  const before = await tree(root);
  let writes = 0;
  await assert.rejects(
    writeScaffold(root, planScaffold(options({ version: 2 }), catalog), {
      ...nodeFileSystem,
      async open(path) {
        if (++writes === 2) throw new Error("isolated v2 write failure");
        return nodeFileSystem.open(path);
      },
    }),
    /removed safely/,
  );
  assert.deepEqual(await tree(root), before);
});

test("a registered launch v1 permits a v2 starter without changing legacy source", async (t) => {
  const root = await workspace(t);
  for (const [path, contents] of [
    ["packages/templates/src/secret-letter.ts", "legacy definition"],
    ["apps/web/src/templates/secret-letter/renderer.tsx", "legacy renderer"],
  ] as const) {
    await fs.mkdir(dirname(join(root, path)), { recursive: true });
    await fs.writeFile(join(root, path), contents);
  }
  const before = await tree(root);
  const plan = planScaffold(
    options({ category: "confession", template: "secret-letter", version: 2 }),
    catalog,
  );
  await writeScaffold(root, plan);
  const after = await tree(root);
  for (const [path, contents] of Object.entries(before))
    assert.equal(after[path], contents);
  assert.equal(plan.registryKey, "confession.secret-letter.v2");
  assert.match(after[plan.files[0]!]!, /renderer: \{ key: "secret-letter" \}/);
});

test("different categories can generate the same template name at multiple versions", async (t) => {
  const root = await workspace(t);
  const plans = ["confession", "celebration"].flatMap((category) =>
    [2, 3].map((version) =>
      planScaffold(
        options({ category, template: "secret-letter", version }),
        catalog,
      ),
    ),
  );
  for (const plan of plans) await writeScaffold(root, plan);
  const output = await tree(root);
  assert.equal(new Set(plans.map((plan) => plan.registryKey)).size, 4);
  for (const plan of plans) {
    for (const path of plan.files) assert.ok(path in output);
    assert.match(
      output[plan.files[0]!]!,
      new RegExp(`registryKey: "${plan.registryKey.replaceAll(".", "\\.")}"`),
    );
  }
});

for (const version of [1, 2]) {
  test(`creates exactly three v${version} starters, valid schemas, and compilable server presentation`, async (t) => {
    const root = await workspace(t);
    const before = await tree(root);
    const plan = planScaffold(options({ version }), catalog);
    await writeScaffold(root, plan);
    const after = await tree(root);
    const createdFiles = Object.keys(after).filter(
      (key) => !(key in before) && !key.endsWith("/"),
    );
    assert.deepEqual(createdFiles.sort(), [...plan.files].sort());
    for (const [index, path] of plan.files.entries())
      assert.equal(after[path], renderScaffold(plan)[index]);
    assert.match(after[plan.files[1]!]!, /unimplemented and unregistered/);
    assert.doesNotMatch(after[plan.files[1]!]!, /use client|useEffect|fetch\(/);
    for (const owner of ["packages/templates", "apps/web"]) {
      await fs.symlink(
        join(repository, owner, "node_modules"),
        join(root, owner, "node_modules"),
        "junction",
      );
    }
    const definition: {
      templateScaffold: {
        contentSchema: { parse(value: unknown): unknown };
        settingsSchema: { parse(value: unknown): unknown };
        defaultContent: unknown;
        defaultSettings: unknown;
        registryKey: string;
        renderer: { key: string };
        version: number;
      };
      scaffoldStatus: string;
    } = await import(pathToFileURL(join(root, plan.files[0]!)).href);
    assert.equal(definition.scaffoldStatus, "unregistered");
    assert.equal(definition.templateScaffold.registryKey, plan.registryKey);
    assert.equal(definition.templateScaffold.renderer.key, plan.template);
    assert.equal(definition.templateScaffold.version, version);
    assert.deepEqual(
      definition.templateScaffold.contentSchema.parse(
        definition.templateScaffold.defaultContent,
      ),
      {},
    );
    assert.deepEqual(
      definition.templateScaffold.settingsSchema.parse(
        definition.templateScaffold.defaultSettings,
      ),
      {},
    );
    const program = ts.createProgram(
      plan.files.slice(0, 2).map((path) => join(root, path)),
      {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        jsx: ts.JsxEmit.ReactJSX,
      },
    );
    assert.deepEqual(
      ts
        .getPreEmitDiagnostics(program)
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        ),
      [],
    );
  });
}

test("repeat runs and other versions preserve existing files", async (t) => {
  const root = await workspace(t);
  const plan = planScaffold(options(), catalog);
  await writeScaffold(root, plan);
  const before = await tree(root);
  await assert.rejects(writeScaffold(root, plan), /already exists/);
  assert.deepEqual(await tree(root), before);
  const v2 = planScaffold(options({ version: 2 }), catalog);
  await writeScaffold(root, v2);
  const after = await tree(root);
  for (const [path, content] of Object.entries(before))
    assert.equal(after[path], content);
  assert.equal(v2.registryKey, "celebration.birthday-note.v2");
  for (const path of v2.files) assert.ok(path in after);
});

test("preflights all outputs before writing and detects case collisions", async (t) => {
  const root = await workspace(t);
  await fs.mkdir(join(root, "docs/templates/Celebration"), { recursive: true });
  const before = await tree(root);
  await assert.rejects(
    writeScaffold(root, planScaffold(options(), catalog)),
    /Case insensitive/,
  );
  assert.deepEqual(await tree(root), before);
});

test("rejects linked ancestors without following or changing them", async (t) => {
  const root = await workspace(t);
  const other = await workspace(t);
  await fs.mkdir(join(root, "docs"));
  await fs.symlink(other, join(root, "docs/templates"), "junction");
  const before = await tree(root);
  await assert.rejects(
    writeScaffold(root, planScaffold(options(), catalog)),
    /Symlink or junction/,
  );
  assert.deepEqual(await tree(root), before);
});

test("rejects missing/wrong workspace markers and escaped output paths", async (t) => {
  const root = await workspace(t);
  const plan = planScaffold(options(), catalog);
  await assert.rejects(
    writeScaffold(root, { ...plan, files: ["../escape.ts"] }),
    /escapes/,
  );
  await fs.writeFile(join(root, "apps/web/package.json"), '{"name":"other"}');
  const before = await tree(root);
  await assert.rejects(
    writeScaffold(root, plan),
    /Unexpected workspace identity/,
  );
  assert.deepEqual(await tree(root), before);
  await fs.unlink(join(root, "pnpm-workspace.yaml"));
  await fs.writeFile(join(root, "apps/web/package.json"), '{"name":"web"}');
  await assert.rejects(writeScaffold(root, plan), /Missing pnpm-workspace/);
});

test("mid-write failure removes unchanged owned output only", async (t) => {
  const root = await workspace(t);
  const before = await tree(root);
  let writes = 0;
  const failing: ScaffoldFileSystem = {
    ...nodeFileSystem,
    open: async (path) => {
      if (++writes === 2) throw new Error("injected failure");
      return nodeFileSystem.open(path);
    },
  };
  await assert.rejects(
    writeScaffold(root, planScaffold(options(), catalog), failing),
    /removed safely/,
  );
  assert.deepEqual(await tree(root), before);
});

test("write failure preserves concurrently edited output and unrelated files", async (t) => {
  const root = await workspace(t);
  const plan = planScaffold(options(), catalog);
  let writes = 0;
  const failing: ScaffoldFileSystem = {
    ...nodeFileSystem,
    open: async (path) => {
      if (++writes === 2) {
        await fs.writeFile(join(root, plan.files[0]!), "concurrent edit");
        await fs.writeFile(
          join(root, dirname(plan.files[0]!), "unrelated.txt"),
          "keep",
        );
        throw new Error("injected failure");
      }
      return nodeFileSystem.open(path);
    },
  };
  await assert.rejects(
    writeScaffold(root, plan, failing),
    /Preserved partial output for manual recovery/,
  );
  assert.equal(
    await fs.readFile(join(root, plan.files[0]!), "utf8"),
    "concurrent edit",
  );
  assert.equal(
    await fs.readFile(
      join(root, dirname(plan.files[0]!), "unrelated.txt"),
      "utf8",
    ),
    "keep",
  );
});

test("partial writes are reported and preserved when byte ownership cannot be proved", async (t) => {
  const root = await workspace(t);
  const plan = planScaffold(options(), catalog);
  const failing: ScaffoldFileSystem = {
    ...nodeFileSystem,
    open: async (path) => {
      const handle = await nodeFileSystem.open(path);
      return {
        stat: () => handle.stat(),
        close: () => handle.close(),
        writeFile: async () => {
          await handle.writeFile("partial");
          throw new Error("injected partial write");
        },
      };
    },
  };
  await assert.rejects(
    writeScaffold(root, plan, failing),
    /Preserved partial output/,
  );
  assert.equal(
    await fs.readFile(join(root, plan.files[0]!), "utf8"),
    "partial",
  );
});

test("exclusive creation preserves a file appearing after preflight", async (t) => {
  const root = await workspace(t);
  const plan = planScaffold(options(), catalog);
  let writes = 0;
  const racing: ScaffoldFileSystem = {
    ...nodeFileSystem,
    open: async (path) => {
      if (++writes === 2) await fs.writeFile(path, "another invocation");
      return nodeFileSystem.open(path);
    },
  };
  await assert.rejects(writeScaffold(root, plan, racing), /EEXIST/);
  assert.equal(
    await fs.readFile(join(root, plan.files[1]!), "utf8"),
    "another invocation",
  );
  await assert.rejects(fs.lstat(join(root, plan.files[0]!)), {
    code: "ENOENT",
  });
});

test("rollback preserves replacement files even when bytes match", async (t) => {
  const root = await workspace(t);
  const plan = planScaffold(options(), catalog);
  let writes = 0;
  const replacing: ScaffoldFileSystem = {
    ...nodeFileSystem,
    open: async (path) => {
      if (++writes === 2) {
        const original = join(root, plan.files[0]!);
        const content = await fs.readFile(original);
        await fs.rename(original, `${original}.saved`);
        await fs.writeFile(original, content);
        throw new Error("injected replacement");
      }
      return nodeFileSystem.open(path);
    },
  };
  await assert.rejects(
    writeScaffold(root, plan, replacing),
    /Preserved partial output/,
  );
  assert.deepEqual(
    await fs.readFile(join(root, plan.files[0]!)),
    await fs.readFile(join(root, `${plan.files[0]!}.saved`)),
  );
});

test("failed identity capture reports the exclusively created file for recovery", async (t) => {
  const root = await workspace(t);
  const plan = planScaffold(options(), catalog);
  const failing: ScaffoldFileSystem = {
    ...nodeFileSystem,
    open: async (path) => {
      const handle = await nodeFileSystem.open(path);
      return {
        stat: async () => {
          throw new Error("injected stat failure");
        },
        writeFile: (content) => handle.writeFile(content),
        close: () => handle.close(),
      };
    },
  };
  await assert.rejects(
    writeScaffold(root, plan, failing),
    /Preserved partial output/,
  );
  assert.equal(await fs.readFile(join(root, plan.files[0]!), "utf8"), "");
});

test("CLI works outside repository cwd and preserves launch registrations and seed source", async (t) => {
  const root = await workspace(t);
  const protectedPaths = [
    "packages/templates/src/catalog.ts",
    "packages/templates/src/registry.ts",
    "packages/templates/package.json",
    "packages/database/src/seed-catalog.ts",
    "pnpm-lock.yaml",
  ];
  const before = await Promise.all(
    protectedPaths.map((path) => fs.readFile(join(repository, path))),
  );
  const cli = join(repository, "packages/templates/tools/scaffold/cli.ts");
  const output = execFileSync(process.execPath, [cli, ...args, "--dry-run"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.match(
    output,
    /Planned unregistered scaffold: celebration.birthday-note v1/,
  );
  const versionOutput = execFileSync(
    process.execPath,
    [
      cli,
      "--category",
      "confession",
      "--template",
      "secret-letter",
      "--version",
      "2",
      "--dry-run",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.match(
    versionOutput,
    /Planned unregistered scaffold: confession.secret-letter.v2 v2/,
  );
  assert.match(
    versionOutput,
    /packages\/templates\/src\/confession\/secret-letter\/v2\/definition.ts/,
  );
  assert.match(versionOutput, /explicit ACTIVE or INACTIVE/);
  assert.match(
    execFileSync(process.execPath, [cli, "--help"], {
      cwd: root,
      encoding: "utf8",
    }),
    /Usage:/,
  );
  assert.throws(
    () =>
      execFileSync(process.execPath, [cli, ...args.slice(0, -1), "01"], {
        cwd: root,
        stdio: "pipe",
      }),
    (error: unknown) =>
      error instanceof Error && "status" in error && error.status === 1,
  );
  for (const [index, path] of protectedPaths.entries())
    assert.deepEqual(await fs.readFile(join(repository, path)), before[index]);
  assert.deepEqual(catalog.categories, ["confession"]);
  assert.deepEqual(
    catalog.templates.map((entry) => entry.definition.registryKey),
    ["confession.secret-letter", "confession.choose-your-heart"],
  );
});
