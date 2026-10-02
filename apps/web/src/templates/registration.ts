import { templateDefinitions } from "@letterly/templates/catalog";

const presentationMetadata = {
  "confession.secret-letter": {
    previewDescription: "A romantic letter with optional interactive features.",
    dialogDescription:
      "A quiet place for the words you want someone to return to, with room for memories and a private reply.",
    previewLabel: "Secret Letter sample preview",
    thumbnailAppearance: "letter",
    publicTitle: "A Secret Letter on Letterly",
    publicDescription: "A personal letter shared through Letterly.",
    metadataTag: undefined,
  },
  "confession.choose-your-heart": {
    previewDescription: "A thoughtful question led by your own words.",
    dialogDescription:
      "A thoughtful question led by your own words, with each answer opening a different part of the story.",
    previewLabel: "Template sample preview",
    thumbnailAppearance: "journey",
    publicTitle: "Choose Your Heart",
    publicDescription: "A guided heart journey shared through Letterly.",
    metadataTag: "choose-your-heart",
  },
} as const satisfies Record<
  (typeof templateDefinitions)[number]["definition"]["registryKey"],
  {
    previewDescription: string;
    dialogDescription: string;
    previewLabel: string;
    thumbnailAppearance: "letter" | "journey";
    publicTitle: string;
    publicDescription: string;
    metadataTag: string | undefined;
  }
>;

export type WebTemplateId = keyof typeof presentationMetadata;
export const webTemplateRegistrations = templateDefinitions.map((catalog) => ({
  id: catalog.definition.registryKey,
  categoryKey: catalog.categoryKey,
  templateKey: catalog.definition.renderer.key,
  version: catalog.definition.version,
  name: catalog.name,
  capabilities: catalog.definition.capabilities,
  ...presentationMetadata[catalog.definition.registryKey],
}));
export type WebTemplateRegistration = (typeof webTemplateRegistrations)[number];
export interface WebTemplateIdentity {
  templateKey: string;
  categoryKey?: string | undefined;
  version?: number | undefined;
  registryKey?: string | undefined;
}

export function resolveWebTemplate<
  T extends {
    id: string;
    categoryKey: string;
    templateKey: string;
    version: number;
  },
>(identity: WebTemplateIdentity, registrations: readonly T[]): T | undefined {
  const matches = registrations.filter(
    (entry) =>
      entry.templateKey === identity.templateKey &&
      (!("categoryKey" in identity) ||
        entry.categoryKey === identity.categoryKey) &&
      (!("version" in identity) || entry.version === identity.version) &&
      (!("registryKey" in identity) || entry.id === identity.registryKey),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function getWebTemplate(
  identity: WebTemplateIdentity,
): WebTemplateRegistration | undefined {
  return resolveWebTemplate(identity, webTemplateRegistrations);
}

export function createTemplatePreviewPath(
  identity: WebTemplateIdentity,
  startHref: string,
): string {
  const search = new URLSearchParams({ start: startHref });
  if ("categoryKey" in identity)
    search.set("category", identity.categoryKey ?? "");
  if ("version" in identity)
    search.set("version", String(identity.version ?? ""));
  return `/preview/${encodeURIComponent(identity.templateKey)}?${search}`;
}
