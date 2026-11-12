"use client";

import { useState, type MouseEvent } from "react";
import {
  EnvelopeArtwork,
  WaxSeal,
} from "../../landing/components/envelope-artwork";
import styles from "./sign-in-form.module.css";

export function AuthStationery(): React.JSX.Element {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: Number((x * 12).toFixed(2)),
      y: Number((y * -12).toFixed(2)),
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div
      className={styles.stationeryWrapper}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      aria-hidden="true"
    >
      <div
        className={styles.stationery}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
        }}
      >
        {/* Soft Romantic Ambient Glow */}
        <div className={styles.stationeryGlow} />

        {/* Botanical Laurel Frame */}
        <svg className={styles.botanical} viewBox="0 0 520 330" fill="none">
          <ellipse cx="260" cy="164" rx="218" ry="140" />
          <ellipse cx="260" cy="164" rx="230" ry="150" strokeDasharray="3 12" />
          <path d="M425 264c27-60 37-110 29-157m-5 79c-21-6-32-21-29-35 17 1 29 15 29 35Zm7-44c-3-18 3-34 16-39 6 18 0 30-16 39ZM92 253c-27-37-39-74-36-111m8 54c-19-4-30-15-29-29 16 0 27 12 29 29Zm-8-34c1-17 9-29 21-31 1 16-6 27-21 31Z" />
          <path d="m116 60 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Zm279 6 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
        </svg>

        {/* Floating Romantic Sparkles */}
        <div className={styles.stationerySparkles}>
          <span className={`${styles.sparkle} ${styles.sp1}`}>✦</span>
          <span className={`${styles.sparkle} ${styles.sp2}`}>♥</span>
          <span className={`${styles.sparkle} ${styles.sp3}`}>❦</span>
          <span className={`${styles.sparkle} ${styles.sp4}`}>✨</span>
        </div>

        {/* 3D Tilted Letter & Envelope Scene */}
        <div className={styles.letterScene}>
          <div className={styles.envelopeBack} />

          {/* Deckled Romantic Keepsake Letter */}
          <div className={styles.paper}>
            <div className={styles.paperInner}>
              <span className={styles.paperEyebrow}>
                ✦ A LETTER, JUST FOR YOU ✦
              </span>
              <p className={styles.paperSalutation}>Dear you,</p>
              <p className={styles.paperBody}>
                Somewhere between our ordinary days,
                <br />
                you became my favorite part of them.
              </p>
              <div className={styles.paperOrnament}>
                <svg viewBox="0 0 100 20" fill="none">
                  <path d="M0 10h35m30 0h35M50 18S38 12 38 7a7 7 0 0 1 12-4 7 7 0 0 1 12 4c0 5-12 11-12 11Z" />
                </svg>
              </div>
              <span className={styles.paperSignoff}>Forever & always ♡</span>
            </div>
          </div>

          {/* Envelope Front with 3D Wax Seal */}
          <div className={styles.envelopeFront}>
            <EnvelopeArtwork className={styles.envelopeGraphic} />
            <div className={styles.waxSealContainer}>
              <WaxSeal className={styles.waxSeal} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
