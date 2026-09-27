import { frequentlyAskedQuestions } from "../../../content/letterly-information";
import styles from "./workspace-faq.module.css";

export function WorkspaceFaq(): React.JSX.Element {
  return (
    <section className={styles.section} id="faq" aria-labelledby="home-faq-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Questions, answered</p>
        <h2 id="home-faq-title">Frequently asked questions</h2>
        <p className={styles.description}>
          A clear guide to creating, protecting, publishing, and sharing your
          Letterly page.
        </p>
      </div>

      <div className={styles.list}>
        {frequentlyAskedQuestions.map((item) => (
          <details className={styles.item} key={item.question}>
            <summary>
              <span>{item.question}</span>
              <span className={styles.toggle} aria-hidden="true" />
            </summary>
            <div className={styles.answer}>
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
