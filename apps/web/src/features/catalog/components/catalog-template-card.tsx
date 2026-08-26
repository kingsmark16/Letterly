import type { TemplateCatalogItem } from "@letterly/contracts/catalog";
import Link from "next/link";
import { TemplatePreviewDialog } from "../../../components/template-preview-dialog";
import { createTemplateStartPath } from "../../../lib/return-path";
import { capabilityLabels, getTemplateIntro } from "../catalog-copy";
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
  const startHref = version ? createTemplateStartPath(version.id) : "/sign-in";

  return (
    <article className={styles.card}>
      <div className={styles.artwork} aria-hidden="true">
        <span>{categoryName}</span>
        <strong>{template.name}</strong>
        <span className={styles.artworkRule} />
        <span>{capabilities.length} ways to make it yours</span>
      </div>

      <div className={styles.content}>
        <div className={styles.meta}>
          <span>{categoryName}</span>
          <span>Template</span>
        </div>
        <h3>{template.name}</h3>
        <p>{getTemplateIntro(template.key, template.description)}</p>

        {capabilities.length > 0 ? (
          <ul
            className={styles.capabilities}
            aria-label={`Capabilities for ${template.name}`}
          >
            {capabilities.map((capability) => (
              <li key={capability}>
                {capabilityLabels[capability] ?? capability}
              </li>
            ))}
          </ul>
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
          />
          <Link className={styles.useLink} href={startHref}>
            Use this template <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
