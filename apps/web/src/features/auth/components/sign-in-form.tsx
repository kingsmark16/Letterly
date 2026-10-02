"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import appFavicon from "../../../../assets/images/app-favicon.png";
import appLogo from "../../../../assets/images/app-logo.png";
import facebookIcon from "../../../../assets/images/fb.png";
import googleIcon from "../../../../assets/images/google.png";
import { LegalPolicyDialog } from "../../../components/legal-policy-dialog";
import { LoadingState } from "../../../components/loading-state";
import { authClient } from "../../../lib/auth-client";
import type { EmailPasswordMode } from "./email-password-form";
import styles from "./sign-in-form.module.css";

type OAuthProvider = "google" | "facebook";

export interface SignInFormProps {
  mode?: EmailPasswordMode;
  returnTo?: string;
  initialError?: boolean;
  privacyContent: ReactNode;
  termsContent: ReactNode;
}

const providerNames: Record<OAuthProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};

export function BrandLogo({
  compact = false,
  priority = false,
}: {
  compact?: boolean;
  priority?: boolean;
} = {}): React.JSX.Element {
  return (
    <Image
      className={compact ? styles.panelMark : styles.brandLogo}
      src={compact ? appFavicon : appLogo}
      alt=""
      aria-hidden="true"
      sizes={compact ? "2rem" : "(max-width: 48rem) 6.25rem, 8.25rem"}
      priority={priority}
    />
  );
}

export function SignInFooter({
  privacyContent,
  termsContent,
  compact = false,
}: {
  privacyContent: ReactNode;
  termsContent: ReactNode;
  compact?: boolean;
}): React.JSX.Element {
  if (compact) {
    return (
      <footer className={styles.compactFooter}>
        <span>© {new Date().getFullYear()} Letterly</span>
        <nav aria-label="Footer navigation">
          <LegalPolicyDialog
            privacyContent={privacyContent}
            termsContent={termsContent}
          />
        </nav>
      </footer>
    );
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footerLead}>
        <Link className={styles.wordmark} href="/" aria-label="Letterly home">
          <BrandLogo />
        </Link>
        <p>A place for the words that matter.</p>
      </div>

      <nav className={styles.footerLinks} aria-label="Footer navigation">
        <Link href="/#templates">Categories</Link>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/#faq">FAQ</Link>
        <LegalPolicyDialog
          privacyContent={privacyContent}
          termsContent={termsContent}
        />
        <Link href="/sign-in">Sign in</Link>
      </nav>

      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} Letterly</span>
      </div>
    </footer>
  );
}

export function SignInForm({
  mode = "sign-in",
  returnTo = "/templates",
  initialError = false,
  privacyContent,
  termsContent,
}: SignInFormProps): React.JSX.Element {
  const isSignIn = mode === "sign-in";
  const router = useRouter();
  const session = authClient.useSession();
  const [hasResolvedSession, setHasResolvedSession] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError
      ? isSignIn
        ? "We could not complete sign in. Please try again."
        : "We could not complete account setup. Please try again."
      : null,
  );

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    setHasResolvedSession(true);

    if (session.data) {
      router.replace(returnTo);
    }
  }, [returnTo, router, session.data, session.isPending]);

  if (!hasResolvedSession || session.data) {
    return (
      <LoadingState
        title={session.data ? "Opening your letters" : "Checking your session"}
        description={
          session.data
            ? "You are signed in. Getting your pages ready."
            : "Just a moment while we check your account."
        }
      />
    );
  }

  async function continueWith(provider: OAuthProvider): Promise<void> {
    setPendingProvider(provider);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: returnTo,
        errorCallbackURL: `/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
      });

      if (result.error) {
        setErrorMessage(
          "We could not start " +
            providerNames[provider] +
            " sign in. Please try again.",
        );
      }
    } catch {
      setErrorMessage("We could not start sign in. Please try again.");
    } finally {
      setPendingProvider(null);
    }
  }

  return (
    <div className={`${styles.page} ${styles.socialPage}`}>
      <main className={`${styles.main} ${styles.mainSingle}`} id="main-content">
        <section
          className={styles.panel}
          aria-labelledby={isSignIn ? "continue-title" : "create-title"}
        >
          <header className={styles.authIntroduction}>
            <Link
              className={styles.wordmark}
              href="/"
              aria-label="Letterly home"
            >
              <BrandLogo priority />
            </Link>
            <h1 id={isSignIn ? "continue-title" : "create-title"}>
              {isSignIn ? "Welcome back" : "Create your account"}
            </h1>
            <p className={styles.panelCopy}>
              {isSignIn
                ? "Choose Google or Facebook to open your pages and drafts."
                : "Choose Google or Facebook to create your Letterly account."}
            </p>
          </header>
          <div className={styles.authOptions}>
            <div className={styles.providerList}>
              {(["google", "facebook"] as const).map((provider) => {
                const isPending = pendingProvider === provider;

                return (
                  <button
                    key={provider}
                    className={styles.providerButton}
                    type="button"
                    disabled={pendingProvider !== null}
                    aria-busy={isPending}
                    aria-label={"Continue with " + providerNames[provider]}
                    title={"Continue with " + providerNames[provider]}
                    onClick={() => void continueWith(provider)}
                  >
                    <span className={styles.providerMark} aria-hidden="true">
                      <Image
                        className={styles.providerIcon}
                        src={provider === "google" ? googleIcon : facebookIcon}
                        alt=""
                        sizes="1.5rem"
                      />
                    </span>
                    <span>Continue with {providerNames[provider]}</span>
                  </button>
                );
              })}
            </div>

            {pendingProvider ? (
              <p className={styles.statusMessage} role="status">
                Opening a secure sign in window.
              </p>
            ) : null}
            {errorMessage ? (
              <p className={styles.errorMessage} role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className={styles.emailComingSoon}>
              <span>Email and password</span>
              <span className={styles.comingSoonLabel}>Coming soon</span>
            </div>
          </div>
          <div className={styles.authClosing}>
            <p className={styles.switchPrompt}>
              {isSignIn ? "New to Letterly?" : "Already have an account?"}{" "}
              <Link
                href={`${isSignIn ? "/sign-up" : "/sign-in"}?returnTo=${encodeURIComponent(returnTo)}`}
              >
                {isSignIn ? "Create an account" : "Sign in"}
              </Link>
            </p>
          </div>
        </section>
      </main>

      <SignInFooter
        compact
        privacyContent={privacyContent}
        termsContent={termsContent}
      />
    </div>
  );
}

export function SignUpForm(
  props: Omit<SignInFormProps, "mode">,
): React.JSX.Element {
  return <SignInForm {...props} mode="sign-up" />;
}
