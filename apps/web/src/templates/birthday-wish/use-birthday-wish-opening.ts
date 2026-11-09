import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import secretLetterStyles from "../secret-letter/renderer.module.css";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type BirthdayWishOpeningOptions = {
  rootRef: RefObject<HTMLDivElement | null>;
  readerHeadingRef: RefObject<HTMLHeadingElement | null>;
  initialOpened: boolean;
  locked: boolean;
  hydrated: boolean;
  clientReady: boolean;
  reduceMotion: boolean;
};

export function useBirthdayWishOpening({
  rootRef,
  readerHeadingRef,
  initialOpened,
  locked,
  hydrated,
  clientReady,
  reduceMotion,
}: BirthdayWishOpeningOptions) {
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
          `.${secretLetterStyles.siteHeader}`,
        );
        const heroCopy = rootRef.current?.querySelector<HTMLElement>(
          `.${secretLetterStyles.heroCopy}`,
        );
        const heroActions = rootRef.current?.querySelector<HTMLElement>(
          `.${secretLetterStyles.heroActions}`,
        );
        const reveal = gsap.timeline({
          defaults: { ease: "power2.out" },
          onComplete: contextSafe
            ? contextSafe(() => setRevealed(true))
            : undefined,
        });

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
        "[data-wish-overlay]",
      );
      const stage =
        rootRef.current?.querySelector<HTMLElement>("[data-wish-scene]");
      if (!overlay || !stage) return;

      const flame = rootRef.current?.querySelector<HTMLElement>(
        "[data-candle-flame]",
      );
      const halo =
        rootRef.current?.querySelector<HTMLElement>("[data-candle-halo]");
      const sparkles = rootRef.current?.querySelector<HTMLElement>(
        "[data-wish-sparkles]",
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
      timeline.addLabel("blow-out");
      if (flame) {
        timeline.to(
          flame,
          {
            scaleY: 1.4,
            scaleX: 0.4,
            y: -14,
            autoAlpha: 0,
            duration: 0.26,
            ease: "power2.in",
          },
          "blow-out",
        );
      }
      if (halo) {
        timeline.to(
          halo,
          {
            scale: 1.45,
            autoAlpha: 0,
            duration: 0.36,
            ease: "power2.out",
          },
          "blow-out",
        );
      }
      if (sparkles) {
        timeline.fromTo(
          sparkles,
          { autoAlpha: 0.4, y: 4, scale: 0.92 },
          {
            autoAlpha: 0,
            y: -26,
            scale: 1.16,
            duration: 0.48,
            ease: "power2.out",
          },
          "blow-out+=0.04",
        );
      }
      timeline
        .to(
          stage,
          {
            y: -28,
            scale: 0.96,
            autoAlpha: 0,
            duration: 0.42,
            ease: "power3.in",
          },
          "blow-out+=0.18",
        )
        .to(
          overlay,
          { autoAlpha: 0, duration: 0.3, ease: "power2.inOut" },
          "<0.14",
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
    setRevealed(reduceMotion);
    window.requestAnimationFrame(() =>
      readerHeadingRef.current?.focus({ preventScroll: true }),
    );
  }

  function revealPasswordPrompt(): void {
    if (!locked || lockedPromptVisible) return;
    setLockedPromptVisible(true);
  }

  function blowOutCandle(): void {
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
    blowOutCandle,
  };
}
