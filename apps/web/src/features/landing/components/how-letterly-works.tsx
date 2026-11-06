import styles from "./how-letterly-works.module.css";
import { creationSteps } from "./creation-steps";
import { CreationJourney } from "./creation-journey";

export function HowLetterlyWorks(): React.JSX.Element {
  return (
    <section
      className={styles.section}
      id="how-it-works"
      data-section-entry
      aria-labelledby="how-it-works-title"
    >
      <div className={styles.inner}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>How Letterly works</p>
          <h2 id="how-it-works-title">
            From a feeling <em>to their screen.</em>
          </h2>
          <p>You bring the words. We’ll give them a beautiful home.</p>
        </div>
        <CreationJourney>
          <ol className={styles.steps} aria-label="Letterly creation steps">
            {creationSteps.map((step, index) => (
              <li key={step.title} id={`creation-step-${index + 1}`}>
                <a
                  href={`#creation-step-${index + 1}`}
                  className={styles.step}
                  data-creation-step={index}
                  aria-current={index === 0 ? "step" : undefined}
                  aria-labelledby={`creation-step-title-${index + 1}`}
                  aria-describedby={`creation-step-copy-${index + 1}`}
                >
                  <span className={styles.number} aria-hidden="true">
                    0{index + 1}
                  </span>
                  <h3 id={`creation-step-title-${index + 1}`}>{step.title}</h3>
                  <p id={`creation-step-copy-${index + 1}`}>
                    {step.description}
                  </p>
                  <svg
                    className={styles.stepArrow}
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m7 5 5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </li>
            ))}
          </ol>
        </CreationJourney>
      </div>
    </section>
  );
}
