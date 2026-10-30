import Link from "next/link";
import { CreateDraftButton } from "../components/create-draft-button";
import { RegisteredTemplatePreview } from "./registered-preview";
import { getWebTemplate } from "../../../templates/registration";
import { getTemplateVersionIdFromStartPath } from "../../../lib/return-path";
import styles from "./template-preview-dialog.module.css";

export type TemplatePreviewContentProps = {
  capabilities: string[];
  categoryKey?: string;
  version?: number;
  startHref: string;
  templateKey: string;
  templateVersionId?: string;
  templateName?: string;
};

const capabilityLabels: Record<string, string> = {
  images: "Memory images",
  audio: "Optional music",
  questions: "Interactive questions",
  visitorMessage: "Private replies",
  passwordProtection: "Password protection",
};

export function TemplatePreviewContent({
  capabilities,
  categoryKey,
  version,
  startHref,
  templateKey,
  templateVersionId,
  templateName,
}: TemplatePreviewContentProps): React.JSX.Element {
  const registration = getWebTemplate({
    templateKey,
    ...(categoryKey !== undefined ? { categoryKey } : {}),
    ...(version !== undefined ? { version } : {}),
  });
  const activeTemplateVersionId =
    templateVersionId ?? getTemplateVersionIdFromStartPath(startHref);

  return (
    <div className={styles.previewLayout}>
      <div className={styles.previewStage}>
        <div
          className={`${styles.letterPreviewScroll} ${
            registration?.thumbnailAppearance === "journey"
              ? styles.journeyPreviewScroll
              : ""
          }`}
          role="region"
          aria-label={registration?.previewLabel ?? "Template sample preview"}
          tabIndex={0}
        >
          {registration ? (
            <div
              className={
                registration.thumbnailAppearance === "journey"
                  ? styles.journeyPreview
                  : undefined
              }
            >
              <RegisteredTemplatePreview
                identity={{
                  templateKey: registration.templateKey,
                  registryKey: registration.id,
                  version: registration.version,
                }}
              />
            </div>
          ) : (
            <div className={styles.previewPaper}>
              <p className={styles.previewKicker}>A page made for feeling</p>
              <p className={styles.previewRecipient}>For someone special</p>
              <span className={styles.previewSeal}>L</span>
              <p className={styles.previewPrompt}>Open when you are ready</p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.dialogContent}>
        <div className={styles.capabilitySection}>
          <p className={styles.capabilityHeading}>What this design supports</p>
          <ul className={styles.capabilityList}>
            {capabilities.map((capability) => (
              <li key={capability}>
                {capabilityLabels[capability] ?? capability}
              </li>
            ))}
          </ul>
        </div>

        {activeTemplateVersionId ? (
          <CreateDraftButton
            className={styles.useLink}
            label="Use this template"
            templateVersionId={activeTemplateVersionId}
            templateName={templateName}
          />
        ) : (
          <Link className={styles.useLink} href="/templates">
            Browse templates
          </Link>
        )}
      </div>
    </div>
  );
}
