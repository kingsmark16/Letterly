import { templateDefinitions } from "@letterly/templates/catalog";
import type { CatalogTemplateIdentity } from "@letterly/templates/catalog-validation";
import {
  resolveTemplateFromDefinitions,
  type TemplateResolution,
} from "@letterly/templates/registry";

export function resolveCatalogTemplateFromDefinitions<
  Entry extends CatalogTemplateIdentity,
>(criteria: TemplateResolution, entries: readonly Entry[]): Entry | undefined {
  return resolveTemplateFromDefinitions(
    criteria,
    entries.map((entry) => ({
      registryKey: entry.definition.registryKey,
      version: entry.definition.version,
      renderer: entry.definition.renderer,
      entry,
    })),
  )?.entry;
}

export function resolveCatalogTemplate(criteria: TemplateResolution) {
  return resolveCatalogTemplateFromDefinitions(criteria, templateDefinitions);
}
