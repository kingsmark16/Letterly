"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { ReactNode } from "react";
import { useRef } from "react";
import styles from "./question-section.module.css";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP);

interface QuestionSectionProps {
  children?: ReactNode;
  enabled: boolean;
  reduceMotion: boolean;
}

export function QuestionSection({
  children,
  enabled,
  reduceMotion,
}: QuestionSectionProps): React.JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const section = sectionRef.current;
      if (!section || !enabled) return;

      const intro = Array.from(
        section.querySelectorAll<HTMLElement>("[data-question-reveal]"),
      );
      const frame = section.querySelector<HTMLElement>(
        "[data-question-frame]",
      );
      const glow = section.querySelector<HTMLElement>("[data-question-glow]");
      const orbit = Array.from(
        section.querySelectorAll<HTMLElement>("[data-question-orbit]"),
      );

      if (!frame) return;

      if (reduceMotion) {
        gsap.set([section, ...intro, frame, glow, ...orbit].filter(Boolean), {
          clearProps: "all",
        });
        return;
      }

      const reveal = gsap.timeline({
        defaults: { ease: "power3.out" },
      });
      reveal
        .fromTo(
          section,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.62 },
        )
        .fromTo(
          intro,
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.38, stagger: 0.08 },
          "<0.16",
        )
        .fromTo(
          frame,
          { autoAlpha: 0, y: 18, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.46 },
          "<0.1",
        )
        .fromTo(
          orbit,
          { autoAlpha: 0, scale: 0.76, rotation: -8 },
          {
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration: 0.72,
            stagger: 0.08,
          },
          "<0.08",
        );

      const pulse = glow
        ? gsap.to(glow, {
            opacity: 0.78,
            scale: 1.08,
            duration: 3.6,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: 0.72,
          })
        : null;

      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return () => pulse?.kill();
      }

      gsap.set(frame, {
        transformPerspective: 900,
        transformOrigin: "50% 50%",
      });
      const rotateX = gsap.quickTo(frame, "rotationX", {
        duration: 0.55,
        ease: "power3.out",
      });
      const rotateY = gsap.quickTo(frame, "rotationY", {
        duration: 0.55,
        ease: "power3.out",
      });
      const moveGlowX = glow
        ? gsap.quickTo(glow, "x", { duration: 0.8, ease: "power3.out" })
        : null;
      const moveGlowY = glow
        ? gsap.quickTo(glow, "y", { duration: 0.8, ease: "power3.out" })
        : null;

      const handlePointerMove = (event: PointerEvent): void => {
        const bounds = frame.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) return;

        const x = Math.max(
          -0.5,
          Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5),
        );
        const y = Math.max(
          -0.5,
          Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5),
        );
        rotateY(x * 3.2);
        rotateX(y * -2.6);
        moveGlowX?.(x * 18);
        moveGlowY?.(y * 14);
      };
      const handlePointerLeave = (): void => {
        rotateX(0);
        rotateY(0);
        moveGlowX?.(0);
        moveGlowY?.(0);
      };
      const safePointerMove = contextSafe
        ? contextSafe(handlePointerMove)
        : handlePointerMove;
      const safePointerLeave = contextSafe
        ? contextSafe(handlePointerLeave)
        : handlePointerLeave;

      frame.addEventListener("pointermove", safePointerMove);
      frame.addEventListener("pointerleave", safePointerLeave);

      return () => {
        frame.removeEventListener("pointermove", safePointerMove);
        frame.removeEventListener("pointerleave", safePointerLeave);
        pulse?.kill();
      };
    },
    {
      scope: sectionRef,
      dependencies: [enabled, reduceMotion],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      ref={sectionRef}
      id="a-question"
      className={styles.section}
      aria-labelledby="question-section-title"
      data-question-section
    >
      <span
        className={`${styles.orbit} ${styles.orbitOne}`}
        data-question-orbit
        aria-hidden="true"
      />
      <span
        className={`${styles.orbit} ${styles.orbitTwo}`}
        data-question-orbit
        aria-hidden="true"
      />
      <span
        className={styles.ambientGlow}
        data-question-glow
        aria-hidden="true"
      />
      <span
        className={`${styles.sparkle} ${styles.sparkleOne}`}
        aria-hidden="true"
      >
        ✦
      </span>
      <span
        className={`${styles.sparkle} ${styles.sparkleTwo}`}
        aria-hidden="true"
      >
        ♡
      </span>

      <div className={styles.intro}>
        <p className={styles.eyebrow} data-question-reveal>
          A little question, just for us
        </p>
        <h2 id="question-section-title" data-question-reveal>
          Tell me what your heart says.
        </h2>
        <p className={styles.introCopy} data-question-reveal>
          Take your time. There is no perfect answer here, only yours.
        </p>
      </div>

      <div className={styles.responseFrame} data-question-frame>
        {children ? (
          children
        ) : (
          <div className={styles.emptyState}>
            <span aria-hidden="true">♡</span>
            <p>This letter is keeping one more question for later.</p>
          </div>
        )}
      </div>
    </section>
  );
}
