"use client";

import Image from "next/image";
import { useState, type MouseEvent } from "react";
import confessionThumbnail from "../../../../assets/categories/confession/confession-thumbnail.png";
import { AuthWebGLCanvas } from "./auth-webgl-canvas";
import styles from "./sign-in-form.module.css";

export function AuthStationery(): React.JSX.Element {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: Number((x * 10).toFixed(2)),
      y: Number((y * -10).toFixed(2)),
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
        {/* WebGL Silk Flow Behind the Keepsake */}
        <div className={styles.stationeryWebGL}>
          <AuthWebGLCanvas />
        </div>

        {/* Soft Romantic Ambient Glow */}
        <div className={styles.stationeryGlow} />

        {/* Floating Romantic Sparkles */}
        <div className={styles.stationerySparkles}>
          <span className={`${styles.sparkle} ${styles.sp1}`}>✦</span>
          <span className={`${styles.sparkle} ${styles.sp2}`}>♥</span>
          <span className={`${styles.sparkle} ${styles.sp3}`}>❦</span>
          <span className={`${styles.sparkle} ${styles.sp4}`}>✨</span>
        </div>

        {/* Photorealistic Keepsake Showcase Card */}
        <div className={styles.keepsakeCard}>
          <div className={styles.cardImageFrame}>
            <Image
              src={confessionThumbnail}
              alt="Secret Letter keepsake"
              className={styles.keepsakeImage}
              priority
              sizes="(max-width: 60rem) 100vw, 32rem"
            />
            {/* Dynamic Specular Sheen responding to tilt */}
            <div
              className={styles.cardShine}
              style={{
                background: `linear-gradient(${135 + tilt.x * 3}deg, rgba(255, 255, 255, ${0.22 + (tilt.y + 5) * 0.015}) 0%, rgba(255, 255, 255, 0) 55%, rgba(155, 49, 87, 0.08) 100%)`,
              }}
            />
          </div>

          {/* Floating Editorial Keepsake Badge */}
          <div className={styles.keepsakeBadge}>
            <span className={styles.badgeStar}>✦</span>
            <span>HANDCRAFTED SECRET LETTER</span>
            <span className={styles.badgeStar}>✦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
