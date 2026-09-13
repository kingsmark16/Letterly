"use client";

/* React Bits exposes a typed props interface; runtime prop-types are not
   needed for this TypeScript-only component. */
/* eslint-disable react/prop-types */

import { motion, type Easing, type Transition } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

interface BlurTextProps {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: Easing | Easing[];
  onAnimationComplete?: () => void;
  stepDuration?: number;
  as?: "p" | "span" | "div";
  "aria-hidden"?: boolean;
}

const buildKeyframes = (
  from: Record<string, string | number>,
  steps: Array<Record<string, string | number>>,
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([
    ...Object.keys(from),
    ...steps.flatMap((s) => Object.keys(s)),
  ]);

  const keyframes: Record<string, Array<string | number>> = {};
  keys.forEach((k) => {
    const fallback = from[k] ?? 0;
    keyframes[k] = [fallback, ...steps.map((s) => s[k] ?? fallback)];
  });
  return keyframes;
};

const BlurText: React.FC<BlurTextProps> = ({
  text = "",
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = (t: number) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  as = "p",
  "aria-hidden": ariaHidden,
}) => {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");
  const [inView, setInView] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const ref = useRef<Element | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setReducedMotion(mediaQuery.matches);

    syncReducedMotion();
    mediaQuery.addEventListener("change", syncReducedMotion);
    return () => mediaQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.unobserve(target);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, y: -50 }
        : { filter: "blur(10px)", opacity: 0, y: 50 },
    [direction],
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: "blur(5px)",
        opacity: 0.5,
        y: direction === "top" ? 5 : -5,
      },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction],
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1),
  );
  const finalSnapshot = toSnapshots[toSnapshots.length - 1] ?? {};

  const content = elements.map((segment, index) => {
    const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);

    const spanTransition: Transition = {
      duration: totalDuration,
      times,
      delay: (index * delay) / 1000,
      ease: easing,
    };

    return (
      <motion.span
        key={index}
        initial={
          reducedMotion ? finalSnapshot : hasMounted ? fromSnapshot : false
        }
        animate={
          reducedMotion
            ? finalSnapshot
            : inView
              ? animateKeyframes
              : hasMounted
                ? fromSnapshot
                : undefined
        }
        transition={reducedMotion ? { duration: 0 } : spanTransition}
        onAnimationComplete={
          index === elements.length - 1 ? onAnimationComplete : undefined
        }
        style={{
          display: "inline-block",
          willChange: reducedMotion ? undefined : "transform, filter, opacity",
        }}
      >
        {segment === " " ? "\u00A0" : segment}
        {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
      </motion.span>
    );
  });

  const setObserverTarget = (node: Element | null) => {
    ref.current = node;
  };

  const sharedProps = {
    ref: setObserverTarget,
    className: `blur-text ${className} flex flex-wrap`,
    ...(ariaHidden === undefined ? {} : { "aria-hidden": ariaHidden }),
  };

  if (as === "span") {
    return <span {...sharedProps}>{content}</span>;
  }

  if (as === "div") {
    return <div {...sharedProps}>{content}</div>;
  }

  return <p {...sharedProps}>{content}</p>;
};

export default BlurText;
