"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "../../../lib/auth-client";
import { createSignInPath } from "../../../lib/return-path";
import appLogo from "../../../../assets/images/app-logo.png";
import { DashboardHeader } from "./dashboard-header";
import { DashboardFooter } from "./dashboard-footer";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
}

function WorkspaceState({
  description,
  title,
  signIn = false,
}: {
  description: string;
  title: string;
  signIn?: boolean;
}): React.JSX.Element {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="border-b border-border px-5 py-5 sm:px-8">
        <Link
          aria-label="Letterly home"
          className="inline-flex min-h-[var(--letterly-target-min)] items-center rounded-small focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
          href="/"
        >
          <Image
            alt="Letterly"
            className="h-auto w-28"
            priority
            sizes="7rem"
            src={appLogo}
          />
        </Link>
      </header>
      <main className="grid flex-1 place-items-center px-5 py-12 sm:px-8">
        <section
          aria-labelledby="workspace-state-title"
          className="w-full max-w-xl border-y border-border py-8 sm:py-10"
          aria-live="polite"
        >
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
            Private workspace
          </p>
          <h1
            className="mt-3 font-display text-balance text-heading-1 font-semibold tracking-[-0.06em]"
            id="workspace-state-title"
          >
            {title}
          </h1>
          <p className="mt-4 max-w-[38rem] text-body-large leading-[var(--letterly-text-body-large-line-height)] text-ink-muted">
            {description}
          </p>
          {signIn ? (
            <Link
              className="mt-7 inline-flex min-h-[var(--letterly-target-min)] items-center justify-center rounded-small bg-wine px-5 py-3 text-small font-bold text-surface transition-[background-color,transform] duration-[var(--letterly-motion-fast)] hover:bg-wine-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
              href={createSignInPath(pathname)}
            >
              Sign in to continue
            </Link>
          ) : null}
        </section>
      </main>
      <DashboardFooter />
    </div>
  );
}

export function DashboardShell({
  children,
}: DashboardShellProps): React.JSX.Element {
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <WorkspaceState
        description="Checking your secure session before opening your workspace."
        title="Opening your workspace…"
      />
    );
  }

  if (!session.data) {
    return (
      <WorkspaceState
        description="Sign in to keep drafts, choose a template, and continue writing in your own quiet space."
        signIn
        title="Sign in to open your pages."
      />
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <DashboardSidebar
        userEmail={session.data.user.email}
        userName={session.data.user.name}
      />
      <div className="flex min-h-screen min-w-0 flex-col">
        <a
          className="sr-only rounded-small bg-wine px-4 py-3 text-small font-bold text-surface focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
          href="#dashboard-content"
        >
          Skip to workspace content
        </a>
        <div className="min-w-0 flex-1">{children}</div>
        <DashboardFooter />
      </div>
    </div>
  );
}

export function WorkspaceFrame({
  children,
}: DashboardShellProps): React.JSX.Element {
  const session = authClient.useSession();

  if (session.data) {
    return (
      <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <DashboardSidebar
          userEmail={session.data.user.email}
          userName={session.data.user.name}
        />
        <div className="flex min-h-screen min-w-0 flex-col">
          <a
            className="sr-only rounded-small bg-wine px-4 py-3 text-small font-bold text-surface focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
            href="#main-content"
          >
            Skip to page content
          </a>
          <div className="min-w-0 flex-1">{children}</div>
          <DashboardFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <DashboardHeader />
      <div className="min-w-0 flex-1">{children}</div>
      <DashboardFooter />
    </div>
  );
}
