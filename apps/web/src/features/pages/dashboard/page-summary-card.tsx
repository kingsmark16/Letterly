import type { PageSummary } from "@letterly/contracts/pages";
import Link from "next/link";
import { TemplateFirstSectionThumbnail } from "../../../components/template-first-section-thumbnail";
import { DashboardIcon } from "./dashboard-icons";
import styles from "./page-workspace.module.css";

const pageStatusLabels: Record<PageSummary["status"], string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  UNPUBLISHED: "Unpublished",
  ARCHIVED: "Archived",
};

export function getPageSummaryTitle(page: PageSummary): string {
  return (
    page.preview?.title?.trim() ||
    (page.template.key === "choose-your-heart"
      ? page.template.name
      : "Untitled page")
  );
}

interface PageSummaryCardProps {
  page: PageSummary;
  href: string;
  ariaLabel: string;
  signature: React.ReactNode;
  metadataLabel: string;
  metadataValue: React.ReactNode;
  thumbnailInstanceId?: string;
}

export function PageSummaryCard({
  page,
  href,
  ariaLabel,
  signature,
  metadataLabel,
  metadataValue,
  thumbnailInstanceId,
}: PageSummaryCardProps): React.JSX.Element {
  const title = getPageSummaryTitle(page);

  return (
    <li>
      <Link className={styles.pageCard} href={href} aria-label={ariaLabel}>
        <div className={styles.pageCardArtwork}>
          <TemplateFirstSectionThumbnail
            context="page"
            instanceId={thumbnailInstanceId ?? `page-${page.id}`}
            journeyQuestion={
              page.template.key === "choose-your-heart"
                ? (page.preview?.firstQuestion ?? null)
                : undefined
            }
            letterTitle={page.preview?.title}
            version={page.template.version}
            registryKey={page.template.registryKey}
            templateKey={page.template.key}
          />
        </div>
        <div className={styles.pageCardBody}>
          <div className={styles.pageCardHeader}>
            <span className={styles.pageTemplate}>
              <span className={styles.templateIcon}>
                <DashboardIcon
                  name={
                    page.template.key === "choose-your-heart"
                      ? "heart"
                      : "envelope"
                  }
                />
              </span>
              <span>{page.template.name}</span>
            </span>
            <span className={styles.statusBadge} data-status={page.status}>
              <span className={styles.statusDot} aria-hidden="true" />
              {pageStatusLabels[page.status]}
            </span>
          </div>
          <div className={styles.pageCardContent}>
            <h3>{title}</h3>
            <div className={styles.pageCardSubline}>
              <p className={styles.pageRecipient}>To {page.recipientLabel}</p>
              <span className={styles.cardSignature}>{signature}</span>
            </div>
            <div className={styles.cardDivider} aria-hidden="true">
              <span className={styles.cardDividerLine} />
              <DashboardIcon className={styles.cardDividerIcon} name="heart" />
              <span className={styles.cardDividerLine} />
            </div>
            <dl className={styles.pageMeta}>
              <div>
                <dt>{metadataLabel}</dt>
                <dd>{metadataValue}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Link>
    </li>
  );
}
