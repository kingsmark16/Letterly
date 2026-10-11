import styles from "../page.module.css";
type HeroContextIconName = "note" | "question" | "memory";

const heroContextMoments = [
  { icon: "note", label: "A note they can reread" },
  { icon: "question", label: "A question worth answering" },
  { icon: "memory", label: "A memory worth keeping" },
] as const satisfies ReadonlyArray<{
  icon: HeroContextIconName;
  label: string;
}>;

const heroContextConnectorLinePath = "M 18 70 H 442 M 558 70 H 982";
const heroContextConnectorLeftPath = "M 18 70 H 442";
const heroContextConnectorRightPath = "M 982 70 H 558";
const heroContextConnectorHeartPath =
  "M 500 130 C 489 118 451 89 436 66 C 423 46 427 26 441 16 C 454 6 474 10 487 21 C 493 26 497 32 500 38 C 504 31 509 24 515 19 C 528 8 548 7 561 18 C 574 30 579 49 568 68 C 553 91 516 118 500 130 Z";

function HeroContextIcon({
  name,
}: {
  name: HeroContextIconName;
}): React.JSX.Element {
  return (
    <svg
      className={styles.heroContextIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "note" ? (
        <>
          <path d="M6.5 3.75h8l3 3v13.5h-11z" />
          <path d="M14.5 3.75v3h3M9 11h6M9 14.5h6M9 18h3" />
        </>
      ) : name === "question" ? (
        <>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M9.75 9.75a2.25 2.25 0 1 1 3.74 1.7c-.68.53-1.49.93-1.49 2.05M12 16.75h.01" />
        </>
      ) : (
        <path d="M12 19.5s-6.7-3.98-7.5-8.55C3.9 7.55 6.1 5 8.75 5c1.43 0 2.58.7 3.25 1.75C12.67 5.7 13.82 5 15.25 5 17.9 5 20.1 7.55 19.5 10.95 18.7 15.52 12 19.5 12 19.5Z" />
      )}
    </svg>
  );
}

function HeroContextConnector(): React.JSX.Element {
  return (
    <div className={styles.heroContextConnector} aria-hidden="true">
      <svg viewBox="0 0 1000 140" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient
            id="hero-context-connector-gradient"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0%" stopColor="var(--landing-orange-soft)" />
            <stop offset="50%" stopColor="var(--landing-orange)" />
            <stop offset="100%" stopColor="var(--landing-orange-soft)" />
          </linearGradient>
          <radialGradient id="hero-context-connector-orb-gradient">
            <stop offset="0%" stopColor="#fffdfd" stopOpacity="0.98" />
            <stop
              offset="35%"
              stopColor="var(--landing-orange)"
              stopOpacity="0.92"
            />
            <stop
              offset="100%"
              stopColor="var(--landing-orange)"
              stopOpacity="0"
            />
          </radialGradient>
          <linearGradient
            id="hero-context-heart-base-gradient"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#ff7188" />
            <stop offset="34%" stopColor="#f45170" />
            <stop offset="68%" stopColor="#d33861" />
            <stop offset="100%" stopColor="#8d244b" />
          </linearGradient>
          <clipPath id="hero-context-connector-line-clip">
            <rect x="0" y="0" width="438" height="140" />
            <rect x="562" y="0" width="438" height="140" />
          </clipPath>
        </defs>
        <g clipPath="url(#hero-context-connector-line-clip)">
          <path
            className={styles.heroContextConnectorAura}
            d={heroContextConnectorLinePath}
          />
          <path
            className={styles.heroContextConnectorBase}
            d={heroContextConnectorLinePath}
          />
          <path
            className={styles.heroContextConnectorSweep}
            d={heroContextConnectorLeftPath}
            pathLength={1}
          />
          <path
            className={styles.heroContextConnectorSweep}
            d={heroContextConnectorRightPath}
            pathLength={1}
          />
        </g>
        <path
          className={styles.heroContextConnectorHeartCover}
          d={heroContextConnectorHeartPath}
        />
        <path
          className={styles.heroContextConnectorHeartFill}
          d={heroContextConnectorHeartPath}
        />
        <path
          className={styles.heroContextConnectorHeartBase}
          d={heroContextConnectorHeartPath}
        />
        <path
          className={styles.heroContextConnectorHeartHighlight}
          d="M 450 25 C 442 31 438 42 440 52"
        />
        <path
          className={styles.heroContextConnectorHeartFillGlow}
          d={heroContextConnectorHeartPath}
        />
        <path
          className={styles.heroContextConnectorHeartGlow}
          d={heroContextConnectorHeartPath}
          pathLength={1}
        />
        <circle
          className={styles.heroContextConnectorOrb}
          cx="18"
          cy="70"
          r="9"
          fill="url(#hero-context-connector-orb-gradient)"
        >
          <animate
            attributeName="cx"
            values="18;500;500"
            keyTimes="0;0.64;1"
            keySplines="0.65 0 0.35 1; 0 0 1 1"
            calcMode="spline"
            dur="12s"
            begin="0s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          className={styles.heroContextConnectorOrb}
          cx="982"
          cy="70"
          r="9"
          fill="url(#hero-context-connector-orb-gradient)"
        >
          <animate
            attributeName="cx"
            values="982;500;500"
            keyTimes="0;0.64;1"
            keySplines="0.65 0 0.35 1; 0 0 1 1"
            calcMode="spline"
            dur="12s"
            begin="0s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}

export function HeroContextSection(): React.JSX.Element {
  return (
    <section
      className={styles.heroContextSection}
      aria-label="Letterly moments"
    >
      <HeroContextConnector />
      <ul className={styles.heroContextList}>
        {heroContextMoments.map((moment) => (
          <li
            key={moment.label}
            className={styles.heroContextCard}
            data-reveal="right"
          >
            <span className={styles.heroContextIconFrame}>
              <HeroContextIcon name={moment.icon} />
            </span>
            <span className={styles.heroContextItemLabel}>{moment.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
