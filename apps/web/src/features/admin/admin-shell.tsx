"use client";

import { Button } from "@repo/ui/button";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WebApiError } from "@/lib/api/errors";
import { AdminAccessNotice } from "./admin-access-notice";
import styles from "./admin-theme.module.css";

const destinations = [
  { label: "Overview", href: "/admin/overview", available: false },
  { label: "Creators", href: "/admin/creators", available: true },
  { label: "Pages", href: "/admin/pages", available: true },
  { label: "Reports", href: "/admin/moderation/reports", available: true },
  { label: "Appeals", href: "/admin/moderation/appeals", available: true },
  { label: "Deletions", href: "/admin/deletions", available: false },
  { label: "Audit history", href: "/admin/moderation/audit", available: true },
];

function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration">
      <ul className="grid gap-1">
        {destinations.map(({ label, href, available }) => (
          <li key={href}>
            {available ? (
              <Link
                href={href}
                prefetch={false}
                aria-current={
                  pathname === href || pathname.startsWith(`${href}/`)
                    ? "page"
                    : undefined
                }
                onClick={onNavigate}
              >
                {label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title="Available in a later build milestone"
              >
                {label}
                <span className="sr-only">, not available yet</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [lostAccess, setLostAccess] = useState<
    "unauthenticated" | "forbidden" | null
  >(null);
  const [queryClient] = useState(() => {
    function handleAccessError(error: Error) {
      if (
        error instanceof WebApiError &&
        (error.statusCode === 401 || error.statusCode === 403)
      ) {
        setLostAccess(
          error.statusCode === 401 ? "unauthenticated" : "forbidden",
        );
      }
    }
    return new QueryClient({
      queryCache: new QueryCache({ onError: handleAccessError }),
      mutationCache: new MutationCache({ onError: handleAccessError }),
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
  });

  useEffect(() => {
    if (lostAccess) {
      void queryClient.cancelQueries();
      queryClient.clear();
    }
  }, [lostAccess, queryClient]);

  useEffect(
    () => () => {
      void queryClient.cancelQueries();
      queryClient.clear();
    },
    [queryClient],
  );

  if (lostAccess) return <AdminAccessNotice access={lostAccess} />;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-svh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:p-4"
          href="#main-content"
        >
          Skip to content
        </a>
        <aside className={`${styles.navigation} hidden p-4 lg:block`}>
          <div className={styles.brand}>
            Letterly<small>Administration</small>
          </div>
          <AdminNavigation />
          <Link className="mt-10 text-sm" href="/dashboard/home">
            Creator workspace
          </Link>
        </aside>
        <div className="min-w-0">
          <header className="flex min-h-20 items-center justify-between gap-4 border-b border-[var(--admin-divider)] bg-surface px-4 md:px-6 lg:px-8">
            <span className="font-semibold">Operations console</span>
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <Button variant="secondary" className="lg:hidden">
                  Open menu
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <div
                  data-admin-root
                  className={`${styles.root} ${styles.portal}`}
                >
                  <Dialog.Overlay className="fixed inset-0 z-40 bg-backdrop" />
                  <Dialog.Content
                    className={`${styles.sheet} ${styles.navigation}`}
                  >
                    <Dialog.Title className="text-xl font-semibold">
                      Administration menu
                    </Dialog.Title>
                    <Dialog.Description className="mb-6 mt-2 text-sm text-[var(--admin-navigation-muted)]">
                      Choose an operations workspace.
                    </Dialog.Description>
                    <AdminNavigation onNavigate={() => setOpen(false)} />
                    <Dialog.Close className="mt-8 min-h-11 rounded-md border border-current px-4">
                      Close menu
                    </Dialog.Close>
                  </Dialog.Content>
                </div>
              </Dialog.Portal>
            </Dialog.Root>
          </header>
          {children}
        </div>
      </div>
    </QueryClientProvider>
  );
}
