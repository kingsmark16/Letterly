import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "../../../lib/catalog";
import { CatalogTemplateCard } from "../../../src/features/catalog/components/catalog-template-card";
import { WorkspaceFrame } from "../../../src/features/pages/components/dashboard-shell";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Category templates | Letterly",
  description: "Choose a Letterly design for your message.",
};

type TemplateCategoryPageProps = {
  params: Promise<{ categoryKey: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

function categoryHref(categoryKey: string, query?: string): string {
  const path = "/templates/" + encodeURIComponent(categoryKey);
  return query ? path + "?q=" + encodeURIComponent(query) : path;
}

export default async function TemplateCategoryPage({
  params,
  searchParams,
}: TemplateCategoryPageProps): Promise<React.JSX.Element> {
  const [{ categoryKey }, search] = await Promise.all([params, searchParams]);
  const query =
    (Array.isArray(search.q) ? search.q.at(-1) : search.q)
      ?.trim()
      .slice(0, 120) ?? "";

  let catalog: Awaited<ReturnType<typeof getCatalog>> | null = null;
  let catalogError = false;

  try {
    catalog = await getCatalog();
  } catch {
    catalogError = true;
  }

  const categories = catalog?.categories ?? [];
  const category = categories.find((item) => item.key === categoryKey);

  if (!category && !catalogError) {
    notFound();
  }

  const categoryName =
    category?.name ??
    categoryKey
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const templates = (catalog?.templates ?? []).filter(
    (template) => template.categoryKey === categoryKey,
  );
  const visibleTemplates = query
    ? templates.filter((template) =>
        [template.name, template.description]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : templates;
  const resultNoun = visibleTemplates.length === 1 ? "design" : "designs";

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
                {visibleTemplates.length} {resultNoun} found for &quot;{query}
                &quot;.{" "}
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
                href={categoryHref(categoryKey, query)}
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
            </section>
          )}
        </div>
      </main>
    </WorkspaceFrame>
  );
}
