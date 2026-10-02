import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import appLogo from "../../assets/images/app-logo.png";
import styles from "./site-footer.module.css";

interface SiteFooterProps {
  bottom: ReactNode;
  links: ReactNode;
  navigationLabel: string;
}

export function SiteFooter({
  bottom,
  links,
  navigationLabel,
}: SiteFooterProps): React.JSX.Element {
  return (
    <footer className={styles.footer}>
      <div className={styles.lead}>
        <Link aria-label="Letterly home" className={styles.wordmark} href="/">
          <Image
            alt=""
            aria-hidden="true"
            className={styles.logo}
            sizes="(max-width: 48rem) 6.75rem, 8.25rem"
            src={appLogo}
          />
        </Link>
        <p>A place for the words that matter.</p>
      </div>

      <nav aria-label={navigationLabel} className={styles.links}>
        {links}
      </nav>

      <div className={styles.bottom}>{bottom}</div>
    </footer>
  );
}
