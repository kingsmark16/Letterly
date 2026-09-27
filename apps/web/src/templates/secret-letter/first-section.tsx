import type { ReactNode } from "react";
import styles from "./renderer.module.css";

type SecretLetterFirstSectionProps = {
  letterTitle: string;
  heroActions?: ReactNode;
  headingId?: string;
  staticWordmark?: boolean;
  storyId?: string;
};

function HeartIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

export function SecretLetterFirstSection({
  letterTitle,
  heroActions,
  headingId = "hero-heading",
  staticWordmark = false,
  storyId = "our-story",
}: SecretLetterFirstSectionProps): React.JSX.Element {
  const wordmarkContent = (
    <>
      <HeartIcon />
      <span>{letterTitle}</span>
    </>
  );

  return (
    <>
      <header className={styles.siteHeader}>
        {staticWordmark ? (
          <span className={styles.wordmark}>{wordmarkContent}</span>
        ) : (
          <a
            className={styles.wordmark}
            href={`#${storyId}`}
            aria-label={`${letterTitle}. Go to the beginning`}
          >
            {wordmarkContent}
          </a>
        )}
      </header>

      <section id={storyId} className={styles.hero} aria-labelledby={headingId}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            A little corner of the internet, just for you
          </p>
          <h2 id={headingId}>
            I’ve been meaning
            <br />
            to tell you... <span aria-hidden="true">♡</span>
          </h2>
          <p className={styles.heroLead}>
            You make ordinary days feel like
            <br />
            the kind I want to remember forever.
          </p>
          {heroActions ? (
            <div className={styles.heroActions}>{heroActions}</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
