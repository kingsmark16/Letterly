"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { JSX } from "react";
import { useRef, useState } from "react";
import styles from "./reasons-section.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

type ReasonIcon =
  | "smile"
  | "heart"
  | "listen"
  | "home"
  | "idea"
  | "together";

type Reason = {
  label: string;
  icon: ReasonIcon;
  color: "rose" | "peach" | "lavender";
};

type ReasonsSectionProps = {
  enabled: boolean;
  reduceMotion: boolean;
};

const reasons: Reason[] = [
  { label: "Your laugh", icon: "smile", color: "rose" },
  { label: "Your kindness", icon: "heart", color: "peach" },
  { label: "The way\nyou listen", icon: "listen", color: "lavender" },
  { label: "How safe\nyou feel", icon: "home", color: "peach" },
  { label: "Your beautiful\nmind", icon: "idea", color: "lavender" },
  { label: "Us, being us", icon: "together", color: "rose" },
];

function ReasonIllustration({ icon }: { icon: ReasonIcon }): JSX.Element {
  if (icon === "smile")
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r="17" />
        <path d="M24 35c2 5 14 5 16 0M25 27h.1M39 27h.1" />
      </svg>
    );
  if (icon === "listen")
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M38 44c0 6-4 9-9 9-4 0-7-3-7-7 0-5 5-7 8-10 4-4 1-12-5-12-5 0-8 4-8 8" />
        <path d="M33 42c0-5 8-7 8-16 0-8-6-14-14-14-7 0-13 5-14 12" />
      </svg>
    );
  if (icon === "home")
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M11 31 32 13l21 18M17 27v24h30V27" />
        <path d="M39 31a7 7 0 0 0-7 3 7 7 0 0 0-13 4c0 8 13 14 13 14s13-6 13-14a7 7 0 0 0-6-7Z" />
      </svg>
    );
  if (icon === "idea")
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M21 27a11 11 0 1 1 21 5c-2 4-6 6-6 11h-9c0-5-4-7-6-11-1-2-1-3-1-5Z" />
        <path d="M27 48h10M29 53h6M32 7V2M15 14l-4-4M49 14l4-4M12 30H6M58 30h-6" />
      </svg>
    );
  if (icon === "together")
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M27 46 14 34a9 9 0 0 1 13-13l5 5 5-5a9 9 0 1 1 13 13L37 46" />
        <path d="M32 52 19 40a9 9 0 0 1 13-13l5 5 5-5" />
      </svg>
    );
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M32 52S12 41 12 25a11 11 0 0 1 20-7 11 11 0 0 1 20 7c0 16-20 27-20 27Z" />
    </svg>
  );
}

export function ReasonsSection({
  enabled,
  reduceMotion,
}: ReasonsSectionProps): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeReasonIndex, setActiveReasonIndex] = useState(0);
  const activeReasonLabel = reasons[activeReasonIndex]?.label ?? "";

  useGSAP(
    (_context, contextSafe) => {
      const section = sectionRef.current;
      if (!section) return;

      const cards = Array.from(
        section.querySelectorAll<HTMLElement>("[data-reason-card]"),
      );
      const icons = Array.from(
        section.querySelectorAll<HTMLElement>("[data-reason-icon]"),
      );
      const glow = section.querySelector<HTMLElement>("[data-reason-glow]");
      if (cards.length === 0) return;

      if (!enabled) return;

      let reveal: gsap.core.Timeline | null = null;
      let glowPulse: gsap.core.Tween | null = null;

      if (reduceMotion) {
        gsap.set(section, { opacity: 1, y: 0 });
        gsap.set(cards, { opacity: 1, y: 0, scale: 1 });
        gsap.set(icons, { rotation: -4, scale: 1 });
        if (glow) gsap.set(glow, { opacity: 0.86, scale: 1 });
      } else {
        gsap.set(section, { opacity: 0, y: 28 });
        gsap.set(cards, { opacity: 0, y: 18, scale: 0.96 });
        if (glow) {
          gsap.set(glow, { opacity: 0.58, scale: 0.92 });
          glowPulse = gsap.to(glow, {
            opacity: 1,
            scale: 1.08,
            duration: 3.6,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: 0.35,
          });
        }

        reveal = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            once: true,
            toggleActions: "play none none none",
            invalidateOnRefresh: true,
          },
        });
        reveal
          .to(section, { opacity: 1, y: 0, duration: 0.62 })
          .to(
            cards,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.42,
              stagger: 0.08,
            },
            "<0.12",
          );
      }

      const cleanups: Array<() => void> = [];
      cards.forEach((card, index) => {
        const icon = icons[index];
        const activate = (): void => {
          setActiveReasonIndex(index);
          if (reduceMotion) return;

          gsap.to(cards, {
            opacity: 0.8,
            scale: 0.98,
            duration: 0.22,
            ease: "power2.out",
            overwrite: "auto",
          });
          gsap.to(card, {
            opacity: 1,
            scale: 1.025,
            duration: 0.34,
            ease: "back.out(1.7)",
            overwrite: "auto",
          });
          if (icon) {
            gsap.to(icons, {
              rotation: -4,
              scale: 1,
              duration: 0.24,
              ease: "power2.out",
              overwrite: "auto",
            });
            gsap.to(icon, {
              rotation: 0,
              scale: 1.12,
              duration: 0.38,
              ease: "back.out(1.8)",
              overwrite: "auto",
            });
          }
        };
        const safeActivate = contextSafe ? contextSafe(activate) : activate;

        card.addEventListener("pointerenter", safeActivate);
        card.addEventListener("focus", safeActivate);
        card.addEventListener("click", safeActivate);

        cleanups.push(() => {
          card.removeEventListener("pointerenter", safeActivate);
          card.removeEventListener("focus", safeActivate);
          card.removeEventListener("click", safeActivate);
        });
      });

      return () => {
        cleanups.forEach((cleanup) => cleanup());
        reveal?.kill();
        glowPulse?.kill();
        gsap.killTweensOf([...cards, ...icons, ...(glow ? [glow] : [])]);
      };
    },
    {
      scope: sectionRef,
      dependencies: [enabled, reduceMotion],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      ref={sectionRef}
      id="little-things"
      className={styles.reasonsSection}
      data-reason-section
      aria-labelledby="reasons-heading"
    >
      <span
        className={styles.reasonGlow}
        data-reason-glow
        aria-hidden="true"
      />
      <div className={styles.reasonIntro}>
        <p className={styles.reasonKicker}>kept close to my heart</p>
        <h2 id="reasons-heading" className={styles.reasonHeading}>
          A few of the million reasons <span aria-hidden="true">♡</span>
        </h2>
        <p className={styles.reasonPrompt} aria-live="polite">
          <span className={styles.reasonPromptLabel}>
            right now
          </span>
          <span aria-hidden="true">♡</span>
          {activeReasonLabel.replace(/\n/g, " ")}
        </p>
      </div>

      <div className={styles.reasonGrid} role="group" aria-label="Reasons">
        {reasons.map((reason, index) => (
          <button
            className={styles.reasonCard}
            data-reason-card
            data-active={activeReasonIndex === index ? "true" : undefined}
            key={reason.label}
            type="button"
            aria-pressed={activeReasonIndex === index}
            aria-label={reason.label.replace(/\n/g, " ")}
          >
            <span
              className={`${styles.reasonIcon} ${styles[reason.color]}`}
              data-reason-icon
              aria-hidden="true"
            >
              <ReasonIllustration icon={reason.icon} />
            </span>
            <span className={styles.reasonLabel}>
              {reason.label.split("\n").map((line, lineIndex) => (
                <span key={`${reason.label}-${lineIndex}`}>
                  {lineIndex > 0 ? <br /> : null}
                  {line}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
