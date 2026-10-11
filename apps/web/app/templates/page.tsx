import type { Metadata } from "next";
import Link from "next/link";
import {
  getCategories,
  getTemplateCatalogPage,
} from "../../src/features/catalog/server/catalog";
import type { TemplateCatalogPage } from "@letterly/contracts/catalog";
import { CatalogTemplateCard } from "../../src/features/catalog/components/catalog-template-card";
import { WorkspaceFrame } from "../../src/features/pages/dashboard/dashboard-shell";
import {
  CategoryFilterRail,
  type CategoryFilterItem,
  type CategoryIconName,
} from "./category-filter-rail";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Templates | Letterly",
  description: "Find the right design for the words you want to share.",
};

type TemplatesPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    q?: string | string[];
    cursor?: string | string[];
    direction?: string | string[];
  }>;
};

const plannedCategoryFilters = [
  { key: "birthday", name: "Birthday", icon: "birthday" },
  { key: "anniversary", name: "Anniversary", icon: "anniversary" },
  { key: "thank-you", name: "Thank You", icon: "thank-you" },
  { key: "just-because", name: "Just Because", icon: "just-because" },
] as const satisfies ReadonlyArray<{
  key: string;
  name: string;
  icon: CategoryIconName;
}>;

function categoryIconName(categoryKey: string): CategoryIconName {
  if (categoryKey === "confession") return "confession";
  if (categoryKey === "birthday") return "birthday";
  if (categoryKey === "anniversary") return "anniversary";
  if (categoryKey === "thank-you") return "thank-you";
  if (categoryKey === "just-because") return "just-because";
  return "all";
}

function templatesHref(
  categoryKey?: string,
  query?: string,
  cursor?: string,
  direction?: "after" | "before",
): string {
  const params = new URLSearchParams();
  if (categoryKey) params.set("category", categoryKey);
  if (query) params.set("q", query);
  if (cursor) params.set("cursor", cursor);
  if (direction) params.set("direction", direction);
  const search = params.toString();
  return search ? "/templates?" + search : "/templates";
}

function lastValue(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value.at(-1) : value;
}

export default async function TemplatesPage({
  searchParams,
}: TemplatesPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const query = lastValue(params.q)?.trim().slice(0, 120) ?? "";
  const requestedCategory = lastValue(params.category);
  const cursor = lastValue(params.cursor);
  const direction =
    lastValue(params.direction) === "before" ? "before" : "after";

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let page: TemplateCatalogPage | null = null;
  let catalogError = false;

  const [categoriesResult, pageResult] = await Promise.allSettled([
    getCategories(),
    getTemplateCatalogPage({
      ...(requestedCategory ? { categoryKey: requestedCategory } : {}),
      ...(query ? { q: query } : {}),
      ...(cursor ? { cursor, direction } : {}),
      size: 20,
    }),
  ]);

  if (categoriesResult.status === "fulfilled") {
    categories = categoriesResult.value;
  } else {
    catalogError = true;
  }

  if (pageResult.status === "fulfilled") {
    page = pageResult.value;
  } else {
    catalogError = true;
  }

  const selectedCategory = categories.find(
    (category) => category.key === requestedCategory,
  );
  const categoryFilterItems: CategoryFilterItem[] = [
    {
      key: "all",
      name: "All Categories",
      icon: "all",
      href: templatesHref(undefined, query),
      selected: !selectedCategory,
    },
    ...categories.map((category) => ({
      key: category.key,
      name: category.name,
      icon: categoryIconName(category.key),
      href: templatesHref(category.key, query),
      selected: selectedCategory?.key === category.key,
    })),
    ...plannedCategoryFilters
      .filter(
        (planned) =>
          !categories.some((category) => category.key === planned.key),
      )
      .map((planned) => ({ ...planned, unavailable: true as const })),
  ];
  const categoryByKey = new Map(
    categories.map((category) => [category.key, category]),
  );
  const visibleTemplates = page?.items ?? [];
  const resultNoun = visibleTemplates.length === 1 ? "design" : "designs";

  return (
    <WorkspaceFrame categories={categories}>
      <main className={styles.page} id="main-content">
        <div className={styles.shell}>
          <section className={styles.hero} aria-labelledby="templates-title">
            <p className={styles.heroEyebrow}>Templates</p>
            <h1 className="sr-only" id="templates-title">
              Browse templates
            </h1>
            <p className={styles.heroDescription}>
              Beautifully crafted designs to help your words feel at home. Find
              the right design for your message.
            </p>
            {query ? (
              <p className={styles.searchStatus} role="status">
                {visibleTemplates.length > 0
                  ? `Showing ${visibleTemplates.length} ${resultNoun} on this page for `
                  : "No designs on this page for "}
                &quot;{query}&quot;.{" "}
                <Link href={templatesHref(selectedCategory?.key)}>
                  Clear search
                </Link>
              </p>
            ) : null}
          </section>

          {catalogError ? (
            <section className={styles.state} role="alert">
              <p className={styles.eyebrow}>Catalog unavailable</p>
              <h2>We could not load the templates.</h2>
              <p>Try again in a moment.</p>
              <Link
                className={styles.headerAction}
                href={templatesHref(selectedCategory?.key)}
              >
                Try again
              </Link>
            </section>
          ) : (
            <>
              <CategoryFilterRail items={categoryFilterItems} />

              <section
                className={styles.templateSection}
                aria-labelledby="template-list-title"
              >
                <h2 className="sr-only" id="template-list-title">
                  Available designs
                </h2>

                {visibleTemplates.length === 0 ? (
                  <div className={styles.state} role="status">
                    <p className={styles.eyebrow}>Nothing here yet</p>
                    <h2>
                      {query
                        ? "No designs match your search."
                        : "No designs are available in this category yet."}
                    </h2>
                    <p>
                      {query
                        ? "Try another word or browse all categories."
                        : "Choose another category or browse all designs."}
                    </p>
                    <Link
                      className={styles.headerAction}
                      href={templatesHref(undefined, query)}
                    >
                      Browse all categories
                    </Link>
                  </div>
                ) : (
                  <div
                    className={styles.templateGrid}
                    data-template-count={visibleTemplates.length}
                  >
                    {visibleTemplates.map((template) => (
                      <CatalogTemplateCard
                        categoryName={
                          categoryByKey.get(template.categoryKey)?.name ??
                          template.categoryKey
                        }
                        key={template.id}
                        template={template}
                      />
                    ))}
                  </div>
                )}
                {visibleTemplates.length > 0 &&
                (page?.previousCursor || page?.nextCursor) ? (
                  <nav
                    aria-label="Template page navigation"
                    className={styles.pagination}
                  >
                    {page.previousCursor ? (
                      <Link
                        className={styles.paginationLink}
                        href={templatesHref(
                          selectedCategory?.key,
                          query,
                          page.previousCursor,
                          "before",
                        )}
                      >
                        Previous designs
                      </Link>
                    ) : null}
                    {page.nextCursor ? (
                      <Link
                        className={styles.paginationLink}
                        href={templatesHref(
                          selectedCategory?.key,
                          query,
                          page.nextCursor,
                          "after",
                        )}
                      >
                        Next designs
                      </Link>
                    ) : null}
                  </nav>
                ) : null}
              </section>
            </>
          )}
        </div>
      </main>
    </WorkspaceFrame>
  );
}
