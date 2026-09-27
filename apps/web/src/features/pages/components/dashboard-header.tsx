"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import { useForm } from "react-hook-form";
import appLogo from "../../../../assets/images/app-logo.png";
import styles from "./workspace-navigation.module.css";

interface DashboardHeaderProps {
  contextAction?: React.ReactNode;
  mobileNavigation?: React.ReactNode;
}

export function DashboardHeader({
  contextAction,
  mobileNavigation,
}: DashboardHeaderProps = {}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { register, handleSubmit } = useForm<{ query: string }>({
    defaultValues: { query: "" },
  });

  return (
    <header className={styles.header}>
      {mobileNavigation ?? (
        <Link
          className={styles.headerLogo}
          href="/templates"
          aria-label="Letterly categories"
        >
          <Image
            alt=""
            aria-hidden="true"
            src={appLogo}
            sizes="7rem"
            className={styles.logo}
          />
        </Link>
      )}
      <form
        className={styles.search}
        role="search"
        aria-label="Search categories and designs"
        onSubmit={handleSubmit(({ query }) =>
          router.push(
            query.trim()
              ? "/templates?q=" + encodeURIComponent(query.trim())
              : "/templates",
          ),
        )}
      >
        <button type="submit" aria-label="Search categories and designs">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="10.5" cy="10.5" r="6.75" />
            <path d="m15.5 15.5 5 5" />
          </svg>
        </button>
        <input
          {...register("query")}
          aria-label="Search categories and designs"
          type="search"
          placeholder="Search categories and designs…"
          maxLength={120}
        />
      </form>
      <div className={styles.headerActions}>
        {contextAction}
        <Popover.Root>
          <Popover.Trigger
            className={styles.notificationButton}
            aria-label="Notifications"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-2.5 7-2.5 9h17C20.5 15 18 15 18 8ZM9.5 20a2.7 2.7 0 0 0 5 0M12 2V1" />
            </svg>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className={styles.notificationPanel}
              sideOffset={12}
              align="end"
              collisionPadding={16}
            >
              <h2>Notifications</h2>
              <p>
                Notifications are not available yet. You can check responses
                from each page in your workspace.
              </p>
              <Popover.Close asChild>
                <Link
                  href="/dashboard/pages"
                  className={styles.notificationLink}
                >
                  Open your pages
                </Link>
              </Popover.Close>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <p className={styles.motto}>
          <span>
            Good things
            <br />
            travel far
          </span>
          <span aria-hidden="true">♥</span>
        </p>
      </div>
      {!mobileNavigation ? (
        <nav
          aria-label="Workspace navigation"
          className={styles.guestNavigation}
        >
          <Link
            href="/templates"
            aria-current={
              pathname.startsWith("/templates") ? "page" : undefined
            }
          >
            Categories
          </Link>
          <Link
            href="/dashboard/pages"
            aria-current={
              pathname.startsWith("/dashboard/pages") ? "page" : undefined
            }
          >
            Pages
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
