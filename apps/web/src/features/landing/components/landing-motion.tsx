"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  createContext,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MotionContext = createContext({
  paused: true,
  reduced: true,
  toggle: () => {},
});

function subscribeReducedMotion(callback: () => void): () => void {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function reducedSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useLandingMotion() {
  return useContext(MotionContext);
}

export function LandingMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedSnapshot,
    () => true,
  );
  const paused = userPaused || reduced;

  useGSAP(
    () => {
      if (!root.current || paused) return;
      const animations: gsap.core.Animation[] = [];
      const hero = root.current.querySelector("[data-hero-copy]");
      if (hero) {
        animations.push(
          gsap.fromTo(
            hero.children,
            { y: 20 },
            {
              y: 0,
              duration: 0.85,
              stagger: 0.065,
              ease: "power3.out",
              clearProps: "transform",
            },
          ),
        );
      }
      root.current
        .querySelectorAll("[data-section-entry]")
        .forEach((section) => {
          animations.push(
            gsap.fromTo(
              section,
              { y: 28 },
              {
                y: 0,
                duration: 0.8,
                ease: "power3.out",
                clearProps: "transform",
                scrollTrigger: {
                  trigger: section,
                  start: "top 92%",
                  once: true,
                },
              },
            ),
          );
        });
      const suspended = new Set<gsap.core.Animation>();
      const visibility = () => {
        if (document.hidden) {
          animations.forEach((animation) => {
            if (animation.isActive()) {
              suspended.add(animation);
              animation.pause();
            }
          });
        } else {
          suspended.forEach((animation) => animation.resume());
          suspended.clear();
        }
      };
      document.addEventListener("visibilitychange", visibility);
      return () => document.removeEventListener("visibilitychange", visibility);
    },
    { scope: root, dependencies: [paused], revertOnUpdate: true },
  );

  return (
    <MotionContext.Provider
      value={{
        paused,
        reduced,
        toggle: () => setUserPaused((value) => !value),
      }}
    >
      <div
        ref={root}
        className={className}
        data-landing-root
        data-motion-paused={paused}
      >
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export function MotionToggle({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const { paused, reduced, toggle } = useLandingMotion();
  return (
    <button
      className={className}
      type="button"
      onClick={toggle}
      disabled={reduced}
      aria-pressed={paused}
      aria-label={
        reduced
          ? "Reduced motion enabled"
          : paused
            ? "Resume animation"
            : "Pause animation"
      }
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" />
        {paused ? (
          <path d="m8 6 6 4-6 4Z" fill="currentColor" />
        ) : (
          <path d="M7 6h2v8H7zM11 6h2v8h-2z" fill="currentColor" />
        )}
      </svg>
      <span>
        {reduced ? "Motion off" : paused ? "Resume motion" : "Pause motion"}
      </span>
    </button>
  );
}
