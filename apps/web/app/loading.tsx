import styles from "./page.module.css";

export default function Loading(): React.JSX.Element {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <span className={styles.wordmark}>letterly</span>

        <nav aria-label="Loading navigation">
          <ul className={styles.loadingNav} aria-hidden="true">
            <li className={styles.loadingBar} />
            <li className={styles.loadingBar} />
            <li className={styles.loadingBar} />
          </ul>
        </nav>

        <div className={styles.loadingActions} aria-hidden="true">
          <span className={styles.loadingBar} />
          <span className={styles.loadingButton} />
        </div>
      </header>

      <main
        id="loading-content"
        className={styles.loadingMain}
        aria-live="polite"
      >
        <p className="sr-only">Loading Letterly.</p>

        <section className={styles.loadingHero} aria-hidden="true">
          <div className={styles.loadingCopy}>
            <span className={`${styles.loadingBar} ${styles.loadingEyebrow}`} />
            <span className={`${styles.loadingBlock} ${styles.loadingTitle}`} />
            <span
              className={`${styles.loadingBlock} ${styles.loadingParagraph}`}
            />
            <div className={styles.loadingButtons}>
              <span className={styles.loadingButton} />
              <span className={styles.loadingButton} />
            </div>
          </div>

          <div className={styles.loadingPreview}>
            <span className={styles.loadingBar} />
            <div className={styles.loadingPreviewCard}>
              <span className={styles.loadingBar} />
              <span className={styles.loadingBlock} />
              <span className={styles.loadingSeal} />
            </div>
          </div>
        </section>

        <section className={styles.loadingSection} aria-hidden="true">
          <div className={styles.loadingSectionHeading}>
            <span className={`${styles.loadingBar} ${styles.loadingEyebrow}`} />
            <span className={`${styles.loadingBlock} ${styles.loadingHeading}`} />
            <span
              className={`${styles.loadingBlock} ${styles.loadingSectionParagraph}`}
            />
          </div>

          <div className={styles.loadingCards}>
            <div className={styles.loadingCard} />
            <div className={styles.loadingCard} />
          </div>
        </section>
      </main>
    </div>
  );
}
