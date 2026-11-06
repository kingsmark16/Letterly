"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { useLandingMotion } from "./landing-motion";
import { SilkCanvas } from "./silk-canvas";
import styles from "./letter-still-life.module.css";

gsap.registerPlugin(useGSAP);

const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function LetterStillLife(): React.JSX.Element {
  const scene = useRef<HTMLElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const opened = useRef(false);
  const [open, setOpen] = useState(false);
  const { paused } = useLandingMotion();
  const letterId = useId();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientSnapshot,
    serverSnapshot,
  );

  useGSAP(
    () => {
      const root = scene.current;
      if (!root) return;
      const letter = root.querySelector("[data-sample-letter]");
      const envelope = root.querySelector("[data-envelope-front]");
      const seal = root.querySelector("[data-wax-seal]");
      const animation = gsap
        .timeline({ paused: true, defaults: { ease: "power3.inOut" } })
        .to(seal, { scale: 0.72, rotation: -18, duration: 0.3 })
        .set(letter, { zIndex: 3 }, 0.15)
        .to(envelope, { yPercent: 16, rotation: -10, duration: 0.85 }, 0.1)
        .to(letter, { yPercent: -20, rotation: -2, duration: 1.05 }, 0.05);
      timeline.current = animation;
      animation.progress(opened.current ? 1 : 0).pause();
      let resumeOnVisible = false;
      const visibility = () => {
        if (document.hidden) {
          resumeOnVisible = animation.isActive();
          animation.pause();
        } else if (resumeOnVisible) {
          animation.resume();
          resumeOnVisible = false;
        }
      };
      document.addEventListener("visibilitychange", visibility);
      return () => {
        document.removeEventListener("visibilitychange", visibility);
        timeline.current = null;
      };
    },
    { scope: scene, dependencies: [paused], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      const root = scene.current;
      if (
        !root ||
        paused ||
        !matchMedia("(hover: hover) and (pointer: fine)").matches
      )
        return;
      const art = root.querySelector("[data-letter-art]");
      const rotateX = gsap.quickTo(art, "rotationX", {
        duration: 0.65,
        ease: "power3.out",
      });
      const rotateY = gsap.quickTo(art, "rotationY", {
        duration: 0.65,
        ease: "power3.out",
      });
      let bounds = root.getBoundingClientRect();
      const enter = () => {
        bounds = root.getBoundingClientRect();
      };
      const move = (event: PointerEvent) => {
        rotateX((0.5 - (event.clientY - bounds.top) / bounds.height) * 6);
        rotateY(((event.clientX - bounds.left) / bounds.width - 0.5) * 8);
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
    },
    { scope: scene, dependencies: [paused], revertOnUpdate: true },
  );

  const toggleLetter = () => {
    const next = !opened.current;
    opened.current = next;
    setOpen(next);
    if (paused) timeline.current?.progress(next ? 1 : 0).pause();
    else if (next) timeline.current?.timeScale(1).play();
    else timeline.current?.timeScale(1.3).reverse();
  };
  return (
    <figure
      ref={scene}
      className={styles.scene}
      aria-label="A sample letter, tucked into a rose envelope"
      data-sample-open={open}
    >
      <SilkCanvas className={styles.silkCanvas} />
      <div className={styles.letterArt} data-letter-art>
        <div className={styles.backdrop} aria-hidden="true" />
        <svg
          className={styles.botanical}
          viewBox="0 0 160 300"
          fill="none"
          aria-hidden="true"
        >
          <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M81 291C71 211 110 137 94 20M88 208C51 191 37 155 34 127M90 172C122 156 133 129 135 105M94 117C63 103 54 80 56 58M96 76C119 63 125 42 122 22" />
            <path d="M34 127C8 116 12 94 15 88C38 94 42 110 34 127ZM34 127C57 116 54 98 48 90C33 99 29 111 34 127ZM56 58C33 49 35 29 40 20C59 30 63 43 56 58ZM135 105C112 95 114 73 118 66C139 75 143 91 135 105ZM122 22C108 17 105 6 109 2C124 4 130 12 122 22ZM72 245C43 233 33 217 37 199C61 205 75 220 72 245ZM86 224C114 218 130 199 127 183C104 187 87 203 86 224Z" />
          </g>
        </svg>
        <div className={styles.envelopeBack} aria-hidden="true" />
        <div className={styles.letter} id={letterId} data-sample-letter>
          <span className={styles.letterLabel}>A LETTER, JUST FOR YOU</span>
          <p className={styles.salutation}>To my favorite person,</p>
          <p>
            Somewhere between our ordinary days, you became my favorite part of
            them.
          </p>
          <p>I just thought you should know.</p>
          <span className={styles.letterHeart} aria-hidden="true">
            ♡
          </span>
        </div>
        <div
          className={styles.envelopeFront}
          aria-hidden="true"
          data-envelope-front
        >
          <span className={styles.foldLeft} />
          <span className={styles.foldRight} />
          <span className={styles.foldBottom} />
          <span className={styles.seal} data-wax-seal>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            >
              <path d="M12 19s-7-4.2-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 4.8-7 9-7 9Z" />
            </svg>
          </span>
        </div>
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.captionLine} aria-hidden="true" />A small
        letter. A whole lot of feeling.
        <small>Sample letter</small>
      </figcaption>
      <button
        className={styles.openButton}
        hidden={!hydrated}
        type="button"
        aria-expanded={open}
        aria-controls={letterId}
        onClick={toggleLetter}
      >
        <span>
          {open ? "Close the sample letter" : "Open the sample letter"}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m4 8 8-5 8 5v12H4ZM4 8l8 6 8-6" />
        </svg>
      </button>
    </figure>
  );
}
