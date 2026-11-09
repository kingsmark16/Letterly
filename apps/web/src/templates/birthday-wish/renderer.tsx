"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SecretLetterRenderModel } from "@letterly/templates";
import type { PageAudioLink } from "@letterly/contracts/pages";
import {
  MemoryGallery,
  type MemoryGalleryItem,
} from "../secret-letter/memory-gallery";
import { SecretLetterAudioPlayer } from "../secret-letter/audio-player";
import { SecretLetterMessageReader } from "../secret-letter/message-reader";
import secretLetterStyles from "../secret-letter/renderer.module.css";
import { BirthdayWishFirstSection } from "./first-section";
import birthdayStyles from "./renderer.module.css";
import { useBirthdayWishOpening } from "./use-birthday-wish-opening";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export type BirthdayWishRendererProps =
  | {
      model: SecretLetterRenderModel;
      preview?: boolean;
      showAudioPlayerWhenEmpty?: boolean;
      autoOpen?: boolean;
      skipOpening?: boolean;
      previewScrollContainerRef?: RefObject<HTMLElement | null>;
      afterQuestion?: ReactNode;
      audioUrl?: string;
      audioTitle?: string;
      audioDurationMilliseconds?: number | null;
      audioLink?: PageAudioLink;
      audioMetadataUrl?: string;
      recipientName?: never;
      locked?: false;
      openingContent?: never;
    }
  | {
      model?: never;
      preview?: boolean;
      showAudioPlayerWhenEmpty?: never;
      autoOpen?: never;
      skipOpening?: never;
      previewScrollContainerRef?: never;
      afterQuestion?: never;
      audioUrl?: never;
      audioTitle?: never;
      audioDurationMilliseconds?: never;
      audioLink?: never;
      audioMetadataUrl?: never;
      recipientName?: string;
      locked: true;
      openingContent: ReactNode;
    };

const keepsakePillars = [
  {
    number: "01",
    title: "The year behind you",
    detail: "Every laugh, quiet win, and memory worth holding close.",
  },
  {
    number: "02",
    title: "This moment today",
    detail: "A pause to celebrate the warmth you bring to everyone around you.",
  },
  {
    number: "03",
    title: "The chapter ahead",
    detail:
      "Wishing you bright mornings, good company, and every wish fulfilled.",
  },
] as const;

function BirthdayCandleScene(): React.JSX.Element {
  return (
    <div className={birthdayStyles.candleArtwork} aria-hidden="true">
      <span className={birthdayStyles.candleHalo} data-candle-halo />
      <svg
        className={birthdayStyles.wishSparkles}
        data-wish-sparkles
        viewBox="0 0 168 196"
        fill="none"
      >
        <path
          d="M34 52l3 7.5 7.5 3-7.5 3-3 7.5-3-7.5-7.5-3 7.5-3 3-7.5Z"
          fill="#ffd479"
          opacity="0.82"
        />
        <path
          d="M134 44l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4 2.4-6Z"
          fill="#f7c297"
          opacity="0.76"
        />
        <circle cx="44" cy="96" r="2.2" fill="#ffd479" opacity="0.65" />
        <circle cx="126" cy="92" r="2.5" fill="#f7c297" opacity="0.7" />
      </svg>
      <svg
        className={birthdayStyles.candleSvg}
        viewBox="0 0 148 184"
        fill="none"
      >
        <defs>
          <linearGradient
            id="candleFlameGrad"
            x1="74"
            y1="16"
            x2="74"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#fff7d6" />
            <stop offset="52%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#f38b3c" />
          </linearGradient>
          <linearGradient
            id="candleBodyGrad"
            x1="54"
            y1="68"
            x2="94"
            y2="152"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#fff6f8" />
            <stop offset="55%" stopColor="#f9dce6" />
            <stop offset="100%" stopColor="#ebb8ca" />
          </linearGradient>
          <linearGradient
            id="candleHolderGrad"
            x1="36"
            y1="152"
            x2="112"
            y2="170"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#f3cea8" />
            <stop offset="50%" stopColor="#d9a074" />
            <stop offset="100%" stopColor="#a96e44" />
          </linearGradient>
        </defs>
        <g className={birthdayStyles.candleFlameGroup} data-candle-flame>
          <path
            d="M74 16C82 28 86 37 86 44.5C86 52.5 80.6 58 74 58C67.4 58 62 52.5 62 44.5C62 37 66 28 74 16Z"
            fill="url(#candleFlameGrad)"
          />
          <path
            d="M74 28C77.8 34.5 79.5 39.2 79.5 43.5C79.5 47.6 77 50.5 74 50.5C71 50.5 68.5 47.6 68.5 43.5C68.5 39.2 70.2 34.5 74 28Z"
            fill="#fffdf5"
          />
        </g>
        <line
          x1="74"
          y1="57"
          x2="74"
          y2="68"
          stroke="#4a2533"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect
          x="56"
          y="66"
          width="36"
          height="84"
          rx="10"
          fill="url(#candleBodyGrad)"
          stroke="#d9a074"
          strokeWidth="1.5"
        />
        <path
          d="M56 86L92 74M56 110L92 98M56 134L92 122"
          stroke="#d9a074"
          strokeWidth="2"
          strokeOpacity="0.65"
        />
        <path
          d="M56 73C61 78 66 78 70 74C74 70 79 71 83 76C86 79 89 78 92 75"
          stroke="#fffafb"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M38 150H110C112.2 150 114 151.8 114 154C114 158.4 110.4 162 106 162H42C37.6 162 34 158.4 34 154C34 151.8 35.8 150 38 150Z"
          fill="url(#candleHolderGrad)"
        />
        <rect
          x="52"
          y="162"
          width="44"
          height="7"
          rx="3.5"
          fill="url(#candleHolderGrad)"
        />
      </svg>
    </div>
  );
}

function WindSparkIcon(): React.JSX.Element {
  return (
    <svg
      className={birthdayStyles.candleButtonIcon}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 8.5h9.5a2.25 2.25 0 1 0-2.1-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M4.5 12h11a2.25 2.25 0 1 1-2.1 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PreviewFooter(): React.JSX.Element {
  return (
    <footer
      className={secretLetterStyles.previewFooter}
      aria-label="Letter footer"
    >
      <Link href="/" aria-label="Letterly home">
        Letterly
      </Link>
      <span aria-hidden="true">/</span>
      <Link href="/templates">Create your own birthday wish</Link>
    </footer>
  );
}

export function BirthdayWishRenderer({
  model,
  preview = false,
  showAudioPlayerWhenEmpty = false,
  autoOpen = false,
  skipOpening = false,
  previewScrollContainerRef,
  afterQuestion,
  audioUrl,
  audioTitle,
  audioDurationMilliseconds,
  audioLink,
  audioMetadataUrl,
  locked = false,
  recipientName,
  openingContent,
}: BirthdayWishRendererProps): React.JSX.Element {
  const initialOpened = skipOpening || autoOpen;
  const rootRef = useRef<HTMLDivElement>(null);
  const readerHeadingRef = useRef<HTMLHeadingElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );

  const {
    opened,
    opening,
    lockedPromptVisible,
    revealed,
    revealPasswordPrompt,
    blowOutCandle,
  } = useBirthdayWishOpening({
    rootRef,
    readerHeadingRef,
    initialOpened,
    locked,
    hydrated,
    clientReady,
    reduceMotion,
  });

  const memoryCards = useMemo<MemoryGalleryItem[]>(() => {
    if (!model) return [];
    return model.images.map((image, index) => ({
      id: image.imageId,
      src: image.mediaUrl,
      caption: image.caption?.trim() || `Birthday memory ${index + 1}`,
    }));
  }, [model]);

  const letterTitle = model?.title?.trim() || "Birthday Wish";
  const stageRecipient =
    (locked ? recipientName?.trim() : model?.recipientName.trim()) ||
    "Someone Special";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReduceMotion(mediaQuery.matches);
    update();
    setHydrated(true);
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useIsomorphicLayoutEffect(() => {
    setClientReady(true);

    if (preview || window.location.hash) return;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [preview]);

  useGSAP(
    () => {
      if (locked || !hydrated || !opened || !revealed || reduceMotion) return;

      const root = rootRef.current;
      if (!root) return;

      const sections = Array.from(
        root.querySelectorAll<HTMLElement>(
          [
            "[data-letter-memory-gallery]",
            "[data-birthday-keepsake-ribbon]",
            `.${secretLetterStyles.heartLetter}`,
          ].join(", "),
        ),
      );
      if (sections.length === 0) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const refresh = (): void => {
          ScrollTrigger.refresh();
          if (!preview && !window.location.hash) {
            ScrollTrigger.clearScrollMemory("manual");
            window.history.scrollRestoration = "manual";
          }
        };

        sections.forEach((section) => {
          const cards = Array.from(
            section.querySelectorAll<HTMLElement>("[data-memory-card]"),
          );
          gsap.set(section, { opacity: 0, y: 28 });
          if (cards.length > 0) gsap.set(cards, { opacity: 0, y: 14 });

          const reveal = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              scroller: previewScrollContainerRef?.current ?? undefined,
              start: "top 86%",
              once: true,
              toggleActions: "play none none none",
              invalidateOnRefresh: true,
            },
          });
          reveal.to(section, {
            opacity: 1,
            y: 0,
            duration: 0.54,
            ease: "power2.out",
          });
          if (cards.length > 0) {
            reveal.to(
              cards,
              {
                opacity: 1,
                y: 0,
                duration: 0.34,
                stagger: 0.08,
                ease: "power2.out",
              },
              "<0.1",
            );
          }
        });

        refresh();
        const refreshFrame = window.requestAnimationFrame(refresh);
        return () => window.cancelAnimationFrame(refreshFrame);
      });

      return () => media.revert();
    },
    {
      scope: rootRef,
      dependencies: [hydrated, locked, opened, reduceMotion, revealed],
      revertOnUpdate: true,
    },
  );

  return (
    <div className={secretLetterStyles.rootFrame}>
      <div
        ref={rootRef}
        className={`${secretLetterStyles.root} ${birthdayStyles.birthdayTheme}`}
        data-preview={preview || undefined}
        data-hydrated={hydrated || undefined}
        data-client-ready={clientReady || undefined}
        data-locked={locked || undefined}
        data-locked-prompt-visible={lockedPromptVisible || undefined}
        data-opened={opened || undefined}
        data-revealed={revealed ? "true" : "false"}
        data-opening={opening || undefined}
        data-reduced-motion={reduceMotion || undefined}
        role={locked ? "main" : undefined}
        aria-label={
          locked && !lockedPromptVisible ? "Protected birthday wish" : undefined
        }
        aria-labelledby={
          locked && lockedPromptVisible ? "locked-letter-title" : undefined
        }
      >
        {!locked ? (
          <a className={secretLetterStyles.skipLink} href="#letter-content">
            Skip to birthday wish
          </a>
        ) : null}

        <div
          className={birthdayStyles.wishOverlay}
          data-wish-overlay
          aria-label={
            locked && !lockedPromptVisible
              ? "Protected birthday wish opening"
              : locked
                ? undefined
                : "Make a birthday wish"
          }
          aria-labelledby={
            locked && lockedPromptVisible ? "locked-letter-title" : undefined
          }
        >
          {locked ? (
            <div className={secretLetterStyles.lockedOpeningScene}>
              <div
                className={secretLetterStyles.lockedOpeningStage}
                data-locked-opening-stage
                aria-hidden={lockedPromptVisible || undefined}
              >
                <div className={birthdayStyles.wishStage} data-wish-scene>
                  <p className={birthdayStyles.wishKicker}>
                    A Birthday Keepsake For
                  </p>
                  <p className={birthdayStyles.wishRecipientTitle}>
                    {stageRecipient}
                  </p>
                  <BirthdayCandleScene />
                  <p className={birthdayStyles.wishSubtitle}>
                    Make a wish and blow out the candle to unlock your private
                    birthday keepsake.
                  </p>
                  <button
                    className={birthdayStyles.candleActionButton}
                    data-candle-button
                    type="button"
                    onClick={revealPasswordPrompt}
                    disabled={lockedPromptVisible}
                    tabIndex={lockedPromptVisible ? -1 : undefined}
                    aria-label="Blow out the candle to unlock your protected birthday wish"
                  >
                    <WindSparkIcon />
                    <span>Blow out the candle</span>
                  </button>
                </div>
              </div>
              <div
                className={`${secretLetterStyles.openingContent} ${secretLetterStyles.passwordPrompt}`}
                data-password-prompt
                hidden={!lockedPromptVisible}
              >
                {openingContent}
              </div>
            </div>
          ) : (
            <div className={birthdayStyles.wishStage} data-wish-scene>
              <p className={birthdayStyles.wishKicker}>
                A Birthday Keepsake For
              </p>
              <p className={birthdayStyles.wishRecipientTitle}>
                {stageRecipient}
              </p>
              <BirthdayCandleScene />
              <p className={birthdayStyles.wishSubtitle}>
                Close your eyes, make a wish, and blow out the candle to unfold
                your birthday card.
              </p>
              <button
                className={birthdayStyles.candleActionButton}
                data-candle-button
                type="button"
                onClick={blowOutCandle}
                disabled={opening || opened}
                aria-expanded={opened}
                aria-controls="letter-content"
                aria-label={
                  opening
                    ? "Making your wish..."
                    : "Blow out the candle and open your birthday wish"
                }
              >
                <WindSparkIcon />
                <span>
                  {opening ? "Making a wish..." : "Blow out the candle"}
                </span>
              </button>
              <p className={birthdayStyles.wishHint} data-opening-hint>
                Tap or press Enter to blow out the candle
              </p>
            </div>
          )}
        </div>

        {!locked && model ? (
          <main
            className={secretLetterStyles.mainContent}
            data-letter-content-wrapper
          >
            <article
              id="letter-content"
              className={`${secretLetterStyles.letterShell} ${birthdayStyles.keepsakeShell}`}
            >
              <h1
                ref={readerHeadingRef}
                className={secretLetterStyles.readerTitle}
                tabIndex={-1}
              >
                Happy Birthday, {model.recipientName || "Someone Special"}
              </h1>
              <BirthdayWishFirstSection
                letterTitle={letterTitle}
                recipientName={model.recipientName}
                heroActions={
                  audioUrl ||
                  audioLink ||
                  preview ||
                  showAudioPlayerWhenEmpty ? (
                    <SecretLetterAudioPlayer
                      src={audioUrl}
                      youtubeVideoId={audioLink?.videoId}
                      metadataUrl={audioMetadataUrl}
                      title={
                        audioLink?.displayTitle ??
                        audioTitle ??
                        "Birthday soundtrack"
                      }
                      durationSeconds={audioLink?.durationSeconds}
                      durationMilliseconds={audioDurationMilliseconds}
                      active={hydrated && opened && revealed && !locked}
                      compact
                      romantic
                      formatLabel={audioLink ? "YouTube" : "Audio"}
                    />
                  ) : null
                }
              />

              {memoryCards.length > 0 ? (
                <MemoryGallery
                  memories={memoryCards}
                  failedImageIds={failedImageIds}
                  onImageError={(imageId) =>
                    setFailedImageIds((current) =>
                      new Set(current).add(imageId),
                    )
                  }
                />
              ) : null}

              <section
                className={birthdayStyles.keepsakeRibbon}
                data-birthday-keepsake-ribbon
                aria-label="Birthday wishes"
              >
                {keepsakePillars.map((pillar) => (
                  <div
                    key={pillar.number}
                    className={birthdayStyles.keepsakeItem}
                  >
                    <span
                      className={birthdayStyles.keepsakeNumber}
                      aria-hidden="true"
                    >
                      {pillar.number}
                    </span>
                    <h3 className={birthdayStyles.keepsakeTitle}>
                      {pillar.title}
                    </h3>
                    <p className={birthdayStyles.keepsakeDetail}>
                      {pillar.detail}
                    </p>
                  </div>
                ))}
              </section>

              <SecretLetterMessageReader
                message={model.mainMessage}
                recipientName={model.recipientName}
                creatorName={model.creatorName}
                headingText="A birthday wish for you,"
                closingText="Warmest wishes,"
                defaultRecipientLabel="someone worth celebrating"
                hydrated={hydrated}
                opened={opened}
                revealed={revealed}
                reduceMotion={reduceMotion}
                previewScrollContainerRef={previewScrollContainerRef}
              />

              {afterQuestion ? (
                <div className={secretLetterStyles.reportSlot}>
                  {afterQuestion}
                </div>
              ) : null}
              {preview ? <PreviewFooter /> : null}
            </article>
          </main>
        ) : null}
      </div>
    </div>
  );
}
