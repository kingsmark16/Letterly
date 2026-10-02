"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const isCategoryPage = pathname.startsWith("/templates/");
  const categoryKey = isCategoryPage
    ? pathname.slice("/templates/".length)
    : pathname === "/templates"
      ? searchParams.get("category")
      : null;
  const searchLabel =
    categoryKey === "confession"
      ? "Search confession designs"
      : "Search categories and designs";
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
        aria-label={searchLabel}
        onSubmit={handleSubmit(({ query }) => {
          const params = new URLSearchParams();
          if (!isCategoryPage && categoryKey) {
            params.set("category", categoryKey);
          }
          if (query.trim()) params.set("q", query.trim());
          const search = params.toString();
          const destination = isCategoryPage ? pathname : "/templates";
          router.push(search ? destination + "?" + search : destination);
        })}
      >
        <button type="submit" aria-label={searchLabel}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="10.5" cy="10.5" r="6.75" />
            <path d="m15.5 15.5 5 5" />
          </svg>
        </button>
        <input
          {...register("query")}
          aria-label={searchLabel}
          type="search"
          placeholder={`${searchLabel}...`}
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
            Little letters
            <br />
            lasting feelings
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
