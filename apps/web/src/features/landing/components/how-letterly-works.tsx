import { HowItWorksProgress } from "./how-it-works-progress";
import styles from "../page.module.css";
const howItWorksSteps = [
  {
    number: "1",
    label: "Choose",
    title: "Start with a category.",
    description:
      "Browse the gallery and choose a format that fits the mood, moment, and person you have in mind.",
    visual: "choose",
    visualLabel: "Category gallery",
    visualTitle: "Pick a place to begin",
  },
  {
    number: "2",
    label: "Write",
    title: "Build around your message.",
    description:
      "Add your words and complete the sections that belong to the selected design.",
    visual: "write",
    visualLabel: "Page editor",
    visualTitle: "Write what matters",
  },
  {
    number: "3",
    label: "Preview",
    title: "See the finished experience.",
    description:
      "Review the page as a recipient will see it, including its layout and interactions.",
    visual: "preview",
    visualLabel: "Preview mode",
    visualTitle: "See it as they will",
  },
  {
    number: "4",
    label: "Publish",
    title: "Share it when ready.",
    description:
      "Keep the draft private while you work, then publish and send the finished page when the moment feels right.",
    visual: "share",
    visualLabel: "Published page",
    visualTitle: "Ready to share",
  },
] as const;

export function HowLetterlyWorks(): React.JSX.Element {
  return (
    <section
      className={styles.howItWorksSection}
      id="how-it-works"
      aria-labelledby="how-it-works-title"
    >
      <div className={styles.howItWorksHeader} data-reveal="left">
        <h2 id="how-it-works-title">How Letterly works</h2>
        <p>
          Every design has its own layout and features. Letterly keeps the
          process clear from your first choice to the final share.
        </p>
      </div>

      <HowItWorksProgress className={styles.howItWorksRail}>
        <span className={styles.howItWorksRailLine} aria-hidden="true" />
        <span
          className={styles.howItWorksRailFill}
          data-scroll-progress-fill
          aria-hidden="true"
        />
        <ol
          className={styles.howItWorksSteps}
          aria-label="Letterly creation steps"
        >
          {howItWorksSteps.map((step, index) => {
            const headingId = `how-it-works-step-${step.number}`;

            return (
              <li
                key={step.number}
                className={styles.howItWorksItem}
                data-reveal={index % 2 === 0 ? "left" : "right"}
                data-scroll-progress-item
              >
                <span
                  className={styles.howItWorksMarker}
                  data-scroll-progress-marker
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <article
                  className={styles.howItWorksCard}
                  data-spotlight
                  aria-labelledby={headingId}
                >
                  <div
                    className={styles.howItWorksVisual}
                    data-step-visual={step.visual}
                    aria-hidden="true"
                  >
                    <span className={styles.howItWorksVisualBack} />
                    <span className={styles.howItWorksVisualSheet}>
                      <small>{step.visualLabel}</small>
                      <strong>{step.visualTitle}</strong>
                      <span className={styles.howItWorksVisualRules}>
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                  </div>

                  <div className={styles.howItWorksCopy}>
                    <p className={styles.howItWorksLabel}>{step.label}</p>
                    <h3 id={headingId}>{step.title}</h3>
                    <p className={styles.howItWorksDescription}>
                      {step.description}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </HowItWorksProgress>
    </section>
  );
}
