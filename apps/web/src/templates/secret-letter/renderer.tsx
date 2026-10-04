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
import { MemoryGallery, type MemoryGalleryItem } from "./memory-gallery";
import { QuestionSection } from "./question-section";
import { ReasonsSection } from "./reasons-section";
import { SecretLetterAudioPlayer } from "./audio-player";
import { SecretLetterMessageReader } from "./message-reader";
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
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
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

              <SecretLetterMessageReader
                message={model.mainMessage}
                recipientName={model.recipientName}
                creatorName={model.creatorName}
                hydrated={hydrated}
                opened={opened}
                revealed={revealed}
                reduceMotion={reduceMotion}
                previewScrollContainerRef={previewScrollContainerRef}
              />

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
