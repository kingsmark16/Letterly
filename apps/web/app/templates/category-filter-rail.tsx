"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import styles from "./page.module.css";

export type CategoryIconName =
  | "all"
  | "anniversary"
  | "birthday"
  | "confession"
  | "just-because"
  | "thank-you";

export type CategoryFilterItem = {
  key: string;
  name: string;
  icon: CategoryIconName;
} & (
  | { unavailable: true; href?: never; selected?: never }
  | { unavailable?: false; href: string; selected: boolean }
);

type CategoryFilterRailProps = {
  items: readonly CategoryFilterItem[];
};

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";
const resumeDelayMs = 3000;
const scrollSpeedPixelsPerSecond = 14;

function CategoryIcon({ name }: { name: CategoryIconName }): React.JSX.Element {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      {name === "all" ? (
        <path d="M12 20.5S4.5 16.1 4.5 10.8A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.5 2.6c0 5.3-7.5 9.7-7.5 9.7Z" />
      ) : null}
      {name === "confession" ? (
        <>
          <path d="M3.5 5.5h17v13h-17z" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </>
      ) : null}
      {name === "birthday" ? (
        <>
          <path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" />
          <path d="M12 7H8.3a2.3 2.3 0 1 1 2.3-2.3C10.6 6 12 7 12 7Zm0 0h3.7a2.3 2.3 0 1 0-2.3-2.3C13.4 6 12 7 12 7Z" />
        </>
      ) : null}
      {name === "anniversary" ? (
        <>
          <circle cx="10" cy="13" r="5" />
          <circle cx="14" cy="13" r="5" />
          <path d="m8 6 2-3 2 3m0 0 2-3 2 3" />
        </>
      ) : null}
      {name === "thank-you" ? (
        <>
          <path d="M12 21V8m0 5c-4.5 0-7-2.5-7-6 4.5 0 7 2.5 7 6Zm0-3c4.5 0 7-2.5 7-6-4.5 0-7 2.5-7 6Z" />
          <path d="M12 17c-3 0-4.8-1.6-5.2-4.2M12 17c3 0 4.8-1.6 5.2-4.2" />
        </>
      ) : null}
      {name === "just-because" ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <circle cx="8" cy="9" r="1.5" />
          <path d="m4 18 5.5-5 3 2.5 2.5-2 5 4.5" />
        </>
      ) : null}
    </svg>
  );
}

function CategoryFilterOption({
  item,
}: {
  item: CategoryFilterItem;
}): React.JSX.Element {
  if (item.unavailable) {
    return (
      <span
        aria-disabled="true"
        aria-label={item.name + ", coming soon"}
        className={styles.categoryCardUnavailable}
      >
        <CategoryIcon name={item.icon} />
        <span>{item.name}</span>
        <small>Coming soon</small>
      </span>
    );
  }

  return (
    <Link
      aria-current={item.selected ? "page" : undefined}
      className={
        item.selected ? styles.categoryCardSelected : styles.categoryCard
      }
      href={item.href}
    >
      <CategoryIcon name={item.icon} />
      <span>{item.name}</span>
    </Link>
  );
}

export function CategoryFilterRail({
  items,
}: CategoryFilterRailProps): React.JSX.Element {
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const hoveredRef = useRef(false);
  const canAutoScrollRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const directionRef = useRef(1);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const scheduleResume = useCallback(() => {
    clearResumeTimer();
    if (!canAutoScrollRef.current || focusedRef.current || hoveredRef.current) {
      return;
    }

    resumeTimerRef.current = window.setTimeout(() => {
      resumeTimerRef.current = null;
      if (
        canAutoScrollRef.current &&
        !focusedRef.current &&
        !hoveredRef.current &&
        document.visibilityState === "visible"
      ) {
        setIsAutoScrolling(true);
      }
    }, resumeDelayMs);
  }, [clearResumeTimer]);

  const pauseForDirectInteraction = useCallback(() => {
    setIsAutoScrolling(false);
    scheduleResume();
  }, [scheduleResume]);

  const pauseForFocus = useCallback(() => {
    clearResumeTimer();
    setIsAutoScrolling(false);
  }, [clearResumeTimer]);

  const pauseForHover = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") return;
      hoveredRef.current = true;
      clearResumeTimer();
      setIsAutoScrolling(false);
    },
    [clearResumeTimer],
  );

  const resumeFromHover = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") return;
      hoveredRef.current = false;
      scheduleResume();
    },
    [scheduleResume],
  );

  const updateAvailability = useCallback(() => {
    const nav = navRef.current;
    const track = trackRef.current;
    if (!nav || !track) return;

    const maxScroll = nav.scrollWidth - nav.clientWidth;
    const prefersReducedMotion = window.matchMedia(reduceMotionQuery).matches;
    const canAnimate =
      maxScroll > 1 &&
      !prefersReducedMotion &&
      document.visibilityState === "visible";

    canAutoScrollRef.current = canAnimate;

    if (!canAnimate) {
      clearResumeTimer();
      setIsAutoScrolling(false);
      return;
    }

    if (
      !focusedRef.current &&
      !hoveredRef.current &&
      resumeTimerRef.current === null
    ) {
      setIsAutoScrolling(true);
    }
  }, [clearResumeTimer]);

  useEffect(() => {
    const nav = navRef.current;
    const track = trackRef.current;
    if (!nav || !track) return;

    const motionPreference = window.matchMedia(reduceMotionQuery);
    const observer = new ResizeObserver(updateAvailability);
    observer.observe(nav);
    observer.observe(track);
    motionPreference.addEventListener("change", updateAvailability);
    document.addEventListener("visibilitychange", updateAvailability);
    updateAvailability();

    return () => {
      observer.disconnect();
      motionPreference.removeEventListener("change", updateAvailability);
      document.removeEventListener("visibilitychange", updateAvailability);
      clearResumeTimer();
    };
  }, [clearResumeTimer, updateAvailability]);

  useEffect(() => {
    if (!isAutoScrolling) return;

    const nav = navRef.current;
    const track = trackRef.current;
    if (!nav || !track) return;

    let animationFrame = 0;
    let previousTime = 0;

    const moveRail = (time: number) => {
      const maxScroll = nav.scrollWidth - nav.clientWidth;
      if (
        maxScroll <= 1 ||
        !canAutoScrollRef.current ||
        document.visibilityState !== "visible"
      ) {
        setIsAutoScrolling(false);
        return;
      }

      if (previousTime === 0) previousTime = time;
      const elapsed = Math.min(time - previousTime, 48);
      previousTime = time;

      const distance = (elapsed * scrollSpeedPixelsPerSecond) / 1000;
      let nextScrollLeft = nav.scrollLeft + directionRef.current * distance;

      if (nextScrollLeft >= maxScroll) {
        nextScrollLeft = maxScroll;
        directionRef.current = -1;
      } else if (nextScrollLeft <= 0) {
        nextScrollLeft = 0;
        directionRef.current = 1;
      }

      nav.scrollLeft = nextScrollLeft;
      animationFrame = window.requestAnimationFrame(moveRail);
    };

    animationFrame = window.requestAnimationFrame(moveRail);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isAutoScrolling]);

  const handleFocusCapture = () => {
    focusedRef.current = true;
    pauseForFocus();
  };

  const handleBlurCapture = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }
    focusedRef.current = false;
    scheduleResume();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        " ",
      ].includes(event.key)
    ) {
      pauseForDirectInteraction();
    }
  };

  return (
    <nav
      aria-describedby="category-filter-scroll-hint"
      aria-label="Filter designs by category"
      className={styles.categoryNav}
      data-auto-scrolling={isAutoScrolling ? "true" : "false"}
      onBlurCapture={handleBlurCapture}
      onFocusCapture={handleFocusCapture}
      onKeyDown={handleKeyDown}
      onPointerDown={pauseForDirectInteraction}
      onPointerEnter={pauseForHover}
      onPointerLeave={resumeFromHover}
      onPointerMove={(event) => {
        if (event.buttons > 0) pauseForDirectInteraction();
      }}
      onTouchEnd={scheduleResume}
      onTouchMove={pauseForDirectInteraction}
      onTouchStart={pauseForDirectInteraction}
      onWheel={pauseForDirectInteraction}
      ref={navRef}
    >
      <span className="sr-only" id="category-filter-scroll-hint">
        Scroll horizontally to see all categories.
      </span>
      <div className={styles.categoryGrid} ref={trackRef}>
        {items.map((item) => (
          <CategoryFilterOption item={item} key={item.key} />
        ))}
      </div>
    </nav>
  );
}
