"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "../../../lib/auth-client";

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
  const areaLabel = pathname.startsWith("/dashboard/letters")
    ? "Letter editor"
    : pathname.startsWith("/templates")
      ? "Template library"
      : "Dashboard";
  const areaDetail = pathname.startsWith("/dashboard/letters")
    ? "Private workspace"
    : "Your letters and templates";

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
    <header className="relative sticky top-0 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-[var(--letterly-container-max)] flex-col border-b border-border bg-canvas/95 text-ink backdrop-blur-xl lg:w-[calc(100%-4rem)]">
      <div className="flex min-h-16 items-center justify-between gap-3 py-2 sm:min-h-[4.5rem] sm:gap-5">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Link
            className="group grid size-10 shrink-0 place-items-center rounded-small bg-wine text-surface shadow-low transition-transform duration-200 ease-standard hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            href="/dashboard/home"
            aria-label="Letterly home"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              focusable="false"
              aria-hidden="true"
            >
              <path
                d="M20 5.5H4A1.5 1.5 0 0 0 2.5 7v10A1.5 1.5 0 0 0 4 18.5h16a1.5 1.5 0 0 0 1.5-1.5V7A1.5 1.5 0 0 0 20 5.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="m3 7 8.1 6.1a1.5 1.5 0 0 0 1.8 0L21 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                className="shrink-0 font-display text-xl font-semibold tracking-[-0.05em] text-ink transition-colors hover:text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
                href="/dashboard/home"
              >
                letterly
              </Link>
              <span className="text-ink-muted" aria-hidden="true">
                /
              </span>
              <span className="truncate text-small font-bold text-ink">
                {areaLabel}
              </span>
            </div>
            <div className="mt-0.5 hidden items-center gap-2 text-label text-ink-muted sm:flex">
              <span className="rounded-small border border-border bg-surface-muted px-2 py-1 font-bold">
                Personal workspace
              </span>
              <span aria-hidden="true">·</span>
              <span>{areaDetail}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          {contextAction ? (
            <div className="max-w-[9rem] truncate text-label font-bold text-wine sm:max-w-none sm:text-small [&_a]:underline [&_a]:underline-offset-4 [&_a]:focus-visible:outline [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-2 [&_a]:focus-visible:outline-wine">
              {contextAction}
            </div>
          ) : null}
          {session.data ? (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-small border border-border bg-surface px-3.5 py-2 text-label font-bold text-ink transition-colors hover:border-wine hover:text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine disabled:cursor-wait disabled:opacity-60 sm:px-4 sm:text-small"
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              aria-busy={isSigningOut}
            >
              {isSigningOut ? "Logging out..." : "Log out"}
            </button>
          ) : (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-small border border-border bg-surface px-3.5 py-2 text-label font-bold text-ink transition-colors hover:border-wine hover:text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine sm:px-4 sm:text-small"
              href="/sign-in"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      <div className="flex min-h-12 items-center justify-between gap-4 overflow-x-auto border-t border-border/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <nav className="shrink-0" aria-label="Dashboard navigation">
          <ul className="flex items-center gap-1">
            <li>
              <Link
                className={`inline-flex min-h-11 items-center rounded-small px-3 text-small font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine sm:px-4 ${homeActive ? "bg-surface text-wine shadow-low" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`}
                aria-current={homeActive ? "page" : undefined}
                href="/dashboard/home"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                className={`inline-flex min-h-11 items-center rounded-small px-3 text-small font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine sm:px-4 ${lettersActive ? "bg-surface text-wine shadow-low" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`}
                aria-current={lettersActive ? "page" : undefined}
                href="/dashboard"
              >
                My letters
              </Link>
            </li>
            <li>
              <Link
                className={`inline-flex min-h-11 items-center rounded-small px-3 text-small font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine sm:px-4 ${templatesActive ? "bg-surface text-wine shadow-low" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`}
                aria-current={templatesActive ? "page" : undefined}
                href="/templates"
              >
                Templates
              </Link>
            </li>
          </ul>
        </nav>
        <p className="hidden shrink-0 pr-1 text-label font-semibold text-ink-muted lg:block">
          Private by default
        </p>
      </div>
      {errorMessage ? (
        <p
          className="absolute right-0 top-full z-10 rounded-small border border-error bg-surface px-3 py-2 text-label text-error shadow-low"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </header>
  );
}
