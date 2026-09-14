"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import appLogo from "../../../../assets/images/app-logo.png";
import { Button } from "../../../components/ui/button";
import { authClient } from "../../../lib/auth-client";
import { DashboardIcon } from "./dashboard-icons";

interface DashboardSidebarProps {
  userEmail: string;
  userName: string;
}

const navigationItems = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/pages", label: "My pages", icon: "pages" },
  {
    href: "/dashboard#recent-responses",
    label: "Responses",
    icon: "inbox",
  },
  { href: "/templates", label: "Templates", icon: "grid" },
] as const;

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "L";
}

function isNavigationItemActive(
  pathname: string,
  href: (typeof navigationItems)[number]["href"],
): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (href === "/dashboard/pages") {
    return (
      pathname === "/dashboard/pages" ||
      (pathname.startsWith("/dashboard/pages/") &&
        !pathname.endsWith("/responses"))
    );
  }

  if (href === "/dashboard#recent-responses") {
    return pathname.endsWith("/responses");
  }

  if (href === "/templates") {
    return pathname === "/templates" || pathname.startsWith("/templates/");
  }

  return false;
}

export function DashboardSidebar({
  userEmail,
  userName,
}: DashboardSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initials = getInitials(userName);

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

  function renderNavigation(compact = false): React.JSX.Element {
    return (
      <nav
        aria-label="Dashboard navigation"
        className={compact ? "min-w-0" : "mt-8"}
      >
        <p
          className={
            compact
              ? "sr-only"
              : "px-3 text-label font-bold uppercase tracking-[0.14em] text-ink-muted"
          }
        >
          Workspace
        </p>
        <ul
          className={
            compact
              ? "grid w-full grid-cols-2 items-center gap-1"
              : "mt-3 grid gap-1"
          }
        >
          {navigationItems.map((item) => {
            const active = isNavigationItemActive(pathname, item.href);

            return (
              <li key={item.label}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={
                    compact
                      ? `inline-flex min-h-[var(--letterly-target-min)] w-full items-center justify-center gap-2 rounded-small px-2 text-small font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine ${active ? "bg-surface text-wine shadow-low" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`
                      : `flex min-h-[var(--letterly-target-min)] items-center gap-3 rounded-small border border-transparent px-3 text-small font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine ${active ? "border-border bg-surface text-wine shadow-low" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`
                  }
                  href={item.href}
                >
                  <DashboardIcon
                    className={compact ? "size-4" : "size-[1.125rem]"}
                    name={item.icon}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <>
      <aside className="hidden border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:self-start lg:flex-col lg:px-5 lg:py-6">
        <div className="flex items-center justify-between gap-3 px-2">
          <Link
            aria-label="Letterly overview"
            className="inline-flex min-h-[var(--letterly-target-min)] items-center rounded-small focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            href="/dashboard"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="h-auto w-32"
              priority
              sizes="8rem"
              src={appLogo}
            />
          </Link>
        </div>

        {renderNavigation()}

        <div className="mt-auto border-t border-border pt-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-round bg-rose/20 font-display text-heading-3 font-semibold text-wine">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-small font-bold text-ink">
                {userName}
              </p>
              <p className="truncate text-label text-ink-muted">{userEmail}</p>
            </div>
          </div>
          <Button
            className="mt-4 w-full !justify-start !border-0 !bg-transparent !px-0 !text-small !text-ink-muted hover:!bg-transparent hover:!text-wine"
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
            type="button"
            variant="ghost"
          >
            <DashboardIcon className="size-4" name="logout" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
          {errorMessage ? (
            <p className="mt-2 text-label text-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </aside>

      <header className="border-b border-border bg-canvas px-4 py-3 lg:hidden">
        <div className="flex min-h-[var(--letterly-target-min)] items-center justify-between gap-3">
          <Link
            aria-label="Letterly overview"
            className="inline-flex min-h-[var(--letterly-target-min)] items-center rounded-small focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            href="/dashboard"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="h-auto w-28"
              priority
              sizes="7rem"
              src={appLogo}
            />
          </Link>
          <Button
            asChild
            className="!min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-3 !text-label !text-surface hover:!bg-wine-hover"
            size="sm"
          >
            <Link href="/templates">
              <DashboardIcon className="size-4" name="plus" />
              Create
            </Link>
          </Button>
        </div>
        {renderNavigation(true)}
      </header>
    </>
  );
}
