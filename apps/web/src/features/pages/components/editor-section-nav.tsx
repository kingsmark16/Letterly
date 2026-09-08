"use client";

import styles from "./editor-section-nav.module.css";

export type EditorSection = "content" | "overview" | "viewers" | "settings";

interface EditorSectionNavProps {
  activeSection: EditorSection;
  onChange: (section: EditorSection) => void;
}

const sections: Array<{ id: EditorSection; label: string }> = [
  { id: "content", label: "Content" },
  { id: "overview", label: "Overview" },
  { id: "viewers", label: "Viewers" },
  { id: "settings", label: "Settings" },
];

export function EditorSectionNav({
  activeSection,
  onChange,
}: EditorSectionNavProps): React.JSX.Element {
  const activeIndex = sections.findIndex(
    (section) => section.id === activeSection,
  );

  return (
    <nav className={styles.nav} aria-label="Letter editor sections">
      <div className={styles.list} role="tablist">
        {sections.map((section, index) => {
          const isActive = section.id === activeSection;
          const isComplete = index < activeIndex;
          return (
            <button
              key={section.id}
              id={`editor-tab-${section.id}`}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`editor-panel-${section.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(section.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                  return;
                }

                event.preventDefault();
                const index = sections.findIndex(
                  (candidate) => candidate.id === activeSection,
                );
                const offset = event.key === "ArrowRight" ? 1 : -1;
                const nextIndex =
                  (index + offset + sections.length) % sections.length;
                const nextSection = sections[nextIndex];
                if (nextSection) {
                  onChange(nextSection.id);
                  document
                    .getElementById(`editor-tab-${nextSection.id}`)
                    ?.focus();
                }
              }}
            >
              <span
                className={`${styles.stepNumber} ${isComplete ? styles.stepComplete : ""}`}
                aria-hidden="true"
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
