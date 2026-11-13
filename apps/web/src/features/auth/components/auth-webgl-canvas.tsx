"use client";

import { useEffect, useRef } from "react";
import {
  createSilkRenderer,
  type DecorativeRenderer,
} from "../../landing/components/romantic-webgl";
import styles from "./auth-webgl-canvas.module.css";

export function AuthWebGLCanvas({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let renderer: DecorativeRenderer | null = null;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let disposed = false;
    let isVisible = false;

    try {
      renderer = createSilkRenderer(canvas);
    } catch {
      renderer = null;
    }

    if (!renderer) return;

    const resize = () => {
      if (!canvas || disposed || !renderer) return;
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width || 400, rect.height || 300);
      renderer.draw(elapsed, pointerX, pointerY, 0);
    };

    const render = (now: number) => {
      if (disposed || !renderer || document.hidden || !isVisible) {
        frame = 0;
        return;
      }

      if (now - lastTime >= 1000 / 30) {
        elapsed = Math.min(4, elapsed + (now - lastTime) / 1000);
        lastTime = now;

        pointerX += (targetX - pointerX) * 0.1;
        pointerY += (targetY - pointerY) * 0.1;

        renderer.draw(elapsed, pointerX, pointerY, 0);

        // Once settled, sleep to conserve CPU and avoid background overhead
        if (
          elapsed >= 4 &&
          Math.abs(targetX - pointerX) + Math.abs(targetY - pointerY) < 0.005
        ) {
          frame = 0;
          return;
        }
      }

      frame = requestAnimationFrame(render);
    };

    const wake = () => {
      if (isVisible && !document.hidden && renderer && !frame) {
        lastTime = performance.now();
        frame = requestAnimationFrame(render);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        targetX = Math.max(
          0,
          Math.min(1, (e.clientX - rect.left) / rect.width),
        );
        targetY =
          1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      }
      wake();
    };

    const handlePointerLeave = () => {
      targetX = 0.5;
      targetY = 0.5;
      wake();
    };

    resize();
    window.addEventListener("resize", resize);

    const stage = canvas.parentElement ?? canvas;
    stage.addEventListener("pointermove", handlePointerMove as EventListener, {
      passive: true,
    });
    stage.addEventListener(
      "pointerleave",
      handlePointerLeave as EventListener,
      {
        passive: true,
      },
    );

    const observer = new IntersectionObserver((entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
      if (isVisible) {
        wake();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(canvas);

    const handleVisibilityChange = () => {
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (!document.hidden && isVisible) {
        wake();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    wake();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      stage.removeEventListener(
        "pointermove",
        handlePointerMove as EventListener,
      );
      stage.removeEventListener(
        "pointerleave",
        handlePointerLeave as EventListener,
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      renderer?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? styles.canvas}
      aria-hidden="true"
    />
  );
}
