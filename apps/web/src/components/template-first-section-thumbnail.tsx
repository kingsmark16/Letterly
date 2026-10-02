import type { ChooseYourHeartQuestion } from "../templates/choose-your-heart/first-section";
import { getWebTemplate } from "../templates/registration";
import { templateThumbnails } from "../templates/thumbnails";
import styles from "./template-first-section-thumbnail.module.css";

type TemplateFirstSectionThumbnailProps = {
  context?: "catalog" | "page";
  instanceId?: string;
  journeyQuestion?: ChooseYourHeartQuestion | null;
  letterTitle?: string;
  templateKey: string;
  categoryKey?: string;
  version?: number;
  registryKey?: string;
};
export function TemplateFirstSectionThumbnail({
  context = "catalog",
  instanceId,
  journeyQuestion,
  letterTitle,
  templateKey,
  categoryKey,
  version,
  registryKey,
}: TemplateFirstSectionThumbnailProps): React.JSX.Element {
  const registration = getWebTemplate({
    templateKey,
    ...(categoryKey !== undefined ? { categoryKey } : {}),
    ...(version !== undefined ? { version } : {}),
    ...(registryKey !== undefined ? { registryKey } : {}),
  });
  const Thumbnail = registration
    ? templateThumbnails[registration.id]
    : undefined;
  const appearance =
    registration?.thumbnailAppearance === "journey"
      ? styles.journeyArtwork
      : styles.letterArtwork;
  return (
    <div
      className={`${styles.artwork} ${appearance} ${context === "page" ? styles.pageArtwork : ""}`}
      data-template-key={templateKey}
      data-template-thumbnail={templateKey}
      aria-hidden="true"
    >
      {Thumbnail ? (
        <div className={styles.actualTemplateFrame}>
          <Thumbnail
            id={instanceId?.trim() || `template-${templateKey}`}
            journeyQuestion={journeyQuestion}
            letterTitle={letterTitle}
          />
        </div>
      ) : (
        <span data-template-placeholder="true">Letterly</span>
      )}
    </div>
  );
}
