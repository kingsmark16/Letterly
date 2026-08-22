import styles from "./template-preview-dialog.module.css";

export type TemplatePreviewContentProps = {
  capabilities: string[];
  startHref: string;
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
  startHref,
}: TemplatePreviewContentProps): React.JSX.Element {
  return (
    <div className={styles.previewLayout}>
      <div className={styles.previewStage} aria-hidden="true">
        <div className={styles.previewPaper}>
          <p className={styles.previewKicker}>A page made for feeling</p>
          <p className={styles.previewRecipient}>For someone special</p>
          <span className={styles.previewSeal}>L</span>
          <p className={styles.previewPrompt}>Open when you are ready</p>
        </div>
      </div>

      <div className={styles.dialogContent}>
        <div className={styles.capabilitySection}>
          <p className={styles.capabilityHeading}>
            What this template supports
          </p>
          <ul className={styles.capabilityList}>
            {capabilities.map((capability) => (
              <li key={capability}>
                {capabilityLabels[capability] ?? capability}
              </li>
            ))}
          </ul>
        </div>

        <a className={styles.useLink} href={startHref}>
          Use this template
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}
