"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import Image from "next/image";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useEffect, useRef, useState } from "react";
import type { SecretLetterRenderModel } from "@letterly/templates";
import styles from "./renderer.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

type SecretLetterRendererProps =
  | {
      model: SecretLetterRenderModel;
      preview?: boolean;
      children?: ReactNode;
      locked?: false;
      openingContent?: never;
    }
  | {
      model?: never;
      preview?: boolean;
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

export function SecretLetterRenderer({
  model,
  preview = false,
  children,
  locked = false,
  openingContent,
}: SecretLetterRendererProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sparkleLayerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const burstCallRef = useRef<gsap.core.Tween | null>(null);
  const sparkleTimeoutsRef = useRef<Set<number>>(new Set());
  const reduceMotionRef = useRef(false);
  const openedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showPetals, setShowPetals] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const lastSparklePoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sparkleLayer = sparkleLayerRef.current;
    const sparkleTimeouts = sparkleTimeoutsRef.current;
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
        !sparkleLayer
      ) {
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
      const hint = rootRef.current?.querySelector<HTMLElement>(
        "[data-envelope-hint]",
      );
      const mainContent = rootRef.current?.querySelector<HTMLElement>(
        "[data-letter-content-wrapper]",
      );

      if (!overlay || !envelope || !flap || !seal || !letter || !hint) {
        return;
      }

      if (locked) {
        gsap.set([overlay, envelope, flap, seal, letter, hint], {
          clearProps: "all",
        });
        timelineRef.current = null;
        return;
      }

      if (!mainContent) {
        return;
      }

      const systemReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion || systemReducedMotion) {
        gsap.set([overlay, envelope, flap, seal, letter, hint, mainContent], {
          clearProps: "all",
        });
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
        .addLabel("release")
        .to(
          seal,
          { scale: 1.15, duration: 0.25, ease: "power1.inOut" },
          "release",
        )
        .to(
          seal,
          { scale: 1, duration: 0.25, ease: "power1.inOut" },
          "release+=0.25",
        )
        .to(
          [seal, hint],
          { autoAlpha: 0, duration: 0.01, ease: "none" },
          "release+=0.6",
        )
        .to(
          flap,
          {
            rotationX: 180,
            transformOrigin: "50% 0%",
            duration: 1.2,
            ease: "power3.inOut",
          },
          "release+=0.6",
        )
        .to(
          letter,
          {
            y: -160,
            scale: 1.05,
            zIndex: 50,
            duration: 1.2,
            ease: "power3.out",
          },
          "release+=1.4",
        )
        .to(
          overlay,
          {
            autoAlpha: 0,
            scale: 1.5,
            y: -50,
            duration: 1.2,
            ease: "power2.inOut",
          },
          "release+=2.6",
        )
        .to(
          mainContent,
          {
            autoAlpha: 1,
            scale: 1,
            filter: "blur(0px) brightness(1)",
            duration: 1.2,
            ease: "power2.out",
          },
          "release+=2.6",
        )
        .call(revealEffects, [], "release+=2.6");

      if (openedRef.current) {
        timeline.progress(1).pause();
      }

      timelineRef.current = timeline;

      return () => {
        burstCallRef.current?.kill();
        burstCallRef.current = null;
        timelineRef.current = null;
      };
    },
    {
      scope: rootRef,
      dependencies: [locked, reduceMotion],
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

  function skipOpening(): void {
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

  return (
    <div
      ref={rootRef}
      data-preview={preview || undefined}
      data-hydrated={hydrated || undefined}
      data-locked={locked || undefined}
      data-opened={opened || undefined}
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
            role="img"
            aria-label="Sealed letter envelope"
            onClick={openLetter}
            onPointerMove={handleEnvelopePointerMove}
            onPointerLeave={(event) => resetEnvelopeTilt(event.currentTarget)}
          >
            <div className={styles.envelopeBack} aria-hidden="true" />
            <div className={styles.envelopeLetter} data-envelope-letter>
              <span className={styles.previewHeart} aria-hidden="true">
                ♥
              </span>
              <p className={styles.previewMessage}>A message for you...</p>
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
          <p className={styles.openHint} data-envelope-hint aria-hidden="true">
            Tap to open
          </p>
          {locked && openingContent ? (
            <div className={styles.openingContent}>{openingContent}</div>
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
              onClick={skipOpening}
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
              <p className={styles.heroMessage}>“{model.mainMessage}”</p>
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
              <div className={styles.galleryGrid}>
                {model.images.map((image, index) => (
                  <figure
                    key={image.imageId}
                    className={`${styles.momentCard} ${index % 2 === 1 ? styles.offsetCard : ""}`}
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
                        sizes="(max-width: 768px) calc(100vw - 40px), 360px"
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

          {children}

          <footer className={styles.footer}>
            Create your own letter on Letterly
          </footer>
        </main>
      ) : null}
    </div>
  );
}
