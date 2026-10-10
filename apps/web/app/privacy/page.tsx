import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import appLogo from "../../assets/images/app-logo.png";
import {
  PrivacyDocument,
  privacyContents,
  privacyLastUpdated,
} from "../../src/features/legal/privacy-document";
import styles from "../../src/features/legal/legal-page.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Letterly",
  description:
    "How Letterly collects, uses, shares, and protects information across private pages and visitor responses.",
};

function BrandMark(): React.JSX.Element {
  return (
    <Image
      className={styles.brandLogo}
      src={appLogo}
      alt=""
      aria-hidden="true"
      width={264}
      height={72}
      priority
    />
  );
}

export default function PrivacyPage(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" aria-label="Letterly home">
            <BrandMark />
          </Link>
          <nav className={styles.headerNav} aria-label="Legal page navigation">
            <Link href="/">Back to Letterly</Link>
            <Link className={styles.headerAction} href="/sign-in">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="privacy-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Private beta legal draft</p>
            <h1 id="privacy-title">Privacy Policy</h1>
            <p className={styles.heroDescription}>
              A clear account of the information Letterly handles while you
              make, share, open, and answer a personal page.
            </p>
            <div className={styles.metaRow}>
              <span>Last updated</span>
              <time dateTime="2026-09-13">{privacyLastUpdated}</time>
            </div>
          </div>

          <aside className={styles.heroNote} aria-label="Privacy at a glance">
            <p className={styles.noteLabel}>At a glance</p>
            <ul>
              <li>Drafts stay private until a creator publishes.</li>
              <li>Visitors can respond without creating an account.</li>
              <li>We do not sell letter text or visitor responses.</li>
              <li>Necessary cookies support sign in and page access.</li>
            </ul>
          </aside>
        </section>

        <div className={styles.contentGrid}>
          <aside className={styles.toc} aria-label="Privacy Policy contents">
            <p className={styles.tocLabel}>On this page</p>
            <nav>
              <ol>
                {privacyContents.map((item) => (
                  <li key={item.id}>
                    <a href={"#" + item.id}>{item.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <PrivacyDocument />
        </div>
      </main>

      <footer className={styles.footer}>
        <div>
          <Link href="/" aria-label="Return to the Letterly home page">
            <BrandMark />
          </Link>
          <p>A private place for the words that matter.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/templates">Categories</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/privacy" aria-current="page">
            Privacy
          </Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Letterly
        </p>
      </footer>
    </div>
  );
}
