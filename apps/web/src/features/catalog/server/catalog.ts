import {
  categoryCatalogResponseSchema,
  templateCatalogLookupResponseSchema,
  templateCatalogOverviewResponseSchema,
  templateCatalogPageResponseSchema,
  type CategoryCatalogItem,
  type TemplateCatalogLookup,
  type TemplateCatalogOverview,
  type TemplateCatalogPage,
} from "@letterly/contracts/catalog";

const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:3000";

class CatalogRequestError extends Error {
  constructor(readonly status: number) {
    super(`Catalog request failed with status ${status}`);
    this.name = "CatalogRequestError";
  }
}

async function fetchCatalogData(path: string): Promise<unknown> {
  const url = new URL(path, appOrigin);
  let response: Response;
  let retried = false;

  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    retried = true;
    // A development API restart can close the proxy socket mid-request.
    await new Promise((resolve) => setTimeout(resolve, 250));
    response = await fetch(url, { cache: "no-store" });
  }

  if (!retried && [500, 502, 503, 504].includes(response.status)) {
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 250));
    response = await fetch(url, { cache: "no-store" });
  }

  if (!response.ok) {
    throw new CatalogRequestError(response.status);
  }

  return (await response.json()) as unknown;
}

export async function getCategories(): Promise<CategoryCatalogItem[]> {
  const categoriesPayload = await fetchCatalogData("/api/v1/categories");
  return categoryCatalogResponseSchema.parse(categoriesPayload);
}

export async function getTemplateCatalogPage(input: {
  categoryKey?: string;
  q?: string;
  size?: number;
  cursor?: string;
  direction?: "after" | "before";
}): Promise<TemplateCatalogPage> {
  const params = new URLSearchParams();
  if (input.categoryKey) params.set("categoryKey", input.categoryKey);
  if (input.q) params.set("q", input.q);
  if (input.size !== undefined) params.set("size", String(input.size));
  if (input.cursor) params.set("cursor", input.cursor);
  if (input.direction) params.set("direction", input.direction);

  const search = params.toString();
  const path = "/api/v1/catalog/templates" + (search ? "?" + search : "");
  const payload = await fetchCatalogData(path);
  return templateCatalogPageResponseSchema.parse(payload);
}

export async function getLandingCatalog(): Promise<TemplateCatalogOverview> {
  const payload = await fetchCatalogData("/api/v1/catalog/overview");
  return templateCatalogOverviewResponseSchema.parse(payload);
}

export async function getTemplateCatalogItem(
  templateKey: string,
  categoryKey?: string,
  version?: number,
): Promise<TemplateCatalogLookup | undefined> {
  const params = new URLSearchParams({ templateKey });
  if (categoryKey !== undefined) params.set("categoryKey", categoryKey);
  if (version !== undefined) params.set("version", String(version));

  try {
    const payload = await fetchCatalogData(
      "/api/v1/catalog/templates/lookup?" + params,
    );
    return templateCatalogLookupResponseSchema.parse(payload);
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}
