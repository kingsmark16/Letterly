"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "../../../lib/auth-client";
import styles from "./sign-in-form.module.css";

type OAuthProvider = "google" | "facebook";

interface SignInFormProps {
  returnTo?: string;
  initialError?: boolean;
}

const providerNames: Record<OAuthProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};

export function SignInForm({
  returnTo = "/",
  initialError = false,
}: SignInFormProps): React.JSX.Element {
  const [pendingProvider, setPendingProvider] =
    useState<OAuthProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ? "We could not complete sign in. Please try again." : null,
  );

  async function continueWith(provider: OAuthProvider): Promise<void> {
    setPendingProvider(provider);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: returnTo,
        errorCallbackURL: `/sign-in?error=oauth&returnTo=${encodeURIComponent(returnTo)}`,
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
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Letterly home">
          letterly
        </Link>
        <Link className={styles.returnLink} href="/">
          Return to home
        </Link>
      </header>

      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="sign-in-title">
          <p className={styles.eyebrow}>Private pages begin here</p>
          <h1 id="sign-in-title">Make something worth opening.</h1>
          <p className={styles.introCopy}>
            Sign in to create, save, and share a personal Letterly page when it
            feels ready.
          </p>
          <p className={styles.introNote}>
            Your page stays private while you are making it. You choose when it
            becomes a link for someone else.
          </p>
        </section>

        <section className={styles.panel} aria-labelledby="continue-title">
          <p className={styles.eyebrow}>Welcome to Letterly</p>
          <h2 id="continue-title">Continue with an account.</h2>
          <p className={styles.panelCopy}>
            Use Google or Facebook to keep your pages and drafts together.
          </p>

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
                  onClick={() => void continueWith(provider)}
                >
                  <span className={styles.providerMark} aria-hidden="true">
                    {provider === "google" ? "G" : "f"}
                  </span>
                  <span>
                    {isPending
                      ? "Connecting to " + providerNames[provider] + "..."
                      : "Continue with " + providerNames[provider]}
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

          {errorMessage ? (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <p className={styles.privacyNote}>
            Letterly does not publish anything for you. You stay in control of
            every page and every shared link.
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>Private by default.</span>
        <Link href="/#privacy">Privacy and safety</Link>
      </footer>
    </div>
  );
}
