import styles from "./how-letterly-works.module.css";

const steps = [
  {
    title: "Find your feeling.",
    description:
      "Choose a design for the moment and the person you have in mind.",
  },
  {
    title: "Make it yours.",
    description:
      "Add your words and the personal touches your chosen design supports.",
  },
  {
    title: "Take a little peek.",
    description: "Preview the whole experience, just as they’ll see it.",
  },
  {
    title: "Send a little love.",
    description: "Publish when you’re ready. Share the link with your someone.",
  },
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
          <p className={styles.eyebrow}>How Letterly works</p>
          <h2 id="how-it-works-title">
            From a feeling <em>to their screen.</em>
          </h2>
          <p>You bring the words. We’ll give them a beautiful home.</p>
        </div>
        <ol className={styles.steps} aria-label="Letterly creation steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className={styles.number} aria-hidden="true">
                0{index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
