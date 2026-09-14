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
import { authClient } from "../../../lib/auth-client";
import {
  EmailPasswordForm,
  type EmailPasswordMode,
} from "./email-password-form";
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
}: {
  privacyContent: ReactNode;
  termsContent: ReactNode;
}): React.JSX.Element {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerLead}>
        <Link className={styles.wordmark} href="/" aria-label="Letterly home">
          <BrandLogo />
        </Link>
        <p>A place for the words that matter.</p>
      </div>

      <nav className={styles.footerLinks} aria-label="Footer navigation">
        <Link href="/#templates">Templates</Link>
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
  returnTo = "/dashboard/home",
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
      <div className={styles.page} aria-busy="true">
        <main className={`${styles.main} ${styles.mainSingle}`}>
          <section
            className={`${styles.panel} ${styles.sessionPanel}`}
            aria-live="polite"
          >
            <div className={styles.panelBrand}>
              <BrandLogo compact />
              <span>SECURE SESSION</span>
            </div>
            <p className={styles.eyebrow}>Private pages begin here</p>
            <h1>Checking your secure session...</h1>
            <p className={styles.panelCopy}>
              {session.data
                ? "You are already signed in. Opening your letters..."
                : "One quiet moment while we check your account."}
            </p>
          </section>
        </main>
        <SignInFooter
          privacyContent={privacyContent}
          termsContent={termsContent}
        />
      </div>
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
    <div className={styles.page}>
      <main className={`${styles.main} ${styles.mainSingle}`}>
        <section
          className={styles.panel}
          aria-labelledby={isSignIn ? "continue-title" : "create-title"}
        >
          <div className={styles.panelBrand}>
            <BrandLogo compact />
            <span>LETTERLY ACCOUNT</span>
          </div>
          <p className={`${styles.eyebrow} ${styles.welcomeEyebrow}`}>
            {isSignIn ? "Welcome back" : "Make room for your words"}
          </p>
          <p className={styles.panelCopy}>
            {isSignIn
              ? "Choose a provider to access your Letterly pages and drafts."
              : "Create a private place for your drafts and the pages you choose to share."}
          </p>

          {isSignIn ? (
            <>
              <h2 id="continue-title" className={styles.providerPrompt}>
                Continue with
              </h2>

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
                          src={
                            provider === "google" ? googleIcon : facebookIcon
                          }
                          alt=""
                          sizes="3rem"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>

              {pendingProvider ? (
                <p className={styles.statusMessage} role="status">
                  Opening a secure sign in window.
                </p>
              ) : null}
            </>
          ) : (
            <h2 id="create-title">Create your account</h2>
          )}

          {errorMessage ? (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isSignIn ? (
            <div className={styles.authDivider} aria-hidden="true">
              <span>or use email</span>
            </div>
          ) : null}

          <EmailPasswordForm mode={mode} returnTo={returnTo} />

          <p className={styles.switchPrompt}>
            {isSignIn ? "New to Letterly?" : "Already have an account?"}{" "}
            <Link
              href={`${isSignIn ? "/sign-up" : "/sign-in"}?returnTo=${encodeURIComponent(returnTo)}`}
            >
              {isSignIn ? "Create an account" : "Sign in"}
            </Link>
          </p>

          <div className={styles.privacyNote}>
            <span className={styles.privacyMark} aria-hidden="true">
              ✓
            </span>
            <p>
              Letterly does not publish anything for you. You stay in control of
              every page and every shared link.
            </p>
          </div>
        </section>
      </main>

      <SignInFooter
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
