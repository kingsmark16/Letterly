import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategories,
  getTemplateCatalogPage,
} from "../../../src/features/catalog/server/catalog";
import { CatalogTemplateCard } from "../../../src/features/catalog/components/catalog-template-card";
import { WorkspaceFrame } from "../../../src/features/pages/dashboard/dashboard-shell";
import type { TemplateCatalogPage } from "@letterly/contracts/catalog";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Category templates | Letterly",
  description: "Choose a Letterly design for your message.",
};

type TemplateCategoryPageProps = {
  params: Promise<{ categoryKey: string }>;
  searchParams: Promise<{
    q?: string | string[];
    cursor?: string | string[];
    direction?: string | string[];
  }>;
};

function categoryHref(
  categoryKey: string,
  options: {
    query?: string;
    cursor?: string;
    direction?: "after" | "before";
  } = {},
): string {
  const path = "/templates/" + encodeURIComponent(categoryKey);
  const params = new URLSearchParams();
  if (options.query) params.set("q", options.query);
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.direction) params.set("direction", options.direction);
  const search = params.toString();
  return search ? path + "?" + search : path;
}

function lastValue(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value.at(-1) : value;
}

export default async function TemplateCategoryPage({
  params,
  searchParams,
}: TemplateCategoryPageProps): Promise<React.JSX.Element> {
  const [{ categoryKey }, search] = await Promise.all([params, searchParams]);
  const query = lastValue(search.q)?.trim().slice(0, 120) ?? "";
  const cursor = lastValue(search.cursor);
  const direction =
    lastValue(search.direction) === "before" ? "before" : "after";

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let categoryListLoaded = false;
  let page: TemplateCatalogPage | null = null;
  let catalogError = false;

  const [categoriesResult, pageResult] = await Promise.allSettled([
    getCategories(),
    getTemplateCatalogPage({
      categoryKey,
      ...(query ? { q: query } : {}),
      ...(cursor ? { cursor, direction } : {}),
      size: 20,
    }),
  ]);

  if (categoriesResult.status === "fulfilled") {
    categories = categoriesResult.value;
    categoryListLoaded = true;
  } else {
    catalogError = true;
  }

  if (pageResult.status === "fulfilled") {
    page = pageResult.value;
  } else {
    catalogError = true;
  }

  const category = categories.find((item) => item.key === categoryKey);

  if (!category && categoryListLoaded) {
    notFound();
  }

  const categoryName =
    category?.name ??
    categoryKey
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const visibleTemplates = page?.items ?? [];

  return (
    <WorkspaceFrame categories={categories}>
      <main className={styles.page} id="main-content">
        <div className={styles.shell}>
          <section className={styles.hero} aria-labelledby="category-title">
            <p className={styles.heroEyebrow}>{categoryName}</p>
            <h1 className="sr-only" id="category-title">
              {categoryName} designs
            </h1>
            <p className={styles.heroDescription}>
              {category?.description ??
                "Choose a design for the " +
                  categoryName.toLowerCase() +
                  " you want to write."}
            </p>
            {query ? (
              <p className={styles.searchStatus} role="status">
                {visibleTemplates.length > 0
                  ? `Showing ${visibleTemplates.length} ${visibleTemplates.length === 1 ? "design" : "designs"} on this page for `
                  : "No designs on this page for "}
                &quot;{query}&quot;.{" "}
                <Link href={categoryHref(categoryKey)}>Clear search</Link>
              </p>
            ) : null}
          </section>

          {catalogError ? (
            <section className={styles.state} role="alert">
              <p className={styles.eyebrow}>Catalog unavailable</p>
              <h2>We could not load the designs.</h2>
              <p>Try again in a moment.</p>
              <Link
                className={styles.headerAction}
                href={categoryHref(categoryKey, {
                  query,
                  ...(cursor ? { cursor, direction } : {}),
                })}
              >
                Try again
              </Link>
            </section>
          ) : visibleTemplates.length === 0 ? (
            <section className={styles.state} role="status">
              <p className={styles.eyebrow}>
                {query ? "No matching designs" : "Nothing here yet"}
              </p>
              <h2>
                {query
                  ? "No designs match your search."
                  : "No designs are available in this category yet."}
              </h2>
              <p>
                {query
                  ? "Try another word or browse all templates."
                  : "Browse all templates to find another design."}
              </p>
              <Link className={styles.headerAction} href="/templates">
                Browse all templates
              </Link>
            </section>
          ) : (
            <section
              className={styles.templateSection}
              aria-labelledby="template-list-title"
            >
              <h2 className="sr-only" id="template-list-title">
                {categoryName} designs
              </h2>
              <div
                className={styles.templateGrid}
                data-template-count={visibleTemplates.length}
              >
                {visibleTemplates.map((template) => (
                  <CatalogTemplateCard
                    categoryName={category?.name ?? categoryName}
                    key={template.id}
                    template={template}
                  />
                ))}
              </div>
              {page?.previousCursor || page?.nextCursor ? (
                <nav
                  aria-label="Template page navigation"
                  className={styles.pagination}
                >
                  {page.previousCursor ? (
                    <Link
                      className={styles.paginationLink}
                      href={categoryHref(categoryKey, {
                        ...(query ? { query } : {}),
                        cursor: page.previousCursor,
                        direction: "before",
                      })}
                    >
                      Previous designs
                    </Link>
                  ) : null}
                  {page.nextCursor ? (
                    <Link
                      className={styles.paginationLink}
                      href={categoryHref(categoryKey, {
                        ...(query ? { query } : {}),
                        cursor: page.nextCursor,
                        direction: "after",
                      })}
                    >
                      Next designs
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </section>
          )}
        </div>
      </main>
    </WorkspaceFrame>
  );
}
