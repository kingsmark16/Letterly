import type { ScaffoldPlan } from "./plan.ts";

export function registrationChecklist(plan: ScaffoldPlan): string {
  const category = plan.categoryExists
    ? `Existing category: ${plan.category}. No new category record is required.`
    : `Category metadata draft: key=${plan.category}; name, description, display order, and artwork pending product design.`;
  return `${category}

1. Decide category metadata, template design, real schemas/defaults/capabilities, and immutable version behavior.
2. Implement the pure definition and public/preview/editor presentation. Add useful tests and styles only as required.
3. Add package subpath exports and public named exports. Use typed public package imports across applications.
4. Implement required draft/publish policies, persistence adapters, owner/public projections, contracts, and feature editor/public adapters. Extend shared types through a deliberate capability/data decision.
5. Add literal preview/editor imports, a lightweight thumbnail, and web metadata registrations. Keep data/query/authorization outside pure renderers; preserve server content and accessibility. Avoid runtime filesystem discovery.
6. Add missing category and version metadata with explicit ACTIVE or INACTIVE provisioning status only after required registrations compile and tests pass. Retain earlier released definitions and bindings. The generator never registers entries.
7. Update fixtures and contract/browser checks. Preserve full identity, pinned version, and unavailable behavior for unknown/mismatched inputs.
8. Run repository gates and deliberately provision the intended development database. The transactional seed respects explicit descriptor status and rejects existing version identity conflicts. Source registration and database activation are separate reviewed actions.
`;
}

export function renderScaffold(plan: ScaffoldPlan): readonly string[] {
  return [
    `import { z } from "zod";

export const scaffoldStatus = "unregistered" as const;

export const templateScaffold = {
  registryKey: "${plan.registryKey}",
  renderer: { key: "${plan.template}" },
  version: ${plan.version},
  contentSchema: z.object({}),
  settingsSchema: z.object({}),
  defaultContent: {},
  defaultSettings: {},
  capabilities: [],
  audioCapability: "hidden",
  publishRequirements: { requiredContentFields: [] },
} as const;
`,
    `export function TemplateScaffoldRenderer() {
  return (
    <section aria-label="Unimplemented template scaffold">
      <p>This template is unimplemented and unregistered.</p>
    </section>
  );
}
`,
    `# ${plan.registryKey} v${plan.version}

Status: **unregistered**. This starter has no implemented business flow.
Identity and version are immutable once published. Names, descriptions, artwork, and the real content model remain pending product design.

## Files

${plan.files.map((path) => `- \`${path}\``).join("\n")}

## Registration checklist

${registrationChecklist(plan)}
See \`docs/references/template-registration.md\` for the current integration owners and version limitations.
`,
  ];
}

export function scaffoldReport(plan: ScaffoldPlan): string {
  return `${plan.dryRun ? "Planned" : "Created"} unregistered scaffold: ${plan.registryKey} v${plan.version}
${plan.files.map((path) => `- ${path}`).join("\n")}

Registration pending:
${registrationChecklist(plan)}`;
}
