"use client";

import { useEffect } from "react";

type PointerSnapshot = {
  clientX: number;
  clientY: number;
  target: Element;
};

const revealSelector = "[data-reveal]";
const spotlightSelector = "[data-spotlight]";
const magneticSelector = "[data-magnetic]";

function resetPointerStyles(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(spotlightSelector).forEach((element) => {
    element.style.removeProperty("--spotlight-x");
    element.style.removeProperty("--spotlight-y");
    element.style.removeProperty("--tilt-x");
    element.style.removeProperty("--tilt-y");
  });

  root.querySelectorAll<HTMLElement>(magneticSelector).forEach((element) => {
    element.style.removeProperty("--magnet-x");
    element.style.removeProperty("--magnet-y");
  });
}

export function LandingEffects(): null {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-landing-root]");

    if (!root) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const precisePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    );
    const revealElements = Array.from(
      root.querySelectorAll<HTMLElement>(revealSelector),
    );
    let observer: IntersectionObserver | undefined;
    let animationFrame = 0;
    let pointerSnapshot: PointerSnapshot | undefined;

    const prepareReveals = (): void => {
      observer?.disconnect();
      root.dataset.motionReady = "true";

      if (reducedMotion.matches) {
        revealElements.forEach((element) => {
          element.dataset.revealState = "visible";
        });
        resetPointerStyles(root);
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const element = entry.target as HTMLElement;
            element.dataset.revealState = "visible";
            observer?.unobserve(element);
          });
        },
        { rootMargin: "0px 0px -8%", threshold: 0.14 },
      );

      revealElements.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        const isInitiallyVisible =
          bounds.bottom > 0 && bounds.top < window.innerHeight * 0.9;

        element.dataset.revealState = isInitiallyVisible
          ? "visible"
          : "pending";

        if (!isInitiallyVisible) {
          observer?.observe(element);
        }
      });
    };

    const paintPointerEffects = (): void => {
      animationFrame = 0;

      if (
        !pointerSnapshot ||
        reducedMotion.matches ||
        !precisePointer.matches
      ) {
        return;
      }

      const { clientX, clientY, target } = pointerSnapshot;
      const spotlight = target.closest<HTMLElement>(spotlightSelector);

      if (spotlight) {
        const bounds = spotlight.getBoundingClientRect();
        const localX = clientX - bounds.left;
        const localY = clientY - bounds.top;
        const normalizedX = localX / bounds.width - 0.5;
        const normalizedY = localY / bounds.height - 0.5;

        spotlight.style.setProperty("--spotlight-x", `${localX}px`);
        spotlight.style.setProperty("--spotlight-y", `${localY}px`);
        spotlight.style.setProperty("--tilt-x", `${-normalizedY * 1.4}deg`);
        spotlight.style.setProperty("--tilt-y", `${normalizedX * 1.4}deg`);
      }

      const magnetic = target.closest<HTMLElement>(magneticSelector);

      if (magnetic) {
        const bounds = magnetic.getBoundingClientRect();
        const offsetX = ((clientX - bounds.left) / bounds.width - 0.5) * 10;
        const offsetY = ((clientY - bounds.top) / bounds.height - 0.5) * 8;

        magnetic.style.setProperty("--magnet-x", `${offsetX}px`);
        magnetic.style.setProperty("--magnet-y", `${offsetY}px`);
      }
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (!(event.target instanceof Element)) {
        return;
      }

      pointerSnapshot = {
        clientX: event.clientX,
        clientY: event.clientY,
        target: event.target,
      };

      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(paintPointerEffects);
      }
    };

    const handleMotionPreference = (): void => {
      prepareReveals();
    };

    const handlePointerPreference = (): void => {
      if (!precisePointer.matches) {
        resetPointerStyles(root);
      }
    };

    const handlePointerLeave = (): void => {
      resetPointerStyles(root);
    };

    prepareReveals();
    root.addEventListener("pointermove", handlePointerMove, { passive: true });
    root.addEventListener("pointerleave", handlePointerLeave);
    reducedMotion.addEventListener("change", handleMotionPreference);
    precisePointer.addEventListener("change", handlePointerPreference);

    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(animationFrame);
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerleave", handlePointerLeave);
      reducedMotion.removeEventListener("change", handleMotionPreference);
      precisePointer.removeEventListener("change", handlePointerPreference);
      resetPointerStyles(root);
      delete root.dataset.motionReady;
    };
  }, []);

  return null;
}
