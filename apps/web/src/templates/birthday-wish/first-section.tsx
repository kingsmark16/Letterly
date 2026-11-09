import type { ReactNode } from "react";
import secretLetterStyles from "../secret-letter/renderer.module.css";
import birthdayStyles from "./renderer.module.css";

type BirthdayWishFirstSectionProps = {
  letterTitle: string;
  recipientName?: string;
  heroActions?: ReactNode;
  headingId?: string;
  staticWordmark?: boolean;
  storyId?: string;
};

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

function SparkleIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 2.2 11.7 7l4.8 1.7-4.8 1.7L10 15.2 8.3 10.4 3.5 8.7 8.3 7 10 2.2Z" />
    </svg>
  );
}

export function BirthdayWishFirstSection({
  letterTitle,
  recipientName,
  heroActions,
  headingId = "hero-heading",
  staticWordmark = false,
  storyId = "birthday-story",
}: BirthdayWishFirstSectionProps): React.JSX.Element {
  const cleanRecipient = recipientName?.trim();
  const wordmarkContent = (
    <>
      <BirthdayCrestIcon />
      <span>{letterTitle}</span>
    </>
  );

  return (
    <>
      <header
        className={`${secretLetterStyles.siteHeader} ${birthdayStyles.birthdayHeader}`}
      >
        {staticWordmark ? (
          <span className={secretLetterStyles.wordmark}>{wordmarkContent}</span>
        ) : (
          <a
            className={secretLetterStyles.wordmark}
            href={`#${storyId}`}
            aria-label={`${letterTitle}. Go to the beginning`}
          >
            {wordmarkContent}
          </a>
        )}
      </header>

      <section
        id={storyId}
        className={`${secretLetterStyles.hero} ${birthdayStyles.birthdayHero}`}
        aria-labelledby={headingId}
      >
        <div className={secretLetterStyles.heroCopy}>
          <p className={birthdayStyles.heroBadge}>
            <SparkleIcon />
            <span>A birthday keepsake, made for you</span>
          </p>
          <h2 id={headingId}>
            Happy Birthday
            {cleanRecipient ? `, ${cleanRecipient}` : ""}
            <span aria-hidden="true"> ✦</span>
          </h2>
          <p className={secretLetterStyles.heroLead}>
            Here is to another year of the stories, laughter,
            <br />
            and bright moments that make you unforgettable.
          </p>
          {heroActions ? (
            <div className={secretLetterStyles.heroActions}>{heroActions}</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
