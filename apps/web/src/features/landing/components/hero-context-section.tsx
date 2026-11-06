import styles from "./hero-context-section.module.css";

const moments = [
  ["01", "For the words left unsaid"],
  ["02", "For your favorite memories"],
  ["03", "For someone who matters"],
] as const;

export function HeroContextSection(): React.JSX.Element {
  return (
    <section className={styles.section} aria-label="Letterly moments">
      <ul className={styles.moments}>
        {moments.map(([number, label]) => (
          <li key={number}>
            <span aria-hidden="true">{number}</span>
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
