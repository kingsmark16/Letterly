"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import birthdayStyles from "./renderer.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

type BirthdayWishFirstSectionProps = {
  letterTitle: string;
  recipientName?: string;
  heroActions?: ReactNode;
  headingId?: string;
  staticWordmark?: boolean;
  storyId?: string;
  onRelightCandles?: () => void;
};

const WISH_BLESSINGS = [
  "May your brightest days this year outshine every year before.",
  "Here is to spontaneous adventures, deep laughter, and golden evenings.",
  "May every quiet wish you make today find its way to you.",
  "To health, fierce joy, and people who celebrate you endlessly.",
] as const;

type ParticleType = "ribbon" | "star" | "disc" | "spark";

interface CelebrateParticle {
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  drag: number;
  gravity: number;
  color: string;
  highlightColor: string;
  size: number;
  length: number;
  rotation: number;
  vRot: number;
  flip: number;
  vFlip: number;
  wobblePhase: number;
  wobbleSpeed: number;
  alpha: number;
  life: number;
  maxLife: number;
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: CelebrateParticle,
): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);

  switch (p.type) {
    case "ribbon": {
      const flipScale = Math.cos(p.flip);
      ctx.scale(flipScale, 1);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = flipScale > 0 ? p.color : p.highlightColor;
      ctx.fillRect(-p.size / 2, -p.length / 2, p.size, p.length);
      break;
    }
    case "star": {
      const twinkle = 0.8 + Math.sin(p.wobblePhase * 2.5) * 0.2;
      ctx.globalAlpha = Math.max(0, p.alpha * twinkle);
      const r = p.size;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.closePath();
      ctx.fill();

      // Gleaming white diamond center
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "disc": {
      ctx.globalAlpha = p.alpha * 0.8;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, p.highlightColor);
      grad.addColorStop(0.7, p.color);
      grad.addColorStop(1, "rgba(212, 155, 59, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "spark": {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function spawnCelebrationWave(
  particles: CelebrateParticle[],
  originX: number,
  originY: number,
  count: number,
  isSecondary: boolean,
): void {
  const colors = [
    { base: "#ffd97d", highlight: "#fff6de" },
    { base: "#f5c469", highlight: "#fffaef" },
    { base: "#eab04e", highlight: "#fff2d1" },
    { base: "#d49b3b", highlight: "#fff8e6" },
    { base: "#c2591a", highlight: "#ffd4aa" },
    { base: "#9e2344", highlight: "#ff99b3" },
    { base: "#ffffff", highlight: "#fff3cc" },
  ];

  for (let i = 0; i < count; i++) {
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];
    const colorPair = chosenColor ?? {
      base: "#f5c469",
      highlight: "#ffffff",
    };
    const randType = Math.random();
    const type: ParticleType =
      randType < 0.44
        ? "ribbon"
        : randType < 0.72
          ? "star"
          : randType < 0.88
            ? "disc"
            : "spark";

    // Launch angle: fountain blast upwards and fanning outwards across the spread
    const angleSpread = isSecondary
      ? -Math.PI * 0.98 + Math.random() * Math.PI * 0.96
      : -Math.PI * 0.92 + Math.random() * Math.PI * 0.84;
    const speed = isSecondary
      ? 4.5 + Math.random() * 9.5
      : 6.5 + Math.random() * 12.5;

    const size =
      type === "ribbon"
        ? 4 + Math.random() * 3.5
        : type === "star"
          ? 5 + Math.random() * 5.5
          : type === "disc"
            ? 3.5 + Math.random() * 5
            : 1.5 + Math.random() * 2;

    const length = type === "ribbon" ? 10 + Math.random() * 9 : size;

    // Lifespan: between 210 and 270 frames (3.5 to 4.5 seconds of floating celebration)
    const maxLife = isSecondary
      ? 200 + Math.random() * 60
      : 220 + Math.random() * 60;

    particles.push({
      type,
      x: originX + (Math.random() - 0.5) * 18,
      y: originY + (Math.random() - 0.5) * 10,
      vx: Math.cos(angleSpread) * speed,
      vy: Math.sin(angleSpread) * speed,
      drag: type === "ribbon" ? 0.986 : type === "star" ? 0.988 : 0.982,
      gravity: type === "ribbon" ? 0.12 : type === "star" ? 0.1 : 0.15,
      color: colorPair.base,
      highlightColor: colorPair.highlight,
      size,
      length,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.12,
      flip: Math.random() * Math.PI * 2,
      vFlip: (Math.random() - 0.5) * 0.22,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.04 + Math.random() * 0.06,
      alpha: 1,
      life: 0,
      maxLife,
    });
  }
}

function PatisserieCrestIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.5c1.4 1.8 2 3.1 2 4.2a2 2 0 1 1-4 0c0-1.1.6-2.4 2-4.2Z" />
      <path d="M5 14h14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5Z" />
      <path d="M7.5 10h9v4h-9z" />
      <path d="M3.5 19h17" />
    </svg>
  );
}

function SunburstIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 1.8 11.9 7l5.3 1.9-5.3 1.9L10 16l-1.9-5.2L2.8 8.9 8.1 7 10 1.8Z" />
    </svg>
  );
}

export function BirthdayWishFirstSection({
  letterTitle,
  recipientName,
  heroActions,
  headingId = "hero-heading",
  staticWordmark = false,
  storyId = "birthday-story",
  onRelightCandles,
}: BirthdayWishFirstSectionProps): React.JSX.Element {
  const sectionScopeRef = useRef<HTMLDivElement>(null);
  const celebrateBtnRef = useRef<HTMLButtonElement>(null);
  const celebrateCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<CelebrateParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const waveTimeoutsRef = useRef<number[]>([]);
  const [wishCount, setWishCount] = useState(1);

  const cleanRecipient = recipientName?.trim();
  const activeBlessing =
    WISH_BLESSINGS[(wishCount - 1) % WISH_BLESSINGS.length];

  const { contextSafe } = useGSAP({ scope: sectionScopeRef });

  const runAnimation = useCallback((): void => {
    const canvas = celebrateCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!p) continue;
      p.life += 1;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.wobblePhase += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobblePhase) * 1.3;
      p.y += p.vy;
      p.rotation += p.vRot;
      p.flip += p.vFlip;

      const progress = p.life / p.maxLife;
      p.alpha = progress > 0.72 ? Math.max(0, (1 - progress) / 0.28) : 1;

      if (p.life >= p.maxLife || p.y > height + 50) {
        particles.splice(i, 1);
        continue;
      }

      drawParticle(ctx, p);
    }

    ctx.restore();

    if (particles.length > 0) {
      animFrameRef.current = requestAnimationFrame(runAnimation);
    } else {
      animFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    const canvas = celebrateCanvasRef.current;
    const container = sectionScopeRef.current;
    if (!canvas || !container) return;

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const timeouts = waveTimeoutsRef.current;

    return () => {
      ro.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const triggerConfettiBurst = contextSafe((): void => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const btn = celebrateBtnRef.current;
    const canvas = celebrateCanvasRef.current;
    if (!canvas) return;

    // 1. Tactile Button Elastic Bounce and Radial Ripple Pulse
    if (btn) {
      const icon = btn.querySelector("svg");
      gsap
        .timeline()
        .to(btn, {
          scale: 0.86,
          boxShadow:
            "0 0 0 0px rgba(245, 196, 105, 0.9), 0 2px 8px rgba(212, 155, 59, 0.2)",
          duration: 0.08,
          ease: "power2.in",
        })
        .to(btn, {
          scale: 1.15,
          boxShadow:
            "0 0 0 20px rgba(245, 196, 105, 0), 0 12px 28px rgba(212, 155, 59, 0.45)",
          duration: 0.24,
          ease: "back.out(2.4)",
        })
        .to(btn, {
          scale: 1,
          boxShadow: "0 6px 18px rgba(212, 155, 59, 0.28)",
          duration: 0.28,
          ease: "power2.out",
          clearProps: "transform,boxShadow",
        });

      if (icon) {
        gsap.fromTo(
          icon,
          { rotation: 0, scale: 1 },
          {
            rotation: 720,
            scale: 1.35,
            duration: 0.65,
            ease: "power2.out",
            clearProps: "transform",
          },
        );
      }
    }

    // 2. Sparkle Starburst on the Hero Headline Accent (✦)
    const titleAccent =
      sectionScopeRef.current?.querySelector<HTMLElement>(`[data-hero-accent]`);
    if (titleAccent) {
      gsap.fromTo(
        titleAccent,
        { scale: 0.8, rotation: -45, color: "#ffffff" },
        {
          scale: 1.65,
          rotation: 360,
          color: "#f5c469",
          duration: 0.85,
          ease: "back.out(2.4)",
          clearProps: "transform,color",
        },
      );
    }

    // 3. Playful Celebratory Pulse on the Wish Dial Medallion
    const dialOrbit = sectionScopeRef.current?.querySelector<HTMLElement>(
      `[data-medallion-orbit]`,
    );
    if (dialOrbit) {
      gsap.fromTo(
        dialOrbit,
        { scale: 0.94 },
        {
          scale: 1.07,
          duration: 0.36,
          ease: "back.out(2)",
          yoyo: true,
          repeat: 1,
          clearProps: "transform",
        },
      );
    }

    // 4. Multi-Wave Extended Particle Fountain (4+ Seconds of Tumbling Gold)
    const canvasRect = canvas.getBoundingClientRect();
    const btnRect = btn?.getBoundingClientRect();
    const originX = btnRect
      ? btnRect.left + btnRect.width / 2 - canvasRect.left
      : canvasRect.width / 2;
    const originY = btnRect
      ? btnRect.top + btnRect.height / 2 - canvasRect.top
      : 40;

    // Wave 1: Immediate Fountain Arc
    spawnCelebrationWave(particlesRef.current, originX, originY, 52, false);

    // Wave 2: Wider Secondary Flare (+200ms)
    const t1 = window.setTimeout(() => {
      spawnCelebrationWave(
        particlesRef.current,
        originX - 12,
        originY,
        42,
        true,
      );
      if (animFrameRef.current === null) {
        animFrameRef.current = requestAnimationFrame(runAnimation);
      }
    }, 200);

    // Wave 3: Floating Starry Cascade (+440ms)
    const t2 = window.setTimeout(() => {
      spawnCelebrationWave(
        particlesRef.current,
        originX + 12,
        originY,
        36,
        true,
      );
      if (animFrameRef.current === null) {
        animFrameRef.current = requestAnimationFrame(runAnimation);
      }
    }, 440);

    waveTimeoutsRef.current.push(t1, t2);

    if (animFrameRef.current === null) {
      animFrameRef.current = requestAnimationFrame(runAnimation);
    }
  });

  const handleMakeExtraWish = contextSafe((): void => {
    setWishCount((prev) => prev + 1);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sparks = sectionScopeRef.current?.querySelectorAll<HTMLElement>(
      "[data-medallion-spark]",
    );
    const orbit = sectionScopeRef.current?.querySelector<HTMLElement>(
      "[data-medallion-orbit]",
    );

    if (orbit) {
      gsap.fromTo(
        orbit,
        { scale: 0.92 },
        {
          scale: 1,
          duration: 0.48,
          ease: "back.out(2.1)",
          overwrite: true,
        },
      );
    }

    sparks?.forEach((spark, index) => {
      const angle = (index / sparks.length) * Math.PI * 2;
      const radius = 48 + (index % 2) * 14;
      gsap.fromTo(
        spark,
        { opacity: 1, x: 0, y: 0, scale: 0.4 },
        {
          opacity: 0,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          scale: 1.35,
          duration: 0.72,
          ease: "power2.out",
          overwrite: true,
        },
      );
    });
  });

  const wordmarkContent = (
    <>
      <PatisserieCrestIcon />
      <span>{letterTitle}</span>
    </>
  );

  return (
    <div ref={sectionScopeRef} className={birthdayStyles.heroSectionWrapper}>
      <div className={birthdayStyles.confettiStageLayer} aria-hidden="true">
        <canvas
          ref={celebrateCanvasRef}
          className={birthdayStyles.celebrateCanvas}
          aria-hidden="true"
        />
      </div>

      <header className={birthdayStyles.marqueeHeader} data-bw-header>
        <div className={birthdayStyles.marqueeBrandGroup}>
          <span className={birthdayStyles.editionPill}>Birthday Edition</span>
          {staticWordmark ? (
            <span className={birthdayStyles.wordmark}>{wordmarkContent}</span>
          ) : (
            <a
              className={birthdayStyles.wordmark}
              href={`#${storyId}`}
              aria-label={`${letterTitle}. Go to the beginning`}
            >
              {wordmarkContent}
            </a>
          )}
        </div>

        <div className={birthdayStyles.marqueeControls}>
          <button
            ref={celebrateBtnRef}
            type="button"
            className={birthdayStyles.celebrateButton}
            onClick={triggerConfettiBurst}
          >
            <SunburstIcon />
            <span>Celebrate</span>
          </button>
          {onRelightCandles ? (
            <button
              type="button"
              className={birthdayStyles.relightButton}
              onClick={onRelightCandles}
            >
              <span>Relight Candles</span>
            </button>
          ) : null}
        </div>
      </header>

      <section
        id={storyId}
        className={birthdayStyles.birthdayHero}
        aria-labelledby={headingId}
      >
        <div
          className={birthdayStyles.heroEditorialColumn}
          data-bw-hero-editorial
        >
          <p className={birthdayStyles.heroBadge}>
            <SunburstIcon />
            <span>Solar Return · Personal Keepsake</span>
          </p>
          <h2 id={headingId} className={birthdayStyles.heroDisplayTitle}>
            Happy Birthday
            {cleanRecipient ? `, ${cleanRecipient}` : ""}
            <span
              className={birthdayStyles.heroDisplayAccent}
              aria-hidden="true"
              data-hero-accent
            >
              ✦
            </span>
          </h2>
          <p className={birthdayStyles.heroLead}>
            Another trip around the sun, celebrated with the stories, warmth,
            and bright moments that make this chapter unmistakably yours.
          </p>
          {heroActions ? (
            <div className={birthdayStyles.heroSoundtrackSlot}>
              {heroActions}
            </div>
          ) : null}
        </div>

        <aside
          className={birthdayStyles.heroMedallionCard}
          data-bw-hero-medallion
          aria-label="Interactive birthday wish counter"
        >
          <p className={birthdayStyles.medallionKicker}>
            Golden Hour Wish Dial
          </p>
          <div className={birthdayStyles.medallionOrbit} data-medallion-orbit>
            <div
              className={birthdayStyles.medallionSparkBurst}
              aria-hidden="true"
            >
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className={birthdayStyles.medallionSparkDot}
                  data-medallion-spark
                />
              ))}
            </div>
            <div>
              <p
                className={birthdayStyles.medallionCountValue}
                aria-live="polite"
              >
                {wishCount}
              </p>
              <p className={birthdayStyles.medallionCountLabel}>
                {wishCount === 1 ? "Wish Sealed" : "Wishes Sealed"}
              </p>
            </div>
          </div>
          <p className={birthdayStyles.medallionWishText}>{activeBlessing}</p>
          <button
            type="button"
            className={birthdayStyles.medallionTriggerBtn}
            onClick={handleMakeExtraWish}
          >
            <SunburstIcon />
            <span>Add a Birthday Wish</span>
          </button>
        </aside>
      </section>
    </div>
  );
}
