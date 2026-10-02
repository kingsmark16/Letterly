import { templateDefinitions } from "@letterly/templates/catalog";

type RegisteredTemplate = (typeof templateDefinitions)[number]["definition"];
type Registry = {
  [Key in RegisteredTemplate["registryKey"]]: Extract<
    RegisteredTemplate,
    { registryKey: Key }
  >;
};

export const templateRegistry = Object.fromEntries(
  templateDefinitions.map(({ definition }) => [
    definition.registryKey,
    definition,
  ]),
) as Registry;

export interface TemplateResolution {
  registryKey?: string | null | undefined;
  rendererKey?: string | null | undefined;
  version: number | null | undefined;
}

export function resolveTemplate(
  criteria: TemplateResolution,
): RegisteredTemplate | undefined {
  if (!("registryKey" in criteria) && !("rendererKey" in criteria))
    return undefined;
  const matches = Object.values(templateRegistry).filter(
    (candidate) =>
      candidate.version === criteria.version &&
      (!("registryKey" in criteria) ||
        candidate.registryKey === criteria.registryKey) &&
      (!("rendererKey" in criteria) ||
        candidate.renderer.key === criteria.rendererKey),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
