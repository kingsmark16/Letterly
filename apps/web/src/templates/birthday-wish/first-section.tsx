"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import birthdayStyles from "./renderer.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

type BirthdayWishFirstSectionProps = {
  letterTitle: string;
  recipientName?: string;
  heroActions?: ReactNode;
  headingId?: string;
  staticWordmark?: boolean;
  storyId?: string;
  onRelightCandles?: () => void;
};

const WISH_BLESSINGS = [
  "May your brightest days this year outshine every year before.",
  "Here is to spontaneous adventures, deep laughter, and golden evenings.",
  "May every quiet wish you make today find its way to you.",
  "To health, fierce joy, and people who celebrate you endlessly.",
] as const;

const CONFETTI_COLORS = [
  "#f5c469",
  "#d49b3b",
  "#c2591a",
  "#fff3d1",
  "#9e2344",
  "#eab04e",
] as const;

function PatisserieCrestIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.5c1.4 1.8 2 3.1 2 4.2a2 2 0 1 1-4 0c0-1.1.6-2.4 2-4.2Z" />
      <path d="M5 14h14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5Z" />
      <path d="M7.5 10h9v4h-9z" />
      <path d="M3.5 19h17" />
    </svg>
  );
}

function SunburstIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 1.8 11.9 7l5.3 1.9-5.3 1.9L10 16l-1.9-5.2L2.8 8.9 8.1 7 10 1.8Z" />
    </svg>
  );
}

export function BirthdayWishFirstSection({
  letterTitle,
  recipientName,
  heroActions,
  headingId = "hero-heading",
  staticWordmark = false,
  storyId = "birthday-story",
  onRelightCandles,
}: BirthdayWishFirstSectionProps): React.JSX.Element {
  const sectionScopeRef = useRef<HTMLDivElement>(null);
  const [wishCount, setWishCount] = useState(1);

  const cleanRecipient = recipientName?.trim();
  const activeBlessing =
    WISH_BLESSINGS[(wishCount - 1) % WISH_BLESSINGS.length];

  const { contextSafe } = useGSAP({ scope: sectionScopeRef });

  const triggerConfettiBurst = contextSafe((): void => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const particles = sectionScopeRef.current?.querySelectorAll<HTMLElement>(
      "[data-bw-confetti-piece]",
    );
    if (!particles || particles.length === 0) return;

    particles.forEach((particle, index) => {
      const spreadX = (index - particles.length / 2) * 28;
      const spreadY = 48 + (index % 4) * 34;
      const rotate = (index % 2 === 0 ? 1 : -1) * (95 + index * 18);

      gsap.fromTo(
        particle,
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 0.5,
          rotation: 0,
        },
        {
          opacity: 0,
          x: spreadX,
          y: spreadY,
          scale: 1.25,
          rotation: rotate,
          duration: 1.05,
          ease: "power2.out",
          overwrite: true,
        },
      );
    });
  });

  const handleMakeExtraWish = contextSafe((): void => {
    setWishCount((prev) => prev + 1);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sparks = sectionScopeRef.current?.querySelectorAll<HTMLElement>(
      "[data-medallion-spark]",
    );
    const orbit = sectionScopeRef.current?.querySelector<HTMLElement>(
      "[data-medallion-orbit]",
    );

    if (orbit) {
      gsap.fromTo(
        orbit,
        { scale: 0.92 },
        {
          scale: 1,
          duration: 0.48,
          ease: "back.out(2.1)",
          overwrite: true,
        },
      );
    }

    sparks?.forEach((spark, index) => {
      const angle = (index / sparks.length) * Math.PI * 2;
      const radius = 48 + (index % 2) * 14;
      gsap.fromTo(
        spark,
        { opacity: 1, x: 0, y: 0, scale: 0.4 },
        {
          opacity: 0,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          scale: 1.35,
          duration: 0.72,
          ease: "power2.out",
          overwrite: true,
        },
      );
    });
  });

  const wordmarkContent = (
    <>
      <PatisserieCrestIcon />
      <span>{letterTitle}</span>
    </>
  );

  return (
    <div ref={sectionScopeRef}>
      <div className={birthdayStyles.confettiStageLayer} aria-hidden="true">
        {Array.from({ length: 16 }).map((_, index) => (
          <span
            key={index}
            className={birthdayStyles.confettiParticle}
            data-bw-confetti-piece
            style={{
              backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            }}
          />
        ))}
      </div>

      <header className={birthdayStyles.marqueeHeader} data-bw-header>
        <div className={birthdayStyles.marqueeBrandGroup}>
          <span className={birthdayStyles.editionPill}>Birthday Edition</span>
          {staticWordmark ? (
            <span className={birthdayStyles.wordmark}>{wordmarkContent}</span>
          ) : (
            <a
              className={birthdayStyles.wordmark}
              href={`#${storyId}`}
              aria-label={`${letterTitle}. Go to the beginning`}
            >
              {wordmarkContent}
            </a>
          )}
        </div>

        <div className={birthdayStyles.marqueeControls}>
          <button
            type="button"
            className={birthdayStyles.celebrateButton}
            onClick={triggerConfettiBurst}
          >
            <SunburstIcon />
            <span>Celebrate</span>
          </button>
          {onRelightCandles ? (
            <button
              type="button"
              className={birthdayStyles.relightButton}
              onClick={onRelightCandles}
            >
              <span>Relight Candles</span>
            </button>
          ) : null}
        </div>
      </header>

      <section
        id={storyId}
        className={birthdayStyles.birthdayHero}
        aria-labelledby={headingId}
      >
        <div
          className={birthdayStyles.heroEditorialColumn}
          data-bw-hero-editorial
        >
          <p className={birthdayStyles.heroBadge}>
            <SunburstIcon />
            <span>Solar Return · Personal Keepsake</span>
          </p>
          <h2 id={headingId} className={birthdayStyles.heroDisplayTitle}>
            Happy Birthday
            {cleanRecipient ? `, ${cleanRecipient}` : ""}
            <span
              className={birthdayStyles.heroDisplayAccent}
              aria-hidden="true"
            >
              ✦
            </span>
          </h2>
          <p className={birthdayStyles.heroLead}>
            Another trip around the sun, celebrated with the stories, warmth,
            and bright moments that make this chapter unmistakably yours.
          </p>
          {heroActions ? (
            <div className={birthdayStyles.heroSoundtrackSlot}>
              {heroActions}
            </div>
          ) : null}
        </div>

        <aside
          className={birthdayStyles.heroMedallionCard}
          data-bw-hero-medallion
          aria-label="Interactive birthday wish counter"
        >
          <p className={birthdayStyles.medallionKicker}>
            Golden Hour Wish Dial
          </p>
          <div className={birthdayStyles.medallionOrbit} data-medallion-orbit>
            <div
              className={birthdayStyles.medallionSparkBurst}
              aria-hidden="true"
            >
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className={birthdayStyles.medallionSparkDot}
                  data-medallion-spark
                />
              ))}
            </div>
            <div>
              <p
                className={birthdayStyles.medallionCountValue}
                aria-live="polite"
              >
                {wishCount}
              </p>
              <p className={birthdayStyles.medallionCountLabel}>
                {wishCount === 1 ? "Wish Sealed" : "Wishes Sealed"}
              </p>
            </div>
          </div>
          <p className={birthdayStyles.medallionWishText}>{activeBlessing}</p>
          <button
            type="button"
            className={birthdayStyles.medallionTriggerBtn}
            onClick={handleMakeExtraWish}
          >
            <SunburstIcon />
            <span>Add a Birthday Wish</span>
          </button>
        </aside>
      </section>
    </div>
  );
}
