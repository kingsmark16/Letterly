import { Link as UiLink } from "@repo/ui/link";
import Image from "next/image";
import Link from "next/link";
import appFavicon from "../../../assets/images/app-favicon.png";
import { SiteFooter } from "../../components/site-footer";
import { siteFooterLinkClasses } from "../../components/site-footer-link";
import { LegalPolicyDialog } from "../legal/legal-policy-dialog";
import { PrivacyDocument } from "../legal/privacy-document";
import { TermsDocument } from "../legal/terms-document";
import { HeroContextSection } from "./components/hero-context-section";
import { LetterStillLife } from "./components/letter-still-life";
import { LandingMotion } from "./components/landing-motion";
import { TemplateShowcase } from "./components/template-showcase";
import { HowLetterlyWorks } from "./components/how-letterly-works";
import { FrequentlyAskedQuestions } from "./components/frequently-asked-questions";
import type { LandingCatalog } from "./landing-catalog";
import {
  signInLinkClasses,
  headerSignUpLinkClasses,
  heroStartLinkClasses,
} from "./landing-link-styles";
import styles from "./page.module.css";

function BrandLogo(): React.JSX.Element {
  return (
    <>
      <Image
        className={styles.brandIcon}
        src={appFavicon}
        alt=""
        aria-hidden="true"
        sizes="2rem"
        priority
      />
      <span className={styles.brandName} aria-hidden="true">
        Letterly
      </span>
    </>
  );
}

function Arrow(): React.JSX.Element {
  return <span aria-hidden="true">↗</span>;
}

export function LandingPage({
  catalog,
  catalogError,
}: {
  catalog: LandingCatalog | null;
  catalogError: boolean;
}): React.JSX.Element {
  return (
    <LandingMotion className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Letterly home">
          <BrandLogo />
        </Link>

        <nav className={styles.headerNav} aria-label="Main navigation">
          <a href="#templates">The collection</a>
          <a href="#how-it-works">How it works</a>
        </nav>

        <div className={styles.headerActions}>
          <UiLink className={signInLinkClasses} href="/sign-in">
            Sign in
          </UiLink>
          <UiLink className={headerSignUpLinkClasses} href="/sign-in">
            Sign up
          </UiLink>
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroContent} data-hero-copy>
            <p className={styles.heroEyebrow}>
              A little courage. A letter to remember.
            </p>
            <h1 id="hero-title" className={styles.heroTitle}>
              Say what your heart <em>has been holding.</em>
            </h1>
            <p className={styles.heroDescription}>
              For the feelings too big for a text. Turn your words and memories
              into a personal page they can open, feel, and come back to.
            </p>
            <div className={styles.heroActions}>
              <UiLink href="/sign-in" className={heroStartLinkClasses}>
                Write your letter <Arrow />
              </UiLink>
              <a className={styles.collectionLink} href="#templates">
                Find your inspiration
              </a>
            </div>
            <p className={styles.heroNote}>
              Made by you. Shared when you’re ready.
            </p>
          </div>
          <LetterStillLife />
        </section>

        <HeroContextSection />
        <TemplateShowcase catalog={catalog} catalogError={catalogError} />
        <HowLetterlyWorks />
        <FrequentlyAskedQuestions />
        <section
          className={styles.finalAction}
          aria-labelledby="final-title"
          data-section-entry
        >
          <p className={styles.eyebrow}>For someone on your mind</p>
          <h2 id="final-title">
            You have the words.
            <br />
            <em>Give them a place.</em>
          </h2>
          <p>
            A first confession. An everyday love. Something you’ve been meaning
            to say.
          </p>
          <UiLink href="/sign-in" className={styles.finalLink}>
            Write your letter <Arrow />
          </UiLink>
          <span className={styles.finalPostscript}>With love, Letterly</span>
        </section>
      </main>

      <SiteFooter
        bottom={<span>© {new Date().getFullYear()} Letterly</span>}
        links={
          <>
            <UiLink className={siteFooterLinkClasses} href="#templates">
              Categories
            </UiLink>
            <UiLink className={siteFooterLinkClasses} href="#how-it-works">
              How it works
            </UiLink>
            <UiLink className={siteFooterLinkClasses} href="#faq">
              FAQ
            </UiLink>
            <LegalPolicyDialog
              triggerClassName={siteFooterLinkClasses}
              privacyContent={<PrivacyDocument />}
              termsContent={<TermsDocument />}
            />
            <UiLink className={siteFooterLinkClasses} href="/sign-in">
              Sign in
            </UiLink>
          </>
        }
        navigationLabel="Footer navigation"
      />
    </LandingMotion>
  );
}
