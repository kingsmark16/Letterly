"use client";

import { pageViewStartResponseSchema } from "@letterly/contracts/analytics";
import { useEffect, useRef } from "react";

type ActiveVisit = {
  slug: string;
  viewId: string | null;
  visibleSince: number | null;
  visibleMilliseconds: number;
  lastSentSeconds: number;
  started: boolean;
};

export function PublicVisitTracker({ slug }: { slug: string }): null {
  const visitRef = useRef<ActiveVisit | null>(null);

  useEffect(() => {
    let visit = visitRef.current;
    if (!visit || visit.slug !== slug) {
      visit = {
        slug,
        viewId: null,
        visibleSince: null,
        visibleMilliseconds: 0,
        lastSentSeconds: 0,
        started: false,
      };
      visitRef.current = visit;
    }
    const currentVisit = visit;
    const durationUrl = `/p/${encodeURIComponent(slug)}/visit/time`;

    const pause = () => {
      if (currentVisit.visibleSince === null) return;
      currentVisit.visibleMilliseconds +=
        performance.now() - currentVisit.visibleSince;
      currentVisit.visibleSince = null;
    };
    const resume = () => {
      if (
        document.visibilityState === "visible" &&
        currentVisit.visibleSince === null
      ) {
        currentVisit.visibleSince = performance.now();
      }
    };
    const sendDuration = () => {
      if (!currentVisit.viewId) return;
      const activeMilliseconds =
        currentVisit.visibleMilliseconds +
        (currentVisit.visibleSince === null
          ? 0
          : performance.now() - currentVisit.visibleSince);
      const activeSeconds = Math.min(
        1800,
        Math.floor(activeMilliseconds / 1000),
      );
      if (activeSeconds <= currentVisit.lastSentSeconds) return;
      currentVisit.lastSentSeconds = activeSeconds;
      void fetch(durationUrl, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewId: currentVisit.viewId, activeSeconds }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Duration update failed");
        })
        .catch(() => {
          currentVisit.lastSentSeconds = Math.min(
            currentVisit.lastSentSeconds,
            activeSeconds - 1,
          );
        });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pause();
        sendDuration();
      } else {
        resume();
      }
    };
    const onPageHide = () => {
      pause();
      sendDuration();
    };

    resume();
    if (!currentVisit.started) {
      currentVisit.started = true;
      void fetch(`/p/${encodeURIComponent(slug)}/visit`, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
      })
        .then(async (response) => {
          if (!response.ok) return;
          const result = pageViewStartResponseSchema.safeParse(
            await response.json(),
          );
          if (result.success) {
            currentVisit.viewId = result.data.viewId;
            sendDuration();
          }
        })
        .catch(() => undefined);
    }
    const interval = window.setInterval(sendDuration, 15_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", resume);

    return () => {
      pause();
      sendDuration();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", resume);
    };
  }, [slug]);

  return null;
}
