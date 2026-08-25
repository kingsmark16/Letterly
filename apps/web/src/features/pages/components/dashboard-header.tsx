"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "../../../lib/auth-client";
import styles from "./dashboard-header.module.css";

interface DashboardHeaderProps {
  contextAction?: React.ReactNode;
}

export function DashboardHeader({
  contextAction,
}: DashboardHeaderProps = {}): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const session = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const homeActive = pathname === "/dashboard/home";
  const lettersActive =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/letters");
  const templatesActive =
    pathname === "/templates" || pathname.startsWith("/templates/");

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setErrorMessage("We could not sign you out. Please try again.");
        setIsSigningOut(false);
        return;
      }

      router.replace("/");
    } catch {
      setErrorMessage("We could not sign you out. Please try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/dashboard/home">
        letterly
      </Link>
      <nav className={styles.nav} aria-label="Dashboard navigation">
        <ul className={styles.navList}>
          <li>
            <Link
              aria-current={homeActive ? "page" : undefined}
              href="/dashboard/home"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              aria-current={lettersActive ? "page" : undefined}
              href="/dashboard"
            >
              My letters
            </Link>
          </li>
          <li>
            <Link
              aria-current={templatesActive ? "page" : undefined}
              href="/templates"
            >
              Templates
            </Link>
          </li>
        </ul>
      </nav>
      <div className={styles.actions}>
        {contextAction ? (
          <div className={styles.contextAction}>{contextAction}</div>
        ) : null}
        {session.data ? (
          <button
            className={styles.authAction}
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            aria-busy={isSigningOut}
          >
            {isSigningOut ? "Logging out..." : "Log out"}
          </button>
        ) : (
          <Link className={styles.authAction} href="/sign-in">
            Sign in
          </Link>
        )}
      </div>
      {errorMessage ? (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </header>
  );
}
