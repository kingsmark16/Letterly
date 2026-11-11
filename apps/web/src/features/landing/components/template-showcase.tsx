import type { TemplateCatalogSummary } from "@letterly/contracts/catalog";
import { Link as UiLink } from "@repo/ui/link";
import { Status } from "@repo/ui/status";
import Image from "next/image";
import Link from "next/link";
import { getCategoryThumbnail } from "../../../lib/category-thumbnails";
import { createTemplateStartPath } from "../../../lib/return-path";
import { TemplatePreviewDialog } from "../../catalog/preview/template-preview-dialog";
import type { LandingCatalog } from "../landing-catalog";
import { landingCatalogHref } from "../landing-catalog";
import { catalogRecoveryLinkClasses } from "../landing-link-styles";
import sharedStyles from "../page.module.css";
import styles from "./template-showcase.module.css";
import { TemplateCardBorder } from "./template-card-border";
import { TemplateCardEffects } from "./template-card-effects";
import { TemplateCarousel } from "./template-carousel";
const catalogStatusClasses =
  "min-h-0 rounded-large bg-[color:var(--landing-surface)] border-[color:var(--landing-line)] p-[1.25rem] data-[state=error]:border-[color:var(--landing-line)]";

type TemplateCardProps = {
  template: TemplateCatalogSummary;
};

function TemplateArtwork({
  template,
}: {
  template: TemplateCatalogSummary;
}): React.JSX.Element {
  const categoryThumbnail = getCategoryThumbnail(template.categoryKey);
  const isJourney = template.key === "choose-your-heart";

  if (categoryThumbnail) {
    return (
      <div
        className={styles.templateArtwork}
        data-category-image={template.categoryKey}
        data-template-key={template.key}
        aria-hidden="true"
      >
        <Image
          alt=""
          className={styles.templateCategoryImage}
          data-category-thumbnail={template.categoryKey}
          fill
          sizes="(min-width: 64rem) 34rem, (min-width: 48rem) 45vw, calc(100vw - 2rem)"
          src={categoryThumbnail}
        />
      </div>
    );
  }

  return (
    <div
      className={`${styles.templateArtwork} ${
        isJourney ? styles.journeyArtwork : styles.letterArtwork
      }`}
      data-template-key={template.key}
      aria-hidden="true"
    >
      <div className={styles.artPaperBack} />
      <div className={styles.artPaper}>
        <span>{isJourney ? "A question for you" : "For someone special"}</span>
        <strong>
          {isJourney ? "Choose with your heart" : "Open when ready"}
        </strong>
        <i />
        <i />
        {isJourney ? (
          <span className={styles.artChoices}>
            <b>A</b>
            <b>B</b>
            <b>C</b>
          </span>
        ) : (
          <span className={styles.artSeal}>L</span>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template }: TemplateCardProps): React.JSX.Element {
  const capabilities = template.currentVersion.capabilities;
  const templateVersionId = template.currentVersion.id;
  const startHref = templateVersionId
    ? createTemplateStartPath(templateVersionId)
    : "/sign-in";

  return (
    <li id={`template-${template.id}`}>
      <article
        className={styles.templateCard}
        data-template-card={template.key}
      >
        <TemplateCardBorder />
        <TemplateArtwork template={template} />
        <div className={styles.templateCardContent}>
          <div>
            <span className={styles.cardCategoryBadge}>
              {template.categoryKey === "confession"
                ? "Confession"
                : template.categoryKey === "birthday"
                  ? "Birthday"
                  : template.categoryKey.replace(/-/g, " ")}
            </span>
            <h3>
              <a
                className={styles.templateCardTitleLink}
                href={`#template-${template.id}`}
              >
                {template.name}
              </a>
            </h3>
          </div>
          <div className={styles.cardActions}>
            <TemplatePreviewDialog
              capabilities={capabilities}
              description={
                template.description ?? "A personal way to say what matters."
              }
              categoryKey={template.categoryKey}
              version={template.currentVersion.version}
              templateKey={template.key}
              templateName={template.name}
              startHref={startHref}
              templateVersionId={templateVersionId}
            />
            {templateVersionId ? (
              <Link
                className={sharedStyles.templateUseLink}
                href={`/sign-up?returnTo=${encodeURIComponent(startHref)}`}
                aria-label={`Create draft with ${template.name}`}
              >
                Create draft
              </Link>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
}

function CatalogUnavailable(): React.JSX.Element {
  return (
    <Status
      className={`${styles.catalogState} ${catalogStatusClasses}`}
      error={
        <>
          <p className={sharedStyles.eyebrow}>Catalog unavailable</p>
          <h2>We are preparing the right words.</h2>
          <p>
            The category collection is temporarily unavailable. Please try again
            shortly.
          </p>
        </>
      }
      recovery={
        <UiLink className={catalogRecoveryLinkClasses} href="/">
          Try again
        </UiLink>
      }
      state="error"
    />
  );
}

function EmptyCatalog({
  filtered = false,
}: {
  filtered?: boolean;
}): React.JSX.Element {
  return (
    <Status
      className={`${styles.catalogState} ${catalogStatusClasses}`}
      empty={
        <>
          <p className={sharedStyles.eyebrow}>Designs</p>
          <h2>
            {filtered
              ? "No designs in this category yet."
              : "Something thoughtful is on its way."}
          </h2>
          <p>
            {filtered
              ? "Choose another category to keep browsing."
              : "The catalog has no designs yet. Check back soon."}
          </p>
        </>
      }
      state="empty"
    />
  );
}

export function TemplateShowcase({
  catalog,
  catalogError,
  categoryKey,
  fixture,
}: {
  catalog: LandingCatalog | null;
  catalogError: boolean;
  categoryKey?: string;
  fixture?: string;
}): React.JSX.Element {
  const categories = catalog?.categories ?? [];
  const templates = catalog?.page.items ?? [];

  return (
    <section
      className={styles.templateSection}
      id="templates"
      data-section-entry
      aria-labelledby="templates-title"
    >
      <div className={styles.templateGallery}>
        <div className={styles.templateGalleryIntro}>
          <p className={`${sharedStyles.eyebrow} ${styles.templateEyebrow}`}>
            Pick a feeling. Find your words.
          </p>
          <h2 id="templates-title" className={styles.templateGalleryTitle}>
            A place for every feeling.
          </h2>
          <p className={styles.templateSubcopy}>
            Find a design that feels like you. Make it mean something to them.
          </p>
        </div>

        <div className={styles.templateBrowseBar}>
          <nav aria-label="Browse categories">
            <ul className={styles.templateCategories}>
              <li>
                <Link
                  className={`${styles.templateCategory} ${!categoryKey ? styles.templateCategoryActive : ""}`}
                  href={landingCatalogHref({ fixture })}
                  aria-current={!categoryKey ? "page" : undefined}
                  scroll={false}
                  prefetch={false}
                >
                  All categories
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.key}>
                  <Link
                    className={`${styles.templateCategory} ${categoryKey === category.key ? styles.templateCategoryActive : ""}`}
                    href={landingCatalogHref({
                      categoryKey: category.key,
                      fixture,
                    })}
                    aria-current={
                      categoryKey === category.key ? "page" : undefined
                    }
                    scroll={false}
                    prefetch={false}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.templateStage}>
          {catalogError ? (
            <CatalogUnavailable />
          ) : templates.length === 0 ? (
            <EmptyCatalog filtered={Boolean(categoryKey)} />
          ) : (
            <TemplateCardEffects
              key={`${categoryKey ?? "all"}:${catalog?.page.items[0]?.id ?? "empty"}`}
            >
              <TemplateCarousel itemCount={templates.length}>
                <ol
                  aria-label="Available Letterly designs"
                  className={styles.templateGrid}
                >
                  {templates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </ol>
              </TemplateCarousel>
            </TemplateCardEffects>
          )}
        </div>
        {!catalogError &&
        (catalog?.page.previousCursor || catalog?.page.nextCursor) ? (
          <nav
            className={styles.templatePagination}
            aria-label="Template page navigation"
          >
            {catalog.page.previousCursor ? (
              <Link
                className={styles.templatePageLink}
                href={landingCatalogHref({
                  categoryKey,
                  fixture,
                  cursor: catalog.page.previousCursor,
                  direction: "before",
                })}
                prefetch={false}
              >
                Previous designs
              </Link>
            ) : null}
            {catalog.page.nextCursor ? (
              <Link
                className={styles.templatePageLink}
                href={landingCatalogHref({
                  categoryKey,
                  fixture,
                  cursor: catalog.page.nextCursor,
                })}
                prefetch={false}
              >
                Next designs
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
