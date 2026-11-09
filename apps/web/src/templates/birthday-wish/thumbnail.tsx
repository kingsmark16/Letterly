import styles from "../secret-letter/renderer.module.css";

function BirthdayCrestIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.75c1.35 1.85 2 3.2 2 4.35a2 2 0 1 1-4 0c0-1.15.65-2.5 2-4.35Z" />
      <path d="M10 10.5h4v8.25H10z" />
      <path d="M6.5 18.75h11" />
      <path d="M5 6.5l1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2.5 1.2 1.2.5Z" />
      <path d="M19 6.5l1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2.5 1.2 1.2.5Z" />
    </svg>
  );
}

export function BirthdayWishThumbnail({
  id,
  letterTitle,
}: {
  id: string;
  letterTitle?: string;
}): React.JSX.Element {
  const title = letterTitle?.trim() || "Birthday Wish";
  const headingId = `${id}-heading`;
  const storyId = `${id}-story`;

  return (
    <div className={styles.rootFrame}>
      <div className={styles.root} data-preview="true">
        <main className={styles.mainContent}>
          <article className={styles.letterShell}>
            <header className={styles.siteHeader}>
              <span className={styles.wordmark}>
                <BirthdayCrestIcon />
                <span>{title}</span>
              </span>
            </header>
            <section
              id={storyId}
              className={styles.hero}
              aria-labelledby={headingId}
            >
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>
                  A birthday keepsake, made for you
                </p>
                <h2 id={headingId}>
                  Happy Birthday, Elena
                  <span aria-hidden="true"> ✦</span>
                </h2>
                <p className={styles.heroLead}>
                  Here is to another year of the stories, laughter,
                  <br />
                  and bright moments that make you unforgettable.
                </p>
              </div>
            </section>
          </article>
        </main>
      </div>
    </div>
  );
}
