"use client";

import { useEffect, useRef } from "react";
import { useLandingMotion } from "./landing-motion";
import type { DecorativeRenderer } from "./romantic-webgl";

export function DecorativeCanvas({
  className,
  effect = "silk",
}: {
  className?: string;
  effect?: "silk" | "border";
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { paused } = useLandingMotion();
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage || paused) return;
    const pointerTarget = effect === "border" ? stage.parentElement! : stage;
    let renderer: DecorativeRenderer | null = null;
    let disposed = false;
    let visible = false;
    let frame = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let bounds = stage.getBoundingClientRect();
    const render = (now: number) => {
      if (disposed || !visible || document.hidden || !renderer) {
        frame = 0;
        return;
      }
      if (now - lastFrame >= 1000 / 30) {
        elapsed = Math.min(4, elapsed + (now - lastFrame) / 1000);
        lastFrame = now;
        pointerX += (targetX - pointerX) * 0.075;
        pointerY += (targetY - pointerY) * 0.075;
        renderer.draw(elapsed, pointerX, pointerY);
        if (
          elapsed >= 4 &&
          Math.abs(targetX - pointerX) + Math.abs(targetY - pointerY) < 0.001
        ) {
          frame = 0;
          canvas.dataset.webglRunning = "false";
          return;
        }
      }
      frame = requestAnimationFrame(render);
    };
    const sync = () => {
      if (visible && !document.hidden && renderer && !frame) {
        lastFrame = performance.now();
        frame = requestAnimationFrame(render);
      } else if ((!visible || document.hidden) && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      canvas.dataset.webglRunning = String(Boolean(frame));
    };
    const resize = () => {
      bounds = stage.getBoundingClientRect();
      renderer?.resize(bounds.width, bounds.height);
      renderer?.draw(elapsed, pointerX, pointerY);
    };
    const initialize = async () => {
      try {
        const { createSilkRenderer, createBorderRenderer } =
          await import("./romantic-webgl");
        if (disposed || renderer) return;
        renderer =
          effect === "border"
            ? createBorderRenderer(canvas)
            : createSilkRenderer(canvas);
      } catch {
        renderer = null;
      }
      if (disposed) return;
      canvas.dataset.webglState = renderer ? "ready" : "fallback";
      resize();
      sync();
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !renderer) void initialize();
      sync();
    });
    observer.observe(stage);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const pointer = (event: PointerEvent) => {
      targetX = Math.max(
        0,
        Math.min(1, (event.clientX - bounds.left) / Math.max(bounds.width, 1)),
      );
      targetY =
        1 -
        Math.max(
          0,
          Math.min(
            1,
            (event.clientY - bounds.top) / Math.max(bounds.height, 1),
          ),
        );
      sync();
    };
    const reset = () => {
      targetX = 0.5;
      targetY = 0.5;
      sync();
    };
    const enter = () => {
      bounds = stage.getBoundingClientRect();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      renderer?.dispose();
      renderer = null;
      canvas.dataset.webglState = "fallback";
      canvas.dataset.webglRunning = "false";
    };
    const restored = () => {
      void initialize();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    pointerTarget.addEventListener("pointermove", pointer, { passive: true });
    pointerTarget.addEventListener("pointerenter", enter);
    pointerTarget.addEventListener("pointerleave", reset);
    document.addEventListener("visibilitychange", sync);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      pointerTarget.removeEventListener("pointermove", pointer);
      pointerTarget.removeEventListener("pointerenter", enter);
      pointerTarget.removeEventListener("pointerleave", reset);
      document.removeEventListener("visibilitychange", sync);
      renderer?.dispose();
      canvas.dataset.webglState = "paused";
      canvas.dataset.webglRunning = "false";
    };
  }, [paused, effect]);
  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      data-silk-canvas={effect === "silk" ? "" : undefined}
      data-border-canvas={effect === "border" ? "" : undefined}
      data-webgl-state="idle"
    />
  );
}
