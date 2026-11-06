import styles from "./letter-still-life.module.css";

export function LetterStillLife(): React.JSX.Element {
  return (
    <figure
      className={styles.scene}
      aria-label="A sample letter, tucked into a rose envelope"
    >
      <div className={styles.backdrop} aria-hidden="true" />
      <svg
        className={styles.botanical}
        viewBox="0 0 160 300"
        fill="none"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M81 291C71 211 110 137 94 20M88 208C51 191 37 155 34 127M90 172C122 156 133 129 135 105M94 117C63 103 54 80 56 58M96 76C119 63 125 42 122 22" />
          <path d="M34 127C8 116 12 94 15 88C38 94 42 110 34 127ZM34 127C57 116 54 98 48 90C33 99 29 111 34 127ZM56 58C33 49 35 29 40 20C59 30 63 43 56 58ZM135 105C112 95 114 73 118 66C139 75 143 91 135 105ZM122 22C108 17 105 6 109 2C124 4 130 12 122 22ZM72 245C43 233 33 217 37 199C61 205 75 220 72 245ZM86 224C114 218 130 199 127 183C104 187 87 203 86 224Z" />
        </g>
      </svg>
      <div className={styles.envelopeBack} aria-hidden="true" />
      <div className={styles.letter}>
        <span className={styles.letterLabel}>A LETTER, JUST FOR YOU</span>
        <p className={styles.salutation}>To my favorite person,</p>
        <p>
          Somewhere between our ordinary days, you became my favorite part of
          them.
        </p>
        <p>I just thought you should know.</p>
        <span className={styles.letterHeart} aria-hidden="true">
          ♡
        </span>
      </div>
      <div className={styles.envelopeFront} aria-hidden="true">
        <span className={styles.foldLeft} />
        <span className={styles.foldRight} />
        <span className={styles.foldBottom} />
        <span className={styles.seal}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <path d="M12 19s-7-4.2-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 4.8-7 9-7 9Z" />
          </svg>
        </span>
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.captionLine} aria-hidden="true" />A small
        letter. A whole lot of feeling.
        <small>Sample letter</small>
      </figcaption>
    </figure>
  );
}
