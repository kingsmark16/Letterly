import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  const [relighting, setRelighting] = useState(false);
  const [lockedPromptVisible, setLockedPromptVisible] = useState(false);
  const [revealed, setRevealed] = useState(!initialOpened);
  const [extinguishedCandles, setExtinguishedCandles] = useState<
    [boolean, boolean, boolean]
  >([false, false, false]);

  useIsomorphicLayoutEffect(() => {
    if (clientReady && opened && reduceMotion) setRevealed(true);
  }, [clientReady, opened, reduceMotion]);

  useGSAP(
    (_context, contextSafe) => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      if (locked || !hydrated || reduceMotion) return;

      if (opened && !relighting) {
        const content = rootRef.current?.querySelector<HTMLElement>(
          "[data-letter-content-wrapper]",
        );
        const header =
          rootRef.current?.querySelector<HTMLElement>("[data-bw-header]");
        const heroEditorial = rootRef.current?.querySelector<HTMLElement>(
          "[data-bw-hero-editorial]",
        );
        const heroMedallion = rootRef.current?.querySelector<HTMLElement>(
          "[data-bw-hero-medallion]",
        );
        const reveal = gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: contextSafe
            ? contextSafe(() => setRevealed(true))
            : undefined,
        });

        if (content) {
          reveal.fromTo(
            content,
            { autoAlpha: 0, y: 18 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.65,
              ease: "power2.out",
              clearProps: "transform",
            },
          );
        }
        if (header) {
          reveal.fromTo(
            header,
            { autoAlpha: 0, y: -14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.45,
              ease: "power2.out",
              clearProps: "transform",
            },
            "<0.08",
          );
        }
        if (heroEditorial) {
          reveal.fromTo(
            heroEditorial,
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              ease: "power2.out",
              clearProps: "transform",
            },
            "<0.08",
          );
        }
        if (heroMedallion) {
          reveal.fromTo(
            heroMedallion,
            { autoAlpha: 0, scale: 0.92, y: 16 },
            {
              autoAlpha: 1,
              scale: 1,
              y: 0,
              duration: 0.6,
              ease: "back.out(1.4)",
              clearProps: "transform",
            },
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

      const flames = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>("[data-candle-flame]") ??
          [],
      );
      const halo =
        rootRef.current?.querySelector<HTMLElement>("[data-candle-halo]");
      const sparkles = rootRef.current?.querySelector<HTMLElement>(
        "[data-wish-sparkles]",
      );
      const complete = contextSafe
        ? contextSafe(() => {
            window.scrollTo({
              top: 0,
              left: 0,
              behavior: "instant" as ScrollBehavior,
            });
            setOpening(false);
            setRelighting(false);
            setOpened(true);
            setRevealed(false);
            window.requestAnimationFrame(() =>
              readerHeadingRef.current?.focus({ preventScroll: true }),
            );
          })
        : () => undefined;

      const timeline = gsap.timeline({ paused: true, onComplete: complete });
      timeline.addLabel("blow-out");
      if (flames.length > 0) {
        timeline.to(
          flames,
          {
            scaleY: 1.45,
            scaleX: 0.35,
            y: -14,
            autoAlpha: 0,
            duration: 0.28,
            stagger: 0.05,
            ease: "power2.in",
          },
          "blow-out",
        );
      }
      if (halo) {
        timeline.to(
          halo,
          {
            scale: 1.5,
            autoAlpha: 0,
            duration: 0.38,
            ease: "power2.out",
          },
          "blow-out",
        );
      }
      if (sparkles) {
        timeline.fromTo(
          sparkles,
          { autoAlpha: 0.45, y: 4, scale: 0.9 },
          {
            autoAlpha: 0,
            y: -28,
            scale: 1.2,
            duration: 0.5,
            ease: "power2.out",
          },
          "blow-out+=0.04",
        );
      }
      timeline
        .to(
          stage,
          {
            y: -26,
            scale: 0.95,
            autoAlpha: 0,
            duration: 0.54,
            ease: "power2.inOut",
          },
          "blow-out+=1.85",
        )
        .to(
          overlay,
          { autoAlpha: 0, duration: 0.42, ease: "power2.inOut" },
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
      dependencies: [hydrated, locked, opened, relighting, reduceMotion],
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
          display: "none",
        });
        gsap.set(passwordPrompt, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          display: "grid",
        });
        focusPassword();
        return;
      }

      const transition = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => {
          focusPassword();
          if (openingStage) {
            openingStage.style.display = "none";
          }
        },
      });
      transition
        .addLabel("reveal-password")
        .fromTo(
          openingStage,
          { autoAlpha: 1, x: 0, y: 0, scale: 1, display: "grid" },
          {
            autoAlpha: 0,
            x: 0,
            y: -34,
            scale: 0.94,
            duration: 0.52,
            pointerEvents: "none",
          },
        )
        .fromTo(
          passwordPrompt,
          { autoAlpha: 0, x: 0, y: 34, scale: 0.94, display: "grid" },
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

  const autoBlowoutTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (autoBlowoutTimeoutRef.current !== null) {
        window.clearTimeout(autoBlowoutTimeoutRef.current);
      }
    };
  }, []);

  function finishOpening(): void {
    if (autoBlowoutTimeoutRef.current !== null) {
      window.clearTimeout(autoBlowoutTimeoutRef.current);
      autoBlowoutTimeoutRef.current = null;
    }
    timelineRef.current?.kill();
    timelineRef.current = null;
    setOpening(false);
    setRelighting(false);
    setOpened(true);
    setRevealed(reduceMotion);
    window.requestAnimationFrame(() =>
      readerHeadingRef.current?.focus({ preventScroll: true }),
    );
  }

  function revealPasswordPrompt(): void {
    if (!locked || lockedPromptVisible) return;
    if (autoBlowoutTimeoutRef.current !== null) {
      window.clearTimeout(autoBlowoutTimeoutRef.current);
      autoBlowoutTimeoutRef.current = null;
    }
    setExtinguishedCandles([true, true, true]);
    setLockedPromptVisible(true);
  }

  function blowOutCandle(): void {
    if (locked) {
      revealPasswordPrompt();
      return;
    }
    if (opening || (opened && !relighting)) return;
    if (autoBlowoutTimeoutRef.current !== null) {
      window.clearTimeout(autoBlowoutTimeoutRef.current);
      autoBlowoutTimeoutRef.current = null;
    }
    setExtinguishedCandles([true, true, true]);
    if (reduceMotion || !timelineRef.current) return finishOpening();
    setRevealed(false);
    setOpening(true);
    timelineRef.current.restart();
  }

  function toggleCandle(index: 0 | 1 | 2): void {
    if (opening) return;
    setExtinguishedCandles((prev) => {
      const next: [boolean, boolean, boolean] = [...prev];
      next[index] = !next[index];
      if (next.every(Boolean)) {
        if (autoBlowoutTimeoutRef.current !== null) {
          window.clearTimeout(autoBlowoutTimeoutRef.current);
        }
        autoBlowoutTimeoutRef.current = window.setTimeout(() => {
          blowOutCandle();
        }, 1100);
      }
      return next;
    });
  }

  function relightCandles(): void {
    if (locked || opening) return;
    if (autoBlowoutTimeoutRef.current !== null) {
      window.clearTimeout(autoBlowoutTimeoutRef.current);
      autoBlowoutTimeoutRef.current = null;
    }
    setExtinguishedCandles([false, false, false]);
    setRelighting(true);
    setOpened(false);
  }

  return {
    opened,
    opening,
    relighting,
    lockedPromptVisible,
    revealed,
    extinguishedCandles,
    toggleCandle,
    relightCandles,
    revealPasswordPrompt,
    blowOutCandle,
  };
}
