"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./renderer.module.css";
import { MessageScene } from "./message-scene";
import {
  messagePagesMatch,
  paginateMessage,
  paginateMessageToFit,
} from "./message-pagination";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type SecretLetterMessageReaderProps = {
  message: string;
  recipientName: string;
  creatorName?: string;
  hydrated: boolean;
  opened: boolean;
  revealed: boolean;
  reduceMotion: boolean;
  previewScrollContainerRef?: RefObject<HTMLElement | null>;
};

export function SecretLetterMessageReader({
  message,
  recipientName,
  creatorName,
  hydrated,
  opened,
  revealed,
  reduceMotion,
  previewScrollContainerRef,
}: SecretLetterMessageReaderProps): React.JSX.Element {
  const readerRef = useRef<HTMLDivElement>(null);
  const messagePageRef = useRef<HTMLParagraphElement>(null);
  const messageMeasureRef = useRef<HTMLSpanElement>(null);
  const messageVisualRef = useRef<HTMLSpanElement>(null);
  const messageTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const viewedMessagePagesRef = useRef<Set<number>>(new Set());
  const [messagePageIndex, setMessagePageIndex] = useState(0);
  const [messageLayoutReady, setMessageLayoutReady] = useState(false);
  const [messageLoaded, setMessageLoaded] = useState(false);
  const [messageAnimationStarted, setMessageAnimationStarted] = useState(false);

  const fallbackMessagePages = useMemo(
    () => paginateMessage(message),
    [message],
  );
  const [messagePages, setMessagePages] =
    useState<string[]>(fallbackMessagePages);
  const previousMessagePagesRef = useRef(messagePages);
  const activeMessagePageIndex = Math.min(
    messagePageIndex,
    Math.max(messagePages.length - 1, 0),
  );
  const activeMessage = messagePages[activeMessagePageIndex] ?? "";

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
    const measuredMessage = message.trim();
    if (!hydrated) return;
    if (!measuredMessage) {
      setMessageLayoutReady(true);
      return;
    }

    const messageReader = readerRef.current;
    const messageElement = messagePageRef.current;
    const measureElement = messageMeasureRef.current;
    if (!messageReader || !messageElement || !measureElement) return;
    if (typeof ResizeObserver === "undefined") {
      setMessageLayoutReady(true);
      return;
    }

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
          measuredMessage,
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
  }, [hydrated, message]);

  useGSAP(
    (_context, contextSafe) => {
      messageTimelineRef.current?.kill();
      messageTimelineRef.current = null;

      const messageVisual = messageVisualRef.current;
      if (!messageVisual || !hydrated || !opened || !revealed) return;

      if (!messageLayoutReady) {
        setMessageLoaded(false);
        return;
      }

      const reader = readerRef.current;
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
      scope: readerRef,
      dependencies: [
        activeMessage,
        activeMessagePageIndex,
        hydrated,
        messageLayoutReady,
        opened,
        revealed,
        reduceMotion,
        messagePages,
      ],
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
          Dear {recipientName || "my favorite person"},
        </p>
        <div
          ref={readerRef}
          className={styles.messageReader}
          data-message-reader
          data-message-loaded={messageLoaded ? "true" : "false"}
          data-message-animation-started={
            messageAnimationStarted ? "true" : undefined
          }
        >
          <p
            ref={messagePageRef}
            className={styles.mainMessage}
            data-message-page
            aria-live="polite"
          >
            {/*
              Keep a real page of text visible until the animated layer has
              started. ScrollTrigger can be delayed by a custom preview scroller
              or by a resize, and the fallback prevents either case from hiding
              the letter.
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
              {hydrated ? activeMessage : message}
            </span>
            <span className={styles.visuallyHidden} data-message-full>
              {activeMessage}
            </span>
          </p>
          <span
            ref={messageMeasureRef}
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
          {creatorName?.trim() || messagePages.length > 1 ? (
            <div className={styles.messageFooter}>
              {creatorName?.trim() ? (
                <p className={styles.signature}>
                  <span className={styles.signatureClosing}>
                    Yours, always,
                  </span>
                  <span className={styles.signatureName}>
                    {creatorName.trim()}
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
                  <span className={styles.pageIndicator} aria-live="polite">
                    <span
                      className={styles.pageIndicatorHeart}
                      aria-hidden="true"
                    >
                      ♡
                    </span>
                    Page {activeMessagePageIndex + 1} of {messagePages.length}
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
  );
}
