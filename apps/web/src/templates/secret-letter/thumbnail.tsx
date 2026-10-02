import { SecretLetterFirstSection } from "./first-section";
import styles from "./renderer.module.css";
export function SecretLetterThumbnail({
  id,
  letterTitle,
}: {
  id: string;
  letterTitle?: string;
}): React.JSX.Element {
  return (
    <div className={styles.rootFrame}>
      <div className={styles.root} data-preview="true">
        <main className={styles.mainContent}>
          <article className={styles.letterShell}>
            <SecretLetterFirstSection
              headingId={`${id}-heading`}
              letterTitle={letterTitle?.trim() || "For you, always"}
              staticWordmark
              storyId={`${id}-story`}
            />
          </article>
        </main>
      </div>
    </div>
  );
}
