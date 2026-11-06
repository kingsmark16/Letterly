import styles from "./hero-context-section.module.css";

const moments = [
  "For the words left unsaid",
  "For your favorite memories",
  "For someone who matters",
] as const;

export function HeroContextSection(): React.JSX.Element {
  return (
    <section className={styles.section} aria-label="Letterly moments">
      <ul className={styles.moments}>
        {moments.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </section>
  );
}
