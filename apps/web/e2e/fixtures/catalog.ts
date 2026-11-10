import {
  categoryDefinitions,
  templateDefinitions,
} from "@letterly/templates/catalog";
import { createBrowserCatalogFixture } from "./catalog-builder";

const fixtureIds: Record<string, { id: string; versionId: string }> = {
  "confession.secret-letter": {
    id: "11111111-1111-4111-8111-111111111111",
    versionId: "22222222-2222-4222-8222-222222222222",
  },
  "confession.choose-your-heart": {
    id: "33333333-3333-4333-8333-333333333333",
    versionId: "44444444-4444-4444-8444-444444444444",
  },
  "birthday.birthday-wish": {
    id: "55555555-5555-4555-8555-555555555555",
    versionId: "66666666-6666-4666-8666-666666666666",
  },
};

export const { catalogCategories, catalogTemplates } =
  createBrowserCatalogFixture(
    categoryDefinitions,
    templateDefinitions,
    fixtureIds,
  );
