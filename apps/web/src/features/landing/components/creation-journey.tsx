"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState, type ReactNode } from "react";
import { creationSteps } from "./creation-steps";
import { CreationJourneyArtwork } from "./creation-journey-artwork";
import { DecorativeCanvas } from "./decorative-canvas";
import { useLandingMotion } from "./landing-motion";
import styles from "./how-letterly-works.module.css";

gsap.registerPlugin(useGSAP);

export function CreationJourney({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { paused } = useLandingMotion();

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;
      const findStep = (
        target: EventTarget | null,
      ): HTMLAnchorElement | null =>
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("[data-creation-step]")
          : null;
      const select = (link: HTMLAnchorElement | null) => {
        if (!link || !element.contains(link)) return;
        const index = Number(link.dataset.creationStep);
        if (
          Number.isInteger(index) &&
          index >= 0 &&
          index < creationSteps.length
        )
          setActive(index);
      };
      const focus = (event: FocusEvent) => select(findStep(event.target));
      const hover = (event: PointerEvent) => {
        if (event.pointerType === "mouse") {
          if (event.movementX === 0 && event.movementY === 0) return;
          select(findStep(event.target));
        }
      };
      const click = (event: MouseEvent) => {
        const link = findStep(event.target);
        if (
          !link ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        select(link);
      };
      element.addEventListener("focusin", focus);
      element.addEventListener("pointerover", hover);
      element.addEventListener("click", click);
      return () => {
        element.removeEventListener("focusin", focus);
        element.removeEventListener("pointerover", hover);
        element.removeEventListener("click", click);
      };
    },
    { scope: root },
  );

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;
      element
        .querySelectorAll<HTMLAnchorElement>("[data-creation-step]")
        .forEach((link, index) => {
          if (index === active) link.setAttribute("aria-current", "step");
          else link.removeAttribute("aria-current");
        });
      if (paused) return;
      const scene = element.querySelector(`[data-journey-scene="${active}"]`);
      const timeline = gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(
          scene,
          { y: 14, opacity: 0.35, scale: 0.97 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.65,
            transformOrigin: "50% 50%",
          },
        );
      const ink = scene?.querySelectorAll<SVGPathElement>("[data-journey-ink]");
      ink?.forEach((path, index) => {
        const length = path.getTotalLength();
        timeline.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 0.7,
            clearProps: "strokeDasharray,strokeDashoffset",
          },
          0.15 + index * 0.09,
        );
      });
      const visibility = () =>
        document.hidden ? timeline.pause() : timeline.resume();
      document.addEventListener("visibilitychange", visibility);
      return () => document.removeEventListener("visibilitychange", visibility);
    },
    {
      scope: root,
      dependencies: [active, paused, children],
      revertOnUpdate: true,
    },
  );

  const handleFocusCapture = (event: React.FocusEvent) => {
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("[data-creation-step]")
        : null;
    if (link) {
      const index = Number(link.dataset.creationStep);
      if (
        Number.isInteger(index) &&
        index >= 0 &&
        index < creationSteps.length
      ) {
        setActive(index);
      }
    }
  };

  return (
    <div
      ref={root}
      className={styles.journey}
      data-creation-active={active}
      onFocusCapture={handleFocusCapture}
    >
      {children}
      <figure
        className={styles.stage}
        aria-label="Illustrated Letterly creation journey"
      >
        <div className={styles.atmosphere} aria-hidden="true">
          <DecorativeCanvas
            effect="journey"
            variation={active}
            className={styles.journeyCanvas}
          />
        </div>
        <CreationJourneyArtwork />
        <figcaption
          className={styles.caption}
          aria-live="polite"
          aria-atomic="true"
        >
          {creationSteps[active]!.title}
        </figcaption>
      </figure>
    </div>
  );
}
