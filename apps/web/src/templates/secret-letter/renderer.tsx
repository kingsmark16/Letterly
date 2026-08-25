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
  const [opened, setOpened] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReduceMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useGSAP(
    () => {
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

      if (!envelope || !flap || !seal || !letter) {
        return;
      }

      const systemReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion || systemReducedMotion) {
        gsap.set([flap, seal, letter, envelope], { clearProps: "all" });
        timelineRef.current = null;
        return;
      }

      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "power2.out" },
      });

      timeline.eventCallback("onComplete", () => {
        openedRef.current = true;
        setOpened(true);
        focusLetterHeading();
      });

      timeline
        .addLabel("release")
        .to(seal, { autoAlpha: 0, scale: 0.72, duration: 0.35 }, "release")
        .to(
          flap,
          {
            rotationX: -178,
            transformOrigin: "50% 0%",
            duration: 0.75,
            ease: "power3.inOut",
          },
          "release+=0.12",
        )
        .to(
          letter,
          {
            yPercent: -48,
            rotation: -1,
            duration: 1.05,
            ease: "power3.out",
          },
          "release+=0.38",
        )
        .to(
          envelope,
          { autoAlpha: 0, y: 16, duration: 0.55, ease: "power2.in" },
          "release+=1.05",
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
    openedRef.current = true;
    setOpened(true);
    if (reduceMotion) {
      timelineRef.current?.progress(1).pause();
    } else {
      timelineRef.current?.play(0);
    }
    focusLetterHeading();
  }

  function replayOpening(): void {
    openedRef.current = false;
    setOpened(false);

    if (reduceMotion) {
      openedRef.current = true;
      setOpened(true);
      focusLetterHeading();
      return;
    }

    timelineRef.current?.restart();
  }

  function skipOpening(): void {
    openedRef.current = true;
    setOpened(true);
    timelineRef.current?.progress(1).pause();
    focusLetterHeading();
  }

  return (
    <div
      ref={rootRef}
      data-preview={preview || undefined}
      data-opened={opened || undefined}
      className={styles.root}
    >
      <a className={styles.skipLink} href="#letter-content">
        Skip to letter
      </a>

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/">
          letterly
        </Link>
        <p className={styles.headerNote}>
          {preview ? "Private preview" : "A private letter, shared with care"}
        </p>
      </header>

      <main className={styles.main}>
        <section className={styles.opening} aria-labelledby="opening-title">
          <p className={styles.eyebrow}>Something meant to be kept</p>
          <h1 id="opening-title" className={styles.openingTitle}>
            A letter for someone special.
          </h1>
          <p className={styles.openingCopy}>
            Take a quiet moment. The words are here when you are ready to read
            them.
          </p>

          <div
            className={styles.scene}
            role="img"
            aria-label="Sealed letter envelope"
          >
            <div className={styles.glow} aria-hidden="true" />
            <div className={styles.envelope} data-envelope-scene>
              <div className={styles.envelopeLetter} data-envelope-letter>
                <span className={styles.envelopeLetterLine} aria-hidden="true" />
                <span className={styles.envelopeLetterLine} aria-hidden="true" />
                <span className={styles.envelopeLetterLine} aria-hidden="true" />
              </div>
              <div className={styles.envelopeBack} aria-hidden="true" />
              <div className={styles.envelopePocket} aria-hidden="true" />
              <div
                className={styles.envelopeFlap}
                data-envelope-flap
                aria-hidden="true"
              />
              <div className={styles.envelopeLabel} aria-hidden="true">
                For My Dearest
              </div>
              <div
                className={styles.seal}
                data-envelope-seal
                aria-hidden="true"
              >
                <span>♥</span>
              </div>
            </div>
            <p className={styles.openHint} aria-hidden="true">
              Tap to open
            </p>
          </div>

          <div className={styles.controls} aria-label="Letter opening controls">
            <button
              className={styles.primaryButton}
              type="button"
              onClick={openLetter}
              disabled={opened}
            >
              {opened ? "Letter opened" : "Open your letter"}
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
          </div>

          <label className={styles.motionToggle}>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
            />
            <span>Reduce motion</span>
          </label>
        </section>

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
