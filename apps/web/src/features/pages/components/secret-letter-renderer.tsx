"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SecretLetterRenderModel } from "@letterly/templates";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

interface SecretLetterRendererProps {
  model: SecretLetterRenderModel;
  preview?: boolean;
}

export function SecretLetterRenderer({
  model,
  preview = false,
}: SecretLetterRendererProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [opened, setOpened] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReduceMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useGSAP(
    () => {
      const envelope =
        rootRef.current?.querySelector<HTMLElement>("[data-envelope]");
      const sections = rootRef.current
        ? Array.from(
            rootRef.current.querySelectorAll<HTMLElement>(
              "[data-letter-section]",
            ),
          )
        : [];

      if (!envelope) {
        return;
      }

      const systemReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion || systemReducedMotion) {
        gsap.set(envelope, { clearProps: "all" });
        gsap.set(sections, { clearProps: "all" });
        timelineRef.current = null;
        return;
      }

      const timeline = gsap.timeline({ paused: true });
      timeline
        .to(envelope, {
          duration: 0.55,
          y: -8,
          rotation: -1,
          ease: "power2.out",
        })
        .to(
          envelope,
          {
            duration: 0.8,
            scale: 0.98,
            opacity: 0.94,
            ease: "power2.inOut",
          },
          "<",
        )
        .to(envelope, {
          duration: 0.9,
          y: -18,
          rotation: 0,
          scale: 0.96,
          opacity: 0.72,
          ease: "power3.out",
        });

      timelineRef.current = timeline;

      sections.forEach((section) => {
        gsap.fromTo(
          section,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 84%",
              once: true,
            },
          },
        );
      });

      return () => {
        timelineRef.current = null;
      };
    },
    { scope: rootRef, dependencies: [reduceMotion] },
  );

  function focusLetterHeading(): void {
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function openLetter(): void {
    setOpened(true);
    timelineRef.current?.play(0);
    focusLetterHeading();
  }

  function replayOpening(): void {
    setOpened(false);
    timelineRef.current?.restart();
    window.setTimeout(() => {
      setOpened(true);
      focusLetterHeading();
    }, 40);
  }

  function skipOpening(): void {
    setOpened(true);
    timelineRef.current?.progress(1).pause();
    focusLetterHeading();
  }

  return (
    <div
      ref={rootRef}
      data-preview={preview || undefined}
      className="min-h-screen overflow-hidden bg-canvas text-ink"
    >
      <a
        className="sr-only z-50 rounded-small bg-surface px-4 py-3 text-wine focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#letter-content"
      >
        Skip to letter
      </a>

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-7 lg:px-8">
        <Link
          className="font-display text-3xl font-semibold tracking-tight"
          href="/"
        >
          letterly
        </Link>
        <p className="text-small text-ink-muted">
          A private letter, shared with care
        </p>
      </header>

      <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 pb-9 sm:px-7 lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)] lg:gap-9 lg:px-8">
        <section className="flex flex-col justify-center gap-5 py-8 lg:sticky lg:top-0 lg:min-h-screen lg:py-9">
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
            Something meant to be kept
          </p>
          <h1 className="max-w-[12ch] font-display text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            A letter for someone special.
          </h1>
          <p className="max-w-md text-body-large leading-relaxed text-ink-muted">
            Take a quiet moment. The words are here when you are ready to read
            them.
          </p>

          <div
            className="relative mt-5 flex min-h-64 items-center justify-center overflow-hidden rounded-large border border-border bg-surface-muted p-6 shadow-low sm:min-h-72"
            data-envelope
          >
            <div className="absolute inset-x-7 top-1/2 h-32 -translate-y-1/2 rounded-medium border border-border bg-surface shadow-medium will-change-transform" />
            <div className="absolute inset-x-7 top-1/2 h-32 -translate-y-1/2 origin-top border-x border-b border-border bg-surface-muted [clip-path:polygon(0_0,50%_54%,100%_0,100%_100%,0_100%)]" />
            <div
              className="relative z-10 grid size-16 place-items-center rounded-full border border-rose bg-wine font-display text-2xl text-surface shadow-low"
              aria-hidden="true"
            >
              L
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface transition hover:bg-wine-hover disabled:cursor-wait disabled:opacity-60"
              type="button"
              onClick={openLetter}
              disabled={opened}
            >
              {opened ? "Letter opened" : "Open your letter"}
            </button>
            <button
              className="min-h-11 rounded-medium border border-border bg-surface px-4 py-3 text-small font-bold text-ink transition hover:border-wine hover:text-wine"
              type="button"
              onClick={replayOpening}
            >
              Replay opening
            </button>
            <button
              className="min-h-11 rounded-medium border border-border bg-surface px-4 py-3 text-small font-bold text-ink transition hover:border-wine hover:text-wine"
              type="button"
              onClick={skipOpening}
            >
              Skip animation
            </button>
          </div>

          <label className="flex min-h-11 items-center gap-3 text-small text-ink-muted">
            <input
              className="size-4 accent-wine"
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
            />
            Reduce motion
          </label>
        </section>

        <article
          id="letter-content"
          className="rounded-large border border-border bg-surface px-5 py-7 shadow-medium sm:px-7 lg:my-9 lg:px-8"
        >
          <p className="mb-3 text-label font-bold uppercase tracking-[0.14em] text-wine">
            Secret Letter
          </p>
          <h2
            ref={headingRef}
            className="mb-7 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
            tabIndex={-1}
          >
            For {model.recipientName}
          </h2>
          <div className="h-px bg-border" />
          <div className="pt-7" data-letter-section>
            <p className="whitespace-pre-wrap text-body-large leading-[1.8] text-ink">
              {model.mainMessage}
            </p>
          </div>
          {model.images.map((image) => (
            <figure
              key={image.imageId}
              className="mt-8 overflow-hidden rounded-medium border border-border bg-surface-muted"
              data-letter-section
            >
              {failedImageIds.has(image.imageId) ? (
                <div
                  className="grid min-h-48 place-items-center px-6 py-10 text-center text-small text-ink-muted"
                  aria-hidden="true"
                >
                  This image is unavailable right now.
                </div>
              ) : (
                <Image
                  className="block max-h-[42rem] w-full object-contain"
                  src={image.mediaUrl}
                  alt=""
                  width={1200}
                  height={900}
                  sizes="(max-width: 768px) 100vw, 720px"
                  unoptimized
                  decoding="async"
                  onError={() =>
                    setFailedImageIds((current) => {
                      const next = new Set(current);
                      next.add(image.imageId);
                      return next;
                    })
                  }
                />
              )}
              {image.caption ? (
                <figcaption className="border-t border-border px-5 py-3 text-small leading-relaxed text-ink-muted">
                  {image.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
          <footer className="mt-9 border-t border-border pt-6 text-small text-ink-muted">
            Create your own letter on Letterly
          </footer>
        </article>
      </div>
    </div>
  );
}
