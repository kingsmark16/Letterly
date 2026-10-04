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
import floralEnvelope from "./assets/floral-envelope.png";
import styles from "./renderer.module.css";
import { SecretLetterFirstSection } from "./first-section";
import { MessageScene } from "./message-scene";
import { MemoryGallery, type MemoryGalleryItem } from "./memory-gallery";
import {
  messagePagesMatch,
  paginateMessage,
  paginateMessageToFit,
} from "./message-pagination";
import { QuestionSection } from "./question-section";
import { ReasonsSection } from "./reasons-section";
import { SecretLetterAudioPlayer } from "./audio-player";
import { useSecretLetterOpening } from "./use-secret-letter-opening";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type SecretLetterRendererProps =
  | {
      model: SecretLetterRenderModel;
      preview?: boolean;
      showAudioPlayerWhenEmpty?: boolean;
      autoOpen?: boolean;
      skipOpening?: boolean;
      previewScrollContainerRef?: RefObject<HTMLElement | null>;
      children?: ReactNode;
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
      children?: never;
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

function PreviewFooter(): React.JSX.Element {
  return (
    <footer className={styles.previewFooter} aria-label="Letter footer">
      <Link href="/" aria-label="Letterly home">
        Letterly
      </Link>
      <span aria-hidden="true">/</span>
      <Link href="/templates">Create your own letter</Link>
    </footer>
  );
}

export function SecretLetterRenderer({
  model,
  preview = false,
  showAudioPlayerWhenEmpty = false,
  autoOpen = false,
  skipOpening = false,
  previewScrollContainerRef,
  children,
  afterQuestion,
  audioUrl,
  audioTitle,
  audioDurationMilliseconds,
  audioLink,
  audioMetadataUrl,
  locked = false,
  recipientName,
  openingContent,
}: SecretLetterRendererProps): React.JSX.Element {
  const initialOpened = skipOpening || autoOpen;
  const rootRef = useRef<HTMLDivElement>(null);
  const readerHeadingRef = useRef<HTMLHeadingElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [messagePageIndex, setMessagePageIndex] = useState(0);
  const [messageLayoutReady, setMessageLayoutReady] = useState(false);
  const [messageLoaded, setMessageLoaded] = useState(false);
  const [messageAnimationStarted, setMessageAnimationStarted] = useState(false);
  const viewedMessagePagesRef = useRef<Set<number>>(new Set());
  const messageVisualRef = useRef<HTMLSpanElement>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const messageTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const {
    opened,
    opening,
    lockedPromptVisible,
    revealed,
    revealPasswordPrompt,
    openLetter,
  } = useSecretLetterOpening({
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
      caption: image.caption?.trim() || `A memory worth keeping ${index + 1}`,
    }));
  }, [model]);

  const fallbackMessagePages = useMemo(
    () => paginateMessage(model?.mainMessage ?? ""),
    [model?.mainMessage],
  );
  const [messagePages, setMessagePages] =
    useState<string[]>(fallbackMessagePages);
  const previousMessagePagesRef = useRef(messagePages);
  const activeMessagePageIndex = Math.min(
    messagePageIndex,
    Math.max(messagePages.length - 1, 0),
  );
  const activeMessage = messagePages[activeMessagePageIndex] ?? "";
  const letterTitle = model?.title?.trim() || "For you, always";

  useIsomorphicLayoutEffect(() => {
    setMessagePages(fallbackMessagePages);
    setMessagePageIndex(0);
    setMessageLayoutReady(false);
    setMessageLoaded(false);
    setMessageAnimationStarted(false);
    viewedMessagePagesRef.current.clear();
  }, [fallbackMessagePages]);

  useIsomorphicLayoutEffect(() => {
    const previousMessagePages = previousMessagePagesRef.current;
    previousMessagePagesRef.current = messagePages;
    if (messagePagesMatch(previousMessagePages, messagePages)) return;

    // A resize can repartition the message without changing the active page
    // index. Restart from the visible fallback so the new page cannot inherit
    // a stale hidden GSAP state.
    setMessageLoaded(false);
    setMessageAnimationStarted(false);
    viewedMessagePagesRef.current.clear();
    if (messageVisualRef.current) {
      messageVisualRef.current.textContent = "";
      gsap.set(messageVisualRef.current, {
        autoAlpha: 0,
        x: 0,
        y: 8,
        scale: 0.998,
      });
    }
  }, [messagePages]);

  useIsomorphicLayoutEffect(() => {
    const message = model?.mainMessage?.trim() ?? "";
    if (!hydrated) return;
    if (!message) {
      setMessageLayoutReady(true);
      return;
    }

    const root = rootRef.current;
    if (!root) return;
    if (typeof ResizeObserver === "undefined") {
      setMessageLayoutReady(true);
      return;
    }

    const messageReader = root.querySelector<HTMLElement>(
      "[data-message-reader]",
    );
    const messageElement = root.querySelector<HTMLElement>(
      "[data-message-page]",
    );
    const measureElement = root.querySelector<HTMLElement>(
      "[data-message-measure]",
    );
    if (!messageReader || !messageElement || !measureElement) return;

    let frame: number | null = null;
    let disposed = false;

    const recalculatePages = (): void => {
      if (disposed || frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        frame = null;
        if (disposed) return;

        const availableHeight = messageElement.clientHeight;
        if (availableHeight <= 0 || messageElement.clientWidth <= 0) return;

        const nextPages = paginateMessageToFit(
          message,
          measureElement,
          availableHeight,
        );

        setMessagePages((currentPages) =>
          messagePagesMatch(currentPages, nextPages) ? currentPages : nextPages,
        );
        setMessagePageIndex((currentPageIndex) =>
          Math.min(currentPageIndex, Math.max(nextPages.length - 1, 0)),
        );
        setMessageLayoutReady(true);
      });
    };

    const observer = new ResizeObserver(recalculatePages);
    observer.observe(messageReader);
    observer.observe(messageElement);
    recalculatePages();

    if (document.fonts) {
      void document.fonts.ready.then(recalculatePages, recalculatePages);
    }

    return () => {
      disposed = true;
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [hydrated, model?.mainMessage]);

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
    (_context, contextSafe) => {
      messageTimelineRef.current?.kill();
      messageTimelineRef.current = null;

      const messageVisual = messageVisualRef.current;
      if (!messageVisual || locked || !hydrated || !opened || !revealed) return;

      if (!messageLayoutReady) {
        setMessageLoaded(false);
        return;
      }

      const reader = rootRef.current?.querySelector<HTMLElement>(
        "[data-message-reader]",
      );
      if (!reader) return;

      setMessageLoaded(false);

      const setVisualText = (text: string): void => {
        if (messageVisual.textContent !== text) {
          messageVisual.textContent = text;
        }
      };
      const finishImmediately = (): void => {
        viewedMessagePagesRef.current.add(activeMessagePageIndex);
        setMessageAnimationStarted(true);
        setVisualText(activeMessage);
        gsap.set(messageVisual, {
          autoAlpha: activeMessage ? 1 : 0,
          x: 0,
          y: 0,
          scale: 1,
        });
        setMessageLoaded(true);
      };

      const hasViewedMessagePage = viewedMessagePagesRef.current.has(
        activeMessagePageIndex,
      );
      if (reduceMotion || !activeMessage) {
        finishImmediately();
        return;
      }

      let transition: gsap.core.Timeline | null = null;
      if (hasViewedMessagePage) {
        setMessageAnimationStarted(true);
        setVisualText(activeMessage);
        gsap.set(messageVisual, { autoAlpha: 0, x: 0, y: 7, scale: 0.998 });
        transition = gsap.timeline({
          defaults: { ease: "power2.out" },
          onComplete: () => {
            viewedMessagePagesRef.current.add(activeMessagePageIndex);
            setMessageLoaded(true);
          },
        });
        transition.to(messageVisual, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.58,
        });
        messageTimelineRef.current = transition;
        return () => {
          transition?.kill();
        };
      }

      const initialCharacterCount = Math.min(activeMessage.length, 1);
      setVisualText(activeMessage.slice(0, initialCharacterCount));
      gsap.set(messageVisual, {
        autoAlpha: 0,
        x: 0,
        y: 8,
        scale: 0.998,
      });

      const progress = { characters: initialCharacterCount };
      let renderedCharacterCount = initialCharacterCount;
      const updateMessageState = (): void => {
        const nextCharacterCount = Math.floor(progress.characters);
        if (nextCharacterCount === renderedCharacterCount) return;
        renderedCharacterCount = nextCharacterCount;
        setVisualText(activeMessage.slice(0, nextCharacterCount));
      };
      const completeMessageState = (): void => {
        viewedMessagePagesRef.current.add(activeMessagePageIndex);
        setMessageAnimationStarted(true);
        setVisualText(activeMessage);
        gsap.set(messageVisual, { autoAlpha: 1, x: 0, y: 0, scale: 1 });
        setMessageLoaded(true);
      };
      const updateMessage = contextSafe
        ? contextSafe(updateMessageState)
        : updateMessageState;
      const completeMessage = contextSafe
        ? contextSafe(completeMessageState)
        : completeMessageState;
      const writingDuration = Math.max(
        3.8,
        Math.min(12, activeMessage.length * 0.03),
      );
      const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
      timeline
        .to(messageVisual, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.68,
        })
        .to(
          progress,
          {
            characters: activeMessage.length,
            duration: writingDuration,
            ease: "none",
            onUpdate: updateMessage,
            onComplete: completeMessage,
          },
          "-=0.24",
        );
      timeline.pause(0);
      let hasStarted = false;
      const startWriting = contextSafe
        ? contextSafe(() => {
            if (hasStarted) return;
            hasStarted = true;
            setMessageAnimationStarted(true);
            timeline.restart();
          })
        : () => {
            if (hasStarted) return;
            hasStarted = true;
            setMessageAnimationStarted(true);
            timeline.restart();
          };
      messageTimelineRef.current = timeline;
      const trigger = ScrollTrigger.create({
        trigger: reader,
        scroller: previewScrollContainerRef?.current ?? undefined,
        start: "top 78%",
        once: true,
        onEnter: startWriting,
      });
      if (reader.getBoundingClientRect().top < window.innerHeight * 0.78) {
        startWriting();
      }
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
        messageLayoutReady,
        opened,
        revealed,
        reduceMotion,
        messagePages,
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
          ["[data-letter-memory-gallery]", `.${styles.heartLetter}`].join(", "),
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
            section.querySelectorAll<HTMLElement>("[data-memory-card]"),
          );
          // Keep the nodes visible to assistive technology and anchor links
          // while their visual reveal is in progress. `autoAlpha` would also
          // set visibility:hidden and make the section impossible to target.
          gsap.set(section, { opacity: 0, y: 32 });
          if (cards.length > 0) gsap.set(cards, { opacity: 0, y: 16 });

          const reveal = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              scroller: previewScrollContainerRef?.current ?? undefined,
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

  function changeMessagePage(nextIndex: number): void {
    const nextPageIndex = Math.max(
      0,
      Math.min(nextIndex, messagePages.length - 1),
    );
    if (nextPageIndex === messagePageIndex) return;
    if (messageVisualRef.current) {
      messageVisualRef.current.textContent = "";
      gsap.set(messageVisualRef.current, {
        autoAlpha: 0,
        x: 0,
        y: 8,
        scale: 0.998,
      });
    }
    setMessageLoaded(false);
    setMessageAnimationStarted(false);
    setMessagePageIndex(nextPageIndex);
  }
  return (
    <div className={styles.rootFrame}>
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
        data-message-animation-started={
          messageAnimationStarted ? "true" : undefined
        }
        role={locked ? "main" : undefined}
        aria-label={
          locked && !lockedPromptVisible ? "Protected letter" : undefined
        }
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
                  <span className={styles.openHint} data-opening-hint>
                    Tap to open
                  </span>
                </button>
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
                <span className={styles.openHint} data-opening-hint>
                  Tap to open
                </span>
              </button>
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
              <SecretLetterFirstSection
                letterTitle={letterTitle}
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
                        audioLink?.displayTitle ?? audioTitle ?? "Our song"
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

              <ReasonsSection
                enabled={hydrated && opened && revealed && !locked}
                reduceMotion={reduceMotion}
                scroller={previewScrollContainerRef?.current ?? undefined}
              />

              <section
                id="my-heart"
                className={styles.heartLetter}
                aria-labelledby="heart-letter-heading"
              >
                <div className={styles.letterCopy} data-standing-paper>
                  <span className={styles.tape} aria-hidden="true" />
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
                      {/*
                        Keep a real page of text visible until the animated
                        layer has started. ScrollTrigger can be delayed by a
                        custom preview scroller or by a resize, and the
                        fallback prevents either case from hiding the letter.
                      */}
                      <span
                        ref={messageVisualRef}
                        className={styles.messageVisual}
                        data-message-visual
                        aria-hidden="true"
                      />
                      <span
                        className={styles.messageFallback}
                        data-message-fallback
                        aria-hidden={hydrated ? true : undefined}
                      >
                        {hydrated ? activeMessage : model.mainMessage}
                      </span>
                      <span className={styles.visuallyHidden} data-message-full>
                        {activeMessage}
                      </span>
                    </p>
                    <span
                      className={styles.messageMeasure}
                      data-message-measure
                      aria-hidden="true"
                    />
                    <span
                      className={styles.messageSpark}
                      data-message-spark
                      aria-hidden="true"
                    >
                      ♡
                    </span>
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
                                activeMessagePageIndex ===
                                messagePages.length - 1
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
              {preview ? <PreviewFooter /> : null}
            </article>
          </main>
        ) : null}
      </div>
    </div>
  );
}
