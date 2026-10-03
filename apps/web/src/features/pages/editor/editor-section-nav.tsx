"use client";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import styles from "./editor-section-nav.module.css";

export type EditorSection =
  "content" | "preview" | "overview" | "analytics" | "settings";

type EditorSectionNavProps = {
  activeSection: EditorSection;
  published: boolean;
} & (
  | {
      onChange: (section: EditorSection) => void;
      hrefForSection?: never;
    }
  | {
      hrefForSection: (section: EditorSection) => string;
      onChange?: never;
    }
);

const editorSections: ReadonlyArray<{ id: EditorSection; label: string }> = [
  { id: "content", label: "Write" },
  { id: "overview", label: "Review & share" },
  { id: "preview", label: "Preview" },
  { id: "settings", label: "Settings" },
];
const analyticsSection = { id: "analytics", label: "Overview" } as const;

function sectionControlClasses(isActive: boolean): string {
  return cn(
    "relative inline-flex min-w-max min-h-[46px] flex-[1_0_auto] items-center justify-center gap-[9px] rounded-[999px] border-0 bg-transparent px-[14px] py-0 text-[14px] font-semibold text-[#695c6c] no-underline whitespace-nowrap cursor-pointer transition-[color,background-color,box-shadow,transform] duration-fast ease-standard hover:bg-[#f8e8ee] hover:text-[#842647] focus-visible:outline-solid focus-visible:outline-[length:var(--letterly-focus-width)] focus-visible:outline-focus focus-visible:outline-offset-[-3px] motion-safe:active:[transform:scale(0.985)] motion-safe:enabled:active:[transform:scale(0.985)] motion-reduce:transition-none [@media(max-width:72rem)]:gap-[7px] [@media(max-width:72rem)]:px-[10px] [@media(max-width:72rem)]:text-[13px]",
    isActive &&
      "bg-[linear-gradient(180deg,#a53256,#7d213f)] font-bold text-white shadow-[inset_0_1px_0_#ffffff24,0_3px_8px_#83254126] hover:bg-[linear-gradient(180deg,#982c4f,#711b38)] hover:text-white",
  );
}

function SectionIcon({
  section,
}: {
  section: EditorSection;
}): React.JSX.Element {
  switch (section) {
    case "content":
      return (
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="m4 16.75-.75 4 4-.75L19.8 7.45a2.83 2.83 0 0 0-4-4L4 16.75Z" />
          <path d="m14.5 4.75 4 4" />
        </svg>
      );
    case "preview":
      return (
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M2.5 12s3.25-6 9.5-6 9.5 6 9.5 6-3.25 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "overview":
      return (
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="m7 11 10-5M7 13l10 5" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4 19V11m5 8V5m5 14v-7m5 7V8" />
          <path d="M3 20h18" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4 7h8m4 0h4M4 12h2m4 0h10M4 17h8m4 0h4" />
          <circle cx="14" cy="7" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="14" cy="17" r="2" />
        </svg>
      );
  }
}

export function EditorSectionNav({
  activeSection,
  published,
  ...navigation
}: EditorSectionNavProps): React.JSX.Element {
  const hrefForSection = navigation.hrefForSection;
  const onChange = navigation.onChange;
  const routeNavigation = hrefForSection !== undefined;
  const sections = published
    ? [analyticsSection, ...editorSections]
    : editorSections;
  const currentSection = sections.find(
    (section) => section.id === activeSection,
  );
  return (
    <nav
      aria-label={routeNavigation ? "Letter sections" : "Letter editor"}
      className={styles.sectionNav}
    >
      <div
        id="editor-section-tabs"
        className={styles.tabs}
        role={routeNavigation ? undefined : "tablist"}
        aria-label={routeNavigation ? undefined : "Letter editor sections"}
        onKeyDown={(event) => {
          if (routeNavigation || !onChange) return;
          const isNext = event.key === "ArrowRight";
          const isPrevious = event.key === "ArrowLeft";
          const isFirst = event.key === "Home";
          const isLast = event.key === "End";
          if (!isNext && !isPrevious && !isFirst && !isLast) return;
          if (!(event.target instanceof HTMLElement)) return;
          const currentTabId = event.target.id;

          const currentIndex = sections.findIndex(
            (section) => `editor-tab-${section.id}` === currentTabId,
          );
          if (currentIndex === -1) return;

          event.preventDefault();
          const nextIndex = isFirst
            ? 0
            : isLast
              ? sections.length - 1
              : (currentIndex + (isNext ? 1 : -1) + sections.length) %
                sections.length;
          const nextSection = sections[nextIndex];
          if (!nextSection) return;

          onChange(nextSection.id);
          window.requestAnimationFrame(() => {
            document.getElementById(`editor-tab-${nextSection.id}`)?.focus();
          });
        }}
      >
        {sections.map((section) => {
          const isActive = section.id === activeSection;

          if (hrefForSection) {
            return (
              <Link
                key={section.id}
                id={`editor-tab-${section.id}`}
                href={hrefForSection(section.id)}
                aria-current={isActive ? "location" : undefined}
                className={sectionControlClasses(isActive)}
              >
                <span className={styles.tabIcon}>
                  <SectionIcon section={section.id} />
                </span>
                <span>{section.label}</span>
              </Link>
            );
          }

          return (
            <Button
              key={section.id}
              id={`editor-tab-${section.id}`}
              type="button"
              variant="ghost"
              size="sm"
              role="tab"
              aria-selected={isActive}
              aria-controls={`editor-panel-${section.id}`}
              tabIndex={isActive ? 0 : -1}
              className={sectionControlClasses(isActive)}
              onClick={() => onChange?.(section.id)}
            >
              <span className={styles.tabIcon}>
                <SectionIcon section={section.id} />
              </span>
              <span>{section.label}</span>
            </Button>
          );
        })}
      </div>

      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-[var(--letterly-target-min)] w-auto min-h-target flex-none items-center justify-center ms-0 gap-2 rounded-[999px] border border-[#f2dfe5] bg-[#fff6f8] px-[14px] py-0 text-[13px] font-semibold text-[#842647] cursor-pointer transition-[color,background-color,transform] duration-fast ease-standard hover:bg-[#f8e8ee] hover:text-wine-hover data-[state=open]:bg-[#f8e8ee] data-[state=open]:text-wine-hover focus-visible:bg-[#f8e8ee] focus-visible:outline-offset-[-3px] motion-safe:enabled:active:[transform:scale(0.96)] motion-reduce:transition-none [@media(max-width:56rem)]:inline-flex"
            aria-label={
              routeNavigation ? "Open letter sections" : "Open editor sections"
            }
          >
            <span className={styles.tabIcon}>
              <SectionIcon section={activeSection} />
            </span>
            <span>{currentSection?.label ?? "Sections"}</span>
            <svg
              className="size-5 fill-none stroke-current [stroke-width:1.7] [stroke-linecap:round] [stroke-linejoin:round]"
              viewBox="0 0 24 24"
              focusable="false"
              aria-hidden="true"
            >
              <path d="m7 10 5 5 5-5" />
            </svg>
          </Button>
        </DropdownMenuPrimitive.Trigger>

        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="end"
            className={styles.menuContent}
            collisionPadding={12}
            sideOffset={6}
          >
            <DropdownMenuPrimitive.Label className={styles.menuLabel}>
              Go to section
            </DropdownMenuPrimitive.Label>
            <DropdownMenuPrimitive.Separator className={styles.menuSeparator} />
            {sections.map((section) => {
              const isActive = section.id === activeSection;

              if (hrefForSection) {
                return (
                  <DropdownMenuPrimitive.Item key={section.id} asChild>
                    <Link
                      href={hrefForSection(section.id)}
                      className={styles.menuItem}
                      aria-current={isActive ? "location" : undefined}
                    >
                      <span className={styles.menuItemIcon}>
                        <SectionIcon section={section.id} />
                      </span>
                      <span className={styles.menuItemLabel}>
                        {section.label}
                      </span>
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className={styles.menuItemIndicator}
                        />
                      ) : null}
                    </Link>
                  </DropdownMenuPrimitive.Item>
                );
              }

              return (
                <DropdownMenuPrimitive.Item
                  key={section.id}
                  className={styles.menuItem}
                  aria-controls={`editor-panel-${section.id}`}
                  aria-current={isActive ? "step" : undefined}
                  onSelect={() => onChange?.(section.id)}
                >
                  <span className={styles.menuItemIcon}>
                    <SectionIcon section={section.id} />
                  </span>
                  <span className={styles.menuItemLabel}>{section.label}</span>
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className={styles.menuItemIndicator}
                    />
                  ) : null}
                </DropdownMenuPrimitive.Item>
              );
            })}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </nav>
  );
}
