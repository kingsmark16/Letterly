import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import appLogo from "../../../assets/images/app-logo.png";
import {
  TermsDocument,
  termsContents,
  termsLastUpdated,
} from "@/features/legal/terms-document";
import styles from "@/features/legal/legal-page.module.css";

export const metadata: Metadata = {
  title: "Terms and Conditions | Letterly",
  description:
    "The terms that apply when you create, publish, visit, or respond to a Letterly page.",
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

export default function TermsPage(): React.JSX.Element {
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
        <section className={styles.hero} aria-labelledby="terms-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Private beta legal draft</p>
            <h1 id="terms-title">Terms and Conditions</h1>
            <p className={styles.heroDescription}>
              The agreement for creating, sharing, opening, and responding to a
              Letterly page.
            </p>
            <div className={styles.metaRow}>
              <span>Last updated</span>
              <time dateTime="2026-09-13">{termsLastUpdated}</time>
            </div>
          </div>

          <aside className={styles.heroNote} aria-label="Terms at a glance">
            <p className={styles.noteLabel}>At a glance</p>
            <ul>
              <li>Creators keep ownership of their content.</li>
              <li>Drafts stay private until a creator publishes.</li>
              <li>Visitors can open a shared page without an account.</li>
              <li>Reports help us respond to unsafe public content.</li>
            </ul>
          </aside>
        </section>

        <div className={styles.contentGrid}>
          <aside className={styles.toc} aria-label="Terms contents">
            <p className={styles.tocLabel}>On this page</p>
            <nav>
              <ol>
                {termsContents.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <TermsDocument />
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
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms" aria-current="page">
            Terms
          </Link>
        </nav>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Letterly
        </p>
      </footer>
    </div>
  );
}
