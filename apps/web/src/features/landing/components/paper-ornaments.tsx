import { useId } from "react";
import styles from "./letter-still-life.module.css";

function EngravedCorner({
  className,
}: {
  className: string;
}): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 44V22q0-10 10-10h22M7 34V20Q7 7 20 7h14" />
        <path d="M12 28c5-1 8-5 8-10-5 0-8 4-8 10ZM28 12c-1 5-5 8-10 8 0-5 4-8 10-8Z" />
        <path d="M8 8c-5-1-5-6-3-7 4 0 6 3 3 7Zm0 0c-1 4-5 5-7 3 0-4 4-6 7-3Zm0 0c4-2 8 0 8 4-4 2-7 0-8-4Z" />
        <path d="M12 39h-2m29-27v-2" />
      </g>
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="7" cy="39" r="1" fill="currentColor" />
      <circle cx="39" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

export function PaperEngraving(): React.JSX.Element {
  const id = useId();
  return (
    <>
      <svg
        className={styles.paperTexture}
        viewBox="0 0 300 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={`${id}-fiber`} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="300" height="300" filter={`url(#${id}-fiber)`} />
      </svg>
      <EngravedCorner
        className={`${styles.paperCorner} ${styles.paperCornerTopLeft}`}
      />
      <EngravedCorner
        className={`${styles.paperCorner} ${styles.paperCornerTopRight}`}
      />
      <EngravedCorner
        className={`${styles.paperCorner} ${styles.paperCornerBottomLeft}`}
      />
      <EngravedCorner
        className={`${styles.paperCorner} ${styles.paperCornerBottomRight}`}
      />
      <svg
        className={styles.paperImprint}
        viewBox="0 0 140 28"
        fill="none"
        aria-hidden="true"
      >
        <g
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M57 17C42 17 30 11 18 14M83 17c15 0 27-6 39-3M48 16c-3-7-10-9-14-8 2 6 7 9 14 8ZM37 14c-5 5-11 6-16 3 4-4 10-6 16-3ZM92 16c3-7 10-9 14-8-2 6-7 9-14 8Zm11-2c5 5 11 6 16 3-4-4-10-6-16-3Z" />
          <path d="M70 22s-9-5.2-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.8-9 11-9 11Z" />
          <path d="M62 23h-9m25 0h9M9 14h-4m126 0h4" />
        </g>
        <circle cx="14" cy="14" r="1" fill="currentColor" />
        <circle cx="126" cy="14" r="1" fill="currentColor" />
      </svg>
    </>
  );
}

export function PaperStamp({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 28 32"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="24"
        height="28"
        rx="1"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeDasharray="1.6 1.3"
      />
      <rect
        x="4.5"
        y="4.5"
        width="19"
        height="23"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="0.55"
      />
      <path
        d="M14 21s-7-4.3-7-8.5a3.8 3.8 0 0 1 7-2.2 3.8 3.8 0 0 1 7 2.2C21 16.7 14 21 14 21Z"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <path d="M9 24h10M11 6.5h6" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );
}
