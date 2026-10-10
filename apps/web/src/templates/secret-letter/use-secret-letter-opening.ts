import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./renderer.module.css";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type SecretLetterOpeningOptions = {
  rootRef: RefObject<HTMLDivElement | null>;
  readerHeadingRef: RefObject<HTMLHeadingElement | null>;
  initialOpened: boolean;
  locked: boolean;
  hydrated: boolean;
  clientReady: boolean;
  reduceMotion: boolean;
};

export function useSecretLetterOpening({
  rootRef,
  readerHeadingRef,
  initialOpened,
  locked,
  hydrated,
  clientReady,
  reduceMotion,
}: SecretLetterOpeningOptions) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [opened, setOpened] = useState(initialOpened);
  const [opening, setOpening] = useState(false);
  const [lockedPromptVisible, setLockedPromptVisible] = useState(false);
  const [revealed, setRevealed] = useState(!initialOpened);

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
      const envelopeArt =
        rootRef.current?.querySelector<HTMLElement>("[data-opening-art]");
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

  function finishOpening(): void {
    timelineRef.current?.kill();
    timelineRef.current = null;
    setOpening(false);
    setOpened(true);
    // Keep normal motion gated until the content reveal timeline finishes.
    setRevealed(reduceMotion);
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

  return {
    opened,
    opening,
    lockedPromptVisible,
    revealed,
    revealPasswordPrompt,
    openLetter,
  };
}
