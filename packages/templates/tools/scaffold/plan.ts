export interface ScaffoldOptions {
  category: string;
  template: string;
  version: number;
  dryRun: boolean;
}

export interface ScaffoldCatalog {
  categories: readonly string[];
  registryKeys: readonly string[];
}

export interface ScaffoldPlan extends ScaffoldOptions {
  registryKey: string;
  categoryExists: boolean;
  identityDirectories: readonly string[];
  files: readonly string[];
}

export class ScaffoldError extends Error {}

export const help = `Usage: pnpm scaffold:template --category <key> --template <key> --version <integer> [--dry-run]

Creates three unregistered starter files. Requires Node 24.
Keys: lowercase words separated by hyphens, maximum 64 characters.
Version: positive safe integer, without leading zeros.
Existing identities cannot be regenerated, including at another version.
Use --dry-run to inspect paths and registration steps without writing.
Use --help to show this message.
`;

function validateKey(key: string, label: string): void {
  if (
    key.length > 64 ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(key) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(key)
  ) {
    throw new ScaffoldError(
      `Invalid ${label} key. See --help for allowed keys.`,
    );
  }
}

export function parseOptions(
  args: readonly string[],
): ScaffoldOptions | "help" {
  if (args.length === 1 && args[0] === "--help") return "help";
  const values = new Map<string, string>();
  let dryRun = false;
  for (let index = 0; index < args.length; index++) {
    const option = args[index]!;
    if (option === "--dry-run") {
      if (dryRun) throw new ScaffoldError("Duplicate option: --dry-run.");
      dryRun = true;
      continue;
    }
    if (!["--category", "--template", "--version"].includes(option)) {
      throw new ScaffoldError("Unknown option. See --help for usage.");
    }
    if (values.has(option))
      throw new ScaffoldError(`Duplicate option: ${option}.`);
    const value = args[++index];
    if (!value || value.startsWith("--")) {
      throw new ScaffoldError(`Missing value for ${option}.`);
    }
    values.set(option, value);
  }
  for (const option of ["--category", "--template", "--version"]) {
    if (!values.has(option))
      throw new ScaffoldError(`Missing option: ${option}.`);
  }
  const category = values.get("--category")!;
  const template = values.get("--template")!;
  const rawVersion = values.get("--version")!;
  validateKey(category, "category");
  validateKey(template, "template");
  const version = Number(rawVersion);
  if (!/^[1-9][0-9]*$/.test(rawVersion) || !Number.isSafeInteger(version)) {
    throw new ScaffoldError(
      "Version must be a positive safe integer without leading zeros.",
    );
  }
  return { category, template, version, dryRun };
}

export function planScaffold(
  options: ScaffoldOptions,
  catalog: ScaffoldCatalog,
): ScaffoldPlan {
  const registryKey = `${options.category}.${options.template}`;
  if (catalog.registryKeys.includes(registryKey)) {
    throw new ScaffoldError(
      `Identity ${registryKey} is already registered. Additional versions require runtime version support first.`,
    );
  }
  const suffix = `${options.category}/${options.template}`;
  const identityDirectories = [
    `packages/templates/src/${suffix}`,
    `apps/web/src/templates/${suffix}`,
    `docs/templates/${suffix}`,
  ];
  return {
    ...options,
    registryKey,
    categoryExists: catalog.categories.includes(options.category),
    identityDirectories,
    files: [
      `${identityDirectories[0]}/v${options.version}/definition.ts`,
      `${identityDirectories[1]}/v${options.version}/renderer.tsx`,
      `${identityDirectories[2]}/v${options.version}.md`,
    ],
  };
}
