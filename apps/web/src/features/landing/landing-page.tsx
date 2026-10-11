import { Link as UiLink } from "@repo/ui/link";
import Image from "next/image";
import Link from "next/link";
import appFavicon from "../../../assets/images/app-favicon.png";
import appLogo from "../../../assets/images/app-logo.png";
import BlurText from "../../components/BlurText";
import { SiteFooter } from "../../components/site-footer";
import { siteFooterLinkClasses } from "../../components/site-footer-link";
import { LegalPolicyDialog } from "../legal/legal-policy-dialog";
import { PrivacyDocument } from "../legal/privacy-document";
import { TermsDocument } from "../legal/terms-document";
import { LandingEffects } from "./components/landing-effects";
import { FloatingLetterField } from "./components/floating-letter-field";
import { HeroContextSection } from "./components/hero-context-section";
import { TemplateShowcase } from "./components/template-showcase";
import { HowLetterlyWorks } from "./components/how-letterly-works";
import { FrequentlyAskedQuestions } from "./components/frequently-asked-questions";
import type { LandingCatalog } from "./landing-catalog";
import {
  announcementLinkClasses,
  signInLinkClasses,
  headerSignUpLinkClasses,
  heroStartLinkClasses,
  categoryPromptLinkClasses,
} from "./landing-link-styles";
import styles from "./page.module.css";

function BrandLogo({
  compact = false,
  priority = false,
}: {
  compact?: boolean;
  priority?: boolean;
} = {}): React.JSX.Element {
  return (
    <Image
      className={compact ? styles.brandIcon : styles.brandLogo}
      src={compact ? appFavicon : appLogo}
      alt=""
      aria-hidden="true"
      sizes={compact ? "2.25rem" : "(max-width: 48rem) 6.75rem, 8.25rem"}
      priority={priority}
    />
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
    <div className={styles.page} data-landing-root>
      <LandingEffects />
      <FloatingLetterField />
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <aside className={styles.announcement} aria-label="Letterly note">
        <span>A private place for the words that matter.</span>
        <UiLink className={announcementLinkClasses} href="#templates">
          Find a category <span aria-hidden="true">›</span>
        </UiLink>
      </aside>

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Letterly home">
          <BrandLogo priority />
        </Link>

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
          <div className={styles.heroGrid} aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} />
            ))}
          </div>

          <div className={styles.heroContent} data-reveal>
            <h1 id="hero-title" className={styles.heroTitle}>
              <span className={styles.heroTitleAccessible}>
                Say what your heart has been holding.
              </span>
              <span className={styles.heroTitleVisual} aria-hidden="true">
                <BlurText
                  as="span"
                  text="Say what your heart"
                  className={styles.heroTitleLine}
                  animateBy="words"
                  direction="bottom"
                  delay={75}
                  stepDuration={0.28}
                  threshold={0.2}
                  aria-hidden
                />
                <BlurText
                  as="span"
                  text="has been holding."
                  className={`${styles.heroTitleLine} ${styles.heroTitleAccent}`}
                  animateBy="words"
                  direction="bottom"
                  delay={95}
                  stepDuration={0.32}
                  threshold={0.2}
                  aria-hidden
                />
              </span>
            </h1>
            <p className={styles.heroDescription}>
              Create a personal page for the words, memories, and questions that
              deserve more than an ordinary message.
            </p>
            <div className={styles.heroActions}>
              <UiLink
                href="/sign-in"
                data-magnetic
                className={heroStartLinkClasses}
              >
                Get started <Arrow />
              </UiLink>
            </div>
            <UiLink
              className={`${styles.startPrompt} ${categoryPromptLinkClasses}`}
              href="#templates"
              data-magnetic
              data-spotlight
            >
              <span>
                <BrandLogo compact />
                Start with a category
              </span>
              <strong>Find the right shape for your story</strong>
              <Arrow />
            </UiLink>
          </div>
        </section>

        <HeroContextSection />
        <TemplateShowcase catalog={catalog} catalogError={catalogError} />
        <HowLetterlyWorks />
        <FrequentlyAskedQuestions />
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
    </div>
  );
}
