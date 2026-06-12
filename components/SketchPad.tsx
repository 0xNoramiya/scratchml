"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStudio } from "@/lib/store";

const INK = "#2b2233";
const BRUSH = 16; // thick strokes read well after MobileNet's 224px downscale

interface SketchPadProps {
  /** Hands the canvas element up to Studio so it can capture/clear it. */
  registerCanvas: (canvas: HTMLCanvasElement | null) => void;
}

export function SketchPad({ registerCanvas }: SketchPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const sketchDirty = useStudio((s) => s.sketchDirty);
  const setSketchDirty = useStudio((s) => s.setSketchDirty);
  const phase = useStudio((s) => s.phase);

  const fillWhite = useCallback((c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    fillWhite(c);
    registerCanvas(c);
    return () => registerCanvas(null);
  }, [fillWhite, registerCanvas]);

  const toCanvasXY = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    c.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = toCanvasXY(e);
    last.current = p;
    // dot for a simple tap
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(p.x, p.y, BRUSH / 2, 0, Math.PI * 2);
    ctx.fill();
    if (!useStudio.getState().sketchDirty) setSketchDirty(true);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || !last.current) return;
    const p = toCanvasXY(e);
    ctx.strokeStyle = INK;
    ctx.lineWidth = BRUSH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    fillWhite(c);
    setSketchDirty(false);
  };

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white ring-2 ring-line">
      <canvas
        ref={canvasRef}
        data-testid="sketchpad"
        width={480}
        height={360}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="h-full w-full cursor-crosshair touch-none"
      />

      {!sketchDirty && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-4xl">✏️</div>
            <p className="mt-1 font-display text-base font-bold text-ink-soft">
              {phase === "live" ? "draw a Thing you taught me!" : "draw here!"}
            </p>
          </div>
        </div>
      )}

      {sketchDirty && (
        <button
          type="button"
          onClick={clear}
          className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-3 py-1.5 text-[12px] font-extrabold text-white backdrop-blur transition-colors hover:bg-ink"
        >
          🧽 clear
        </button>
      )}
    </div>
  );
}
