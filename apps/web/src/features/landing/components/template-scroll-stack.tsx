"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { ReactNode } from "react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

type TemplateScrollStackProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
};

/**
 * A Letterly-specific adaptation of the React Bits Scroll Stack pattern.
 *
 * The ordered list and every template action are rendered on the server. GSAP
 * only adds a restrained depth response on large screens, so the catalog stays
 * complete when JavaScript or motion is unavailable.
 */
export function TemplateScrollStack({
  ariaLabel,
  children,
  className,
}: TemplateScrollStackProps): React.JSX.Element {
  const stackRef = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const stack = stackRef.current;

      if (!stack) {
        return;
      }

      const cards = Array.from(stack.children).filter(
        (element): element is HTMLElement => element instanceof HTMLElement,
      );

      if (cards.length < 2) {
        return;
      }

      const media = gsap.matchMedia();

      media.add(
        {
          largeScreen: "(min-width: 64.01rem)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { largeScreen, reduceMotion } = context.conditions as {
            largeScreen: boolean;
            reduceMotion: boolean;
          };

          if (!largeScreen || reduceMotion) {
            gsap.set(cards, { clearProps: "transform" });
            return;
          }

          let animationFrame = 0;

          const updateDepth = (): void => {
            animationFrame = 0;
            const measurements = cards.map((card) =>
              card.getBoundingClientRect(),
            );

            cards.forEach((card, index) => {
              const nextCard = measurements[index + 1];

              const cardBounds = measurements[index];

              if (!cardBounds || !nextCard) {
                gsap.set(card, {
                  rotation: 0,
                  scale: 1,
                  y: 0,
                });
                return;
              }

              const depthStart = cardBounds.top + cardBounds.height * 0.82;
              const depthTravel = Math.max(cardBounds.height * 0.58, 1);
              const sharesRow = Math.abs(nextCard.top - cardBounds.top) < 1;

              if (sharesRow) {
                gsap.set(card, {
                  rotation: 0,
                  scale: 1,
                  y: 0,
                });
                return;
              }

              const progress = gsap.utils.clamp(
                0,
                1,
                (depthStart - nextCard.top) / depthTravel,
              );

              gsap.set(card, {
                rotation: (index % 2 === 0 ? -0.35 : 0.35) * progress,
                scale: 1 - progress * 0.035,
                transformOrigin: "top center",
                y: progress * -8,
              });
            });
          };

          const requestUpdate = (): void => {
            if (animationFrame === 0) {
              animationFrame = window.requestAnimationFrame(updateDepth);
            }
          };

          updateDepth();
          window.addEventListener("scroll", requestUpdate, { passive: true });
          window.addEventListener("resize", requestUpdate, { passive: true });

          return () => {
            window.cancelAnimationFrame(animationFrame);
            window.removeEventListener("scroll", requestUpdate);
            window.removeEventListener("resize", requestUpdate);
            gsap.set(cards, { clearProps: "transform" });
          };
        },
        stack,
      );

      return () => media.revert();
    },
    { scope: stackRef },
  );

  return (
    <ol
      ref={stackRef}
      aria-label={ariaLabel}
      className={className}
      data-react-bits-pattern="scroll-stack"
      data-template-stack
    >
      {children}
    </ol>
  );
}
