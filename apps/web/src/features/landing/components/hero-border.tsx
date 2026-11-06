import { DecorativeCanvas } from "./decorative-canvas";
import styles from "./hero-border.module.css";

function BorderKnot({ className }: { className: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 144 28" fill="none">
      <g stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
        <path d="M1 14h28c12 0 15-7 25-7 5 0 7 3 6 6-2 4-9 3-8-1M143 14h-28c-12 0-15-7-25-7-5 0-7 3-6 6 2 4 9 3 8-1" />
        <path d="M30 14c5 0 9 6 17 6 5 0 7-2 8-4M114 14c-5 0-9 6-17 6-5 0-7-2-8-4M38 12c-5-6-9-5-11-4 2 5 6 7 11 4Zm68 0c5-6 9-5 11-4-2 5-6 7-11 4Z" />
        <path d="M72 21s-9-5.4-9-11a4.9 4.9 0 0 1 9-2.8 4.9 4.9 0 0 1 9 2.8c0 5.6-9 11-9 11Z" />
        <path d="m72 1 1 2-1 2-1-2Zm0 22 1 2-1 2-1-2Z" />
      </g>
      <circle cx="19" cy="14" r="1.4" fill="currentColor" />
      <circle cx="125" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
}

function BorderCorner({ className }: { className: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <g stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
        <path d="M1 63V17Q1 1 17 1h46M7 45V20Q7 7 20 7h25" />
        <path d="M4 4c12 3 17 12 17 22M14 13c7-2 13 0 15 5-7 2-13 0-15-5ZM15 15c-3 7-1 13 4 16 3-7 1-13-4-16Z" />
        <path d="M1 50h3M50 1v3" />
      </g>
      <circle cx="1" cy="59" r="1" fill="currentColor" />
      <circle cx="59" cy="1" r="1" fill="currentColor" />
    </svg>
  );
}

export function HeroBorder(): React.JSX.Element {
  return (
    <div className={styles.border} aria-hidden="true" data-hero-border>
      <span className={`${styles.rule} ${styles.topRule}`} />
      <span className={`${styles.rule} ${styles.bottomRule}`} />
      <BorderKnot className={`${styles.knot} ${styles.topKnot}`} />
      <BorderKnot className={`${styles.knot} ${styles.bottomKnot}`} />
      <BorderCorner className={`${styles.corner} ${styles.topLeft}`} />
      <BorderCorner className={`${styles.corner} ${styles.topRight}`} />
      <BorderCorner className={`${styles.corner} ${styles.bottomLeft}`} />
      <BorderCorner className={`${styles.corner} ${styles.bottomRight}`} />
      <DecorativeCanvas effect="border" className={styles.shimmer} />
    </div>
  );
}
