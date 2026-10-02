import { fileURLToPath } from "node:url";
import { help, parseOptions, planScaffold, ScaffoldError } from "./plan.ts";
import { scaffoldReport } from "./render.ts";
import { writeScaffold } from "./write.ts";

try {
  if (Number(process.versions.node.split(".")[0]) < 24) {
    throw new ScaffoldError("Template scaffolding requires Node 24 or newer.");
  }
  const options = parseOptions(process.argv.slice(2));
  if (options === "help") {
    process.stdout.write(help);
  } else {
    let catalog: typeof import("@letterly/templates/catalog");
    try {
      catalog = await import("@letterly/templates/catalog");
    } catch {
      throw new ScaffoldError(
        "Cannot load the canonical template catalog. Check workspace dependencies and catalog imports.",
      );
    }
    const plan = planScaffold(options, {
      categories: catalog.categoryDefinitions.map((entry) => entry.key),
      registryKeys: catalog.templateDefinitions.map(
        (entry) => entry.definition.registryKey,
      ),
    });
    await writeScaffold(
      fileURLToPath(new URL("../../../../", import.meta.url)),
      plan,
    );
    process.stdout.write(scaffoldReport(plan));
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof ScaffoldError ? error.message : "Scaffold failed. Check workspace markers and filesystem permissions."}\n`,
  );
  process.exitCode = 1;
}
