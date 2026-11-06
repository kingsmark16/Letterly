"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState, type ReactNode } from "react";
import { DecorativeCanvas } from "./decorative-canvas";
import { useLandingMotion } from "./landing-motion";
import styles from "./template-card-border.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function TemplateCardEffects({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { paused } = useLandingMotion();

  useGSAP(
    () => {
      const gallery = root.current;
      const overlay = light.current;
      if (!gallery || !overlay || paused) return;
      const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
      const cards = Array.from(
        gallery.querySelectorAll<HTMLElement>("[data-template-card]"),
      );
      const reveals = new Map<HTMLElement, gsap.core.Timeline>();
      let active: HTMLElement | null = null;
      let hovered: HTMLElement | null = null;
      for (const card of cards) {
        const frame = card.querySelector("[data-card-border]");
        const trace = card.querySelector("[data-card-trace]");
        reveals.set(
          card,
          gsap
            .timeline({ paused: true, defaults: { ease: "power2.out" } })
            .fromTo(
              trace,
              { strokeDashoffset: 1, opacity: 0 },
              {
                strokeDashoffset: 0,
                opacity: 1,
                duration: 1.1,
                immediateRender: false,
              },
            )
            .fromTo(
              frame,
              { scale: 0.99 },
              { scale: 1.008, duration: 0.5, immediateRender: false },
              0,
            )
            .to(frame, { scale: 1, duration: 0.5 }, 0.5)
            .to(trace, { opacity: 0, duration: 0.5 }, 1.4),
        );
      }
      const position = () => {
        if (!active) return;
        const container = gallery.getBoundingClientRect();
        const card = active.getBoundingClientRect();
        Object.assign(overlay.style, {
          left: `${card.left - container.left - 6}px`,
          top: `${card.top - container.top - 6}px`,
          width: `${card.width + 12}px`,
          height: `${card.height + 12}px`,
        });
      };
      const activate = (card: HTMLElement | null) => {
        if (active === card) return;
        if (active) {
          delete active.dataset.borderActive;
          reveals.get(active)?.progress(1).pause();
        }
        active = card;
        if (card) {
          card.dataset.borderActive = "true";
          position();
          reveals.get(card)?.restart();
        }
        setActiveKey(card?.dataset.templateCard ?? null);
      };
      const findCard = (target: EventTarget | null): HTMLElement | null => {
        const card =
          target instanceof Element
            ? target.closest<HTMLElement>("[data-template-card]")
            : null;
        return card && gallery.contains(card) ? card : null;
      };
      const over = (event: PointerEvent) => {
        hovered = findCard(event.target);
        if (hovered) activate(hovered);
      };
      const out = (event: PointerEvent) => {
        hovered = findCard(event.relatedTarget);
        activate(hovered ?? findCard(document.activeElement));
      };
      const focus = (event: FocusEvent) => activate(findCard(event.target));
      const blur = (event: FocusEvent) =>
        activate(findCard(event.relatedTarget) ?? hovered);
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const card = entry.target as HTMLElement;
            reveals.get(card)?.restart();
            observer.unobserve(card);
          }
        },
        { threshold: 0.2 },
      );
      cards.forEach((card) => observer.observe(card));
      const resize = new ResizeObserver(position);
      resize.observe(gallery);
      const suspended = new Set<gsap.core.Timeline>();
      const visibility = () => {
        if (document.hidden) {
          reveals.forEach((animation) => {
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
      gallery.addEventListener("pointerover", over);
      gallery.addEventListener("pointerout", out);
      gallery.addEventListener("focusin", focus);
      gallery.addEventListener("focusout", blur);
      document.addEventListener("visibilitychange", visibility);
      return () => {
        cancelAnimationFrame(refresh);
        observer.disconnect();
        resize.disconnect();
        gallery.removeEventListener("pointerover", over);
        gallery.removeEventListener("pointerout", out);
        gallery.removeEventListener("focusin", focus);
        gallery.removeEventListener("focusout", blur);
        document.removeEventListener("visibilitychange", visibility);
        if (active) delete active.dataset.borderActive;
        setActiveKey(null);
      };
    },
    { scope: root, dependencies: [paused], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={styles.gallery} data-template-effects>
      {children}
      <div
        ref={light}
        className={styles.light}
        aria-hidden="true"
        data-card-light={activeKey ?? undefined}
      >
        <DecorativeCanvas
          effect="card"
          enabled={activeKey !== null}
          className={styles.canvas}
        />
      </div>
    </div>
  );
}
