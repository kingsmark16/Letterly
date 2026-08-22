import { Container } from "@repo/ui/container";
import { Stack } from "@repo/ui/stack";
import styles from "./page.module.css";

export default function Loading(): React.JSX.Element {
  return (
    <main aria-busy="true" aria-live="polite" id="main-content">
      <p className={styles.loadingAnnouncement}>Loading templates</p>
      <Container className={styles.loadingMain}>
        <Stack className={styles.loadingHero} direction="horizontal" gap={8}>
          <div className={styles.loadingCopy}>
            <span className={styles.loadingEyebrow} />
            <span className={styles.loadingTitle} />
            <span className={styles.loadingParagraph} />
            <Stack
              className={styles.loadingButtons}
              direction="horizontal"
              gap={3}
            >
              <span className={styles.loadingButton} />
              <span className={styles.loadingButton} />
            </Stack>
          </div>
          <div className={styles.loadingPreview}>
            <span className={styles.loadingBar} />
            <span className={styles.loadingPreviewCard} />
          </div>
        </Stack>

        <section
          className={styles.loadingSection}
          aria-label="Loading templates"
        >
          <span className={styles.loadingEyebrow} />
          <span className={styles.loadingHeading} />
          <span className={styles.loadingSectionParagraph} />
          <div className={styles.loadingCards}>
            <span className={styles.loadingCard} />
            <span className={styles.loadingCard} />
          </div>
        </section>
      </Container>
    </main>
  );
}
