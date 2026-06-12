"use client";

import { useEffect } from "react";
import { loadFeatureExtractor } from "@/lib/mlEngine";

/**
 * Invisible component that pre-warms MobileNet on the landing page so the studio's
 * load screen is mostly skipped. mlEngine's module-level cache is shared on SPA navigation.
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
