"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import birthdayStyles from "./renderer.module.css";

type CandleIndex = 0 | 1 | 2;

export type RealisticBirthdayCakeCanvasProps = {
  extinguishedCandles: [boolean, boolean, boolean];
  onToggleCandle?: (index: CandleIndex) => void;
  disabled?: boolean;
  isOpening?: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxAlpha: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  color?: string;
};

type BokehParticle = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speedY: number;
  phase: number;
};

const CANDLE_LABELS = [
  "Wish 1: The year behind you",
  "Wish 2: This moment today",
  "Wish 3: The chapter ahead",
] as const;

const CANDLE_CONFIG = [
  { index: 0 as CandleIndex, x: 116, baseY: 88, height: 34, width: 11 },
  { index: 1 as CandleIndex, x: 170, baseY: 91, height: 40, width: 11.5 },
  { index: 2 as CandleIndex, x: 224, baseY: 88, height: 34, width: 11 },
] as const;

// ----------------------------------------------------------
// MODULE-LEVEL PURE DRAWING FUNCTIONS
// ----------------------------------------------------------

function drawPedestal(ctx: CanvasRenderingContext2D): void {
  const cx = 170;

  // Ambient drop shadow onto tabletop
  ctx.save();
  const shadowGrad = ctx.createRadialGradient(cx, 206, 20, cx, 206, 110);
  shadowGrad.addColorStop(0, "rgba(8, 4, 2, 0.65)");
  shadowGrad.addColorStop(0.5, "rgba(8, 4, 2, 0.3)");
  shadowGrad.addColorStop(1, "rgba(8, 4, 2, 0)");
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 206, 110, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Pedestal Base Foot (Y: 194 -> 203, width 130)
  ctx.save();
  const footGrad = ctx.createLinearGradient(105, 194, 235, 203);
  footGrad.addColorStop(0, "#7d5015");
  footGrad.addColorStop(0.25, "#e5b253");
  footGrad.addColorStop(0.5, "#fff3d1");
  footGrad.addColorStop(0.75, "#c98f30");
  footGrad.addColorStop(1, "#543309");

  ctx.fillStyle = footGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 200, 68, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pedestal Flared Stem (Y: 172 -> 195)
  const stemGrad = ctx.createLinearGradient(142, 172, 198, 172);
  stemGrad.addColorStop(0, "#663e0e");
  stemGrad.addColorStop(0.3, "#e5b253");
  stemGrad.addColorStop(0.55, "#fff2ce");
  stemGrad.addColorStop(0.8, "#b97f26");
  stemGrad.addColorStop(1, "#4d2e0a");

  ctx.fillStyle = stemGrad;
  ctx.beginPath();
  ctx.moveTo(156, 172);
  ctx.bezierCurveTo(154, 184, 142, 192, 134, 196);
  ctx.lineTo(206, 196);
  ctx.bezierCurveTo(198, 192, 186, 184, 184, 172);
  ctx.closePath();
  ctx.fill();

  // Pedestal Platter Rim (Y: 168 -> 173, width: 236)
  const platterGrad = ctx.createLinearGradient(52, 168, 288, 173);
  platterGrad.addColorStop(0, "#855518");
  platterGrad.addColorStop(0.2, "#e5b253");
  platterGrad.addColorStop(0.48, "#fff6db");
  platterGrad.addColorStop(0.78, "#c68d2c");
  platterGrad.addColorStop(1, "#5a360a");

  ctx.fillStyle = platterGrad;
  ctx.beginPath();
  ctx.ellipse(cx, 170, 118, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight line along platter rim
  ctx.strokeStyle = "rgba(255, 250, 230, 0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, 169, 116, 9.5, 0, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();

  ctx.restore();
}

function drawCakeBaseTier(ctx: CanvasRenderingContext2D): void {
  const cx = 170;
  const rx = 88;
  const ry = 13;
  const topY = 124;
  const botY = 162;

  ctx.save();

  // 1. Cylinder Body
  const bodyGrad = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  bodyGrad.addColorStop(0, "#23140c"); // deep dark chocolate shadow
  bodyGrad.addColorStop(0.22, "#3d2215");
  bodyGrad.addColorStop(0.5, "#522f1d"); // warm hazelnut/mocha body
  bodyGrad.addColorStop(0.78, "#3a2013");
  bodyGrad.addColorStop(1, "#1c0f08");

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(cx - rx, topY);
  ctx.lineTo(cx - rx, botY);
  ctx.ellipse(cx, botY, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, topY);
  ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();

  // 2. Delicate Gold & Cream Piped Pearls at base seam
  const pearlCount = 17;
  for (let i = 0; i < pearlCount; i++) {
    const angle = Math.PI + (Math.PI * i) / (pearlCount - 1);
    const px = cx + Math.cos(angle) * (rx - 1);
    const py = botY + Math.sin(angle) * (ry - 1);

    const pearlGrad = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, 3);
    pearlGrad.addColorStop(0, "#fff5d9");
    pearlGrad.addColorStop(0.4, "#e5b253");
    pearlGrad.addColorStop(1, "#8e5c19");

    ctx.fillStyle = pearlGrad;
    ctx.beginPath();
    ctx.arc(px, py, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Luxurious chocolate glaze drip lines on base tier
  ctx.strokeStyle = "rgba(229, 178, 83, 0.45)";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - rx + 14, topY + 12);
  ctx.bezierCurveTo(cx - 44, topY + 22, cx - 20, topY + 6, cx, topY + 16);
  ctx.bezierCurveTo(
    cx + 20,
    topY + 6,
    cx + 44,
    topY + 22,
    cx + rx - 14,
    topY + 12,
  );
  ctx.stroke();

  // 4. Base Tier Top Surface (ellipse)
  const topSurfaceGrad = ctx.createRadialGradient(cx, topY, 10, cx, topY, rx);
  topSurfaceGrad.addColorStop(0, "#482819");
  topSurfaceGrad.addColorStop(0.7, "#351d12");
  topSurfaceGrad.addColorStop(1, "#22120a");

  ctx.fillStyle = topSurfaceGrad;
  ctx.beginPath();
  ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCakeTopTier(ctx: CanvasRenderingContext2D): void {
  const cx = 170;
  const rx = 60;
  const ry = 9.5;
  const topY = 86;
  const botY = 122;

  ctx.save();

  // 1. Ambient Occlusion Shadow cast onto base tier
  const aoGrad = ctx.createRadialGradient(
    cx,
    botY + 2,
    10,
    cx,
    botY + 2,
    rx + 14,
  );
  aoGrad.addColorStop(0, "rgba(12, 6, 3, 0.7)");
  aoGrad.addColorStop(0.7, "rgba(12, 6, 3, 0.35)");
  aoGrad.addColorStop(1, "rgba(12, 6, 3, 0)");
  ctx.fillStyle = aoGrad;
  ctx.beginPath();
  ctx.ellipse(cx, botY + 2, rx + 14, ry + 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Top Tier Cylinder Body (Silky Vanilla / Champagne Cream)
  const bodyGrad = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  bodyGrad.addColorStop(0, "#d8c4a4"); // soft warm shadow
  bodyGrad.addColorStop(0.25, "#f7edd8");
  bodyGrad.addColorStop(0.55, "#fffaf0"); // rich silky buttercream center
  bodyGrad.addColorStop(0.8, "#ebd9be");
  bodyGrad.addColorStop(1, "#caaf90");

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(cx - rx, topY);
  ctx.lineTo(cx - rx, botY);
  ctx.ellipse(cx, botY, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, topY);
  ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();

  // 3. Luscious Glossy Chocolate Ganache / Caramel Drips along top rim
  const dripGrad = ctx.createLinearGradient(cx - rx, topY, cx + rx, topY + 16);
  dripGrad.addColorStop(0, "#2c170d");
  dripGrad.addColorStop(0.5, "#4e2917");
  dripGrad.addColorStop(1, "#26130b");

  ctx.fillStyle = dripGrad;
  ctx.beginPath();
  ctx.moveTo(cx - rx, topY);
  ctx.bezierCurveTo(cx - 50, topY + 14, cx - 42, topY + 16, cx - 36, topY + 7);
  ctx.bezierCurveTo(cx - 30, topY + 18, cx - 22, topY + 20, cx - 14, topY + 8);
  ctx.bezierCurveTo(cx - 6, topY + 16, cx + 4, topY + 18, cx + 12, topY + 7);
  ctx.bezierCurveTo(cx + 20, topY + 22, cx + 30, topY + 21, cx + 38, topY + 8);
  ctx.bezierCurveTo(cx + 46, topY + 15, cx + 54, topY + 14, cx + rx, topY);
  ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();

  // Specular sheen on the glossy drips
  ctx.strokeStyle = "rgba(255, 235, 200, 0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 29, topY + 14);
  ctx.lineTo(cx - 26, topY + 18);
  ctx.moveTo(cx + 22, topY + 16);
  ctx.lineTo(cx + 26, topY + 20);
  ctx.stroke();

  // 4. Top Tier Upper Ellipse (Ivory Cake Top)
  const topSurfaceGrad = ctx.createRadialGradient(cx, topY, 8, cx, topY, rx);
  topSurfaceGrad.addColorStop(0, "#fffcf4");
  topSurfaceGrad.addColorStop(0.65, "#f8eedb");
  topSurfaceGrad.addColorStop(1, "#ebd7bc");

  ctx.fillStyle = topSurfaceGrad;
  ctx.beginPath();
  ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Edible Gold Flakes on the top surface
  const goldFlakes = [
    { x: cx - 32, y: topY - 1 },
    { x: cx - 18, y: topY + 3 },
    { x: cx + 8, y: topY - 3 },
    { x: cx + 28, y: topY + 2 },
    { x: cx + 40, y: topY - 1 },
  ];
  goldFlakes.forEach((gf, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? "#ffd97d" : "#e5b253";
    ctx.beginPath();
    ctx.arc(gf.x, gf.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawCandleSticks(
  ctx: CanvasRenderingContext2D,
  extinguishedCandles: [boolean, boolean, boolean],
  hoveredCandle: CandleIndex | null,
  disabled: boolean,
  wickEmbers: [number, number, number],
): void {
  CANDLE_CONFIG.forEach((cfg) => {
    const { x, baseY, height, width, index } = cfg;
    const topY = baseY - height;
    const halfW = width / 2;
    const isLit = !extinguishedCandles[index];
    const isHovered = hoveredCandle === index;

    ctx.save();

    // Soft wax shadow beneath candle base
    ctx.fillStyle = "rgba(40, 20, 10, 0.45)";
    ctx.beginPath();
    ctx.ellipse(x, baseY + 1, halfW + 1.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fluted Candle Cylinder
    const waxGrad = ctx.createLinearGradient(x - halfW, 0, x + halfW, 0);
    if (isLit) {
      waxGrad.addColorStop(0, "#eedcc2");
      waxGrad.addColorStop(0.3, "#fffef9");
      waxGrad.addColorStop(0.7, "#fff8ea");
      waxGrad.addColorStop(1, "#ddc59e");
    } else {
      waxGrad.addColorStop(0, "#c9b69b");
      waxGrad.addColorStop(0.35, "#f1e7d4");
      waxGrad.addColorStop(0.75, "#eae0cb");
      waxGrad.addColorStop(1, "#b59f81");
    }

    ctx.fillStyle = waxGrad;
    ctx.beginPath();
    ctx.moveTo(x - halfW, topY);
    ctx.lineTo(x - halfW, baseY);
    ctx.ellipse(x, baseY, halfW, 2.2, 0, Math.PI, 0, true);
    ctx.lineTo(x + halfW, topY);
    ctx.ellipse(x, topY, halfW, 2.2, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();

    // Spiral Burnished Gold Ribbon on candle
    ctx.strokeStyle = isLit
      ? "rgba(229, 178, 83, 0.72)"
      : "rgba(196, 148, 56, 0.45)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - halfW, topY + 7);
    ctx.lineTo(x + halfW, topY + 12);
    ctx.moveTo(x - halfW, topY + 17);
    ctx.lineTo(x + halfW, topY + 22);
    ctx.moveTo(x - halfW, topY + 27);
    ctx.lineTo(x + halfW, topY + 32);
    ctx.stroke();

    // Top Wax Pool Ellipse
    const cupGrad = ctx.createRadialGradient(x, topY, 1, x, topY, halfW);
    cupGrad.addColorStop(0, isLit ? "#ffeed2" : "#e8dac3");
    cupGrad.addColorStop(1, isLit ? "#e0c7a2" : "#c4b094");
    ctx.fillStyle = cupGrad;
    ctx.beginPath();
    ctx.ellipse(x, topY, halfW, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark Cotton Wick
    const wickEmber = wickEmbers[index];
    ctx.strokeStyle = "#251409";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.quadraticCurveTo(x + 0.8, topY - 3, x + 0.2, topY - 5);
    ctx.stroke();

    // Hot Glowing Wick Tip
    if (wickEmber > 0) {
      ctx.fillStyle = `rgba(255, 68, 10, ${wickEmber})`;
      ctx.beginPath();
      ctx.arc(x + 0.2, topY - 5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hover aura highlight when hovering candle
    if (isHovered && !disabled) {
      ctx.strokeStyle = "rgba(245, 196, 105, 0.6)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(
        x,
        (topY + baseY) / 2,
        halfW + 4,
        height / 2 + 6,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }

    ctx.restore();
  });
}

function drawFlamesAndGlow(
  ctx: CanvasRenderingContext2D,
  extinguishedCandles: [boolean, boolean, boolean],
  wind: number,
  time: number,
  reduceMotion: boolean,
): void {
  CANDLE_CONFIG.forEach((cfg) => {
    const { x, baseY, height, index } = cfg;
    const isLit = !extinguishedCandles[index];
    if (!isLit) return;

    const wickX = x + 0.2;
    const wickY = baseY - height - 5;

    ctx.save();

    // 1. Organic Sinusoidal Flame Oscillation
    const flameFreq = 5.6 + index * 1.3;
    const flutterX = reduceMotion
      ? 0
      : Math.sin(time * flameFreq) * 1.8 + Math.cos(time * 11) * 0.7;
    const flutterY = reduceMotion ? 0 : Math.sin(time * 7.4 + index) * 1.4;

    // Wind displacement when blown out
    const windPushX = wind * 24;
    const windPushY = wind * 4;

    const flameTipX = wickX + flutterX + windPushX;
    const flameTipY = wickY - 24 + flutterY + windPushY;
    const flameHeight = 24 - wind * 8;

    // 2. Large Volumetric Ambient Warm Glow (Halo)
    const glowRadius = 38 + (reduceMotion ? 0 : Math.sin(time * 4 + index) * 4);
    const glowGrad = ctx.createRadialGradient(
      wickX,
      wickY - 12,
      2,
      wickX,
      wickY - 12,
      glowRadius,
    );
    glowGrad.addColorStop(0, "rgba(255, 214, 110, 0.38)");
    glowGrad.addColorStop(0.4, "rgba(245, 155, 45, 0.16)");
    glowGrad.addColorStop(1, "rgba(212, 100, 20, 0)");

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(wickX, wickY - 12, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Dynamic Flame Cast Reflection onto Top Tier of Cake
    const cakeReflectGrad = ctx.createRadialGradient(
      wickX,
      86,
      1,
      wickX,
      86,
      22,
    );
    cakeReflectGrad.addColorStop(0, "rgba(255, 215, 120, 0.42)");
    cakeReflectGrad.addColorStop(0.6, "rgba(245, 150, 40, 0.14)");
    cakeReflectGrad.addColorStop(1, "rgba(212, 100, 20, 0)");
    ctx.fillStyle = cakeReflectGrad;
    ctx.beginPath();
    ctx.ellipse(wickX, 86, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Outer Flame Corona (Radiant Gold / Orange)
    const outerGrad = ctx.createLinearGradient(wickX, flameTipY, wickX, wickY);
    outerGrad.addColorStop(0, "#ffe88f");
    outerGrad.addColorStop(0.35, "#ffa826");
    outerGrad.addColorStop(0.75, "#ff6200");
    outerGrad.addColorStop(1, "#c93400");

    const flameWidth = 8.5;
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.moveTo(wickX, wickY);
    ctx.bezierCurveTo(
      wickX - flameWidth,
      wickY - flameHeight * 0.35,
      wickX - flameWidth * 0.7 + flutterX * 0.5,
      wickY - flameHeight * 0.75,
      flameTipX,
      flameTipY,
    );
    ctx.bezierCurveTo(
      wickX + flameWidth * 0.7 + flutterX * 0.5,
      wickY - flameHeight * 0.75,
      wickX + flameWidth,
      wickY - flameHeight * 0.35,
      wickX,
      wickY,
    );
    ctx.closePath();
    ctx.fill();

    // 5. Inner Incandescent Hot Core (Bright White-Gold)
    const coreTipY = flameTipY + 6;
    const coreWidth = flameWidth * 0.55;
    const coreGrad = ctx.createLinearGradient(wickX, coreTipY, wickX, wickY);
    coreGrad.addColorStop(0, "#ffffff");
    coreGrad.addColorStop(0.5, "#fff8d6");
    coreGrad.addColorStop(1, "#ffd043");

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(wickX, wickY);
    ctx.bezierCurveTo(
      wickX - coreWidth,
      wickY - flameHeight * 0.28,
      wickX - coreWidth * 0.6,
      wickY - flameHeight * 0.6,
      wickX + flutterX * 0.4 + windPushX * 0.5,
      coreTipY,
    );
    ctx.bezierCurveTo(
      wickX + coreWidth * 0.6,
      wickY - flameHeight * 0.6,
      wickX + coreWidth,
      wickY - flameHeight * 0.28,
      wickX,
      wickY,
    );
    ctx.closePath();
    ctx.fill();

    // 6. Deep Blue Combustion Zone at Wick Root
    const blueGrad = ctx.createRadialGradient(
      wickX,
      wickY,
      0.5,
      wickX,
      wickY,
      4.5,
    );
    blueGrad.addColorStop(0, "rgba(45, 75, 255, 0.75)");
    blueGrad.addColorStop(0.6, "rgba(65, 120, 255, 0.4)");
    blueGrad.addColorStop(1, "rgba(65, 120, 255, 0)");

    ctx.fillStyle = blueGrad;
    ctx.beginPath();
    ctx.ellipse(wickX, wickY - 1, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

function drawSmokeAndEmbers(
  ctx: CanvasRenderingContext2D,
  smoke: Particle[],
  embers: Particle[],
): void {
  // 1. Draw Curling Smoke Wisps
  if (smoke.length > 0) {
    ctx.save();
    smoke.forEach((p) => {
      const smokeGrad = ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        p.radius,
      );
      smokeGrad.addColorStop(0, `rgba(242, 235, 224, ${p.alpha * 0.7})`);
      smokeGrad.addColorStop(0.5, `rgba(215, 205, 192, ${p.alpha * 0.4})`);
      smokeGrad.addColorStop(1, "rgba(200, 190, 180, 0)");

      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // 2. Draw Golden Spark Embers
  if (embers.length > 0) {
    ctx.save();
    embers.forEach((p) => {
      ctx.fillStyle = p.color || "#ffd97d";
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

// ----------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------

export function RealisticBirthdayCakeCanvas({
  extinguishedCandles,
  onToggleCandle,
  disabled = false,
  isOpening = false,
}: RealisticBirthdayCakeCanvasProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<CandleIndex | null>(null);

  // Sync state into refs so renderFrame loop always accesses latest values without re-subscribing
  const extinguishedCandlesRef = useRef(extinguishedCandles);
  extinguishedCandlesRef.current = extinguishedCandles;

  const hoveredCandleRef = useRef<CandleIndex | null>(hoveredCandle);
  hoveredCandleRef.current = hoveredCandle;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  // Track previous extinguished state to trigger smoke/ember bursts
  const prevExtinguishedRef = useRef<[boolean, boolean, boolean]>([
    ...extinguishedCandles,
  ]);
  const prevOpeningRef = useRef<boolean>(isOpening);

  // Particle systems
  const smokeParticlesRef = useRef<Particle[]>([]);
  const emberParticlesRef = useRef<Particle[]>([]);
  const windStreaksRef = useRef<Particle[]>([]);
  const bokehParticlesRef = useRef<BokehParticle[]>([]);

  // Candle wick embers (hot glow cooldown: 1 -> 0)
  const wickEmbersRef = useRef<[number, number, number]>([0, 0, 0]);

  // Smoke emitter timers per candle (seconds remaining)
  const smokeEmittersRef = useRef<[number, number, number]>([0, 0, 0]);

  // Wind blast strength (0 -> 1 during blowout)
  const windIntensityRef = useRef<number>(0);

  const spawnExtinguishBurst = useCallback((candleIndex: CandleIndex): void => {
    const cfg = CANDLE_CONFIG[candleIndex];
    const wickX = cfg.x;
    const wickY = cfg.baseY - cfg.height - 3;

    // 1. Hot wick glow
    wickEmbersRef.current[candleIndex] = 1.0;

    // 2. Continuous smoke emitter for 2.2 seconds
    smokeEmittersRef.current[candleIndex] = 2.2;

    // 3. Initial burst of golden spark embers
    const embers = emberParticlesRef.current;
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.5;
      const speed = 0.8 + Math.random() * 2.2;
      embers.push({
        x: wickX,
        y: wickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.9,
        radius: 0.7 + Math.random() * 1.5,
        alpha: 1,
        maxAlpha: 1,
        rotation: 0,
        vRot: 0,
        life: 0,
        maxLife: 28 + Math.random() * 24,
        color: Math.random() > 0.3 ? "#ffd97d" : "#ff9e2c",
      });
    }
  }, []);

  const triggerWindBlowout = useCallback((): void => {
    windIntensityRef.current = 1.0;

    // Wind streak lines sweeping across
    const streaks = windStreaksRef.current;
    for (let i = 0; i < 18; i++) {
      streaks.push({
        x: -40 - Math.random() * 80,
        y: 40 + Math.random() * 80,
        vx: 8 + Math.random() * 6,
        vy: (Math.random() - 0.5) * 1.2,
        radius: 18 + Math.random() * 32,
        alpha: 0.5 + Math.random() * 0.4,
        maxAlpha: 0.8,
        rotation: 0,
        vRot: 0,
        life: 0,
        maxLife: 28 + Math.random() * 16,
      });
    }

    // Extinguish all remaining candles
    ([0, 1, 2] as const).forEach((index) => {
      spawnExtinguishBurst(index);
    });
  }, [spawnExtinguishBurst]);

  // Initialize bokeh particles once
  useEffect(() => {
    const bokeh: BokehParticle[] = [];
    for (let i = 0; i < 24; i++) {
      bokeh.push({
        x: Math.random() * 340,
        y: Math.random() * 220,
        radius: 0.8 + Math.random() * 2.2,
        alpha: 0.15 + Math.random() * 0.45,
        speedY: 0.08 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
      });
    }
    bokehParticlesRef.current = bokeh;
  }, []);

  // Detect transitions to spawn realistic puffs of smoke and ember bursts
  useEffect(() => {
    const prev = prevExtinguishedRef.current;
    ([0, 1, 2] as const).forEach((index) => {
      if (!prev[index] && extinguishedCandles[index]) {
        spawnExtinguishBurst(index);
      }
    });
    prevExtinguishedRef.current = [...extinguishedCandles];
  }, [extinguishedCandles, spawnExtinguishBurst]);

  // Detect opening / blow-all-out trigger
  useEffect(() => {
    if (isOpening && !prevOpeningRef.current) {
      triggerWindBlowout();
    }
    prevOpeningRef.current = isOpening;
  }, [isOpening, triggerWindBlowout]);

  // Canvas drawing & animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isVisible = true;
    let isRunning = true;
    let lastTime = performance.now();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Retina DPI scaling
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = 340;
    const height = 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Intersection observer to pause offscreen
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      isVisible = entry.isIntersecting;
      if (isVisible && isRunning) {
        lastTime = performance.now();
        renderFrame(lastTime);
      }
    });
    observer.observe(canvas);

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        isVisible = false;
      } else {
        isVisible = true;
        lastTime = performance.now();
        renderFrame(lastTime);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    function renderFrame(now: number): void {
      if (!ctx || !isRunning || (!isVisible && !reduceMotion)) return;

      const deltaMs = Math.min(now - lastTime, 48);
      lastTime = now;
      const dt = deltaMs / 1000;
      const time = now * 0.001;

      // Decay wind blast
      if (windIntensityRef.current > 0) {
        windIntensityRef.current = Math.max(
          0,
          windIntensityRef.current - dt * 1.8,
        );
      }

      // Decay wick embers
      ([0, 1, 2] as const).forEach((i) => {
        if (wickEmbersRef.current[i] > 0) {
          wickEmbersRef.current[i] = Math.max(
            0,
            wickEmbersRef.current[i] - dt * 0.7,
          );
        }
        // Emit smoke if active
        if (smokeEmittersRef.current[i] > 0) {
          smokeEmittersRef.current[i] -= dt;
          if (!reduceMotion && Math.random() < 0.8) {
            const cfg = CANDLE_CONFIG[i];
            const wickX = cfg.x;
            const wickY = cfg.baseY - cfg.height - 3;
            smokeParticlesRef.current.push({
              x: wickX + (Math.random() - 0.5) * 3,
              y: wickY,
              vx: (Math.random() - 0.5) * 0.6 + windIntensityRef.current * 2.4,
              vy: -0.8 - Math.random() * 0.9,
              radius: 3 + Math.random() * 2,
              alpha: 0.75,
              maxAlpha: 0.75,
              rotation: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 1.6,
              life: 0,
              maxLife: 45 + Math.random() * 30,
            });
          }
        }
      });

      // Update Smoke Particles
      const smoke = smokeParticlesRef.current;
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i];
        if (!p) continue;
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot * 0.02;
        p.radius += 0.22;
        p.vx += (Math.random() - 0.5) * 0.08 + windIntensityRef.current * 0.15;
        p.alpha = Math.max(0, p.maxAlpha * (1 - p.life / p.maxLife));
        if (p.life >= p.maxLife) {
          smoke.splice(i, 1);
        }
      }

      // Update Ember Particles
      const embers = emberParticlesRef.current;
      for (let i = embers.length - 1; i >= 0; i--) {
        const p = embers[i];
        if (!p) continue;
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.alpha = Math.max(0, p.maxAlpha * (1 - p.life / p.maxLife));
        if (p.life >= p.maxLife) {
          embers.splice(i, 1);
        }
      }

      // Update Wind Streaks
      const streaks = windStreaksRef.current;
      for (let i = streaks.length - 1; i >= 0; i--) {
        const p = streaks[i];
        if (!p) continue;
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = Math.max(0, p.maxAlpha * (1 - p.life / p.maxLife));
        if (p.life >= p.maxLife || p.x > width + 40) {
          streaks.splice(i, 1);
        }
      }

      // Clear canvas with scaled DPR
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // 1. AMBIENT GOLDEN BOKEH / STARDUST
      if (!reduceMotion) {
        const bokeh = bokehParticlesRef.current;
        bokeh.forEach((b) => {
          b.y -= b.speedY;
          if (b.y < -10) b.y = height + 10;
          const oscX = b.x + Math.sin(time + b.phase) * 6;
          const oscAlpha = b.alpha * (0.7 + Math.sin(time * 2 + b.phase) * 0.3);

          const grad = ctx.createRadialGradient(
            oscX,
            b.y,
            0,
            oscX,
            b.y,
            b.radius * 2,
          );
          grad.addColorStop(0, `rgba(255, 228, 150, ${oscAlpha})`);
          grad.addColorStop(0.5, `rgba(235, 175, 75, ${oscAlpha * 0.5})`);
          grad.addColorStop(1, "rgba(235, 175, 75, 0)");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(oscX, b.y, b.radius * 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 2. PEDESTAL & AMBIENT SHADOW
      drawPedestal(ctx);

      // 3. MULTI-TIER PATISSERIE CAKE
      drawCakeBaseTier(ctx);
      drawCakeTopTier(ctx);

      // 4. CANDLE BODIES & WICKS
      drawCandleSticks(
        ctx,
        extinguishedCandlesRef.current,
        hoveredCandleRef.current,
        disabledRef.current,
        wickEmbersRef.current,
      );

      // 5. CANDLE FLAMES & REALISTIC GLOW
      drawFlamesAndGlow(
        ctx,
        extinguishedCandlesRef.current,
        windIntensityRef.current,
        time,
        reduceMotion,
      );

      // 6. SMOKE WISPS & BURST PARTICLES
      drawSmokeAndEmbers(ctx, smoke, embers);

      // 7. WIND STREAKS (DURING BLOWOUT)
      if (streaks.length > 0) {
        ctx.save();
        streaks.forEach((p) => {
          ctx.strokeStyle = `rgba(255, 238, 190, ${p.alpha * 0.6})`;
          ctx.lineWidth = 1.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.radius, p.y + p.vy * 2);
          ctx.stroke();
        });
        ctx.restore();
      }

      ctx.restore();

      if (!reduceMotion && isRunning) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
      }
    }

    if (!reduceMotion) {
      animFrameRef.current = requestAnimationFrame(renderFrame);
    } else {
      renderFrame(performance.now());
    }

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  function handleCandleClick(index: CandleIndex): void {
    if (disabled || isOpening) return;
    onToggleCandle?.(index);
  }

  function handleKeyDown(
    e: KeyboardEvent<HTMLButtonElement>,
    index: CandleIndex,
  ): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCandleClick(index);
    }
  }

  return (
    <div
      ref={containerRef}
      className={birthdayStyles.realisticCakeCanvasWrapper}
      data-cake-stage
    >
      {/* High-Performance Canvas */}
      <canvas
        ref={canvasRef}
        className={birthdayStyles.cakeRealisticCanvas}
        aria-hidden="true"
      />

      {/* Accessible Interactive Overlay Buttons (WCAG AA) */}
      <div
        className={birthdayStyles.candleHitAreaOverlay}
        role="group"
        aria-label="Interactive birthday candles"
      >
        {CANDLE_CONFIG.map((cfg) => {
          const isOut = extinguishedCandles[cfg.index];
          const leftPercent = ((cfg.x - 22) / 340) * 100;
          const topPercent = ((cfg.baseY - cfg.height - 28) / 220) * 100;
          const widthPercent = (44 / 340) * 100;
          const heightPercent = ((cfg.height + 34) / 220) * 100;

          return (
            <button
              key={cfg.index}
              type="button"
              className={birthdayStyles.candleHitTarget}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
              }}
              disabled={disabled || isOpening}
              onClick={() => handleCandleClick(cfg.index)}
              onKeyDown={(e) => handleKeyDown(e, cfg.index)}
              onPointerEnter={() => setHoveredCandle(cfg.index)}
              onPointerLeave={() =>
                setHoveredCandle((prev) => (prev === cfg.index ? null : prev))
              }
              aria-label={`${CANDLE_LABELS[cfg.index]} - ${isOut ? "extinguished" : "glowing"}`}
              aria-pressed={isOut}
            >
              <span className={birthdayStyles.srOnly}>
                {CANDLE_LABELS[cfg.index]} {isOut ? "(blown out)" : "(lit)"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
