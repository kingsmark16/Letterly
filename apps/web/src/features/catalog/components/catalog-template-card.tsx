import type { TemplateCatalogItem } from "@letterly/contracts/catalog";
import Image from "next/image";
import { TemplatePreviewDialog } from "../../../components/template-preview-dialog";
import { TemplateFirstSectionThumbnail } from "../../../components/template-first-section-thumbnail";
import { getCategoryThumbnail } from "../../../lib/category-thumbnails";
import { createTemplateStartPath } from "../../../lib/return-path";
import { capabilityLabels, getTemplateIntro } from "../catalog-copy";
import { CreateDraftButton } from "./create-draft-button";
import styles from "./catalog-template-card.module.css";

type CatalogTemplateCardProps = {
  categoryName: string;
  template: TemplateCatalogItem;
};

export function CatalogTemplateCard({
  categoryName,
  template,
}: CatalogTemplateCardProps): React.JSX.Element {
  const version = template.versions.at(-1);
  const capabilities = version?.capabilities ?? [];
  const startHref = version
    ? createTemplateStartPath(version.id)
    : "/templates";
  const categoryThumbnail = getCategoryThumbnail(template.categoryKey);

  return (
    <article
      className={styles.card}
      id={version ? "template-" + version.id : undefined}
    >
      <div className={styles.artwork}>
        {categoryThumbnail ? (
          <Image
            alt=""
            className={styles.categoryImage}
            data-category-thumbnail={template.categoryKey}
            sizes="(min-width: 48rem) 23rem, (min-width: 32rem) 32rem, calc(100vw - 2rem)"
            src={categoryThumbnail}
          />
        ) : (
          <TemplateFirstSectionThumbnail templateKey={template.key} />
        )}
        <span className={styles.category}>{categoryName}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.copy}>
          <h3>{template.name}</h3>
          <p>{getTemplateIntro(template.key, template.description)}</p>
          {capabilities.length > 0 ? (
            <p className={styles.capabilities}>
              {capabilities
                .slice(0, 3)
                .map((capability) => capabilityLabels[capability] ?? capability)
                .join(" · ")}
            </p>
          ) : null}
          <div className={styles.actions}>
            <TemplatePreviewDialog
              capabilities={capabilities}
              description={
                template.description ?? "A personal way to say what matters."
              }
              templateKey={template.key}
              templateName={template.name}
              startHref={startHref}
              templateVersionId={version?.id}
            />
            {version ? (
              <CreateDraftButton
                className={styles.createDraftButton}
                label="Create draft"
                templateVersionId={version.id}
                templateName={template.name}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
