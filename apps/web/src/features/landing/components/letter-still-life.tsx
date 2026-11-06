"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { EnvelopeArtwork, WaxSeal } from "./envelope-artwork";
import { useLandingMotion } from "./landing-motion";
import { SilkCanvas } from "./silk-canvas";
import styles from "./letter-still-life.module.css";

gsap.registerPlugin(useGSAP);

export function LetterStillLife(): React.JSX.Element {
  const scene = useRef<HTMLElement>(null);
  const { paused } = useLandingMotion();

  useGSAP(
    () => {
      const root = scene.current;
      if (!root || paused) return;
      const letter = root.querySelector("[data-sample-letter]");
      const envelope = root.querySelector("[data-envelope-front]");
      const reveal = gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(envelope, { y: 12 }, { y: 0, duration: 1.1 })
        .fromTo(letter, { y: 24 }, { y: 0, duration: 1.4 }, 0.05);
      let suspended = false;
      const visibility = () => {
        if (document.hidden) {
          suspended = reveal.isActive();
          reveal.pause();
        } else if (suspended) {
          reveal.resume();
          suspended = false;
        }
      };
      document.addEventListener("visibilitychange", visibility);
      return () => document.removeEventListener("visibilitychange", visibility);
    },
    { scope: scene, dependencies: [paused], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      const root = scene.current;
      if (!root || paused) return;
      const media = gsap.matchMedia();
      media.add("(hover: hover) and (pointer: fine)", () => {
        const art = root.querySelector("[data-letter-art]");
        const rotateX = gsap.quickTo(art, "rotationX", {
          duration: 0.8,
          ease: "power3.out",
        });
        const rotateY = gsap.quickTo(art, "rotationY", {
          duration: 0.8,
          ease: "power3.out",
        });
        let bounds = root.getBoundingClientRect();
        const enter = () => {
          bounds = root.getBoundingClientRect();
        };
        const move = (event: PointerEvent) => {
          rotateX((0.5 - (event.clientY - bounds.top) / bounds.height) * 4);
          rotateY(((event.clientX - bounds.left) / bounds.width - 0.5) * 6);
        };
        const leave = () => {
          rotateX(0);
          rotateY(0);
        };
        root.addEventListener("pointerenter", enter);
        root.addEventListener("pointermove", move, { passive: true });
        root.addEventListener("pointerleave", leave);
        return () => {
          root.removeEventListener("pointerenter", enter);
          root.removeEventListener("pointermove", move);
          root.removeEventListener("pointerleave", leave);
        };
      });
      return () => media.revert();
    },
    { scope: scene, dependencies: [paused], revertOnUpdate: true },
  );

  return (
    <figure
      ref={scene}
      className={styles.scene}
      aria-label="A sample letter, tucked into a rose envelope"
      data-letter-scene
    >
      <SilkCanvas className={styles.silkCanvas} />
      <div className={styles.letterArt} data-letter-art>
        <svg
          className={styles.botanical}
          viewBox="0 0 150 300"
          fill="none"
          aria-hidden="true"
        >
          <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
            <path d="M32 287C60 223 80 141 87 32M61 206C29 186 16 159 21 133M75 147C105 134 123 111 128 81M84 89C61 75 49 58 51 37" />
            <path d="M87 32C72 17 77 8 86 3C99 15 98 26 87 32ZM21 133C1 128 0 109 5 98C24 103 30 119 21 133ZM21 133C37 125 40 111 36 102C23 108 18 121 21 133ZM128 81C110 73 110 58 114 48C133 57 138 70 128 81ZM128 81C142 70 146 58 143 50C130 57 124 70 128 81ZM51 37C37 32 32 18 36 8C53 15 58 27 51 37ZM48 239C27 230 18 215 21 201C42 207 52 223 48 239Z" />
          </g>
        </svg>
        <div className={styles.stationery} data-stationery>
          <div className={styles.envelopeBack} aria-hidden="true" />
          <div className={styles.letter} data-sample-letter>
            <div className={styles.letterHeading}>
              <span className={styles.letterLabel}>A LETTER, JUST FOR YOU</span>
              <svg
                className={styles.paperMark}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                aria-hidden="true"
              >
                <path d="M12 20S4 15.4 4 9.8A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.8C20 15.4 12 20 12 20Z" />
              </svg>
            </div>
            <p className={styles.salutation}>To my favorite person,</p>
            <p>
              Somewhere between our ordinary days, you became my favorite part
              of them.
            </p>
            <p className={styles.postscript}>I just thought you should know.</p>
          </div>
          <div
            className={styles.envelopeFront}
            aria-hidden="true"
            data-envelope-front
          >
            <EnvelopeArtwork className={styles.envelopeGraphic} />
            <WaxSeal className={styles.seal} />
          </div>
        </div>
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.captionRule} aria-hidden="true" />A small
        letter. A whole lot of feeling.
        <small>Sample letter</small>
      </figcaption>
    </figure>
  );
}
