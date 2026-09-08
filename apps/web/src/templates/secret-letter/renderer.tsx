"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SecretLetterRenderModel } from "@letterly/templates";
import floralEnvelope from "./assets/floral-envelope.png";
import styles from "./renderer.module.css";
import { MessageScene } from "./message-scene";
import { QuestionSection } from "./question-section";
import { ReasonsSection } from "./reasons-section";
import { SecretLetterAudioPlayer } from "./audio-player";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type SecretLetterRendererProps =
  | {
      model: SecretLetterRenderModel;
      preview?: boolean;
      autoOpen?: boolean;
      skipOpening?: boolean;
      children?: ReactNode;
      afterQuestion?: ReactNode;
      audioUrl?: string;
      audioTitle?: string;
      recipientName?: never;
      locked?: false;
      openingContent?: never;
    }
  | {
      model?: never;
      preview?: boolean;
      autoOpen?: never;
      skipOpening?: never;
      children?: never;
      afterQuestion?: never;
      audioUrl?: never;
      audioTitle?: never;
      recipientName?: string;
      locked: true;
      openingContent: ReactNode;
    };

type MemoryCard = {
  id: string;
  src: string;
  caption: string;
};

const MESSAGE_PAGE_CHARACTER_LIMIT = 640;
const WHITESPACE_PATTERN = /\s/;

function paginateMessage(message: string): string[] {
  let remainingMessage = message.trim();
  if (!remainingMessage) return [""];

  const pages: string[] = [];

  while (remainingMessage.length > MESSAGE_PAGE_CHARACTER_LIMIT) {
    let breakAt = MESSAGE_PAGE_CHARACTER_LIMIT;
    for (let index = MESSAGE_PAGE_CHARACTER_LIMIT; index > 0; index -= 1) {
      if (WHITESPACE_PATTERN.test(remainingMessage[index] ?? "")) {
        breakAt = index;
        break;
      }
    }

    pages.push(remainingMessage.slice(0, breakAt).trimEnd());
    remainingMessage = remainingMessage.slice(breakAt).trimStart();
  }

  if (remainingMessage) pages.push(remainingMessage);
  return pages;
}

function HeartIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

export function SecretLetterRenderer({
  model,
  preview = false,
  autoOpen = false,
  skipOpening = false,
  children,
  afterQuestion,
  audioUrl,
  audioTitle,
  locked = false,
  recipientName,
  openingContent,
}: SecretLetterRendererProps): React.JSX.Element {
  const initialOpened = skipOpening || autoOpen;
  const rootRef = useRef<HTMLDivElement>(null);
  const readerHeadingRef = useRef<HTMLHeadingElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [opened, setOpened] = useState(initialOpened);
  const [opening, setOpening] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [lockedPromptVisible, setLockedPromptVisible] = useState(false);
  const [revealed, setRevealed] = useState(!initialOpened);
  const [messagePageIndex, setMessagePageIndex] = useState(0);
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [messageLoaded, setMessageLoaded] = useState(false);
  const viewedMessagePagesRef = useRef<Set<number>>(new Set());
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const messageTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const memoryCards = useMemo<MemoryCard[]>(() => {
    if (!model) return [];
    return model.images.map((image, index) => ({
      id: image.imageId,
      src: image.mediaUrl,
      caption: image.caption?.trim() || `A memory worth keeping ${index + 1}`,
    }));
  }, [model]);

  const messagePages = useMemo(
    () => paginateMessage(model?.mainMessage ?? ""),
    [model?.mainMessage],
  );
  const activeMessagePageIndex = Math.min(
    messagePageIndex,
    Math.max(messagePages.length - 1, 0),
  );
  const activeMessage = messagePages[activeMessagePageIndex] ?? "";
  const letterTitle = model?.title?.trim() || "For you, always";

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

  useIsomorphicLayoutEffect(() => {
    if (clientReady && opened && reduceMotion) setRevealed(true);
  }, [clientReady, opened, reduceMotion]);

  useGSAP(
    (_context, contextSafe) => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      if (locked || !hydrated || reduceMotion) return;

      if (opened) {
        const content = rootRef.current?.querySelector<HTMLElement>(
          "[data-letter-content-wrapper]",
        );
        const header = rootRef.current?.querySelector<HTMLElement>(
          `.${styles.siteHeader}`,
        );
        const heroCopy = rootRef.current?.querySelector<HTMLElement>(
          `.${styles.heroCopy}`,
        );
        const heroArt = rootRef.current?.querySelector<HTMLElement>(
          `.${styles.heroArt}`,
        );
        const heroActions = rootRef.current?.querySelector<HTMLElement>(
          `.${styles.heroActions}`,
        );
        const reveal = gsap.timeline({
          defaults: { ease: "power2.out" },
          onComplete: contextSafe
            ? contextSafe(() => setRevealed(true))
            : undefined,
        });

        // Release the content gate just before the header begins so the reveal
        // is visible from the very top of the letter.
        if (content) {
          reveal.fromTo(
            content,
            { opacity: 0 },
            { opacity: 1, duration: 0.01, ease: "none" },
          );
        }
        if (header) {
          reveal.fromTo(
            header,
            // The shell clips overflow; entering from below keeps the logo and
            // navigation inside the header instead of cutting off their tops.
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.24 },
          );
        }
        if (heroCopy) {
          reveal.fromTo(
            heroCopy,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.28 },
            "<0.08",
          );
        }
        if (heroArt) {
          reveal.fromTo(
            heroArt,
            { autoAlpha: 0, y: 24, scale: 0.96, rotation: 1.5 },
            { autoAlpha: 1, y: 0, scale: 1, rotation: 0, duration: 0.38 },
            "<0.12",
          );
          gsap.to(heroArt, {
            y: -7,
            rotation: -0.8,
            duration: 3.4,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
        }
        if (heroActions) {
          reveal.fromTo(
            heroActions,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.18 },
            "<0.08",
          );
        }
        return;
      }

      const overlay = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-overlay]",
      );
      const envelope = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-scene]",
      );
      if (!overlay || !envelope) return;
      const envelopeArt = rootRef.current?.querySelector<HTMLElement>(
        "[data-opening-art]",
      );
      const envelopeCard = rootRef.current?.querySelector<HTMLElement>(
        "[data-opening-card]",
      );
      const openingHint = rootRef.current?.querySelector<HTMLElement>(
        "[data-opening-hint]",
      );
      const complete = contextSafe
        ? contextSafe(() => {
            setOpening(false);
            setOpened(true);
            setRevealed(false);
            window.requestAnimationFrame(() =>
              readerHeadingRef.current?.focus({ preventScroll: true }),
            );
          })
        : () => undefined;
      const timeline = gsap.timeline({ paused: true, onComplete: complete });
      timeline.addLabel("release");
      if (openingHint) {
        timeline.to(
          openingHint,
          { autoAlpha: 0, y: -6, duration: 0.22, ease: "power2.inOut" },
          "release",
        );
      }
      timeline.to(
        envelope,
        {
          y: -14,
          scale: 1.03,
          rotation: -1.2,
          duration: 0.34,
          ease: "power2.out",
        },
        "release",
      );
      if (envelopeCard) {
        timeline.to(
          envelopeCard,
          {
            y: -58,
            scale: 1.08,
            rotation: -4,
            autoAlpha: 0,
            duration: 0.52,
            ease: "power2.inOut",
          },
          "<0.08",
        );
      }
      if (envelopeArt) {
        timeline.to(
          envelopeArt,
          {
            y: -8,
            scale: 1.06,
            autoAlpha: 0,
            duration: 0.58,
            ease: "power2.inOut",
          },
          "<0.04",
        );
      }
      timeline
        .to(
          envelope,
          {
            y: -88,
            scale: 0.91,
            autoAlpha: 0,
            duration: 0.48,
            ease: "power3.in",
          },
          "<0.22",
        )
        .to(
          overlay,
          { autoAlpha: 0, duration: 0.32, ease: "power2.inOut" },
          "<0.16",
        );
      timelineRef.current = timeline;
      return () => {
        timeline.kill();
        timelineRef.current = null;
      };
    },
    {
      scope: rootRef,
      dependencies: [hydrated, locked, opened, reduceMotion],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    (_context, contextSafe) => {
      if (!locked || !hydrated || !lockedPromptVisible) return;

      const openingStage = rootRef.current?.querySelector<HTMLElement>(
        "[data-locked-opening-stage]",
      );
      const passwordPrompt = rootRef.current?.querySelector<HTMLElement>(
        "[data-password-prompt]",
      );
      if (!openingStage || !passwordPrompt) return;

      const focusPassword = contextSafe
        ? contextSafe(() =>
            passwordPrompt
              .querySelector<HTMLInputElement>("[data-password-input]")
              ?.focus({ preventScroll: true }),
          )
        : () => undefined;

      if (reduceMotion) {
        gsap.set(openingStage, {
          autoAlpha: 0,
          x: 0,
          pointerEvents: "none",
        });
        gsap.set(passwordPrompt, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
        });
        focusPassword();
        return;
      }

      const transition = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: focusPassword,
      });
      transition
        .addLabel("reveal-password")
        .fromTo(
          openingStage,
          { autoAlpha: 1, x: 0, y: 0, scale: 1 },
          {
            autoAlpha: 0,
            x: 0,
            y: -34,
            scale: 0.94,
            duration: 0.52,
            pointerEvents: "none",
          },
          "reveal-password",
        )
        .fromTo(
          passwordPrompt,
          { autoAlpha: 0, x: 0, y: 34, scale: 0.94 },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.72,
            ease: "power3.out",
          },
          "reveal-password+=0.2",
        );

      return () => transition.kill();
    },
    {
      scope: rootRef,
      dependencies: [hydrated, locked, lockedPromptVisible, reduceMotion],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    (_context, contextSafe) => {
      messageTimelineRef.current?.kill();
      messageTimelineRef.current = null;

      if (locked || !hydrated || !opened || !revealed) return;

      setMessageLoaded(false);

      const hasViewedMessagePage = viewedMessagePagesRef.current.has(
        activeMessagePageIndex,
      );
      if (hasViewedMessagePage || reduceMotion || !activeMessage) {
        viewedMessagePagesRef.current.add(activeMessagePageIndex);
        setDisplayedMessage(activeMessage);
        setMessageLoaded(true);
        return;
      }

      const reader = rootRef.current?.querySelector<HTMLElement>(
        "[data-message-reader]",
      );
      if (!reader) return;

      setDisplayedMessage("");
      const progress = { characters: 0 };
      const updateMessage = contextSafe
        ? contextSafe(() => {
            setDisplayedMessage(
              activeMessage.slice(0, Math.floor(progress.characters)),
            );
          })
        : () => undefined;
      const completeMessage = contextSafe
        ? contextSafe(() => {
            viewedMessagePagesRef.current.add(activeMessagePageIndex);
            setDisplayedMessage(activeMessage);
            setMessageLoaded(true);
          })
        : undefined;
      const timeline = gsap.timeline({ defaults: { ease: "none" } });
      timeline.to(progress, {
        characters: activeMessage.length,
        duration: Math.max(3.8, Math.min(14, activeMessage.length * 0.035)),
        ease: "none",
        onUpdate: updateMessage,
        onComplete: completeMessage,
      });
      timeline.pause(0);
      const startWriting = contextSafe
        ? contextSafe(() => timeline.restart())
        : () => timeline.restart();
      const trigger = ScrollTrigger.create({
        trigger: reader,
        start: "top 78%",
        once: true,
        onEnter: startWriting,
      });
      messageTimelineRef.current = timeline;

      return () => {
        trigger.kill();
        timeline.kill();
        messageTimelineRef.current = null;
      };
    },
    {
      scope: rootRef,
      dependencies: [
        activeMessage,
        activeMessagePageIndex,
        hydrated,
        locked,
        opened,
        revealed,
        reduceMotion,
      ],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    () => {
      if (locked || !hydrated || !opened || !revealed || reduceMotion) return;

      const root = rootRef.current;
      if (!root) return;

      const sections = Array.from(
        root.querySelectorAll<HTMLElement>(
          [`.${styles.memories}`, `.${styles.heartLetter}`].join(", "),
        ),
      );
      if (sections.length === 0) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const refresh = (): void => {
          ScrollTrigger.refresh();
          // ScrollTrigger restores the value it captured at registration time
          // during refresh. Keep reloads pinned to the top of the letter.
          if (!preview && !window.location.hash) {
            ScrollTrigger.clearScrollMemory("manual");
            window.history.scrollRestoration = "manual";
          }
        };

        sections.forEach((section) => {
          const cards = Array.from(
            section.querySelectorAll<HTMLElement>(`.${styles.memoryCard}`),
          );
          // Keep the nodes visible to assistive technology and anchor links
          // while their visual reveal is in progress. `autoAlpha` would also
          // set visibility:hidden and make the section impossible to target.
          gsap.set(section, { opacity: 0, y: 32 });
          if (cards.length > 0) gsap.set(cards, { opacity: 0, y: 16 });

          const reveal = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top 84%",
              once: true,
              toggleActions: "play none none none",
              invalidateOnRefresh: true,
            },
          });
          reveal.to(section, {
            opacity: 1,
            y: 0,
            duration: 0.58,
            ease: "power2.out",
          });
          if (cards.length > 0) {
            reveal.to(
              cards,
              {
                opacity: 1,
                y: 0,
                duration: 0.36,
                stagger: 0.08,
                ease: "power2.out",
              },
              "<0.12",
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

  function finishOpening(): void {
    timelineRef.current?.kill();
    timelineRef.current = null;
    setOpening(false);
    setOpened(true);
    setRevealed(true);
    window.requestAnimationFrame(() =>
      readerHeadingRef.current?.focus({ preventScroll: true }),
    );
  }
  function revealPasswordPrompt(): void {
    if (!locked || lockedPromptVisible) return;
    setLockedPromptVisible(true);
  }
  function openLetter(): void {
    if (locked || opening || opened) return;
    if (reduceMotion || !timelineRef.current) return finishOpening();
    setRevealed(false);
    setOpening(true);
    timelineRef.current.restart();
  }

  function changeMessagePage(nextIndex: number): void {
    const nextPageIndex = Math.max(
      0,
      Math.min(nextIndex, messagePages.length - 1),
    );
    if (nextPageIndex === messagePageIndex) return;
    setDisplayedMessage("");
    setMessageLoaded(false);
    setMessagePageIndex(nextPageIndex);
  }
  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-preview={preview || undefined}
      data-hydrated={hydrated || undefined}
      data-client-ready={clientReady || undefined}
      data-locked={locked || undefined}
      data-locked-prompt-visible={lockedPromptVisible || undefined}
      data-opened={opened || undefined}
      data-revealed={revealed ? "true" : "false"}
      data-opening={opening || undefined}
      data-reduced-motion={reduceMotion || undefined}
      data-message-loaded={messageLoaded ? "true" : "false"}
      role={locked ? "main" : undefined}
      aria-label={locked && !lockedPromptVisible ? "Protected letter" : undefined}
      aria-labelledby={
        locked && lockedPromptVisible ? "locked-letter-title" : undefined
      }
    >
      {!locked ? (
        <a className={styles.skipLink} href="#letter-content">
          Skip to letter
        </a>
      ) : null}

      <div
        className={styles.envelopeOverlay}
        data-envelope-overlay
        aria-label={
          locked && !lockedPromptVisible
            ? "Protected letter opening"
            : locked
              ? undefined
              : "Open your letter"
        }
        aria-labelledby={
          locked && lockedPromptVisible ? "locked-letter-title" : undefined
        }
      >
        {locked ? (
          <div className={styles.lockedOpeningScene}>
            <div
              className={styles.lockedOpeningStage}
              data-locked-opening-stage
              aria-hidden={lockedPromptVisible || undefined}
            >
              <button
                className={styles.envelopeButton}
                data-envelope-scene
                data-envelope-button
                type="button"
                onClick={revealPasswordPrompt}
                disabled={lockedPromptVisible}
                tabIndex={lockedPromptVisible ? -1 : undefined}
                aria-label="Open your protected letter"
              >
                <span
                  className={styles.envelopePreviewArt}
                  data-opening-art
                  aria-hidden="true"
                >
                  <Image src={floralEnvelope} alt="" priority sizes="420px" />
                </span>
                <span
                  className={styles.envelopeCard}
                  data-opening-card
                  aria-hidden="true"
                >
                  <strong className={styles.envelopeCardTitle}>
                    FOR YOU{recipientName ? `, ${recipientName}` : ""}
                  </strong>
                  <span>♡</span>
                </span>
              </button>
              <p className={styles.openHint} data-opening-hint>
                Tap to open
              </p>
            </div>
            <div
              className={`${styles.openingContent} ${styles.passwordPrompt}`}
              data-password-prompt
              hidden={!lockedPromptVisible}
            >
              {openingContent}
            </div>
          </div>
        ) : (
          <>
            <button
              className={styles.envelopeButton}
              data-envelope-scene
              data-envelope-button
              type="button"
              onClick={openLetter}
              disabled={opening || opened}
              aria-label={opening ? "Opening..." : "Open your letter"}
            >
              <span
                className={styles.envelopePreviewArt}
                data-opening-art
                aria-hidden="true"
              >
                <Image src={floralEnvelope} alt="" priority sizes="420px" />
              </span>
              <span
                className={styles.envelopeCard}
                data-opening-card
                aria-hidden="true"
              >
                <strong className={styles.envelopeCardTitle}>
                  FOR YOU, {model?.recipientName.trim() || "My Dearest"}
                </strong>
                <span>♡</span>
              </span>
            </button>
            <p className={styles.openHint} data-opening-hint>
              Tap to open
            </p>
          </>
        )}
      </div>

      {!locked && model ? (
        <main className={styles.mainContent} data-letter-content-wrapper>
          <article id="letter-content" className={styles.letterShell}>
            <h1
              ref={readerHeadingRef}
              className={styles.readerTitle}
              tabIndex={-1}
            >
              To {model.recipientName || "My Dearest"}
            </h1>
            <header className={styles.siteHeader}>
              <a
                className={styles.wordmark}
                href="#our-story"
                aria-label={`${letterTitle}. Go to the beginning`}
              >
                <HeartIcon />
                <span>{letterTitle}</span>
              </a>
            </header>

            <section
              id="our-story"
              className={styles.hero}
              aria-labelledby="hero-heading"
            >
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>
                  A little corner of the internet, just for you
                </p>
                <h2 id="hero-heading">
                  I’ve been meaning
                  <br />
                  to tell you... <span aria-hidden="true">♡</span>
                </h2>
                <p className={styles.heroLead}>
                  You make ordinary days feel like
                  <br />
                  the kind I want to remember forever.
                </p>
                {audioUrl ? (
                  <div className={styles.heroActions}>
                    <SecretLetterAudioPlayer
                      src={audioUrl}
                      title={audioTitle ?? "Our song"}
                      compact
                    />
                  </div>
                ) : null}
              </div>
              <div className={styles.heroArt} aria-hidden="true">
                <Image
                  src={floralEnvelope}
                  alt=""
                  priority
                  sizes="(max-width: 720px) 88vw, 440px"
                />
              </div>
            </section>

            {memoryCards.length > 0 ? (
              <section
                className={styles.memories}
                aria-labelledby="memories-heading"
              >
                <h2 id="memories-heading">
                  <span aria-hidden="true">＞</span> Every version of life is
                  better with you in it. <span aria-hidden="true">♡ ＜</span>
                </h2>
                <div
                  className={styles.memoryGrid}
                  role="list"
                  aria-label="Letter memories"
                >
                  {memoryCards.map((memory) => (
                    <figure
                      className={styles.memoryCard}
                      role="listitem"
                      key={memory.id}
                    >
                      {failedImageIds.has(memory.id) ? (
                        <div className={styles.imageFallback} role="status">
                          This image is unavailable right now.
                        </div>
                      ) : (
                        <Image
                          className={styles.memoryImage}
                          src={memory.src}
                          alt={memory.caption}
                          width={720}
                          height={480}
                          sizes="(max-width: 720px) 86vw, (max-width: 1040px) 29vw, 280px"
                          loading="lazy"
                          decoding="async"
                          unoptimized
                          onError={() =>
                            setFailedImageIds((current) =>
                              new Set(current).add(memory.id),
                            )
                          }
                        />
                      )}
                      <figcaption>
                        <span aria-hidden="true">♡</span>
                        {memory.caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}

            <ReasonsSection
              enabled={hydrated && opened && revealed && !locked}
              reduceMotion={reduceMotion}
            />

            <section
              id="my-heart"
              className={styles.heartLetter}
              aria-labelledby="heart-letter-heading"
            >
              <div className={styles.letterCopy} data-standing-paper>
                <MessageScene />
                <h2 id="heart-letter-heading">
                  My favorite person, <span aria-hidden="true">♡</span>
                </h2>
                <p className={styles.salutation}>
                  Dear {model.recipientName || "my favorite person"},
                </p>
                <div className={styles.messageReader} data-message-reader>
                  <p
                    className={styles.mainMessage}
                    data-message-page
                    aria-live="polite"
                  >
                    <span
                      className={styles.messageVisual}
                      data-message-visual
                      aria-hidden="true"
                    >
                      {displayedMessage}
                    </span>
                    <span
                      className={styles.messageFallback}
                      data-message-fallback
                      aria-hidden={hydrated ? true : undefined}
                    >
                      {model.mainMessage}
                    </span>
                    <span className={styles.visuallyHidden} data-message-full>
                      {activeMessage}
                    </span>
                  </p>
                  {model.creatorName?.trim() || messagePages.length > 1 ? (
                    <div className={styles.messageFooter}>
                      {model.creatorName?.trim() ? (
                        <p className={styles.signature}>
                          <span className={styles.signatureClosing}>
                            Yours, always,
                          </span>
                          <span className={styles.signatureName}>
                            {model.creatorName.trim()}
                          </span>
                        </p>
                      ) : null}
                      {messagePages.length > 1 ? (
                        <nav
                          className={styles.messagePagination}
                          aria-label="Message pages"
                        >
                          <button
                            className={styles.pageButton}
                            type="button"
                            onClick={() =>
                              changeMessagePage(activeMessagePageIndex - 1)
                            }
                            disabled={activeMessagePageIndex === 0}
                            aria-label="Previous message page"
                          >
                            <span>Previous</span>
                          </button>
                          <span
                            className={styles.pageIndicator}
                            aria-live="polite"
                          >
                            <span
                              className={styles.pageIndicatorHeart}
                              aria-hidden="true"
                            >
                              ♡
                            </span>
                            Page {activeMessagePageIndex + 1} of{" "}
                            {messagePages.length}
                            <span
                              className={styles.pageIndicatorHeart}
                              aria-hidden="true"
                            >
                              ♡
                            </span>
                          </span>
                          <button
                            className={styles.pageButton}
                            type="button"
                            onClick={() =>
                              changeMessagePage(activeMessagePageIndex + 1)
                            }
                            disabled={
                              activeMessagePageIndex === messagePages.length - 1
                            }
                            aria-label="Next message page"
                          >
                            <span>Next</span>
                          </button>
                        </nav>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <QuestionSection
              enabled={
                hydrated &&
                (opened || preview) &&
                (revealed || preview) &&
                !locked
              }
              reduceMotion={reduceMotion}
            >
              {children}
            </QuestionSection>
            {afterQuestion ? (
              <div className={styles.reportSlot}>{afterQuestion}</div>
            ) : null}
          </article>
        </main>
      ) : null}
    </div>
  );
}
