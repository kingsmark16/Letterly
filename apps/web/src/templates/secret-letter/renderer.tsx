"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SecretLetterRenderModel } from "@letterly/templates";
import styles from "./renderer.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

interface SecretLetterRendererProps {
  model: SecretLetterRenderModel;
  preview?: boolean;
}

export function SecretLetterRenderer({
  model,
  preview = false,
}: SecretLetterRendererProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const openedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReduceMotion(mediaQuery.matches);

    update();
    setHydrated(true);
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useGSAP(
    () => {
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

      if (!overlay || !envelope || !flap || !seal || !letter || !hint || !mainContent) {
        return;
      }

      const systemReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion || systemReducedMotion) {
        gsap.set([overlay, envelope, flap, seal, letter, hint, mainContent], {
          clearProps: "all",
        });
        timelineRef.current = null;
        return;
      }

      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "power2.out" },
      });

      timeline.eventCallback("onComplete", () => {
        openedRef.current = true;
        setOpening(false);
        setOpened(true);
        focusLetterHeading();
      });

      timeline
        .addLabel("release")
        .to(
          seal,
          { autoAlpha: 0, scale: 0.72, duration: 0.45, ease: "power2.inOut" },
          "release",
        )
        .to(
          hint,
          { autoAlpha: 0, y: 10, duration: 0.3 },
          "release",
        )
        .to(
          flap,
          {
            rotationX: 180,
            transformOrigin: "50% 0%",
            duration: 1,
            ease: "power3.inOut",
          },
          "release+=0.55",
        )
        .to(
          letter,
          {
            y: -160,
            scale: 1.05,
            zIndex: 50,
            duration: 1.35,
            ease: "power3.out",
          },
          "release+=1.25",
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
          "release+=2.35",
        )
        .to(
          mainContent,
          {
            autoAlpha: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.3,
            ease: "power2.out",
          },
          "release+=2.6",
        );

      if (openedRef.current) {
        timeline.progress(1).pause();
      }

      timelineRef.current = timeline;

      return () => {
        timelineRef.current = null;
      };
    },
    { scope: rootRef, dependencies: [reduceMotion], revertOnUpdate: true },
  );

  function focusLetterHeading(): void {
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function openLetter(): void {
    if (openedRef.current || opening) {
      return;
    }

    if (reduceMotion || !timelineRef.current) {
      openedRef.current = true;
      setOpening(false);
      setOpened(true);
      timelineRef.current?.progress(1).pause();
    } else {
      setOpening(true);
      timelineRef.current?.play(0);
    }
    if (reduceMotion || !timelineRef.current) {
      focusLetterHeading();
    }
  }

  function replayOpening(): void {
    openedRef.current = false;
    setOpening(false);
    setOpened(false);

    if (reduceMotion) {
      openedRef.current = true;
      setOpened(true);
      focusLetterHeading();
      return;
    }

    setOpening(true);
    timelineRef.current?.restart();
  }

  function skipOpening(): void {
    openedRef.current = true;
    setOpening(false);
    setOpened(true);
    timelineRef.current?.progress(1).pause();
    focusLetterHeading();
  }

  return (
    <div
      ref={rootRef}
      data-preview={preview || undefined}
      data-hydrated={hydrated || undefined}
      data-opened={opened || undefined}
      data-reduced-motion={reduceMotion || undefined}
      className={styles.root}
    >
      <a className={styles.skipLink} href="#letter-content">
        Skip to letter
      </a>

      <div
        className={styles.envelopeOverlay}
        data-envelope-overlay
        aria-label="Cinematic letter opening"
      >
        <div
          className={styles.envelopeScene}
          role="img"
          aria-label="Sealed letter envelope"
        >
          <div
            className={styles.envelope}
            data-envelope-scene
            onClick={openLetter}
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
            <div className={styles.envelopeFlap} data-envelope-flap aria-hidden="true">
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
        </div>

        <div className={styles.openingControls} aria-label="Letter opening controls">
          <button
            className={styles.primaryButton}
            type="button"
            onClick={openLetter}
            disabled={opened || opening}
          >
            {opened ? "Letter opened" : opening ? "Opening..." : "Open your letter"}
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
              onChange={(event) => setReduceMotion(event.target.checked)}
            />
            <span>Reduce motion</span>
          </label>
        </div>
      </div>

      <main className={styles.mainContent} data-letter-content-wrapper>
        <header className={styles.header}>
          <Link className={styles.wordmark} href="/">
            letterly
          </Link>
          <p className={styles.headerNote}>
            {preview ? "Private preview" : "A private letter, shared with care"}
          </p>
        </header>

        <article id="letter-content" className={styles.letterCard}>
          <div className={styles.letterTopline} aria-hidden="true">
            <span>Letterly</span>
            <span>♡</span>
          </div>
          <p className={styles.letterKicker}>Secret Letter</p>
          <h2 ref={headingRef} className={styles.letterHeading} tabIndex={-1}>
            For {model.recipientName}
          </h2>
          <div className={styles.divider} aria-hidden="true" />
          <div className={styles.message} data-letter-section>
            <p>{model.mainMessage}</p>
          </div>

          {model.images.map((image) => (
            <figure
              key={image.imageId}
              className={styles.imageFigure}
              data-letter-section
            >
              {failedImageIds.has(image.imageId) ? (
                <div className={styles.imageFallback} role="status">
                  This image is unavailable right now.
                </div>
              ) : (
                <Image
                  className={styles.image}
                  src={image.mediaUrl}
                  alt=""
                  width={1200}
                  height={900}
                  sizes="(max-width: 768px) calc(100vw - 40px), 720px"
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
                <figcaption className={styles.caption}>
                  {image.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}

          <footer className={styles.footer}>
            Create your own letter on Letterly
          </footer>
        </article>
      </main>
    </div>
  );
}
