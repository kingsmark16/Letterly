"use client";

import { Button } from "@repo/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminAccessState } from "@/lib/server-admin-auth";
import styles from "./admin-theme.module.css";

export function AdminAccessNotice({
  access,
}: {
  access: Exclude<AdminAccessState, "allowed">;
}): React.JSX.Element {
  const pathname = usePathname();
  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl p-6 lg:p-8">
      <section className={styles.panel} aria-labelledby="admin-access-title">
        <p className="mb-5 text-sm text-ink-muted">Letterly administration</p>
        <h1 id="admin-access-title" className="text-2xl font-semibold">
          {access === "unauthenticated"
            ? "Sign in to continue"
            : access === "forbidden"
              ? "Administrator access required"
              : "Administration is unavailable"}
        </h1>
        <p className="mt-3 text-ink-muted" role="alert">
          {access === "unauthenticated"
            ? "Your administrator session is missing or has expired. Sign in again to continue."
            : access === "forbidden"
              ? "Your current account cannot access this workspace."
              : "We could not verify administrator access. You can try again."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {access === "unauthenticated" ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-md bg-wine px-5 text-surface"
              href={`/sign-in?returnTo=${encodeURIComponent(pathname)}`}
            >
              Sign in
            </Link>
          ) : (
            <Button onClick={() => window.location.reload()}>
              Check access again
            </Button>
          )}
          <Link
            className="inline-flex min-h-11 items-center underline"
            href="/"
          >
            Return to Letterly
          </Link>
        </div>
      </section>
    </main>
  );
}
