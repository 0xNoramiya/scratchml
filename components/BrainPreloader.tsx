"use client";

import { useEffect } from "react";
import { loadFeatureExtractor } from "@/lib/mlEngine";

/**
 * Invisible. Starts downloading + warming MobileNet while the visitor reads
 * the landing page, so the studio's "loading brain…" is mostly or entirely
 * over by the time they click through. The module-level cache in mlEngine
 * means the studio reuses the same in-flight promise on SPA navigation, and
 * the immutable HTTP cache covers full reloads.
 */
export function BrainPreloader() {
  useEffect(() => {
    const kick = () => void loadFeatureExtractor().catch(() => {});
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(kick, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(kick, 1200);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
