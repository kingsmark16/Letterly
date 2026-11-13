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

  const checkScroll = useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;
    const firstCard = element.querySelector("li");
    const cardWidth = (firstCard?.offsetWidth ?? 310) + 24;
    const index = Math.round(element.scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(itemCount - 1, index)));
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

  const scrollToIndex = useCallback((index: number) => {
    const element = viewportRef.current;
    if (!element) return;
    const cards = element.querySelectorAll("li");
    const targetCard = cards[index];
    if (targetCard) {
      const targetLeft = targetCard.offsetLeft - element.offsetLeft;
      element.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
      setActiveIndex(index);
    }
  }, []);

  const handlePrev = useCallback(() => {
    const prev = activeIndex > 0 ? activeIndex - 1 : itemCount - 1;
    scrollToIndex(prev);
  }, [activeIndex, itemCount, scrollToIndex]);

  const handleNext = useCallback(() => {
    const next = activeIndex < itemCount - 1 ? activeIndex + 1 : 0;
    scrollToIndex(next);
  }, [activeIndex, itemCount, scrollToIndex]);

  return (
    <div className={styles.carouselContainer}>
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

      <div ref={viewportRef} className={styles.carouselViewport}>
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
        <div className={styles.carouselFooter}>
          <div className={styles.carouselFlourish} aria-hidden="true">
            <span className={styles.flourishText}>
              Small templates. Big feelings.
            </span>
            <svg
              className={styles.flourishHeart}
              width="44"
              height="28"
              viewBox="0 0 54 32"
              fill="none"
            >
              <path
                d="M2 18 C 14 26, 24 28, 30 20 C 34 14, 34 6, 27 6 C 21 6, 19 12, 24 18 C 30 24, 40 28, 52 14"
                stroke="var(--landing-orange)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
            </svg>
          </div>

          <a href="#templates" className={styles.browseAllButton}>
            Browse All Templates <span aria-hidden="true">→</span>
          </a>

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
        </div>
      ) : null}
    </div>
  );
}
