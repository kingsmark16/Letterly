import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "../../lib/catalog";
import { CatalogTemplateCard } from "../../src/features/catalog/components/catalog-template-card";
import { WorkspaceFrame } from "../../src/features/pages/components/dashboard-shell";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Templates | Letterly",
  description: "Find the right shape for the words you want to share.",
};

type TemplatesPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    q?: string | string[];
  }>;
};

type CategoryIconName =
  | "all"
  | "anniversary"
  | "birthday"
  | "confession"
  | "just-because"
  | "thank-you";

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

function CategoryIcon({ name }: { name: CategoryIconName }): React.JSX.Element {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      {name === "all" ? (
        <path d="M12 20.5S4.5 16.1 4.5 10.8A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.5 2.6c0 5.3-7.5 9.7-7.5 9.7Z" />
      ) : null}
      {name === "confession" ? (
        <>
          <path d="M3.5 5.5h17v13h-17z" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </>
      ) : null}
      {name === "birthday" ? (
        <>
          <path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" />
          <path d="M12 7H8.3a2.3 2.3 0 1 1 2.3-2.3C10.6 6 12 7 12 7Zm0 0h3.7a2.3 2.3 0 1 0-2.3-2.3C13.4 6 12 7 12 7Z" />
        </>
      ) : null}
      {name === "anniversary" ? (
        <>
          <circle cx="10" cy="13" r="5" />
          <circle cx="14" cy="13" r="5" />
          <path d="m8 6 2-3 2 3m0 0 2-3 2 3" />
        </>
      ) : null}
      {name === "thank-you" ? (
        <>
          <path d="M12 21V8m0 5c-4.5 0-7-2.5-7-6 4.5 0 7 2.5 7 6Zm0-3c4.5 0 7-2.5 7-6-4.5 0-7 2.5-7 6Z" />
          <path d="M12 17c-3 0-4.8-1.6-5.2-4.2M12 17c3 0 4.8-1.6 5.2-4.2" />
        </>
      ) : null}
      {name === "just-because" ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <circle cx="8" cy="9" r="1.5" />
          <path d="m4 18 5.5-5 3 2.5 2.5-2 5 4.5" />
        </>
      ) : null}
    </svg>
  );
}

function categoryIconName(categoryKey: string): CategoryIconName {
  if (categoryKey === "confession") return "confession";
  if (categoryKey === "birthday") return "birthday";
  if (categoryKey === "anniversary") return "anniversary";
  if (categoryKey === "thank-you") return "thank-you";
  if (categoryKey === "just-because") return "just-because";
  return "all";
}

export default async function TemplatesPage({
  searchParams,
}: TemplatesPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const query =
    (Array.isArray(params.q) ? params.q.at(-1) : params.q)
      ?.trim()
      .slice(0, 120) ?? "";
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
  const categoryTemplates = selectedCategory
    ? templates.filter(
        (template) => template.categoryKey === selectedCategory.key,
      )
    : templates;
  const categoryByKey = new Map(
    categories.map((category) => [category.key, category]),
  );
  const visibleTemplates = query
    ? categoryTemplates.filter((template) =>
        [
          template.name,
          template.description,
          categoryByKey.get(template.categoryKey)?.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : categoryTemplates;

  return (
    <WorkspaceFrame categories={categories}>
      <main className={styles.page} id="main-content">
        <div className={styles.shell}>
          <section className={styles.hero} aria-labelledby="templates-title">
            <p className={styles.heroEyebrow}>Templates</p>
            <h1 id="templates-title">
              Templates for <em>Every Story</em>
              <svg aria-hidden="true" fill="none" viewBox="0 0 58 66">
                <path d="M28 49C8 34 7 15 18 10c8-4 14 2 14 10 3-12 16-15 20-5 5 13-10 29-24 42" />
                <path d="M35 51c-4 5-8 9-14 12" />
              </svg>
            </h1>
            <p className={styles.heroDescription}>
              Beautifully crafted designs to help your words feel at home.
              <br />
              Find the right design for your message.
            </p>
            {query ? (
              <p className={styles.searchStatus} role="status">
                {visibleTemplates.length} results for “{query}”.{" "}
                <Link href="/templates">Clear search</Link>
              </p>
            ) : null}
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
              <nav
                className={styles.categoryNav}
                aria-label="Filter designs by category"
              >
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
                    <CategoryIcon name="all" />
                    <span>All Categories</span>
                  </Link>
                  {categories.map((category) => {
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
                        <CategoryIcon name={categoryIconName(category.key)} />
                        <span>{category.name}</span>
                      </Link>
                    );
                  })}
                  {plannedCategoryFilters
                    .filter(
                      (planned) =>
                        !categories.some(
                          (category) => category.key === planned.key,
                        ),
                    )
                    .map((planned) => (
                      <span
                        aria-disabled="true"
                        className={styles.categoryCardUnavailable}
                        key={planned.key}
                      >
                        <CategoryIcon name={planned.icon} />
                        <span>{planned.name}</span>
                        <small>Coming soon</small>
                      </span>
                    ))}
                </div>
              </nav>

              <section
                className={styles.templateSection}
                aria-labelledby="template-list-title"
              >
                <h2 className="sr-only" id="template-list-title">
                  {selectedCategory
                    ? `Designs for ${selectedCategory.name.toLowerCase()}`
                    : "Available designs"}
                </h2>

                {visibleTemplates.length === 0 ? (
                  <div className={styles.state} role="status">
                    <p className={styles.eyebrow}>Nothing here yet</p>
                    <h2>
                      {query
                        ? "No designs match your search."
                        : "Something thoughtful is on its way."}
                    </h2>
                    <p>
                      {query
                        ? "Try a different word or return to all categories."
                        : "Choose another category or return to all categories."}
                    </p>
                    <Link className={styles.headerAction} href="/templates">
                      See all categories
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
              </section>
            </>
          )}
        </div>
      </main>
    </WorkspaceFrame>
  );
}
