import styles from "./how-letterly-works.module.css";
import { creationSteps } from "./creation-steps";
import { CreationJourney } from "./creation-journey";

const stepEyebrows = ["Choose", "Write", "Preview", "Publish"] as const;
const stepActions = [
  "Explore templates →",
  "Start writing →",
  "Preview your page →",
  "Get ready to share →",
] as const;

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
          <p className={styles.eyebrow}>From feeling to page</p>
          <h2 id="how-it-works-title">
            From a feeling <em>to their screen.</em>
          </h2>
          <p>
            Every template has its own layout and capabilities. Letterly keeps
            the process clear from your first choice to the final share.
          </p>
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
                    {index + 1}
                  </span>
                  <div className={styles.stepBody}>
                    <span className={styles.stepTag} aria-hidden="true">
                      {stepEyebrows[index]}
                    </span>
                    <h3 id={`creation-step-title-${index + 1}`}>
                      {step.title}
                    </h3>
                    <p id={`creation-step-copy-${index + 1}`}>
                      {step.description}
                    </p>
                    <span className={styles.stepActionHint} aria-hidden="true">
                      {stepActions[index]}
                    </span>
                  </div>
                  <svg
                    className={styles.stepArrow}
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m7 5 5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </li>
            ))}
          </ol>
        </CreationJourney>
        <div className={styles.journeyFootnote} aria-hidden="true">
          <span className={styles.footnoteHeart}>♡</span>
          <span>MEANINGFUL MOMENTS, BEAUTIFULLY SHARED</span>
        </div>
      </div>
    </section>
  );
}
