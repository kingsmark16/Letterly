"use client";

import { Button } from "@repo/ui/button";

export type EditorSection = "content" | "overview" | "viewers" | "settings";

interface EditorSectionNavProps {
  activeSection: EditorSection;
  isPublished: boolean;
  onChange: (section: EditorSection) => void;
}

const sections: ReadonlyArray<{
  id: EditorSection;
  label: string;
  description: string;
}> = [
  {
    id: "content",
    label: "Content",
    description: "Write and personalize",
  },
  {
    id: "overview",
    label: "Overview",
    description: "Check before sharing",
  },
  {
    id: "viewers",
    label: "Viewers",
    description: "See response activity",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Manage access",
  },
];

export function EditorSectionNav({
  activeSection,
  isPublished,
  onChange,
}: EditorSectionNavProps): React.JSX.Element {
  const activeIndex = sections.findIndex(
    (section) => section.id === activeSection,
  );

  return (
    <nav
      className="w-full rounded-medium border border-border bg-surface p-2 shadow-low sm:p-3"
      aria-label="Letter editor sections"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-2 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-small bg-wine text-surface"
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              focusable="false"
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
          </span>
          <span className="min-w-0">
            <span className="block truncate text-small font-bold text-ink">
              Secret Letter
            </span>
            <span className="block truncate text-label text-ink-muted">
              Personal workspace
            </span>
          </span>
        </div>
        <span className="hidden shrink-0 rounded-small border border-border bg-surface-muted px-2 py-1 text-label font-bold text-ink-muted sm:inline-flex">
          {isPublished ? "Live" : "Draft"}
        </span>
      </div>
      <div className="mb-2 mt-4 px-2 sm:mb-3">
        <p className="text-label font-bold uppercase tracking-[0.12em] text-wine">
          Editor
        </p>
        <p className="mt-1 hidden text-small leading-5 text-ink-muted sm:block">
          Shape the message, then prepare it to share.
        </p>
      </div>
      <div
        className="grid grid-cols-2 gap-2 min-[56rem]:grid-cols-1"
        role="tablist"
        aria-label="Editor steps"
      >
        {sections.map((section, index) => {
          const isActive = section.id === activeSection;
          const isComplete = index < activeIndex;

          return (
            <Button
              key={section.id}
              id={`editor-tab-${section.id}`}
              className="!min-h-11 !min-w-0 !w-full !justify-start !gap-2 !rounded-small !px-2.5 !py-2 !text-left sm:!px-3"
              type="button"
              variant={isActive ? "primary" : "secondary"}
              role="tab"
              aria-selected={isActive}
              aria-controls={`editor-panel-${section.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(section.id)}
              onKeyDown={(event) => {
                const isNext =
                  event.key === "ArrowRight" || event.key === "ArrowDown";
                const isPrevious =
                  event.key === "ArrowLeft" || event.key === "ArrowUp";

                if (!isNext && !isPrevious) {
                  return;
                }

                event.preventDefault();
                const offset = isNext ? 1 : -1;
                const nextIndex =
                  (activeIndex + offset + sections.length) % sections.length;
                const nextSection = sections[nextIndex];

                if (nextSection) {
                  onChange(nextSection.id);
                  window.requestAnimationFrame(() => {
                    document
                      .getElementById(`editor-tab-${nextSection.id}`)
                      ?.focus();
                  });
                }
              }}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-label font-bold ${
                  isActive
                    ? "border-white/30 bg-white/15 text-surface"
                    : isComplete
                      ? "border-olive/50 bg-olive/10 text-olive"
                      : "border-border bg-surface-muted text-ink-muted"
                }`}
                aria-hidden="true"
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-small font-semibold">
                  {section.label}
                </span>
                <span
                  className={`mt-0.5 hidden truncate text-label leading-4 min-[56rem]:block ${
                    isActive ? "text-surface/80" : "text-ink-muted"
                  }`}
                >
                  {section.description}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-border px-2 pt-3">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${isPublished ? "bg-wine" : "bg-olive"}`}
          aria-hidden="true"
        />
        <span className="text-label text-ink-muted">
          {isPublished ? "Published letter" : "Private draft"}
        </span>
      </div>
    </nav>
  );
}
