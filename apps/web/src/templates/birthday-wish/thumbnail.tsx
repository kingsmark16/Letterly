import secretLetterStyles from "../secret-letter/renderer.module.css";
import { BirthdayWishFirstSection } from "./first-section";
import birthdayStyles from "./renderer.module.css";

export function BirthdayWishThumbnail({
  id,
  letterTitle,
}: {
  id: string;
  letterTitle?: string;
}): React.JSX.Element {
  return (
    <div className={secretLetterStyles.rootFrame}>
      <div
        className={`${secretLetterStyles.root} ${birthdayStyles.birthdayTheme}`}
        data-preview="true"
      >
        <main className={secretLetterStyles.mainContent}>
          <article
            className={`${secretLetterStyles.letterShell} ${birthdayStyles.keepsakeShell}`}
          >
            <BirthdayWishFirstSection
              headingId={`${id}-heading`}
              letterTitle={letterTitle?.trim() || "Birthday Wish"}
              recipientName="Elena"
              staticWordmark
              storyId={`${id}-story`}
            />
          </article>
        </main>
      </div>
    </div>
  );
}
