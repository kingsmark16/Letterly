import {
  EnvelopeArtwork,
  WaxSeal,
} from "../../landing/components/envelope-artwork";
import styles from "./sign-in-form.module.css";

export function AuthStationery(): React.JSX.Element {
  return (
    <div className={styles.stationery} aria-hidden="true">
      <svg className={styles.botanical} viewBox="0 0 520 330" fill="none">
        <ellipse cx="260" cy="164" rx="218" ry="140" />
        <ellipse cx="260" cy="164" rx="230" ry="150" strokeDasharray="2 10" />
        <path d="M425 264c27-60 37-110 29-157m-5 79c-21-6-32-21-29-35 17 1 29 15 29 35Zm7-44c-3-18 3-34 16-39 6 18 0 30-16 39ZM92 253c-27-37-39-74-36-111m8 54c-19-4-30-15-29-29 16 0 27 12 29 29Zm-8-34c1-17 9-29 21-31 1 16-6 27-21 31Z" />
        <path d="m116 60 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Zm279 6 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
      </svg>
      <div className={styles.letterScene}>
        <div className={styles.envelopeBack} />
        <div className={styles.paper}>
          <span>A LETTER, JUST FOR YOU</span>
          <p>Dear you,</p>
          <p>
            There’s something
            <br />
            I’ve been meaning to say.
          </p>
          <svg viewBox="0 0 80 16" fill="none">
            <path d="M0 8h25m30 0h25M40 14S31 9 31 5a5 5 0 0 1 9-2 5 5 0 0 1 9 2c0 4-9 9-9 9Z" />
          </svg>
        </div>
        <div className={styles.envelopeFront}>
          <EnvelopeArtwork className={styles.envelopeGraphic} />
          <WaxSeal className={styles.waxSeal} />
        </div>
      </div>
    </div>
  );
}
