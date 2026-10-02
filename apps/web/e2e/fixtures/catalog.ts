import {
  categoryCatalogResponseSchema,
  templateCatalogResponseSchema,
} from "@letterly/contracts/catalog";
import { categoryDefinitions, templateDefinitions } from "@letterly/templates";

const fixtureIds: Record<string, { id: string; versionId: string }> = {
  "confession.secret-letter": {
    id: "11111111-1111-4111-8111-111111111111",
    versionId: "22222222-2222-4222-8222-222222222222",
  },
  "confession.choose-your-heart": {
    id: "33333333-3333-4333-8333-333333333333",
    versionId: "44444444-4444-4444-8444-444444444444",
  },
};

export const catalogCategories =
  categoryCatalogResponseSchema.parse(categoryDefinitions);
export const catalogTemplates = templateCatalogResponseSchema.parse(
  templateDefinitions.map(({ definition, ...metadata }) => {
    const ids = fixtureIds[definition.registryKey];
    if (!ids)
      throw new Error(
        `Missing browser fixture IDs for ${definition.registryKey}`,
      );
    return {
      ...metadata,
      id: ids.id,
      key: definition.renderer.key,
      versions: [
        {
          id: ids.versionId,
          version: definition.version,
          capabilities: [...definition.capabilities],
          audioCapability: definition.audioCapability,
        },
      ],
    };
  }),
);
