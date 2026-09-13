"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ReactNode } from "react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type HowItWorksProgressProps = {
  children: ReactNode;
  className?: string;
};

function setProgressState(
  progress: number,
  rail: HTMLElement,
  markers: HTMLElement[],
  items: HTMLElement[],
): void {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const activeIndex = Math.min(
    markers.length - 1,
    Math.floor(clampedProgress * markers.length),
  );

  rail.style.setProperty("--scroll-progress", `${clampedProgress}`);

  markers.forEach((marker, index) => {
    marker.dataset.progressState =
      index < activeIndex
        ? "complete"
        : index === activeIndex
          ? "active"
          : "upcoming";
  });

  items.forEach((item, index) => {
    item.dataset.progressState =
      index < activeIndex
        ? "complete"
        : index === activeIndex
          ? "active"
          : "upcoming";
  });
}

function updateRailBounds(rail: HTMLElement, markers: HTMLElement[]): void {
  const firstMarkerElement = markers.at(0);
  const lastMarkerElement = markers.at(-1);

  if (!firstMarkerElement || !lastMarkerElement) {
    return;
  }

  const railTop = rail.getBoundingClientRect().top;
  const firstMarker = firstMarkerElement.getBoundingClientRect();
  const lastMarker = lastMarkerElement.getBoundingClientRect();
  const start = Math.max(0, firstMarker.top + firstMarker.height / 2 - railTop);
  const end = Math.max(start, lastMarker.top + lastMarker.height / 2 - railTop);

  rail.style.setProperty("--scroll-rail-start", `${start}px`);
  rail.style.setProperty("--scroll-rail-end", `${end}px`);
  rail.dataset.scrollBoundsReady = "true";
}

export function HowItWorksProgress({
  children,
  className,
}: HowItWorksProgressProps): React.JSX.Element {
  const railRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const rail = railRef.current;

      if (!rail) {
        return;
      }

      const fill = rail.querySelector<HTMLElement>(
        "[data-scroll-progress-fill]",
      );
      const markers = Array.from(
        rail.querySelectorAll<HTMLElement>("[data-scroll-progress-marker]"),
      );
      const items = Array.from(
        rail.querySelectorAll<HTMLElement>("[data-scroll-progress-item]"),
      );

      if (!fill || markers.length === 0 || items.length !== markers.length) {
        return;
      }

      updateRailBounds(rail, markers);

      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => {
              updateRailBounds(rail, markers);
            });

      resizeObserver?.observe(rail);

      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        let furthestProgress = 0;
        const fillTween = gsap.fromTo(
          fill,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: 1,
            ease: "none",
            paused: true,
            transformOrigin: "top center",
          },
        );

        const paintProgress = (progress: number): void => {
          furthestProgress = Math.max(
            furthestProgress,
            Math.min(1, Math.max(0, progress)),
          );
          const markerProgress =
            markers.length === 1
              ? 1
              : Math.min(
                  1,
                  (furthestProgress * markers.length) / (markers.length - 1),
                );

          fillTween.progress(markerProgress);
          setProgressState(furthestProgress, rail, markers, items);
        };

        const resetAtDocumentTop = (): void => {
          if (window.scrollY > 1 || furthestProgress === 0) {
            return;
          }

          furthestProgress = 0;
          fillTween.progress(0);
          setProgressState(0, rail, markers, items);
        };

        fillTween.progress(0);
        setProgressState(0, rail, markers, items);

        const trigger = ScrollTrigger.create({
          trigger: rail,
          start: "top 76%",
          end: "bottom 34%",
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            paintProgress(self.progress);
          },
          onLeave: () => {
            paintProgress(1);
          },
          onLeaveBack: () => {
            paintProgress(furthestProgress);
          },
        });

        window.addEventListener("scroll", resetAtDocumentTop, {
          passive: true,
        });

        return () => {
          trigger.kill();
          fillTween.kill();
          window.removeEventListener("scroll", resetAtDocumentTop);
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(fill, { scaleY: 1, transformOrigin: "top center" });
        setProgressState(1, rail, markers, items);
      });

      return () => {
        resizeObserver?.disconnect();
        media.revert();
      };
    },
    { scope: railRef },
  );

  return (
    <div
      ref={railRef}
      className={className}
      data-react-bits-pattern="scroll-story"
    >
      {children}
    </div>
  );
}
