"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { ReactNode } from "react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

type DashboardMotionProps = {
  children: ReactNode;
};

export function DashboardMotion({
  children,
}: DashboardMotionProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const elements = gsap.utils.toArray<HTMLElement>(
          "[data-dashboard-reveal]",
          root,
        );

        if (elements.length === 0) {
          return;
        }

        const timeline = gsap.timeline({
          defaults: {
            duration: 0.42,
            ease: "power2.out",
          },
        });

        timeline.fromTo(
          elements,
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            clearProps: "opacity,transform,visibility",
            stagger: 0.06,
            y: 0,
          },
        );

        return () => {
          timeline.kill();
        };
      });

      return () => {
        media.revert();
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} data-dashboard-root>
      {children}
    </div>
  );
}
