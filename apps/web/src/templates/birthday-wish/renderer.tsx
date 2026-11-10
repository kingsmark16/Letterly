"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SecretLetterRenderModel } from "@letterly/templates";
import type { PageAudioLink } from "@letterly/contracts/pages";
import { SecretLetterAudioPlayer } from "../secret-letter/audio-player";
import { paginateMessage } from "../secret-letter/message-pagination";
import { BirthdayWishFirstSection } from "./first-section";
import { RealisticBirthdayCakeCanvas } from "./realistic-cake-canvas";
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

type BirthdayMemoryItem = {
  id: string;
  src: string;
  caption: string;
};

const keepsakePillars = [
  {
    number: "WISH I",
    tag: "Gratitude",
    title: "The year behind you",
    detail: "Every laugh, quiet triumph, and memory worth holding close.",
  },
  {
    number: "WISH II",
    tag: "Presence",
    title: "This moment today",
    detail: "A pause to celebrate the warmth you bring to everyone around you.",
  },
  {
    number: "WISH III",
    tag: "Horizon",
    title: "The chapter ahead",
    detail:
      "Wishing you bright mornings, good company, and every wish fulfilled.",
  },
] as const;

function GoldenStarIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={birthdayStyles.kickerIcon}
    >
      <path d="M8 1l1.7 4.5L14.2 7l-4.5 1.7L8 13.2l-1.7-4.5L1.8 7l4.5-1.5L8 1z" />
    </svg>
  );
}

function BirthdayWishTracker({
  extinguishedCandles,
  isOpening = false,
}: {
  extinguishedCandles: [boolean, boolean, boolean];
  isOpening?: boolean;
}): React.JSX.Element {
  const litCount = extinguishedCandles.filter((out) => !out).length;
  const wishLabels = ["Gratitude", "Presence", "Horizon"] as const;

  return (
    <div className={birthdayStyles.wishTrackerContainer} aria-live="polite">
      <div className={birthdayStyles.wishNodeGroup}>
        {([0, 1, 2] as const).map((index) => {
          const isOut = isOpening || extinguishedCandles[index];
          return (
            <div
              key={index}
              className={birthdayStyles.wishNodePill}
              data-sealed={isOut ? "true" : "false"}
            >
              <span className={birthdayStyles.wishNodeOrb} aria-hidden="true">
                {isOut ? "✦" : "•"}
              </span>
              <span className={birthdayStyles.wishNodeText}>
                {isOut ? `Wish ${index + 1} Sealed` : wishLabels[index]}
              </span>
            </div>
          );
        })}
      </div>
      <p className={birthdayStyles.wishStatusLead}>
        {isOpening
          ? "All 3 wishes sealed ✦ Opening your celebration edition..."
          : litCount === 3
            ? "3 wishes waiting · Tap each candle or blow all out below"
            : litCount === 2
              ? "1st wish sealed · 2 candles glowing"
              : litCount === 1
                ? "2nd wish sealed · 1 candle remaining"
                : "All 3 wishes sealed ✦ Opening your celebration edition..."}
      </p>
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

function BirthdayMemoryReel({
  memories,
  failedImageIds,
  onImageError,
}: {
  memories: BirthdayMemoryItem[];
  failedImageIds: Set<string>;
  onImageError: (imageId: string) => void;
}): React.JSX.Element {
  return (
    <section
      className={birthdayStyles.memoryReelSection}
      data-letter-memory-gallery
      aria-label="Birthday memory filmstrip"
    >
      <div className={birthdayStyles.sectionHeaderRow}>
        <p className={birthdayStyles.sectionEyebrow}>
          Golden Hour Filmstrip · Saved Moments
        </p>
        <p className={birthdayStyles.sectionSubhint}>
          {memories.length} {memories.length === 1 ? "frame" : "frames"} in this
          edition
        </p>
      </div>

      <ul
        className={birthdayStyles.memoryReelGrid}
        aria-label="Birthday memories"
      >
        {memories.map((memory, index) => {
          const hasFailed = failedImageIds.has(memory.id);
          return (
            <li
              key={memory.id}
              className={birthdayStyles.memoryFilmCard}
              data-memory-card
            >
              <div className={birthdayStyles.memoryFilmMeta}>
                <span>FRAME {index + 1}</span>
                <span>35MM KEEPSAKE</span>
              </div>
              <div className={birthdayStyles.memoryViewport}>
                {hasFailed ? (
                  <div className={birthdayStyles.memoryFallback} role="status">
                    This image is unavailable right now.
                  </div>
                ) : (
                  <Image
                    className={birthdayStyles.memoryImage}
                    src={memory.src}
                    alt={memory.caption}
                    width={720}
                    height={480}
                    sizes="(max-width: 720px) 86vw, (max-width: 1040px) 29vw, 280px"
                    loading="lazy"
                    decoding="async"
                    unoptimized
                    onError={() => onImageError(memory.id)}
                  />
                )}
              </div>
              <p className={birthdayStyles.memoryCaption}>{memory.caption}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BirthdayLetterFolio({
  message,
  recipientName,
  creatorName,
}: {
  message: string;
  recipientName?: string;
  creatorName?: string;
}): React.JSX.Element {
  const folioRef = useRef<HTMLElement>(null);
  const [stamped, setStamped] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const pages = useMemo(() => {
    return paginateMessage(message);
  }, [message]);

  const totalPages = pages.length;
  const activePageIndex = Math.min(pageIndex, Math.max(totalPages - 1, 0));
  const currentPageText = pages[activePageIndex] ?? "";

  useEffect(() => {
    setPageIndex(0);
  }, [message]);

  const paragraphs = useMemo(() => {
    const split = currentPageText
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);
    return split.length > 0
      ? split
      : [currentPageText.trim() || "Happy Birthday!"];
  }, [currentPageText]);

  const cleanRecipient = recipientName?.trim() || "Someone Special";
  const cleanCreator = creatorName?.trim() || "Someone who celebrates you";

  const { contextSafe } = useGSAP({ scope: folioRef });

  const handleToggleStamp = contextSafe((): void => {
    setStamped((prev) => !prev);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const button = folioRef.current?.querySelector<HTMLElement>(
      "[data-bw-postmark-btn]",
    );
    if (button) {
      gsap.fromTo(
        button,
        { scale: 0.88, rotation: -4 },
        {
          scale: 1,
          rotation: 0,
          duration: 0.42,
          ease: "back.out(2.2)",
          overwrite: true,
        },
      );
    }
  });

  return (
    <section
      ref={folioRef}
      className={birthdayStyles.letterFolioSection}
      data-bw-letter-folio
      aria-label="Birthday letter"
    >
      <div className={birthdayStyles.letterFolioSheet} data-message-reader>
        <div className={birthdayStyles.folioHeaderRow}>
          <div>
            <p className={birthdayStyles.folioKicker}>The Keepsake Dispatch</p>
            <h2 className={birthdayStyles.folioHeading}>
              A birthday wish written for you
            </h2>
          </div>
          <span className={birthdayStyles.editionPill}>Archival Linen</span>
        </div>

        <p className={birthdayStyles.folioSalutation}>Dear {cleanRecipient},</p>

        <div
          className={birthdayStyles.folioBody}
          data-message-full
          data-message-page={activePageIndex}
        >
          {paragraphs.map((paragraph, index) => (
            <p key={index} className={birthdayStyles.folioParagraph}>
              {paragraph}
            </p>
          ))}
        </div>

        {totalPages > 1 && (
          <nav
            className={birthdayStyles.folioPagination}
            aria-label="Birthday letter pages"
          >
            <button
              type="button"
              className={birthdayStyles.folioPageBtn}
              onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={activePageIndex === 0}
              aria-label="Go to previous letter page"
            >
              ← Previous page
            </button>
            <span
              className={birthdayStyles.folioPageIndicator}
              aria-live="polite"
            >
              Page {activePageIndex + 1} of {totalPages}
            </span>
            <button
              type="button"
              className={birthdayStyles.folioPageBtn}
              onClick={() =>
                setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))
              }
              disabled={activePageIndex >= totalPages - 1}
              aria-label="Go to next letter page"
            >
              Next page →
            </button>
          </nav>
        )}

        <footer className={birthdayStyles.folioFooter}>
          <div className={birthdayStyles.folioSignoffBlock}>
            <p className={birthdayStyles.folioClosingLabel}>
              Warmest birthday wishes,
            </p>
            <p className={birthdayStyles.folioSignature}>{cleanCreator}</p>
          </div>

          <button
            type="button"
            className={birthdayStyles.postmarkButton}
            data-bw-postmark-btn
            aria-pressed={stamped}
            onClick={handleToggleStamp}
          >
            <span aria-hidden="true">{stamped ? "✦" : "◎"}</span>
            <span>
              {stamped ? "Postmarked · Golden Year" : "Stamp Birthday Seal"}
            </span>
          </button>
        </footer>
      </div>
    </section>
  );
}

function PreviewFooter(): React.JSX.Element {
  return (
    <footer className={birthdayStyles.previewFooter} aria-label="Letter footer">
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
  const [activePillarIndex, setActivePillarIndex] = useState<number>(0);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );

  const {
    opened,
    opening,
    relighting,
    revealed,
    extinguishedCandles,
    toggleCandle,
    relightCandles,
    blowOutCandle,
  } = useBirthdayWishOpening({
    rootRef,
    readerHeadingRef,
    initialOpened,
    locked,
    hydrated,
    clientReady,
    reduceMotion,
    preview,
  });

  const memoryCards = useMemo<BirthdayMemoryItem[]>(() => {
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
            "[data-birthday-keepsake-ribbon]",
            "[data-letter-memory-gallery]",
            "[data-bw-letter-folio]",
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
          gsap.set(section, { opacity: 0, y: 24 });
          if (cards.length > 0) gsap.set(cards, { opacity: 0, y: 14 });

          const reveal = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              scroller:
                previewScrollContainerRef?.current ??
                (preview ? (rootRef.current ?? undefined) : undefined),
              start: "top 86%",
              once: true,
              toggleActions: "play none none none",
              invalidateOnRefresh: true,
            },
          });
          reveal.to(section, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            clearProps: "transform",
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
                clearProps: "transform",
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
    <div
      className={`${birthdayStyles.rootFrame} ${preview ? birthdayStyles.previewRootFrame : ""}`}
    >
      <div
        ref={rootRef}
        className={birthdayStyles.root}
        data-preview={preview || undefined}
        data-hydrated={hydrated || undefined}
        data-client-ready={clientReady || undefined}
        data-locked={locked || undefined}
        data-locked-prompt-visible={locked || undefined}
        data-opened={opened || undefined}
        data-relighting={relighting || undefined}
        data-revealed={revealed ? "true" : "false"}
        data-opening={opening || undefined}
        data-reduced-motion={reduceMotion || undefined}
        role={locked ? "main" : undefined}
        aria-labelledby={locked ? "locked-letter-title" : undefined}
      >
        {!locked ? (
          <a className={birthdayStyles.skipLink} href="#letter-content">
            Skip to birthday wish
          </a>
        ) : null}

        <div
          className={birthdayStyles.wishOverlay}
          data-wish-overlay
          aria-label={locked ? undefined : "Make a birthday wish"}
          aria-labelledby={locked ? "locked-letter-title" : undefined}
        >
          {locked ? (
            <div className={birthdayStyles.lockedOpeningScene}>
              <div
                className={birthdayStyles.passwordPrompt}
                data-password-prompt
              >
                {openingContent}
              </div>
            </div>
          ) : (
            <div className={birthdayStyles.wishStage} data-wish-scene>
              <p className={birthdayStyles.wishKicker}>
                <GoldenStarIcon />
                <span>Golden Hour Edition · For</span>
              </p>
              <p className={birthdayStyles.wishRecipientTitle}>
                {stageRecipient}
              </p>
              <RealisticBirthdayCakeCanvas
                extinguishedCandles={extinguishedCandles}
                onToggleCandle={toggleCandle}
                disabled={opening || (opened && !relighting)}
                isOpening={opening}
              />
              <BirthdayWishTracker
                extinguishedCandles={extinguishedCandles}
                isOpening={opening}
              />
              <p className={birthdayStyles.wishSubtitle}>
                {opening
                  ? "Your wishes are drifting into the stars. Preparing your birthday story..."
                  : "Tap each candle to make three wishes, or blow them all out at once to open your birthday edition."}
              </p>
              <button
                className={birthdayStyles.candleActionButton}
                data-candle-button
                data-opening={opening ? "true" : undefined}
                type="button"
                onClick={blowOutCandle}
                disabled={opening || (opened && !relighting)}
                aria-expanded={opened && !relighting}
                aria-controls="letter-content"
                aria-label={
                  opening
                    ? "Wishes sealed! Opening your celebration edition..."
                    : "Blow out the candle and open your birthday wish"
                }
              >
                <WindSparkIcon />
                <span>
                  {opening ? "Wishes Sealed ✦" : "Blow out the candle"}
                </span>
              </button>
              <p className={birthdayStyles.wishHint} data-opening-hint>
                Tap individual candles above or press Enter to blow them out
              </p>
            </div>
          )}
        </div>

        {!locked && model ? (
          <main
            className={birthdayStyles.mainContent}
            data-letter-content-wrapper
          >
            <article
              id="letter-content"
              className={birthdayStyles.keepsakeShell}
            >
              <h1
                ref={readerHeadingRef}
                className={birthdayStyles.srOnlyHeading}
                tabIndex={-1}
              >
                Happy Birthday, {model.recipientName || "Someone Special"}
              </h1>

              <BirthdayWishFirstSection
                letterTitle={letterTitle}
                recipientName={model.recipientName}
                onRelightCandles={relightCandles}
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
                      formatLabel={audioLink ? "YouTube" : "Audio"}
                    />
                  ) : null
                }
              />

              <section
                className={birthdayStyles.wishDeckSection}
                data-birthday-keepsake-ribbon
                aria-label="Birthday wishes"
              >
                <div className={birthdayStyles.sectionHeaderRow}>
                  <p className={birthdayStyles.sectionEyebrow}>
                    Three Pillars of Your New Year
                  </p>
                  <p className={birthdayStyles.sectionSubhint}>
                    Select a card to illuminate its birthday blessing
                  </p>
                </div>
                <div className={birthdayStyles.keepsakeRibbon}>
                  {keepsakePillars.map((pillar, index) => {
                    const isSelected = activePillarIndex === index;
                    return (
                      <button
                        key={pillar.number}
                        type="button"
                        className={birthdayStyles.keepsakeCardButton}
                        aria-pressed={isSelected}
                        onClick={() => setActivePillarIndex(index)}
                      >
                        <div className={birthdayStyles.keepsakeCardTop}>
                          <span className={birthdayStyles.keepsakeNumber}>
                            {pillar.number}
                          </span>
                          <span className={birthdayStyles.keepsakeStateTag}>
                            {isSelected ? "Illuminated ✦" : pillar.tag}
                          </span>
                        </div>
                        <h3 className={birthdayStyles.keepsakeTitle}>
                          {pillar.title}
                        </h3>
                        <p className={birthdayStyles.keepsakeDetail}>
                          {pillar.detail}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {memoryCards.length > 0 ? (
                <BirthdayMemoryReel
                  memories={memoryCards}
                  failedImageIds={failedImageIds}
                  onImageError={(imageId) =>
                    setFailedImageIds((current) =>
                      new Set(current).add(imageId),
                    )
                  }
                />
              ) : null}

              <BirthdayLetterFolio
                message={model.mainMessage}
                recipientName={model.recipientName}
                creatorName={model.creatorName}
              />

              {afterQuestion ? (
                <div className={birthdayStyles.reportSlot}>{afterQuestion}</div>
              ) : null}
              {preview ? <PreviewFooter /> : null}
            </article>
          </main>
        ) : null}
      </div>
    </div>
  );
}
