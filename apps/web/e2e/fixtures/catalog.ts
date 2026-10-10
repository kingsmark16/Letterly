import {
  categoryCatalogResponseSchema,
  templateCatalogResponseSchema,
} from "@letterly/contracts/catalog";
import {
  secretLetterTemplate,
  chooseYourHeartTemplate,
} from "@letterly/templates";

export const catalogCategories = categoryCatalogResponseSchema.parse([
  { key: "confession", name: "Confession", description: null, displayOrder: 0 },
]);

export const catalogTemplates = templateCatalogResponseSchema.parse(
  [
    {
      definition: secretLetterTemplate,
      id: "11111111-1111-4111-8111-111111111111",
      versionId: "22222222-2222-4222-8222-222222222222",
      key: "secret-letter",
      name: "Secret Letter",
    },
    {
      definition: chooseYourHeartTemplate,
      id: "33333333-3333-4333-8333-333333333333",
      versionId: "44444444-4444-4444-8444-444444444444",
      key: "choose-your-heart",
      name: "Choose Your Heart",
    },
  ].map(({ definition, id, versionId, key, name }, displayOrder) => ({
    id,
    categoryKey: "confession",
    key,
    name,
    description: null,
    displayOrder,
    versions: [
      {
        id: versionId,
        version: definition.version,
        capabilities: [...definition.capabilities],
        audioCapability: definition.audioCapability,
      },
    ],
  })),
);
