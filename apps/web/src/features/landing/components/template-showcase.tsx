import type { TemplateCatalogSummary } from "@letterly/contracts/catalog";
import { Link as UiLink } from "@repo/ui/link";
import { Status } from "@repo/ui/status";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { getCategoryThumbnail } from "../../../lib/category-thumbnails";
import { createTemplateStartPath } from "../../../lib/return-path";
import { TemplatePreviewDialog } from "../../catalog/preview/template-preview-dialog";
import type { LandingCatalog } from "../landing-catalog";
import { catalogRecoveryLinkClasses } from "../landing-link-styles";
import { TemplateScrollStack } from "./template-scroll-stack";
import sharedStyles from "../page.module.css";
import styles from "./template-showcase.module.css";
const catalogStatusClasses =
  "min-h-0 rounded-large bg-[color:var(--landing-surface)] border-[color:var(--landing-line)] p-[1.25rem] data-[state=error]:border-[color:var(--landing-line)]";

type TemplateCardProps = {
  position: number;
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

function TemplateCard({
  position,
  template,
}: TemplateCardProps): React.JSX.Element {
  const capabilities = template.currentVersion.capabilities;
  const templateVersionId = template.currentVersion.id;
  const startHref = templateVersionId
    ? createTemplateStartPath(templateVersionId)
    : "/sign-in";

  return (
    <li
      id={`template-${template.id}`}
      style={{ "--template-index": position - 1 } as CSSProperties}
    >
      <article className={styles.templateCard} data-reveal>
        <TemplateArtwork template={template} />
        <div className={styles.templateCardContent}>
          <h3>
            <a
              className={styles.templateCardTitleLink}
              href={`#template-${template.id}`}
            >
              {template.name}
            </a>
          </h3>
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

function EmptyCatalog(): React.JSX.Element {
  return (
    <Status
      className={`${styles.catalogState} ${catalogStatusClasses}`}
      empty={
        <>
          <p className={sharedStyles.eyebrow}>Designs</p>
          <h2>Something thoughtful is on its way.</h2>
          <p>The catalog has no designs yet. Check back soon.</p>
        </>
      }
      state="empty"
    />
  );
}

export function TemplateShowcase({
  catalog,
  catalogError,
}: {
  catalog: LandingCatalog | null;
  catalogError: boolean;
}): React.JSX.Element {
  const categories = catalog?.categories ?? [];
  const templates = categories.flatMap((category) => category.templates);

  return (
    <section
      className={styles.templateSection}
      id="templates"
      aria-labelledby="templates-title"
    >
      <div className={styles.templateGallery}>
        <div className={styles.templateGalleryIntro} data-reveal="left">
          <p className={`${sharedStyles.eyebrow} ${styles.templateEyebrow}`}>
            Pick a feeling. Find your words.
          </p>
          <h2 id="templates-title" className={styles.templateGalleryTitle}>
            Category gallery
          </h2>
          <p className={styles.templateSubcopy}>
            Start with a little inspiration. Begin with what matters.
          </p>
        </div>

        <div className={styles.templateBrowseBar} data-reveal="right">
          <nav aria-label="Browse categories">
            <ul className={styles.templateCategories}>
              <li>
                <Link
                  className={`${styles.templateCategory} ${styles.templateCategoryActive}`}
                  href="/templates"
                >
                  All categories
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.key}>
                  <Link
                    className={styles.templateCategory}
                    href={"/templates/" + encodeURIComponent(category.key)}
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
            <EmptyCatalog />
          ) : (
            <TemplateScrollStack
              ariaLabel="Available Letterly designs"
              className={styles.templateGrid}
            >
              {templates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  position={index + 1}
                  template={template}
                />
              ))}
            </TemplateScrollStack>
          )}
        </div>
      </div>
    </section>
  );
}
