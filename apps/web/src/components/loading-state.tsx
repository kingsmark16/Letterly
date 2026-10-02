import Image from "next/image";
import Link from "next/link";
import appLogo from "../../assets/images/app-logo.png";
import styles from "./loading-state.module.css";

interface LoadingStateProps {
  title?: string;
  description?: string;
  variant?: "screen" | "page" | "section";
  id?: string;
  hideFooter?: boolean;
}

export function LoadingState({
  title = "Loading Letterly",
  description = "Just a moment while we get things ready.",
  variant = "screen",
  id,
  hideFooter = variant !== "section",
}: LoadingStateProps): React.JSX.Element {
  const Surface = variant === "section" ? "section" : "main";
  const Heading = variant === "section" ? "h2" : "h1";

  return (
    <Surface
      className={`${styles.loading} ${styles[variant]}`}
      id={id ?? (variant === "screen" ? "main-content" : undefined)}
      aria-busy="true"
      aria-label={title}
      data-page-loading={hideFooter ? "true" : undefined}
    >
      {variant === "screen" ? (
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Letterly home">
            <Image src={appLogo} alt="" sizes="8rem" className={styles.logo} />
          </Link>
        </header>
      ) : null}
      <div className={styles.center}>
        <div className={styles.content} role="status" aria-live="polite">
          <svg
            className={styles.envelope}
            viewBox="0 0 160 144"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <ellipse
              cx="80"
              cy="131"
              rx="49"
              ry="5"
              fill="#8b2946"
              opacity="0.08"
            />
            <path
              d="M25 65 76 32a8 8 0 0 1 8 0l51 33v52H25Z"
              fill="#efd0c8"
              stroke="#d9afa6"
            />
            <g className={styles.paper}>
              <rect
                x="47"
                y="34"
                width="66"
                height="82"
                rx="5"
                fill="#fffdf8"
                stroke="#e3c7bd"
              />
              <path
                d="M60 48h40M60 55h28M60 94h40"
                stroke="#dec5be"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M80 84s-12-8-12-16a6.4 6.4 0 0 1 12-3 6.4 6.4 0 0 1 12 3c0 8-12 16-12 16Z"
                fill="#a33355"
              />
            </g>
            <path
              d="M25 65 80 102l55-37v53a7 7 0 0 1-7 7H32a7 7 0 0 1-7-7Z"
              fill="#f7e5dc"
              stroke="#d9afa6"
            />
            <path
              d="m27 121 43-34M133 121 90 87"
              stroke="#dfbeb3"
              strokeLinecap="round"
            />
            <path
              d="M30 121 75 90a9 9 0 0 1 10 0l45 31"
              stroke="#fff8ee"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <Heading className={styles.title}>{title}</Heading>
          <p className={styles.description}>{description}</p>
          <span className={styles.progress} aria-hidden="true" />
        </div>
      </div>
    </Surface>
  );
}
