"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import Image from "next/image";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SecretLetterRenderModel } from "@letterly/templates";
import styles from "./renderer.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

type SecretLetterRendererProps =
  | {
      model: SecretLetterRenderModel;
      preview?: boolean;
      autoOpen?: boolean;
      skipOpening?: boolean;
      children?: ReactNode;
      locked?: false;
      openingContent?: never;
    }
  | {
      model?: never;
      preview?: boolean;
      autoOpen?: never;
      skipOpening?: never;
      children?: never;
      locked: true;
      openingContent: ReactNode;
    };

type CSSVariableStyle = CSSProperties & Record<`--${string}`, string>;

const petalStyles: CSSVariableStyle[] = Array.from(
  { length: 40 },
  (_, index) => ({
    "--petal-left": `${(index * 37 + 11) % 100}%`,
    "--petal-delay": `${-((index * 17) % 18)}s`,
    "--petal-duration": `${8 + ((index * 13) % 8)}s`,
    "--petal-drift": `${-35 + ((index * 29) % 70)}px`,
    "--petal-size": `${15 + ((index * 11) % 15)}px`,
  }),
);

const burstStyles: CSSVariableStyle[] = Array.from(
  { length: 60 },
  (_, index) => ({
    "--burst-x": `${-180 + ((index * 71) % 361)}px`,
    "--burst-y": `${-180 + ((index * 43) % 361)}px`,
    "--burst-delay": `${(index % 9) * 0.02}s`,
    "--burst-size": `${10 + ((index * 7) % 11)}px`,
    "--burst-rotation": `${(index * 31) % 360}deg`,
  }),
);

const MESSAGE_PAGE_CHARACTER_LIMIT = 230;
const WHITESPACE_PATTERN = /\s/;

function paginateMessage(message: string): string[] {
  let remaining = message.trim();
  if (!remaining) {
    return [""];
  }

  const pages: string[] = [];

  while (remaining.length > MESSAGE_PAGE_CHARACTER_LIMIT) {
    let breakAt = MESSAGE_PAGE_CHARACTER_LIMIT;
    for (let index = MESSAGE_PAGE_CHARACTER_LIMIT; index > 0; index -= 1) {
      if (WHITESPACE_PATTERN.test(remaining[index] ?? "")) {
        breakAt = index;
        break;
      }
    }

    pages.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }

  if (remaining) {
    pages.push(remaining);
  }

  return pages;
}

export function SecretLetterRenderer({
  model,
  preview = false,
  autoOpen = false,
  skipOpening = false,
  children,
  locked = false,
  openingContent,
}: SecretLetterRendererProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sparkleLayerRef = useRef<HTMLDivElement>(null);
  const galleryTrackRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const messageTweenRef = useRef<gsap.core.Tween | null>(null);
  const burstCallRef = useRef<gsap.core.Tween | null>(null);
  const sparkleTimeoutsRef = useRef<Set<number>>(new Set());
  const reduceMotionRef = useRef(false);
  const openedRef = useRef(skipOpening);
  const [hydrated, setHydrated] = useState(false);
  const [opened, setOpened] = useState(skipOpening);
  const [opening, setOpening] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showPetals, setShowPetals] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [currentMessagePage, setCurrentMessagePage] = useState(0);
  const [isWritingMessage, setIsWritingMessage] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const lastSparklePoint = useRef({ x: 0, y: 0 });
  const messagePages = useMemo(
    () => paginateMessage(model?.mainMessage ?? ""),
    [model?.mainMessage],
  );
  const activeMessagePage =
    messagePages[Math.min(currentMessagePage, messagePages.length - 1)] ?? "";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sparkleLayer = sparkleLayerRef.current;
    const rootElement = rootRef.current;
    const sparkleTimeouts = sparkleTimeoutsRef.current;
    const depthElements = rootElement
      ? Array.from(rootElement.querySelectorAll<HTMLElement>("[data-depth]"))
      : [];
    const depthMotion = depthElements.map((element) => ({
      element,
      depth: Number(element.dataset.depth ?? "0"),
      moveX: gsap.quickTo(element, "x", {
        duration: 0.75,
        ease: "power3.out",
      }),
      moveY: gsap.quickTo(element, "y", {
        duration: 0.75,
        ease: "power3.out",
      }),
    }));
    const update = (): void => {
      reduceMotionRef.current = mediaQuery.matches;
      setReduceMotion(mediaQuery.matches);
    };

    update();
    setHydrated(true);
    mediaQuery.addEventListener("change", update);

    const addSparkle = (event: PointerEvent): void => {
      if (
        event.pointerType === "touch" ||
        reduceMotionRef.current ||
        mediaQuery.matches ||
        !rootElement
      ) {
        return;
      }

      const normalizedX = event.clientX / window.innerWidth - 0.5;
      const normalizedY = event.clientY / window.innerHeight - 0.5;
      for (const motion of depthMotion) {
        motion.moveX(normalizedX * motion.depth);
        motion.moveY(normalizedY * motion.depth);
      }

      if (!sparkleLayer) {
        return;
      }

      const last = lastSparklePoint.current;
      const distance = Math.hypot(
        event.clientX - last.x,
        event.clientY - last.y,
      );
      if (distance <= 10 || Math.random() <= 0.5) {
        return;
      }

      lastSparklePoint.current = { x: event.clientX, y: event.clientY };
      const sparkle = document.createElement("span");
      sparkle.className = styles.sparkle ?? "";
      sparkle.style.left = `${event.clientX}px`;
      sparkle.style.top = `${event.clientY}px`;
      sparkleLayer.append(sparkle);
      const timeout = window.setTimeout(() => {
        sparkle.remove();
        sparkleTimeouts.delete(timeout);
      }, 900);
      sparkleTimeouts.add(timeout);
    };

    window.addEventListener("pointermove", addSparkle, { passive: true });
    return () => {
      mediaQuery.removeEventListener("change", update);
      window.removeEventListener("pointermove", addSparkle);
      for (const timeout of sparkleTimeouts) {
        window.clearTimeout(timeout);
      }
      sparkleTimeouts.clear();
      sparkleLayer?.replaceChildren();
      gsap.killTweensOf(depthElements);
      gsap.set(depthElements, { clearProps: "x,y" });
    };
  }, []);

  useGSAP(
    (_context, contextSafe) => {
      const overlay = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-overlay]",
      );
      const envelope = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-scene]",
      );
      const flap = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-flap]",
      );
      const seal = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-seal]",
      );
      const letter = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-letter]",
      );
      const aura = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-aura]",
      );
      const stamp = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-stamp]",
      );
      const label = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-label]",
      );
      const hint = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-hint]",
      );
      const mainContent = rootRef.current?.querySelector<HTMLElement>(
        "[data-letter-content-wrapper]",
      );

      if (
        !overlay ||
        !envelope ||
        !flap ||
        !seal ||
        !letter ||
        !aura ||
        !stamp ||
        !label
      ) {
        return;
      }

      if (locked) {
        gsap.set([overlay, envelope, flap, seal, letter, aura, stamp, label], {
          clearProps: "all",
        });
        timelineRef.current = null;
        return;
      }

      if (!hint || !mainContent) {
        return;
      }

      if (skipOpening) {
        burstCallRef.current?.kill();
        burstCallRef.current = null;
        timelineRef.current = null;
        openedRef.current = true;
        setOpening(false);
        setOpened(true);
        setShowPetals(false);
        setShowHeartBurst(false);
        gsap.set(
          [
            overlay,
            envelope,
            flap,
            seal,
            letter,
            hint,
            mainContent,
            aura,
            stamp,
            label,
          ],
          { clearProps: "all" },
        );
        focusLetterHeading();
        return;
      }

      const systemReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion || systemReducedMotion) {
        gsap.set(
          [
            overlay,
            envelope,
            flap,
            seal,
            letter,
            hint,
            mainContent,
            aura,
            stamp,
            label,
          ],
          { clearProps: "all" },
        );
        burstCallRef.current?.kill();
        burstCallRef.current = null;
        timelineRef.current = null;
        openedRef.current = true;
        setOpening(false);
        setOpened(true);
        setShowPetals(false);
        setShowHeartBurst(false);
        sparkleLayerRef.current?.replaceChildren();
        focusLetterHeading();
        return;
      }

      const runSafely =
        contextSafe ?? ((callback: () => void): (() => void) => callback);
      const revealEffects = runSafely(() => setShowPetals(true));
      const triggerBurst = runSafely(() => setShowHeartBurst(true));
      const completeOpening = runSafely(() => {
        openedRef.current = true;
        setOpening(false);
        setOpened(true);
        focusLetterHeading();
      });

      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "power2.out" },
      });

      burstCallRef.current = gsap.delayedCall(3.2, triggerBurst).pause();
      timeline.eventCallback("onComplete", completeOpening);

      timeline
        .addLabel("warmth")
        .to(
          envelope,
          {
            y: -10,
            scale: 1.03,
            duration: 0.35,
            ease: "power2.out",
          },
          "warmth",
        )
        .to(
          aura,
          { autoAlpha: 1, scale: 1.15, duration: 0.4, ease: "power1.out" },
          "warmth",
        )
        .to(
          stamp,
          { rotation: 8, scale: 1.08, duration: 0.3, ease: "back.out(1.6)" },
          "warmth+=0.1",
        )
        .to(
          seal,
          { scale: 1.2, rotation: 8, duration: 0.2, ease: "power1.inOut" },
          "warmth+=0.2",
        )
        .to(
          seal,
          { scale: 0.82, rotation: -12, duration: 0.22, ease: "power2.in" },
          "warmth+=0.4",
        )
        .to(
          [seal, hint, label],
          { autoAlpha: 0, y: -10, duration: 0.3, ease: "power2.in" },
          "warmth+=0.62",
        )
        .to(
          flap,
          {
            rotationX: 180,
            transformOrigin: "50% 0%",
            duration: 1.05,
            ease: "power3.inOut",
          },
          "warmth+=0.75",
        )
        .to(
          letter,
          {
            y: -175,
            scale: 1.07,
            zIndex: 50,
            duration: 1.2,
            ease: "power3.out",
          },
          "warmth+=1.25",
        )
        .to(
          envelope,
          { y: -28, scale: 1.06, duration: 1.1, ease: "power2.inOut" },
          "warmth+=1.8",
        )
        .to(
          overlay,
          {
            autoAlpha: 0,
            scale: 1.08,
            y: -24,
            duration: 1.05,
            ease: "power2.inOut",
          },
          "warmth+=2.5",
        )
        .to(
          mainContent,
          {
            autoAlpha: 1,
            scale: 1,
            filter: "blur(0px) brightness(1)",
            duration: 1.1,
            ease: "power2.out",
          },
          "warmth+=2.5",
        )
        .to(
          aura,
          { autoAlpha: 0, duration: 0.5, ease: "power1.out" },
          "warmth+=2.5",
        )
        .call(revealEffects, [], "warmth+=2.5");

      if (openedRef.current) {
        timeline.progress(1).pause();
      }

      timelineRef.current = timeline;

      // Wait until the hydration effect has made the overlay visible. Starting
      // a timeline while it is still `display: none` can leave the envelope
      // on screen after the server content has already arrived.
      if (autoOpen && hydrated && !openedRef.current) {
        setOpening(true);
        burstCallRef.current?.restart();
        timeline.play(0);
      }

      return () => {
        burstCallRef.current?.kill();
        burstCallRef.current = null;
        timelineRef.current = null;
      };
    },
    {
      scope: rootRef,
      dependencies: [autoOpen, hydrated, locked, reduceMotion, skipOpening],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    (_context, contextSafe) => {
      messageTweenRef.current?.kill();
      messageTweenRef.current = null;

      if (!hydrated || !opened || reduceMotion) {
        setIsWritingMessage(false);
        return;
      }

      const characters = gsap.utils.toArray<HTMLElement>(
        "[data-message-character]",
      );
      if (characters.length === 0) {
        setIsWritingMessage(false);
        return;
      }

      const completeWriting = contextSafe
        ? contextSafe(() => setIsWritingMessage(false))
        : () => setIsWritingMessage(false);
      setIsWritingMessage(true);

      messageTweenRef.current = gsap.fromTo(
        characters,
        { autoAlpha: 0, y: 5 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.22,
          stagger: 0.055,
          ease: "power2.out",
          overwrite: "auto",
          onComplete: completeWriting,
        },
      );

      return () => {
        messageTweenRef.current?.kill();
        messageTweenRef.current = null;
      };
    },
    {
      scope: rootRef,
      dependencies: [currentMessagePage, hydrated, opened, reduceMotion],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    () => {
      const track = galleryTrackRef.current;
      if (!track) {
        return;
      }

      const cards = Array.from(
        track.querySelectorAll<HTMLElement>("[data-gallery-card]"),
      );
      if (cards.length === 0 || reduceMotion) {
        gsap.set(cards, { clearProps: "transform,opacity" });
        return;
      }

      const cardMotion = cards.map((card) => ({
        card,
        opacity: gsap.quickTo(card, "opacity", {
          duration: 0.35,
          ease: "power2.out",
        }),
        rotationY: gsap.quickTo(card, "rotationY", {
          duration: 0.45,
          ease: "power3.out",
        }),
        scale: gsap.quickTo(card, "scale", {
          duration: 0.45,
          ease: "power3.out",
        }),
        y: gsap.quickTo(card, "y", {
          duration: 0.45,
          ease: "power3.out",
        }),
      }));
      let frame: number | null = null;

      const updateDepth = (): void => {
        frame = null;
        const trackRect = track.getBoundingClientRect();
        const trackCenter = trackRect.left + trackRect.width / 2;
        const measurements = cardMotion.map(({ card }) => {
          const rect = card.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          return (cardCenter - trackCenter) / Math.max(trackRect.width, 1);
        });

        cardMotion.forEach((motion, index) => {
          const distance = measurements[index] ?? 0;
          const strength = Math.min(
            Math.max(Math.abs(distance) - 0.3, 0) * 2.4,
            1,
          );
          motion.opacity(1 - strength * 0.62);
          motion.rotationY(distance * -18);
          motion.scale(1 - strength * 0.16);
          motion.y(strength * 14);
        });
      };

      const requestDepthUpdate = (): void => {
        if (frame === null) {
          frame = window.requestAnimationFrame(updateDepth);
        }
      };

      updateDepth();
      track.addEventListener("scroll", requestDepthUpdate, { passive: true });
      window.addEventListener("resize", requestDepthUpdate, { passive: true });

      return () => {
        track.removeEventListener("scroll", requestDepthUpdate);
        window.removeEventListener("resize", requestDepthUpdate);
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
        }
        gsap.killTweensOf(cards);
      };
    },
    {
      scope: rootRef,
      dependencies: [model?.images.length, reduceMotion],
      revertOnUpdate: true,
    },
  );

  function focusLetterHeading(): void {
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function resetEnvelopeTilt(element: HTMLElement): void {
    element.style.setProperty("--envelope-scale", "1");
    element.style.setProperty("--envelope-tilt-x", "0deg");
    element.style.setProperty("--envelope-tilt-y", "0deg");
  }

  function handleEnvelopePointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ): void {
    if (openedRef.current || opening || event.pointerType === "touch") {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    event.currentTarget.style.setProperty("--envelope-scale", "1.05");
    event.currentTarget.style.setProperty("--envelope-tilt-x", `${-y / 15}deg`);
    event.currentTarget.style.setProperty("--envelope-tilt-y", `${x / 15}deg`);
  }

  function openLetter(): void {
    if (locked || openedRef.current || opening) {
      return;
    }

    const envelope = rootRef.current?.querySelector<HTMLElement>(
      "[data-envelope-scene]",
    );
    if (envelope) {
      resetEnvelopeTilt(envelope);
    }

    setShowHeartBurst(false);
    if (reduceMotion || !timelineRef.current) {
      openedRef.current = true;
      setOpening(false);
      setOpened(true);
      setShowPetals(false);
      timelineRef.current?.progress(1).pause();
      focusLetterHeading();
      return;
    }

    setOpening(true);
    burstCallRef.current?.restart();
    timelineRef.current.play(0);
  }

  function setMotionPreference(value: boolean): void {
    reduceMotionRef.current = value;
    setReduceMotion(value);
    if (value) {
      openedRef.current = true;
      setOpening(false);
      setOpened(true);
      setShowPetals(false);
      setShowHeartBurst(false);
      burstCallRef.current?.kill();
      burstCallRef.current = null;
      timelineRef.current?.progress(1).pause();
      sparkleLayerRef.current?.replaceChildren();
      focusLetterHeading();
    }
  }

  function replayOpening(): void {
    if (locked) {
      return;
    }

    openedRef.current = false;
    setOpening(false);
    setOpened(false);
    setShowPetals(false);
    setShowHeartBurst(false);

    if (reduceMotion) {
      openedRef.current = true;
      setOpened(true);
      focusLetterHeading();
      return;
    }

    const envelope = rootRef.current?.querySelector<HTMLElement>(
      "[data-envelope-scene]",
    );
    if (envelope) {
      resetEnvelopeTilt(envelope);
    }
    setOpening(true);
    burstCallRef.current?.restart();
    timelineRef.current?.restart();
  }

  function skipOpeningAnimation(): void {
    if (locked) {
      return;
    }

    openedRef.current = true;
    setOpening(false);
    setOpened(true);
    setShowPetals(true);
    burstCallRef.current?.kill();
    timelineRef.current?.progress(1).pause();
    focusLetterHeading();
  }

  function showMessagePage(page: number): void {
    setCurrentMessagePage(Math.min(Math.max(page, 0), messagePages.length - 1));
  }

  function finishMessageWriting(): void {
    messageTweenRef.current?.progress(1).pause();
    setIsWritingMessage(false);
  }

  function scrollGallery(direction: -1 | 1): void {
    const track = galleryTrackRef.current;
    const firstCard = track?.querySelector<HTMLElement>("[data-gallery-card]");
    if (!track || !firstCard) {
      return;
    }

    const gap =
      Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (firstCard.offsetWidth + gap),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return (
    <div
      ref={rootRef}
      data-preview={preview || undefined}
      data-hydrated={hydrated || undefined}
      data-locked={locked || undefined}
      data-opened={opened || undefined}
      data-skip-opening={skipOpening || undefined}
      data-reduced-motion={reduceMotion || undefined}
      data-petals-visible={showPetals || undefined}
      data-heart-burst={showHeartBurst || undefined}
      className={styles.root}
      role={locked ? "main" : undefined}
      aria-labelledby={locked ? "locked-letter-title" : undefined}
    >
      <a
        className={styles.skipLink}
        href={locked ? "#locked-letter-title" : "#letter-content"}
      >
        Skip to letter
      </a>

      <div className={styles.backgroundLayer} aria-hidden="true">
        <span
          className={`${styles.backgroundBlob} ${styles.backgroundBlobRose}`}
          data-depth="-28"
        />
        <span
          className={`${styles.backgroundBlob} ${styles.backgroundBlobGold}`}
          data-depth="22"
        />
        <span
          className={`${styles.backgroundBlob} ${styles.backgroundBlobLavender}`}
          data-depth="-16"
        />
        <span className={styles.backgroundRing} data-depth="14" />
        <span
          className={`${styles.backgroundRibbon} ${styles.backgroundRibbonOne}`}
          data-depth="-20"
        />
        <span
          className={`${styles.backgroundRibbon} ${styles.backgroundRibbonTwo}`}
          data-depth="18"
        />
        <span
          className={`${styles.backgroundHeart} ${styles.backgroundHeartRose}`}
          data-depth="34"
        >
          <span className={styles.backgroundHeartGlyph}>♥</span>
        </span>
        <span
          className={`${styles.backgroundHeart} ${styles.backgroundHeartGold}`}
          data-depth="-26"
        >
          <span className={styles.backgroundHeartGlyph}>♡</span>
        </span>
        <span
          className={`${styles.backgroundHeart} ${styles.backgroundHeartLavender}`}
          data-depth="20"
        >
          <span className={styles.backgroundHeartGlyph}>♥</span>
        </span>
        <span
          className={`${styles.backgroundHeart} ${styles.backgroundHeartSmall}`}
          data-depth="-18"
        >
          <span className={styles.backgroundHeartGlyph}>♡</span>
        </span>
      </div>

      <div
        ref={sparkleLayerRef}
        className={styles.sparkleLayer}
        aria-hidden="true"
      />
      <div className={styles.petalLayer} aria-hidden="true">
        {petalStyles.map((style, index) => (
          <span key={index} className={styles.petal} style={style} />
        ))}
      </div>
      {showHeartBurst ? (
        <div className={styles.heartBurst} aria-hidden="true">
          {burstStyles.map((style, index) => (
            <span key={index} className={styles.burstHeart} style={style}>
              ♥
            </span>
          ))}
        </div>
      ) : null}

      <div
        className={styles.envelopeOverlay}
        data-envelope-overlay
        aria-label="Cinematic letter opening"
      >
        <div className={styles.envelopeScene}>
          <div
            className={styles.envelope}
            data-envelope-scene
            role={locked ? "group" : "img"}
            aria-label={
              locked
                ? "Password protected letter envelope"
                : "Sealed letter envelope"
            }
            onClick={openLetter}
            onPointerMove={handleEnvelopePointerMove}
            onPointerLeave={(event) => resetEnvelopeTilt(event.currentTarget)}
          >
            <div className={styles.envelopeBack} aria-hidden="true" />
            <div
              className={styles.envelopeAura}
              data-envelope-aura
              aria-hidden="true"
            />
            <div
              className={styles.envelopeStamp}
              data-envelope-stamp
              aria-hidden="true"
            >
              <span>♡</span>
              <small>LOVE MAIL</small>
            </div>
            <div className={styles.envelopeLetter} data-envelope-letter>
              {locked && openingContent ? (
                <div className={styles.openingContent} data-unlock-panel>
                  {openingContent}
                </div>
              ) : (
                <>
                  <span className={styles.previewHeart} aria-hidden="true">
                    ♥
                  </span>
                  <p className={styles.previewMessage}>A message for you...</p>
                </>
              )}
            </div>
            <div className={styles.envelopeBody} aria-hidden="true">
              <div className={styles.leftFlap} />
              <div className={styles.rightFlap} />
              <div className={styles.bottomFlap} />
            </div>
            <div
              className={styles.envelopeFlap}
              data-envelope-flap
              aria-hidden="true"
            >
              <div className={styles.envelopeFlapFront}>
                <div className={styles.envelopeLabel}>For My Dearest</div>
                <div className={styles.seal} data-envelope-seal>
                  <span aria-hidden="true">♥</span>
                </div>
              </div>
              <div className={styles.envelopeFlapBack} />
            </div>
          </div>
          {!locked ? (
            <p
              className={styles.openHint}
              data-envelope-hint
              aria-hidden="true"
            >
              Tap to open
            </p>
          ) : null}
        </div>

        {!locked ? (
          <div
            className={styles.openingControls}
            aria-label="Letter opening controls"
          >
            <button
              className={styles.primaryButton}
              type="button"
              onClick={openLetter}
              disabled={opened || opening}
            >
              {opened
                ? "Letter opened"
                : opening
                  ? "Opening..."
                  : "Open your letter"}
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={replayOpening}
            >
              Replay opening
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={skipOpeningAnimation}
            >
              Skip animation
            </button>
            <label className={styles.motionToggle}>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(event) => setMotionPreference(event.target.checked)}
              />
              <span>Reduce motion</span>
            </label>
          </div>
        ) : null}
      </div>

      {!locked && model ? (
        <main className={styles.mainContent} data-letter-content-wrapper>
          <section id="letter-content" className={styles.heroPanel}>
            <div className={styles.shimmerEffect} aria-hidden="true" />
            <div className={styles.heroGradient} aria-hidden="true" />
            <div className={styles.heroInner}>
              <span className={styles.heroHeart} aria-hidden="true">
                ♥
              </span>
              <h2 ref={headingRef} className={styles.heroHeading} tabIndex={-1}>
                To {model.recipientName || "My Dearest"}
              </h2>
              <div
                className={styles.messageViewport}
                aria-live="polite"
                aria-atomic="true"
              >
                <p className={styles.staticMessage}>“{model.mainMessage}”</p>
                <p
                  key={currentMessagePage}
                  className={styles.heroMessage}
                  aria-label={activeMessagePage}
                >
                  <span className={styles.messageQuote} aria-hidden="true">
                    “
                  </span>
                  <span className={styles.animatedMessage} aria-hidden="true">
                    {Array.from(activeMessagePage).map((character, index) => (
                      <span key={index} data-message-character>
                        {character === " " ? "\u00a0" : character}
                      </span>
                    ))}
                  </span>
                  <span className={styles.messageQuote} aria-hidden="true">
                    ”
                  </span>
                </p>
              </div>
              {messagePages.length > 1 ? (
                <nav
                  className={styles.messagePagination}
                  aria-label="Letter message pages"
                >
                  <button
                    type="button"
                    onClick={() => showMessagePage(currentMessagePage - 1)}
                    disabled={currentMessagePage === 0}
                    aria-label="Previous message page"
                  >
                    ←
                  </button>
                  <span aria-live="polite">
                    Page {currentMessagePage + 1} of {messagePages.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => showMessagePage(currentMessagePage + 1)}
                    disabled={currentMessagePage === messagePages.length - 1}
                    aria-label="Next message page"
                  >
                    →
                  </button>
                </nav>
              ) : null}
              {isWritingMessage ? (
                <button
                  className={styles.finishWritingButton}
                  type="button"
                  onClick={finishMessageWriting}
                >
                  Show this page now
                </button>
              ) : null}
            </div>
            <span className={styles.scrollIndicator} aria-hidden="true">
              ↓
            </span>
          </section>

          {model.images.length > 0 ? (
            <section
              className={styles.gallerySection}
              aria-labelledby="moments-heading"
            >
              <h2 id="moments-heading" className={styles.galleryHeading}>
                Cherished Moments
              </h2>
              <div className={styles.galleryHeaderRow}>
                <p>Drag or swipe through every memory.</p>
                {model.images.length > 2 ? (
                  <div
                    className={styles.galleryControls}
                    aria-label="Gallery controls"
                  >
                    <button
                      type="button"
                      onClick={() => scrollGallery(-1)}
                      aria-label="Previous memories"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollGallery(1)}
                      aria-label="Next memories"
                    >
                      →
                    </button>
                  </div>
                ) : null}
              </div>
              <div
                ref={galleryTrackRef}
                className={styles.galleryGrid}
                tabIndex={0}
                role="region"
                aria-roledescription="carousel"
                aria-label="Cherished moments gallery"
              >
                {model.images.map((image, index) => (
                  <figure
                    key={image.imageId}
                    className={`${styles.momentCard} ${index % 2 === 1 ? styles.offsetCard : ""}`}
                    data-gallery-card
                  >
                    <div className={styles.shimmerEffect} aria-hidden="true" />
                    {failedImageIds.has(image.imageId) ? (
                      <div className={styles.imageFallback} role="status">
                        This image is unavailable right now.
                      </div>
                    ) : (
                      <Image
                        className={styles.image}
                        src={image.mediaUrl}
                        alt={image.caption ?? `Cherished moment ${index + 1}`}
                        width={1200}
                        height={900}
                        sizes="(max-width: 767px) 45vw, (max-width: 1200px) 44vw, 500px"
                        loading="lazy"
                        unoptimized
                        decoding="async"
                        onError={() =>
                          setFailedImageIds((current) => {
                            const next = new Set(current);
                            next.add(image.imageId);
                            return next;
                          })
                        }
                      />
                    )}
                    {image.caption ? (
                      <figcaption>{image.caption}</figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {children ? (
            <section
              className={styles.interactiveSection}
              aria-label="Choose your response"
            >
              <div className={styles.interactiveHalo} aria-hidden="true" />
              <span
                className={`${styles.quizHeart} ${styles.quizHeartLeft}`}
                aria-hidden="true"
              >
                ♥
              </span>
              <span
                className={`${styles.quizHeart} ${styles.quizHeartRight}`}
                aria-hidden="true"
              >
                ♥
              </span>
              <p className={styles.interactiveEyebrow}>choose</p>
              <div className={styles.interactiveStage}>{children}</div>
            </section>
          ) : null}

          <footer className={styles.footer}>
            Create your own letter on Letterly
          </footer>
        </main>
      ) : null}
    </div>
  );
}
