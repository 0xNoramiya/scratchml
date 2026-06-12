"use client";

import { createContext, useContext } from "react";

export interface CaptureApi {
  /** Grab one webcam frame for a class: compute embedding + thumbnail. */
  captureSample: (classId: string) => Promise<void>;
  cameraReady: boolean;
  /** Turn the camera on if it's currently off. */
  ensureCamera: () => void;
}

export const CaptureContext = createContext<CaptureApi | null>(null);

export function useCapture(): CaptureApi {
  const ctx = useContext(CaptureContext);
  if (!ctx) throw new Error("useCapture must be used inside <CaptureContext.Provider>");
  return ctx;
}
