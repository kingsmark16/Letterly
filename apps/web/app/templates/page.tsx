import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "../../lib/catalog";
import { CatalogTemplateCard } from "../../src/features/catalog/components/catalog-template-card";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Templates | Letterly",
  description: "Find the right shape for the words you want to share.",
};

type TemplatesPageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function TemplatesPage({
  searchParams,
}: TemplatesPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const requestedCategory = Array.isArray(params.category)
    ? params.category.at(-1)
    : params.category;

  let catalog: Awaited<ReturnType<typeof getCatalog>> | null = null;
  let catalogError = false;

  try {
    catalog = await getCatalog();
  } catch {
    catalogError = true;
  }

  const categories = catalog?.categories ?? [];
  const templates = catalog?.templates ?? [];
  const selectedCategory = categories.find(
    (category) => category.key === requestedCategory,
  );
  const visibleTemplates = selectedCategory
    ? templates.filter(
        (template) => template.categoryKey === selectedCategory.key,
      )
    : templates;
  const categoryByKey = new Map(
    categories.map((category) => [category.key, category]),
  );

  return (
    <main className={styles.page} id="main-content">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.wordmark} href="/dashboard/home">
            letterly
          </Link>
          <nav aria-label="Template navigation">
            <ul className={styles.navList}>
              <li>
                <Link href="/dashboard/home">Home</Link>
              </li>
              <li>
                <Link href="/dashboard">My letters</Link>
              </li>
              <li>
                <Link aria-current="page" href="/templates">
                  Templates
                </Link>
              </li>
            </ul>
          </nav>
          <Link className={styles.headerAction} href="/sign-in">
            Sign in
          </Link>
        </header>

        <section className={styles.hero} aria-labelledby="templates-title">
          <div>
            <p className={styles.eyebrow}>A shape for what matters</p>
            <h1 id="templates-title">
              Start with the feeling, not a blank page.
            </h1>
            <p>
              Browse every Letterly category, choose a starting point, and make
              the page your own before you share it.
            </p>
          </div>
          <div className={styles.heroNote}>
            <span>Letterly catalog</span>
            <strong>{templates.length} templates</strong>
            <small>Each one has its own rhythm and capabilities.</small>
          </div>
        </section>

        {catalogError ? (
          <section className={styles.state} role="alert">
            <p className={styles.eyebrow}>Catalog unavailable</p>
            <h2>We are preparing the right words.</h2>
            <p>Try the collection again in a moment.</p>
            <Link className={styles.headerAction} href="/templates">
              Try again
            </Link>
          </section>
        ) : (
          <>
            <section aria-labelledby="category-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>Explore by category</p>
                  <h2 id="category-title">Find the right kind of story.</h2>
                </div>
                <p>
                  Every category is a different invitation. Choose one to see
                  the templates inside it.
                </p>
              </div>

              <div className={styles.categoryGrid}>
                <Link
                  className={
                    selectedCategory
                      ? styles.categoryCard
                      : styles.categoryCardSelected
                  }
                  href="/templates"
                  aria-current={selectedCategory ? undefined : "page"}
                >
                  <span>All categories</span>
                  <strong>{templates.length} templates</strong>
                  <small>See the whole collection.</small>
                </Link>
                {categories.map((category) => {
                  const count = templates.filter(
                    (template) => template.categoryKey === category.key,
                  ).length;
                  const isSelected = selectedCategory?.key === category.key;

                  return (
                    <Link
                      className={
                        isSelected
                          ? styles.categoryCardSelected
                          : styles.categoryCard
                      }
                      href={`/templates?category=${encodeURIComponent(category.key)}`}
                      key={category.key}
                      aria-current={isSelected ? "page" : undefined}
                    >
                      <span>{category.name}</span>
                      <strong>{count} templates</strong>
                      <small>
                        {category.description ?? "A place to begin."}
                      </small>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section
              className={styles.templateSection}
              aria-labelledby="template-list-title"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>
                    {selectedCategory?.name ?? "The full collection"}
                  </p>
                  <h2 id="template-list-title">
                    {selectedCategory
                      ? `Templates for ${selectedCategory.name.toLowerCase()}.`
                      : "Make it unmistakably yours."}
                  </h2>
                </div>
                <p>
                  {visibleTemplates.length === 0
                    ? "This category is waiting for its first published template."
                    : `${visibleTemplates.length} starting point${visibleTemplates.length === 1 ? "" : "s"} ready to explore.`}
                </p>
              </div>

              {visibleTemplates.length === 0 ? (
                <div className={styles.state} role="status">
                  <p className={styles.eyebrow}>Nothing here yet</p>
                  <h2>Something thoughtful is on its way.</h2>
                  <p>Choose another category or return to all templates.</p>
                  <Link className={styles.headerAction} href="/templates">
                    See all templates
                  </Link>
                </div>
              ) : (
                <div className={styles.templateGrid}>
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
            </section>
          </>
        )}

        <footer className={styles.footer}>
          <span>Private by default.</span>
          <Link href="/dashboard/home">Back to your workspace</Link>
        </footer>
      </div>
    </main>
  );
}
