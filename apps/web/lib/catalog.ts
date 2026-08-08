import {
  categoryCatalogResponseSchema,
  templateCatalogResponseSchema,
  type CategoryCatalogItem,
  type TemplateCatalogItem,
} from "@letterly/contracts/catalog";

const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:3000";

async function fetchCatalogData(path: string): Promise<unknown> {
  const response = await fetch(new URL(path, appOrigin), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  return (await response.json()) as unknown;
}

export async function getLandingCatalog(): Promise<{
  categories: CategoryCatalogItem[];
  templates: TemplateCatalogItem[];
}> {
  const categoriesRequest = fetchCatalogData("/api/v1/categories");

  const templatesRequest = fetchCatalogData(
    "/api/v1/templates?categoryKey=confession",
  );

  const [categoriesPayload, templatesPayload] = await Promise.all([
    categoriesRequest,
    templatesRequest,
  ]);

  return {
    categories: categoryCatalogResponseSchema.parse(categoriesPayload),
    templates: templateCatalogResponseSchema.parse(templatesPayload),
  };
}
