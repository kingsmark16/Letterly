import styles from "./template-card-border.module.css";

export function TemplateCardBorder(): React.JSX.Element {
  return (
    <div className={styles.frame} data-card-border aria-hidden="true">
      <svg
        className={styles.outline}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        <rect
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          rx="2"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          className={styles.trace}
          data-card-trace
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          rx="2"
          pathLength="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {[
        styles.topLeft,
        styles.topRight,
        styles.bottomLeft,
        styles.bottomRight,
      ].map((position) => (
        <svg
          key={position}
          className={`${styles.corner} ${position}`}
          viewBox="0 0 32 32"
          fill="none"
        >
          <g stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
            <path d="M1 31V12Q1 1 12 1h19M5 23V13q0-8 8-8h10M5 5c8 1 12 6 12 13M10 9c5-2 9 0 10 4-5 1-9-1-10-4Zm0 1c-2 5-1 9 3 11 2-5 1-9-3-11Z" />
          </g>
          <circle cx="1" cy="28" r="1" fill="currentColor" />
          <circle cx="28" cy="1" r="1" fill="currentColor" />
        </svg>
      ))}
      <svg className={styles.heart} viewBox="0 0 40 18" fill="none">
        <path
          d="M0 9h9m22 0h9M20 14s-7-4.1-7-8a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 3.9-7 8-7 8Z"
          stroke="currentColor"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  );
}
