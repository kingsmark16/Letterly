import { frequentlyAskedQuestions } from "../../../content/letterly-information";
import styles from "../page.module.css";
import faqStyles from "./frequently-asked-questions.module.css";
export function FrequentlyAskedQuestions(): React.JSX.Element {
  return (
    <section className={styles.faqSection} id="faq" aria-labelledby="faq-title">
      <div className={faqStyles.faqIntro}>
        <p className={styles.eyebrow}>FAQ</p>
        <h2 id="faq-title">Frequently asked questions</h2>
      </div>
      <div className={faqStyles.faqList}>
        {frequentlyAskedQuestions.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <span aria-hidden="true">＋</span>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
