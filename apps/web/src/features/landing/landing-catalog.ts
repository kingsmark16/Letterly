import type {
  CategoryCatalogItem,
  TemplateCatalogPage,
} from "@letterly/contracts/catalog";

export type LandingCatalog = {
  categories: CategoryCatalogItem[];
  page: TemplateCatalogPage;
};

export function landingCatalogHref({
  categoryKey,
  cursor,
  direction,
  fixture,
}: {
  categoryKey?: string;
  cursor?: string;
  direction?: "after" | "before";
  fixture?: string;
} = {}): string {
  const params = new URLSearchParams();
  if (fixture) params.set("uiFixture", fixture);
  if (categoryKey) params.set("category", categoryKey);
  if (cursor) params.set("cursor", cursor);
  if (direction) params.set("direction", direction);
  const query = params.toString();
  return "/" + (query ? "?" + query : "") + "#templates";
}
