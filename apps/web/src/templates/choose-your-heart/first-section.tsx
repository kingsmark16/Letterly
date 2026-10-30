"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  countGraphemes,
  hasAtMostGraphemes,
} from "@letterly/templates/graphemes";
import { isPageJourneyTextQuestion } from "@letterly/templates/journey";
import type { ReactNode } from "react";
import {
  messagePagesMatch,
  paginateMessage,
  paginateMessageToFit,
} from "../secret-letter/message-pagination";
import styles from "./choose-your-heart.module.css";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export type ChooseYourHeartLetterView = {
  title?: string;
  recipientName?: string;
  mainMessage?: string;
  creatorName?: string;
};

export type ChooseYourHeartImage = {
  imageId: string;
  mediaUrl: string;
  caption: string | null;
};

export type ChooseYourHeartQuestion = {
  choices: ReadonlyArray<{
    key: string;
    label: string;
  }>;
  prompt: string;
};

type ChooseYourHeartFirstSectionProps = {
  answeredLabel: string;
  children?: ReactNode;
  idPrefix?: string;
  images?: ReadonlyArray<ChooseYourHeartImage>;
  letter?: ChooseYourHeartLetterView;
  onContinueToQuestions?: () => void;
  onSealPulse?: () => void;
  progress: number;
  questionCount?: number;
};

type ChooseYourHeartQuestionProps = {
  isLastQuestion?: boolean;
  onBack?: () => void;
  onChoose?: (choiceKey: string) => void;
  onSubmitTextAnswer?: (choiceKey: string) => void;
  onTextValueChange?: (value: string) => void;
  question: ChooseYourHeartQuestion;
  questionNumber: number;
  textError?: string | null;
  textValue?: string;
  totalQuestions?: number;
};

function deriveInitial(name: string | undefined, fallback: string): string {
  const trimmed = name?.trim() ?? "";
  for (const char of trimmed) {
    if (/\p{L}|\p{N}/u.test(char)) {
      return char.toUpperCase();
    }
  }
  return fallback;
}

function HeartIcon({
  className = "h-3.5 w-3.5",
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function StarsIcon({
  className = "h-3 w-3",
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2l2.1 6.4L20.5 10.5l-6.4 2.1L12 19l-2.1-6.4L3.5 10.5l6.4-2.1L12 2zm6.5 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
    </svg>
  );
}

function ArrowLeftIcon({
  className = "h-3 w-3",
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon({
  className = "h-3 w-3",
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export function ChooseYourHeartFirstSection({
  answeredLabel,
  children,
  idPrefix = "journey",
  images,
  letter,
  onContinueToQuestions,
  onSealPulse,
  progress,
  questionCount,
}: ChooseYourHeartFirstSectionProps): React.JSX.Element {
  const titleId = `${idPrefix}-title`;
  const heading = letter?.title?.trim() || "Valentine Correspondence";
  const recipient = letter?.recipientName?.trim() || "Someone special";
  const rawMessage =
    letter?.mainMessage?.trim() ||
    "Every ordinary day turns subtly magical the instant you come to mind. Read this letter first, then continue to the questions waiting for you.";
  const creator = letter?.creatorName?.trim();
  const creatorInitial = deriveInitial(creator, "J");
  const recipientInitial = deriveInitial(recipient, "G");
  const stampTitle = creator
    ? `${creator} ♥ ${recipient} — Keepsake Postage`
    : `${recipient} — Keepsake Postage`;

  const bodyViewportRef = useRef<HTMLDivElement>(null);
  const photoContainerRef = useRef<HTMLDivElement>(null);
  const measureElementRef = useRef<HTMLSpanElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );

  const safeImages = images ?? [];
  const currentImage =
    safeImages.length > 0
      ? safeImages[Math.min(activeImageIndex, safeImages.length - 1)]
      : null;

  const fallbackPages = useMemo(
    () => paginateMessage(rawMessage),
    [rawMessage],
  );
  const [pages, setPages] = useState<string[]>(fallbackPages);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    setPages(fallbackPages);
    setPageIndex(0);
  }, [fallbackPages]);

  useIsomorphicLayoutEffect(() => {
    if (!hydrated) return;
    const viewportEl = bodyViewportRef.current;
    const measureEl = measureElementRef.current;
    if (!viewportEl || !measureEl) return;
    if (typeof ResizeObserver === "undefined") return;

    let frame: number | null = null;
    let disposed = false;

    const recalculatePages = (): void => {
      if (disposed || frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        if (disposed) return;

        const photoEl = photoContainerRef.current;
        const photoHeight = photoEl ? photoEl.offsetHeight + 6 : 0;
        const totalHeight = viewportEl.clientHeight;
        const availableHeight = Math.max(20, totalHeight - photoHeight - 6);
        const availableWidth = viewportEl.clientWidth;
        if (availableHeight <= 40 || availableWidth <= 60) {
          setPages(fallbackPages);
          return;
        }

        measureEl.style.width = `${availableWidth}px`;
        const nextPages = paginateMessageToFit(
          rawMessage,
          measureEl,
          availableHeight,
        );

        // Degeneracy guard: If calculation produces an unreasonable number of micro-pages,
        // fallback to standard natural word-boundary pagination immediately!
        const isDegenerate =
          nextPages.length > Math.max(fallbackPages.length * 2, 6) ||
          nextPages.some((p) => p.trim().length < 25);

        const safePages = isDegenerate ? fallbackPages : nextPages;

        setPages((current) =>
          messagePagesMatch(current, safePages) ? current : safePages,
        );
        setPageIndex((current) =>
          Math.min(current, Math.max(safePages.length - 1, 0)),
        );
      });
    };

    const observer = new ResizeObserver(recalculatePages);
    observer.observe(viewportEl);
    recalculatePages();

    if (document.fonts) {
      void document.fonts.ready.then(recalculatePages, recalculatePages);
    }

    return () => {
      disposed = true;
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [hydrated, rawMessage, children, fallbackPages, currentImage]);

  const activePageIndex = Math.min(pageIndex, Math.max(pages.length - 1, 0));
  const activePageText = hydrated ? (pages[activePageIndex] ?? "") : rawMessage;
  const paragraphs = activePageText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const totalPages = pages.length;

  function goToPage(nextIndex: number): void {
    setPageIndex(Math.max(0, Math.min(nextIndex, totalPages - 1)));
  }

  return (
    <section
      className="relative z-10 flex h-full max-h-full min-h-0 w-full max-w-[min(96vw,880px)] flex-1 flex-col items-center justify-between overflow-hidden py-0.5 sm:py-1"
      aria-labelledby={titleId}
      data-cyh-folio="true"
    >
      {/* Floating Editorial Masthead: Architectural Chip Title */}
      <header
        className="relative z-20 mb-1.5 flex shrink-0 flex-col items-center text-center sm:mb-2"
        data-cyh-reveal="heading"
      >
        <h1
          id={titleId}
          className={`${styles.fontSans} inline-flex max-w-[90vw] items-center gap-1.5 truncate rounded-full border border-[#ffb2bf]/60 bg-gradient-to-r from-white/90 via-[#fff5f6]/95 to-white/90 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6c002a] shadow-[0_4px_25px_rgba(140,29,64,0.25),0_0_20px_rgba(255,178,191,0.5)] backdrop-blur-xl transition-all duration-300 hover:scale-105 sm:px-4 sm:py-1 sm:text-[11px]`}
        >
          <HeartIcon className="h-2.5 w-2.5 shrink-0 text-[#8c1d40]" />
          <span className="truncate tracking-[0.22em]">{heading}</span>
        </h1>
      </header>

      {/* Kinetic Sculptural Collage Stage (Diagonal Stationery Stack) */}
      <div className="relative flex h-full max-h-full min-h-0 w-full flex-1 flex-col justify-center px-2 py-1 sm:px-3 sm:py-1.5 md:px-5">
        {/* LAYER 1: Deep Background Sculptural Slate Folder Envelope (Rotated +2.4 deg) */}
        <div
          data-cyh-layer="back-paper"
          className={`${styles.kineticBackPaper} pointer-events-none absolute inset-x-3 top-0 bottom-0 origin-bottom-right transform rounded-[1.6rem] border border-[#ffb2bf]/30 bg-gradient-to-br from-[#2a0e1e]/90 via-[#3b122b]/85 to-[#1a0815]/95 shadow-[0_25px_60px_-10px_rgba(10,2,8,0.85)] backdrop-blur-md sm:inset-x-6 sm:rounded-[2.1rem]`}
          aria-hidden="true"
        >
          {/* Architectural decorative line accents on folder */}
          <div
            className={`${styles.fontSans} absolute top-3.5 right-6 left-6 flex items-center justify-between text-[8px] uppercase tracking-[0.28em] text-[#bdc2ff] opacity-40 sm:top-4 sm:text-[9px]`}
          >
            <span className="text-[#ffb2bf]/80">FOR YOUR EYES ONLY</span>
            <span className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#ffb2bf]/60 to-transparent" />
            <span className="text-[#ffb2bf]/80">SHARED WITH HEART</span>
          </div>
        </div>

        {/* LAYER 2: Warm Parchment Underlay Shadow Sheet (Vellum Border) */}
        <div
          data-cyh-layer="envelope-flap"
          className={`${styles.kineticEnvelopeFlap} pointer-events-none absolute inset-x-1.5 top-2 bottom-1 origin-top-left transform rounded-[1.6rem] border border-[#e8dfcf] bg-gradient-to-br from-[#f8f4ee] via-[#efe8dd] to-[#e4dcd0] opacity-75 shadow-xl sm:inset-x-3 sm:rounded-[2.1rem]`}
          aria-hidden="true"
        />

        {/* LAYER 3: Primary Frosted Bone/Vellum Letter Card (Diagonal Tilt -1.5 deg) */}
        <article
          data-cyh-card="true"
          data-cyh-reveal="paper"
          aria-label="Letter message"
          className={`${styles.kineticLetter} relative z-10 flex h-full max-h-full min-h-0 w-full origin-center transform flex-col justify-between rounded-[1.5rem] border border-[#ffdadb]/80 bg-gradient-to-b from-[#ffffff]/98 via-[#fffbf9]/96 to-[#fdf6f3]/95 p-4 sm:p-5 md:p-6 lg:p-7 shadow-[0_30px_70px_-15px_rgba(30,3,18,0.65),0_0_45px_rgba(255,178,191,0.4),inset_0_1px_2px_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-500 sm:rounded-[2.2rem]`}
        >
          {/* Tactile deckled parchment gradient overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-[1.6rem] bg-gradient-to-tr from-[#ebdccb]/15 via-transparent to-[#dce2ff]/20 sm:rounded-[2.2rem]" />
          {/* Watermark vintage filigree ring in background */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#431d74]/5 sm:h-64 sm:w-64" />

          {/* KINETIC COLLAGE ACCENT: Floating Keepsake Postage Stamp Badge ("M ♥ M") */}
          <button
            type="button"
            onClick={onSealPulse}
            data-cyh-stamp="true"
            title={stampTitle}
            aria-label={stampTitle}
            className={`${styles.kineticStamp} group absolute -top-3 right-3 z-30 cursor-pointer sm:-top-5 sm:right-5`}
          >
            {/* Burst particles container animated by GSAP */}
            <span
              data-cyh-seal-burst="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              {[0, 1, 2, 3, 4, 5].map((burstIndex) => (
                <span
                  key={burstIndex}
                  data-cyh-burst-heart={burstIndex}
                  className="absolute text-[#ba1a1a] opacity-0"
                >
                  <HeartIcon className="h-3 w-3" />
                </span>
              ))}
            </span>

            {/* Valentine Commemorative Stamp container with perforated deckled look & romantic glow */}
            <span className="relative block rounded-lg border-2 border-dashed border-[#e6a8b2] bg-[#fff8f9] p-0.5 shadow-[0_12px_32px_-4px_rgba(108,0,42,0.45),0_0_22px_rgba(255,178,191,0.5)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 sm:p-1.5">
              <span className="relative flex h-[62px] w-[60px] flex-col items-center justify-between overflow-hidden rounded border border-white/40 bg-gradient-to-br from-[#8c1d40] via-[#ba1a1a] to-[#431d74] px-1 py-1 text-center sm:h-[74px] sm:w-[70px] sm:px-1.5 sm:py-1.5">
                {/* Stamp cancellation postmark wave */}
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.25),transparent)]" />
                <span className="flex w-full items-center justify-between">
                  <span
                    className={`${styles.fontSans} text-[7px] font-bold uppercase tracking-[0.1em] text-pink-100 sm:text-[8px]`}
                  >
                    VALENTINE
                  </span>
                  <StarsIcon className="h-2 w-2 shrink-0 text-[#ffdadb] sm:h-2.5 sm:w-2.5" />
                </span>
                <span className="my-auto flex w-full items-center justify-center gap-0.5 whitespace-nowrap px-0.5 sm:gap-1">
                  <span
                    className={`${styles.fontCormorant} text-[14px] font-bold italic leading-none text-white drop-shadow-sm sm:text-[17px]`}
                  >
                    {creatorInitial}
                  </span>
                  <HeartIcon className="h-3 w-3 shrink-0 animate-pulse text-[#ffdadb] drop-shadow sm:h-3.5 sm:w-3.5" />
                  <span
                    className={`${styles.fontCormorant} text-[14px] font-bold italic leading-none text-white drop-shadow-sm sm:text-[17px]`}
                  >
                    {recipientInitial}
                  </span>
                </span>
                <span className="font-mono text-[6.5px] tracking-wider text-pink-100/90 sm:text-[7.5px]">
                  № 0214
                </span>
              </span>
            </span>
          </button>

          {/* Embossed Romantic Wax Seal Accent on Upper Left Border */}
          <div
            data-cyh-seal="true"
            className={`${styles.kineticSeal} pointer-events-none absolute -top-3 left-4 z-30 flex items-center justify-center rounded-full sm:-top-5 sm:left-7`}
            aria-hidden="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#ffdadb]/70 bg-gradient-to-br from-[#ba1a1a] via-[#8c1d40] to-[#570020] shadow-lg ring-2 ring-[#8c1d40]/40 transition-transform hover:scale-110 sm:h-10 sm:w-10">
              <HeartIcon className="h-3.5 w-3.5 text-[#ffdadb] drop-shadow sm:h-4.5 sm:w-4.5" />
            </div>
          </div>

          {/* Letter Content Container */}
          <div className="relative z-10 flex h-full max-h-full min-h-0 w-full flex-1 flex-col justify-between pt-7 sm:pt-5 md:pt-6">
            {/* Salutation Header with Calligraphic Grandeur */}
            <div className="mb-1.5 shrink-0 pr-18 sm:mb-2 sm:pr-24">
              <div className="relative inline-block">
                <p
                  data-cyh-salutation="true"
                  className={`${styles.fontSerif} text-base leading-tight italic tracking-tight text-[#161a30] break-words sm:text-lg md:text-xl lg:text-2xl`}
                >
                  My Dearest {recipient},
                </p>
                <div className="mt-1 h-[1.5px] w-14 bg-gradient-to-r from-[#8c1d40] to-transparent sm:w-20" />
              </div>
            </div>

            {/* Content Area: Keepsake Photo (if images exist) + Measured Paginated Prose */}
            <div
              ref={bodyViewportRef}
              className="relative flex h-full max-h-full min-h-0 w-full flex-1 flex-col justify-start overflow-hidden py-0.5 sm:justify-center"
            >
              {currentImage ? (
                <div
                  ref={photoContainerRef}
                  className="mb-1.5 flex shrink-0 justify-center"
                  data-cyh-keepsake-photo="true"
                >
                  <div className={styles.keepsakePhotoCard}>
                    {failedImageIds.has(currentImage.imageId) ? (
                      <div className="flex h-16 w-20 items-center justify-center rounded bg-[#fff5f6] text-[10px] text-[#8c1d40] sm:h-20 sm:w-24">
                        <HeartIcon className="h-3.5 w-3.5 text-[#ba1a1a]" />
                      </div>
                    ) : (
                      <Image
                        src={currentImage.mediaUrl}
                        alt={currentImage.caption || "Keepsake memory"}
                        width={240}
                        height={180}
                        className={`${styles.keepsakePhotoImage} h-16 w-20 sm:h-20 sm:w-24`}
                        loading="lazy"
                        unoptimized
                        onError={() =>
                          setFailedImageIds((prev) =>
                            new Set(prev).add(currentImage.imageId),
                          )
                        }
                      />
                    )}
                    {currentImage.caption ? (
                      <span
                        className={styles.keepsakePhotoCaption}
                        title={currentImage.caption}
                      >
                        {currentImage.caption}
                      </span>
                    ) : null}
                  </div>
                  {safeImages.length > 1 ? (
                    <div className="mt-1 flex items-center gap-1">
                      {safeImages.map((img, i) => (
                        <button
                          key={img.imageId}
                          type="button"
                          onClick={() => setActiveImageIndex(i)}
                          aria-label={`View photo ${i + 1}`}
                          className={`h-1.5 w-1.5 rounded-full transition-colors ${
                            i === activeImageIndex
                              ? "bg-[#8c1d40]"
                              : "bg-[#e6a8b2]/60 hover:bg-[#8c1d40]/80"
                          }`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Paginated Body Prose */}
              <div
                key={activePageIndex}
                aria-live="polite"
                className={`${styles.fontSerif} space-y-2 text-[14px] leading-[22px] font-normal tracking-wide text-[#2c3150] sm:space-y-2.5 sm:text-[15px] sm:leading-[25px] md:text-[16px] md:leading-[27px]`}
              >
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    data-cyh-paragraph="true"
                    className={`whitespace-pre-line ${
                      activePageIndex === 0 && index === 0
                        ? styles.dropCapParagraph
                        : ""
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Hidden measurement span matching body typography for dynamic pagination */}
              <span
                ref={measureElementRef}
                aria-hidden="true"
                className={`${styles.fontSerif} ${styles.messageMeasure} text-[14px] leading-[22px] tracking-wide sm:text-[15px] sm:leading-[25px] md:text-[16px] md:leading-[27px]`}
              />
            </div>

            {/* Footer: Pagination Controls + Editorial Cursive Sign-off */}
            <div
              data-cyh-signoff="true"
              className="relative mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-[#303660]/15 pt-1.5 sm:mt-2 sm:gap-3 sm:pt-2"
            >
              {/* Letter Pagination Bar */}
              {totalPages > 1 ? (
                <nav
                  aria-label="Letter pages"
                  className="flex items-center gap-1 sm:gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => goToPage(activePageIndex - 1)}
                    disabled={activePageIndex === 0}
                    aria-label="Previous letter page"
                    className={`${styles.fontSans} inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[#e6a8b2] bg-[#fff8f9] text-[#6c002a] shadow-sm transition-all hover:border-[#8c1d40] hover:bg-[#faecef] disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-7`}
                  >
                    <ArrowLeftIcon className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
                  </button>
                  <span
                    aria-live="polite"
                    className={`${styles.fontSans} inline-flex items-center gap-1.5 rounded-full border border-[#f2d0d7] bg-[#faecef]/90 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8c1d40] sm:text-[10px]`}
                  >
                    <HeartIcon className="h-2.5 w-2.5 shrink-0 text-[#ba1a1a]" />
                    <span>
                      Page {activePageIndex + 1} of {totalPages}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(activePageIndex + 1)}
                    disabled={activePageIndex >= totalPages - 1}
                    aria-label="Next letter page"
                    className={`${styles.fontSans} inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[#e6a8b2] bg-[#fff8f9] text-[#6c002a] shadow-sm transition-all hover:border-[#8c1d40] hover:bg-[#faecef] disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-7`}
                  >
                    <ArrowRightIcon className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
                  </button>
                </nav>
              ) : (
                <div />
              )}

              {/* Sign-off with editorial cursive signature */}
              <div className="ml-auto flex flex-col items-end text-right">
                <div className="mb-0.5 flex items-center gap-1 opacity-90">
                  <span className="h-[1px] w-4 bg-gradient-to-l from-[#8c1d40] to-transparent sm:w-6" />
                  <p
                    className={`${styles.fontSerif} text-[11px] italic text-[#8c1d40] sm:text-xs`}
                  >
                    With all my heart,
                  </p>
                </div>
                {creator ? (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <HeartIcon className="h-3 w-3 shrink-0 text-[#ba1a1a]/85" />
                    <p
                      className={`${styles.fontCalligraphic} text-2xl leading-none tracking-wide text-[#570020] sm:text-3xl`}
                    >
                      {creator}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Inline Questions Preview / Thumbnail Slot (when rendered inside catalog thumbnail) */}
            {children ? (
              <div className="mt-2.5 shrink-0 border-t border-[#303660]/15 pt-2.5 sm:mt-3 sm:pt-3">
                <div aria-label={`${progress}% complete`}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#faecef]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8c1d40] via-[#ba1a1a] to-[#6c002a] transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p
                    className={`${styles.fontSans} mt-1 text-[9px] font-semibold tracking-wider uppercase text-[#8c1d40] sm:text-[10px]`}
                    aria-live="polite"
                  >
                    {answeredLabel}
                  </p>
                </div>
                {children}
              </div>
            ) : null}
          </div>
        </article>
      </div>

      {/* Asymmetrical Kinetic Dock / Interactive Action Button */}
      {onContinueToQuestions && (questionCount ?? 0) > 0 ? (
        <div
          className="relative z-20 mt-1 flex w-full shrink-0 flex-col items-center justify-center sm:mt-1.5"
          data-cyh-reveal="cta"
        >
          <div className="group relative">
            {/* Glow ambient back halo in ruby & rose glow */}
            <div
              className={`pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-[#ba1a1a] via-[#8c1d40] to-[#d6284e] opacity-80 blur-xl transition duration-500 group-hover:opacity-100 group-hover:duration-200 ${styles.glowPulse}`}
              aria-hidden="true"
            />
            {/* Tactile Pill Action Button with opulent Valentine colors */}
            <button
              data-cyh-cta="true"
              className={`${styles.primaryCta} cursor-pointer`}
              type="button"
              onClick={onContinueToQuestions}
            >
              {/* Shimmer light sweep bar */}
              <span
                className={`pointer-events-none absolute inset-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent ${styles.btnSweep}`}
                aria-hidden="true"
              />
              <span className="relative z-10 flex items-center gap-2 font-semibold text-white">
                <span>Continue to Questions</span>
                <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <noscript>
        <p className="mt-2 rounded-xl border border-[#ffb2bf]/50 bg-[#fff8f9] p-2 text-[11px] text-[#6c002a]">
          Enable JavaScript to open the questions and send your answers.
        </p>
      </noscript>
    </section>
  );
}

export function ChooseYourHeartQuestion({
  isLastQuestion = false,
  onBack,
  onChoose,
  onSubmitTextAnswer,
  onTextValueChange,
  question,
  questionNumber,
  textError = null,
  textValue = "",
}: ChooseYourHeartQuestionProps): React.JSX.Element {
  const isText = isPageJourneyTextQuestion(question);
  const singleChoice = question.choices[0];
  const interactive = Boolean(onChoose || onSubmitTextAnswer);

  return (
    <div
      className="mt-3 flex min-h-0 flex-1 flex-col justify-between sm:mt-4"
      aria-live={interactive ? "polite" : undefined}
      data-cyh-question-card="true"
    >
      <div>
        <div className="flex items-start gap-2.5">
          <span
            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ba1a1a] to-[#8c1d40] text-white shadow-sm ring-2 ring-[#ffb2bf]/40"
            aria-hidden="true"
          >
            <HeartIcon className="h-3 w-3" />
          </span>
          <h2
            className={`${styles.fontCormorant} text-xl font-semibold italic tracking-tight text-[#161a30] sm:text-2xl md:text-[27px] leading-snug`}
          >
            {question.prompt}
          </h2>
        </div>

        {isText ? (
          <div className="mt-3.5 space-y-2.5 sm:mt-4">
            {onSubmitTextAnswer && singleChoice ? (
              <>
                <textarea
                  id={`journey-text-answer-${questionNumber}`}
                  className={`${styles.fontSerif} min-h-24 w-full rounded-2xl border border-[#e6a8b2] bg-[#fffbf9] p-3.5 text-base text-[#161a30] shadow-inner outline-none transition-all placeholder:italic placeholder:text-[#2c3150]/40 focus:border-[#8c1d40] focus:ring-2 focus:ring-[#ffb2bf] sm:min-h-28`}
                  placeholder="Pour your heart onto this page..."
                  value={textValue}
                  onChange={(event) => {
                    if (
                      onTextValueChange &&
                      hasAtMostGraphemes(event.target.value, 2_000)
                    ) {
                      onTextValueChange(event.target.value);
                    }
                  }}
                />
                <div
                  className={`${styles.fontSans} flex items-center justify-end text-[10px] font-medium text-[#6c002a]/70`}
                >
                  <span>{countGraphemes(textValue)} / 2000</span>
                </div>
                {textError ? (
                  <p
                    className={`${styles.fontSans} rounded-lg border border-[#ba1a1a]/30 bg-[#fff5f6] px-2.5 py-1.5 text-xs font-semibold text-[#ba1a1a]`}
                    role="alert"
                  >
                    {textError}
                  </p>
                ) : null}
                <div className="pt-1">
                  <button
                    className={`${styles.primaryCta} w-full cursor-pointer sm:w-auto`}
                    type="button"
                    onClick={() => onSubmitTextAnswer(singleChoice.key)}
                  >
                    <span
                      className={`pointer-events-none absolute inset-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent ${styles.btnSweep}`}
                      aria-hidden="true"
                    />
                    <span className="relative z-10 flex items-center gap-2 font-semibold text-white">
                      <span>{isLastQuestion ? "Finish" : "Next"}</span>
                      <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div
                className={`${styles.fontSerif} rounded-xl border border-dashed border-[#e6a8b2] bg-[#fff8f9] px-3.5 py-2.5 text-sm italic text-[#6c002a]`}
                aria-hidden="true"
              >
                Readers will pen their own heartfelt reflection here.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3.5 grid gap-2.5 sm:mt-4">
            {question.choices.map((choice, choiceIndex) => {
              const badgeText = String(choiceIndex + 1).padStart(2, "0");
              return onChoose ? (
                <button
                  className={`${styles.choiceCardButton} group cursor-pointer`}
                  key={choice.key}
                  type="button"
                  data-cyh-choice="true"
                  onClick={() => onChoose(choice.key)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={styles.choiceIndexBadge}
                      aria-hidden="true"
                    >
                      {badgeText}
                    </span>
                    <span className="min-w-0 break-words text-[15px] font-medium sm:text-base">
                      {choice.label}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[#8c1d40] transition-all duration-300 group-hover:translate-x-1">
                    <HeartIcon className="h-3.5 w-3.5 text-[#ba1a1a] opacity-0 transition-all duration-300 group-hover:scale-125 group-hover:opacity-100" />
                    <ArrowRightIcon className="h-3.5 w-3.5 opacity-40 transition-opacity duration-200 group-hover:opacity-100" />
                  </span>
                </button>
              ) : (
                <span
                  className={styles.choiceCardButton}
                  key={choice.key}
                  aria-hidden="true"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={styles.choiceIndexBadge}>{badgeText}</span>
                    <span className="min-w-0 break-words text-[15px] font-medium sm:text-base">
                      {choice.label}
                    </span>
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {onBack ? (
        <div className="mt-4 shrink-0 sm:mt-5">
          <button
            className={`${styles.fontSans} inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#e6a8b2] bg-[#fff8f9] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#6c002a] transition-all hover:scale-105 hover:border-[#8c1d40] hover:bg-[#faecef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb2bf]`}
            type="button"
            onClick={onBack}
          >
            <ArrowLeftIcon className="h-3 w-3 shrink-0" />
            <span>Back</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
