"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./template-showcase.module.css";

type TemplateCarouselProps = {
  itemCount: number;
  children: ReactNode;
};

export function TemplateCarousel({
  itemCount,
  children,
}: TemplateCarouselProps): React.JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  const checkScroll = useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;
    const scrollLeft = element.scrollLeft;
    const maxScroll = element.scrollWidth - element.clientWidth;
    if (maxScroll <= 0) {
      setActiveIndex(0);
      return;
    }
    const progress = Math.min(1, Math.max(0, scrollLeft / maxScroll));
    const index = Math.round(progress * (itemCount - 1));
    setActiveIndex(index);
  }, [itemCount]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    checkScroll();
    element.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const element = viewportRef.current;
      if (!element) return;
      const maxScroll = element.scrollWidth - element.clientWidth;
      const targetScroll =
        maxScroll > 0 ? (index / Math.max(1, itemCount - 1)) * maxScroll : 0;
      element.scrollTo({ left: targetScroll, behavior: "smooth" });
      setActiveIndex(index);
      const cards = element.querySelectorAll("li");
      const targetCard = cards[index];
      const article = targetCard?.querySelector("article");
      if (article) {
        article.dispatchEvent(
          new PointerEvent("pointerover", { bubbles: true }),
        );
      }
    },
    [itemCount],
  );

  const handlePrev = useCallback(() => {
    const prev = activeIndex > 0 ? activeIndex - 1 : itemCount - 1;
    scrollToIndex(prev);
  }, [activeIndex, itemCount, scrollToIndex]);

  const handleNext = useCallback(() => {
    const next = activeIndex < itemCount - 1 ? activeIndex + 1 : 0;
    scrollToIndex(next);
  }, [activeIndex, itemCount, scrollToIndex]);

  // Touch and mouse drag interaction
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a")) return;
    const element = viewportRef.current;
    if (!element) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = element.scrollLeft;
    setIsPaused(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const element = viewportRef.current;
    if (!element) return;
    const deltaX = e.clientX - startXRef.current;
    element.scrollLeft = startScrollLeftRef.current - deltaX;
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsPaused(false);
    checkScroll();
  }, [checkScroll]);

  useEffect(() => {
    if (isPaused || itemCount <= 1) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const timer = setInterval(() => {
      const element = viewportRef.current;
      if (!element) return;
      if (element.scrollWidth <= element.clientWidth) return;

      setActiveIndex((current) => {
        const next = (current + 1) % itemCount;
        const maxScroll = element.scrollWidth - element.clientWidth;
        const targetScroll =
          maxScroll > 0 ? (next / Math.max(1, itemCount - 1)) * maxScroll : 0;
        element.scrollTo({ left: targetScroll, behavior: "smooth" });
        return next;
      });
    }, 4200);

    return () => clearInterval(timer);
  }, [isPaused, itemCount]);

  return (
    <div
      className={styles.carouselContainer}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      {itemCount > 1 ? (
        <button
          type="button"
          className={`${styles.carouselNavButton} ${styles.carouselNavPrev}`}
          onClick={handlePrev}
          aria-label="Previous template design"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      <div
        ref={viewportRef}
        className={styles.carouselViewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>

      {itemCount > 1 ? (
        <button
          type="button"
          className={`${styles.carouselNavButton} ${styles.carouselNavNext}`}
          onClick={handleNext}
          aria-label="Next template design"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7.5 5L12.5 10L7.5 15"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      {itemCount > 1 ? (
        <div
          className={styles.carouselPagination}
          role="tablist"
          aria-label="Template design slides"
        >
          {Array.from({ length: itemCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`View design ${index + 1}`}
              className={`${styles.carouselDot} ${
                index === activeIndex ? styles.carouselDotActive : ""
              }`}
              onClick={() => scrollToIndex(index)}
            >
              <span className={styles.carouselDotInner} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
