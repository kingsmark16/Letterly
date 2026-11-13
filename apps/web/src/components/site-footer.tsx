"use client";

import { useState, useCallback, type ReactNode, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import appLogo from "../../assets/images/app-logo.png";
import styles from "./site-footer.module.css";

export interface SiteFooterProps {
  bottom: ReactNode;
  links: ReactNode;
  navigationLabel: string;
  interactive?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  char: string;
}

const INSPIRATION_QUOTES = [
  {
    quote: "Between every two souls, there is a letter waiting to be written.",
    category: "COURAGE",
  },
  {
    quote: "Some feelings are simply too vast for an ordinary text message.",
    category: "DEPTH",
  },
  {
    quote: "A little courage today becomes a keepsake to cherish forever.",
    category: "DEVOTION",
  },
  {
    quote: "Words written with genuine feeling never truly fade away.",
    category: "REMEMBRANCE",
  },
  {
    quote: "Speak what your heart has been holding in the quiet hours.",
    category: "INTENTION",
  },
];

const MOOD_TAGS = [
  { label: "Secret confession", href: "#templates", icon: "💌" },
  { label: "Birthday wish", href: "#templates", icon: "🎂" },
  { label: "Quiet gratitude", href: "#templates", icon: "🕊️" },
  { label: "Heartfelt apology", href: "#templates", icon: "🌹" },
  { label: "Cherished memory", href: "#templates", icon: "🕯️" },
];

export function SiteFooter({
  bottom,
  links,
  navigationLabel,
  interactive = false,
}: SiteFooterProps): React.JSX.Element {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [activeQuote, setActiveQuote] = useState(0);
  const [stamping, setStamping] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [moodToast, setMoodToast] = useState<string | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleStamp = useCallback(() => {
    setStamping(true);
    setActiveQuote((prev) => (prev + 1) % INSPIRATION_QUOTES.length);

    const chars = ["♥", "✦", "❦", "♡", "✨", "♥"];
    const newParticles: Particle[] = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * (360 / 6) + Math.random() * 20) * (Math.PI / 180);
      const distance = 40 + Math.random() * 45;
      return {
        id: Date.now() + i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        char: chars[i % chars.length] ?? "♥",
      };
    });
    setParticles(newParticles);

    window.setTimeout(() => {
      setStamping(false);
    }, 450);

    window.setTimeout(() => {
      setParticles([]);
    }, 950);
  }, []);

  const handleMoodClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, label: string) => {
      setMoodToast(`Ready for: ${label}`);
      window.setTimeout(() => {
        setMoodToast(null);
      }, 2500);
    },
    [],
  );

  const scrollToTop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  if (!interactive) {
    return (
      <footer className={styles.footer}>
        <div className={styles.lead}>
          <Link aria-label="Letterly home" className={styles.wordmark} href="/">
            <Image
              alt=""
              aria-hidden="true"
              className={styles.logo}
              sizes="(max-width: 48rem) 3.5rem, 3.75rem"
              src={appLogo}
            />
          </Link>
          <p>A place for the words that matter.</p>
        </div>

        <nav aria-label={navigationLabel} className={styles.links}>
          {links}
        </nav>

        <div className={styles.bottom}>{bottom}</div>
      </footer>
    );
  }

  const currentQuote =
    INSPIRATION_QUOTES[activeQuote] ?? INSPIRATION_QUOTES[0]!;

  return (
    <footer className={`${styles.footer} ${styles.interactiveFooter}`}>
      {/* Top Ornate Ribbon Divider */}
      <div className={styles.topDivider} aria-hidden="true">
        <div className={styles.dividerLine} />
        <div className={styles.dividerEmblem}>
          <span className={styles.flourishWing}>❦</span>
          <span className={styles.sealHeart}>♥</span>
          <span className={styles.flourishWing}>❦</span>
        </div>
        <div className={styles.dividerLine} />
      </div>

      {/* Main Interactive Stage */}
      <div className={styles.interactiveStage}>
        {/* Left Column: Keepsake Showcase Card */}
        <div
          className={styles.keepsakeCard}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          }}
        >
          <div className={styles.cardHeader}>
            <Link
              aria-label="Letterly home"
              className={styles.wordmark}
              href="/"
            >
              <Image
                alt="Letterly"
                className={styles.interactiveLogo}
                src={appLogo}
                sizes="10rem"
                priority
              />
            </Link>
            <span className={styles.cardBadge}>CRAFTED KEEPSAKE</span>
          </div>

          <p className={styles.cardMotto}>
            For the feelings too big for a text. Turn your memories and words
            into an enduring personal page they can keep forever.
          </p>

          {/* Mood Pills */}
          <div className={styles.moodSection}>
            <span className={styles.moodHeading}>CHOOSE YOUR FEELING</span>
            <div className={styles.moodPills}>
              {MOOD_TAGS.map((mood) => (
                <a
                  key={mood.label}
                  href={mood.href}
                  className={styles.moodPill}
                  onClick={(e) => handleMoodClick(e, mood.label)}
                >
                  <span className={styles.moodIcon} aria-hidden="true">
                    {mood.icon}
                  </span>
                  <span>{mood.label}</span>
                </a>
              ))}
            </div>
            {moodToast && (
              <p className={styles.moodToast} role="status">
                {moodToast}
              </p>
            )}
          </div>

          {/* Live Security Indicator */}
          <div className={styles.statusPill}>
            <span className={styles.pulseDot} aria-hidden="true" />
            <span>
              Sealed with end to end privacy: zero ad tracking, forever
              preserved
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Wax Seal Inspiration Station */}
        <div className={styles.stampStation}>
          <div className={styles.stampStationHeader}>
            <span className={styles.stampEyebrow}>INTERACTIVE WAX SEAL</span>
            <h3 className={styles.stampTitle}>Seal of Intention</h3>
            <p className={styles.stampSubtitle}>
              Tap the ruby wax seal below to compress the stamp and receive an
              inspiring thought for your letter.
            </p>
          </div>

          {/* 3D Wax Seal Button with Particle Burst */}
          <div className={styles.sealArea}>
            <button
              type="button"
              className={`${styles.waxSealBtn} ${stamping ? styles.waxSealStamping : ""}`}
              onClick={handleStamp}
              aria-label="Stamp for a romantic whisper"
            >
              <div className={styles.waxSealGloss} />
              <div className={styles.waxSealRim} />
              <div className={styles.waxSealCore}>
                <span className={styles.waxSealHeart} aria-hidden="true">
                  ♥
                </span>
              </div>
            </button>

            {/* Floating Particles */}
            {particles.map((p) => (
              <span
                key={p.id}
                className={styles.sparkleParticle}
                style={
                  {
                    "--dx": `${p.x}px`,
                    "--dy": `${p.y}px`,
                  } as React.CSSProperties
                }
                aria-hidden="true"
              >
                {p.char}
              </span>
            ))}
          </div>

          {/* Revealed Quote Card */}
          <div className={styles.quoteCard}>
            <div className={styles.quoteHeader}>
              <span className={styles.quoteCategory}>
                {currentQuote.category}
              </span>
              <span className={styles.quoteNumber}>
                {activeQuote + 1} of {INSPIRATION_QUOTES.length}
              </span>
            </div>
            <blockquote className={styles.quoteText}>
              “{currentQuote.quote}”
            </blockquote>
            <div className={styles.quoteFooter}>
              <span className={styles.quoteAuthor}>
                A whisper from Letterly
              </span>
              <button
                type="button"
                className={styles.nextQuoteBtn}
                onClick={handleStamp}
              >
                Stamp again <span aria-hidden="true">↻</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Navigation - PRESERVES TEST IDENTIFIERS */}
      <div className={styles.navigationRow}>
        <nav aria-label={navigationLabel} className={styles.links}>
          {links}
        </nav>
      </div>

      {/* Bottom Bar: Copyright, Motto, Return to top */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomLeft}>{bottom}</div>
        <div className={styles.bottomCenter}>
          <span>With love and quiet courage for hearts everywhere.</span>
        </div>
        <div className={styles.bottomRight}>
          <button
            type="button"
            className={styles.backToTopBtn}
            onClick={scrollToTop}
            aria-label="Return to top"
          >
            <span aria-hidden="true">↑</span>
            <span>Back to top</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
