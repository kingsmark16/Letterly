import * as fs from "node:fs/promises";
import type { Stats } from "node:fs";
import {
  dirname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";
import { ScaffoldError, type ScaffoldPlan } from "./plan.ts";
import { renderScaffold } from "./render.ts";

interface CreatedHandle {
  stat(): Promise<Stats>;
  writeFile(content: string): Promise<void>;
  close(): Promise<void>;
}

export interface ScaffoldFileSystem {
  lstat(path: string): Promise<Stats>;
  readdir(path: string): Promise<string[]>;
  readFile(path: string): Promise<Buffer>;
  mkdir(path: string): Promise<void>;
  open(path: string): Promise<CreatedHandle>;
  unlink(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;
}

export const nodeFileSystem: ScaffoldFileSystem = {
  lstat: fs.lstat,
  readdir: (path) => fs.readdir(path),
  readFile: (path) => fs.readFile(path),
  mkdir: (path) => fs.mkdir(path),
  open: (path) => fs.open(path, "wx"),
  unlink: fs.unlink,
  rmdir: fs.rmdir,
};

function errorCode(error: unknown): string {
  return error instanceof Error &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "UNKNOWN";
}

async function statIfPresent(
  fs: ScaffoldFileSystem,
  path: string,
): Promise<Stats | undefined> {
  try {
    return await fs.lstat(path);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return undefined;
    throw error;
  }
}

function containedPath(root: string, path: string): string {
  const absolute = resolve(root, path);
  const suffix = relative(root, absolute);
  if (
    !suffix ||
    suffix === ".." ||
    suffix.startsWith(`..${sep}`) ||
    isAbsolute(suffix)
  ) {
    throw new ScaffoldError("Output path escapes the repository root.");
  }
  return absolute;
}

async function inspectPath(
  fs: ScaffoldFileSystem,
  root: string,
  absolute: string,
): Promise<Stats | undefined> {
  let current = root;
  const segments = relative(current, absolute).split(sep);
  for (const [index, segment] of segments.entries()) {
    const siblings = await fs.readdir(current);
    if (
      siblings.some(
        (name) =>
          name.toLowerCase() === segment.toLowerCase() && name !== segment,
      )
    ) {
      throw new ScaffoldError(
        "Case insensitive path collision. Use the existing spelling or a different identity.",
      );
    }
    current = join(current, segment);
    const stats = await statIfPresent(fs, current);
    if (!stats) return undefined;
    if (stats.isSymbolicLink())
      throw new ScaffoldError("Symlink or junction ancestors are not allowed.");
    if (index === segments.length - 1) return stats;
    if (!stats.isDirectory())
      throw new ScaffoldError("An output ancestor is not a directory.");
  }
  return undefined;
}

async function validateRoot(
  fs: ScaffoldFileSystem,
  root: string,
): Promise<void> {
  let ancestor = parse(root).root;
  for (const segment of relative(ancestor, root).split(sep)) {
    ancestor = join(ancestor, segment);
    if ((await statIfPresent(fs, ancestor))?.isSymbolicLink()) {
      throw new ScaffoldError("Symlink or junction ancestors are not allowed.");
    }
  }
  const stats = await statIfPresent(fs, root);
  if (!stats?.isDirectory())
    throw new ScaffoldError("Repository root is missing.");
  for (const [path, expectedName] of [
    ["packages/templates/package.json", "@letterly/templates"],
    ["apps/web/package.json", "web"],
  ] as const) {
    const absolute = containedPath(root, path);
    if (!(await inspectPath(fs, root, absolute))?.isFile()) {
      throw new ScaffoldError(`Missing workspace marker: ${path}.`);
    }
    const metadata: unknown = JSON.parse(
      (await fs.readFile(absolute)).toString("utf8"),
    );
    if (
      typeof metadata !== "object" ||
      metadata === null ||
      !("name" in metadata) ||
      metadata.name !== expectedName
    ) {
      throw new ScaffoldError(`Unexpected workspace identity: ${path}.`);
    }
  }
  if (
    !(
      await inspectPath(fs, root, containedPath(root, "pnpm-workspace.yaml"))
    )?.isFile()
  ) {
    throw new ScaffoldError("Missing pnpm-workspace.yaml repository marker.");
  }
}

interface OwnedPath {
  path: string;
  identity?: Stats;
  content?: Buffer;
}

function sameIdentity(left: Stats, right: Stats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.birthtimeMs === right.birthtimeMs
  );
}

async function cleanup(
  fs: ScaffoldFileSystem,
  root: string,
  owned: readonly OwnedPath[],
): Promise<string[]> {
  const preserved: string[] = [];
  for (const entry of [...owned].reverse()) {
    try {
      const current = await inspectPath(fs, root, entry.path);
      if (!current) continue;
      if (
        !entry.identity ||
        current.isSymbolicLink() ||
        !sameIdentity(current, entry.identity)
      ) {
        preserved.push(entry.path);
        continue;
      }
      if (entry.content) {
        if (
          !current.isFile() ||
          !(await fs.readFile(entry.path)).equals(entry.content)
        ) {
          preserved.push(entry.path);
          continue;
        }
        await fs.unlink(entry.path);
      } else {
        await fs.rmdir(entry.path);
      }
    } catch {
      preserved.push(entry.path);
    }
  }
  return preserved;
}

async function createParents(
  fs: ScaffoldFileSystem,
  root: string,
  file: string,
  owned: OwnedPath[],
): Promise<void> {
  let current = root;
  for (const segment of relative(root, dirname(file)).split(sep)) {
    current = join(current, segment);
    const existing = await inspectPath(fs, root, current);
    if (existing) {
      if (!existing.isDirectory())
        throw new ScaffoldError("An output ancestor is not a directory.");
      continue;
    }
    await fs.mkdir(current);
    const entry: OwnedPath = { path: current };
    owned.push(entry);
    entry.identity = await fs.lstat(current);
  }
}

export async function writeScaffold(
  root: string,
  plan: ScaffoldPlan,
  fs: ScaffoldFileSystem = nodeFileSystem,
): Promise<void> {
  root = resolve(root);
  await validateRoot(fs, root);
  for (const path of plan.identityDirectories) {
    if (await inspectPath(fs, root, containedPath(root, path))) {
      throw new ScaffoldError(
        `Scaffold identity directory already exists: ${path}. Choose another identity; versions cannot be regenerated.`,
      );
    }
  }
  for (const path of plan.files) {
    if (await inspectPath(fs, root, containedPath(root, path))) {
      throw new ScaffoldError(`Output already exists: ${path}.`);
    }
  }
  if (plan.dryRun) return;
  const contents = renderScaffold(plan);
  const owned: OwnedPath[] = [];
  try {
    for (const [index, path] of plan.files.entries()) {
      const absolute = containedPath(root, path);
      await createParents(fs, root, absolute, owned);
      await inspectPath(fs, root, absolute);
      const handle = await fs.open(absolute);
      const entry: OwnedPath = {
        path: absolute,
        content: Buffer.from(contents[index]!),
      };
      owned.push(entry);
      try {
        const content = contents[index]!;
        entry.identity = await handle.stat();
        await handle.writeFile(content);
      } finally {
        await handle.close();
      }
    }
  } catch (error) {
    const preserved = await cleanup(fs, root, owned);
    const recovery = preserved.length
      ? ` Preserved partial output for manual recovery:\n${preserved.map((path) => `- ${relative(root, path).split(sep).join("/")}`).join("\n")}`
      : " Created output was removed safely.";
    throw new ScaffoldError(
      `Scaffold write failed (${errorCode(error)}).${recovery}`,
    );
  }
}
