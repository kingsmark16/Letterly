"use client";

import type { CategoryCatalogItem } from "@letterly/contracts/catalog";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, DropdownMenu } from "radix-ui";
import { useState } from "react";
import appLogo from "../../../../assets/images/app-logo.png";
import { authClient } from "../../../lib/auth-client";
import { DashboardIcon } from "./dashboard-icons";
import { SidebarIcon, type SidebarIconName } from "./sidebar-icon";
import styles from "./workspace-navigation.module.css";

interface DashboardSidebarProps {
  categories: CategoryCatalogItem[];
  userEmail: string;
  userName: string;
  mobile?: boolean;
}

type NavigationItem = {
  label: string;
  icon: SidebarIconName;
  href?: string;
  categoryKey?: string;
};

function categoryIcon(categoryKey: string): SidebarIconName {
  if (categoryKey === "confession") return "heart";
  if (categoryKey === "birthday") return "gift";
  if (categoryKey === "anniversary") return "rings";
  return "templates";
}

function createNavigationGroups(
  categories: CategoryCatalogItem[],
): { label: string; items: NavigationItem[] }[] {
  return [
    {
      label: "Main",
      items: [
        { label: "Home", icon: "home", href: "/dashboard/home" },
        { label: "Templates", icon: "templates", href: "/templates" },
        { label: "My Pages", icon: "pages", href: "/dashboard/pages" },
      ],
    },
    ...(categories.length > 0
      ? [
          {
            label: "Categories",
            items: categories.map((category) => ({
              label: category.name,
              icon: categoryIcon(category.key),
              href: `/templates?category=${encodeURIComponent(category.key)}`,
              categoryKey: category.key,
            })),
          },
        ]
      : []),
    {
      label: "Sharing",
      items: [
        { label: "Shared Links", icon: "share" },
        { label: "QR Share", icon: "qr" },
        { label: "Visitors", icon: "visitors" },
        { label: "Reactions", icon: "reactions" },
      ],
    },
    {
      label: "Organize",
      items: [
        {
          label: "Drafts",
          icon: "draft",
          href: "/dashboard/pages?status=DRAFT",
        },
        { label: "Favorites", icon: "heart" },
        {
          label: "Archive",
          icon: "archive",
          href: "/dashboard/pages?status=ARCHIVED",
        },
      ],
    },
  ];
}

export function DashboardSidebar({
  categories,
  userEmail,
  userName,
  mobile = false,
}: DashboardSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initials =
    userName
      .trim()
      .split(/\s+/u)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "L";
  const navigationGroups = createNavigationGroups(categories);

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

  const content = (
    <>
      <div className={styles.brand}>
        <Link
          aria-label="Letterly templates"
          href="/templates"
          onClick={() => setOpen(false)}
        >
          <Image
            alt=""
            aria-hidden="true"
            priority
            sizes="10rem"
            src={appLogo}
            className={styles.logo}
          />
        </Link>
        <p>Meaningful pages, shared with heart.</p>
      </div>
      <nav aria-label="Workspace navigation" className={styles.navigation}>
        {navigationGroups.map((group) => (
          <div className={styles.navGroup} key={group.label}>
            <p className={styles.groupLabel}>{group.label}</p>
            <ul>
              {group.items.map((item) => {
                const active =
                  item.categoryKey !== undefined
                    ? pathname === "/templates" &&
                      searchParams.get("category") === item.categoryKey
                    : item.href === "/templates"
                      ? pathname === "/templates" &&
                        searchParams.get("category") === null
                      : item.href !== undefined &&
                        !item.href.includes("?") &&
                        (pathname === item.href ||
                          pathname.startsWith(item.href + "/"));
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <Link
                        className={styles.navLink}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <SidebarIcon name={item.icon} />
                        {item.label}
                      </Link>
                    ) : (
                      // TODO: Enable each destination when its workspace feature is implemented.
                      <span className={styles.comingSoon} aria-disabled="true">
                        <SidebarIcon name={item.icon} />
                        <span>{item.label}</span>
                        <small>Coming soon</small>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.account}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className={styles.accountTrigger}
            aria-label="Open account menu"
          >
            <span className={styles.avatar} aria-hidden="true">
              {initials}
            </span>
            <span className={styles.accountIdentity}>
              <span className={styles.accountName}>{userName}</span>
              <span className={styles.accountCaption}>Personal account</span>
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={styles.chevron}
            >
              <path d="m7 10 5 5 5-5" />
            </svg>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={styles.accountMenu}
              side="top"
              align="start"
              sideOffset={12}
              collisionPadding={16}
            >
              <DropdownMenu.Label className={styles.accountEmail}>
                {userEmail}
              </DropdownMenu.Label>
              <DropdownMenu.Separator className={styles.menuSeparator} />
              <DropdownMenu.Item
                className={styles.menuItem}
                disabled={isSigningOut}
                onSelect={(event) => {
                  event.preventDefault();
                  void handleSignOut();
                }}
              >
                <DashboardIcon name="logout" />
                {isSigningOut ? "Signing out…" : "Sign out"}
              </DropdownMenu.Item>
              {errorMessage ? (
                <p className={styles.error} role="alert">
                  {errorMessage}
                </p>
              ) : null}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </>
  );

  if (mobile) {
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className={styles.mobileTrigger}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>Menu</span>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.drawer}>
            <Dialog.Title className="sr-only">Workspace menu</Dialog.Title>
            <Dialog.Description className="sr-only">
              Browse categories, open your pages, and manage your account.
            </Dialog.Description>
            <Dialog.Close
              className={styles.closeButton}
              aria-label="Close menu"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </Dialog.Close>
            {content}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return <aside className={styles.sidebar}>{content}</aside>;
}
