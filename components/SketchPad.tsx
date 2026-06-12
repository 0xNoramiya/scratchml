"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/store";

// Crayon box. INK first = default.
const CRAYONS = [
  { name: "Ink", value: "#2b2233" },
  { name: "Red", value: "#ff5d5d" },
  { name: "Orange", value: "#ff9f45" },
  { name: "Green", value: "#2fbf71" },
  { name: "Blue", value: "#4d96ff" },
  { name: "Purple", value: "#a674f2" },
  { name: "Pink", value: "#ff6fa3" },
];

const SIZES = [
  { name: "Small", value: 8 },
  { name: "Medium", value: 16 },
  { name: "Big", value: 28 },
];

const MAX_UNDO = 20;

interface SketchPadProps {
  /** Hands the canvas element up to Studio so it can capture/clear it. */
  registerCanvas: (canvas: HTMLCanvasElement | null) => void;
}

export function SketchPad({ registerCanvas }: SketchPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const initialized = useRef(false);

  // Tool state lives in refs too so the native event handlers (bound once)
  // always see the current values without re-attaching listeners.
  const [color, setColor] = useState(CRAYONS[0].value);
  const [size, setSize] = useState(SIZES[1].value);
  const [eraser, setEraser] = useState(false);
  const [undoDepth, setUndoDepth] = useState(0);
  const toolRef = useRef({ color: CRAYONS[0].value, size: SIZES[1].value, eraser: false });
  toolRef.current = { color, size, eraser };

  const sketchDirty = useStudio((s) => s.sketchDirty);
  const setSketchDirty = useStudio((s) => s.setSketchDirty);
  const phase = useStudio((s) => s.phase);

  const fillWhite = useCallback((c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  /** Cheap blank check: sample every 16th pixel for non-white. */
  const isBlank = useCallback((c: HTMLCanvasElement): boolean => {
    const ctx = c.getContext("2d");
    if (!ctx) return true;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < data.length; i += 64) {
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return false;
    }
    return true;
  }, []);

  const syncDirty = useCallback(
    (c: HTMLCanvasElement) => setSketchDirty(!isBlank(c)),
    [isBlank, setSketchDirty],
  );

  // ---- Drawing via NATIVE listeners (passive:false) for reliability.
  // React's synthetic events occasionally drop fast drags and can't
  // preventDefault on passive listeners; this also lets us use
  // getCoalescedEvents() so quick strokes stay smooth and unbroken.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    // Paint the white background ONLY on first mount. If this effect ever
    // re-runs (parent re-render with changed deps), repainting here would
    // erase the kid's in-progress drawing.
    if (!initialized.current) {
      initialized.current = true;
      fillWhite(c);
      // This instance starts blank, so the store must agree — otherwise a stale
      // sketchDirty from before a camera↔sketchpad swap would let the empty pad
      // be captured as a (blank) training example.
      setSketchDirty(false);
    }
    registerCanvas(c);
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let drawing = false;
    let last: { x: number; y: number } | null = null;

    const toXY = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * c.width,
        y: ((e.clientY - r.top) / r.height) * c.height,
      };
    };

    const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const { color, size, eraser } = toolRef.current;
      ctx.strokeStyle = eraser ? "#ffffff" : color;
      ctx.lineWidth = eraser ? size * 1.8 : size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return; // left button only
      e.preventDefault();
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        /* capture can fail on exotic inputs — drawing still works */
      }
      // snapshot for undo BEFORE the stroke begins
      undoStack.current.push(ctx.getImageData(0, 0, c.width, c.height));
      if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
      setUndoDepth(undoStack.current.length);

      drawing = true;
      const p = toXY(e);
      last = p;
      // a dot for a simple tap
      const { color, size, eraser } = toolRef.current;
      ctx.fillStyle = eraser ? "#ffffff" : color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (eraser ? size * 1.8 : size) / 2, 0, Math.PI * 2);
      ctx.fill();
      setSketchDirty(true);
    };

    const move = (e: PointerEvent) => {
      if (!drawing) return;
      // missed pointerup (e.g. released outside the window) — end the stroke
      if (e.pointerType === "mouse" && e.buttons === 0) {
        end();
        return;
      }
      e.preventDefault();
      const events: PointerEvent[] =
        typeof e.getCoalescedEvents === "function" && e.getCoalescedEvents().length > 0
          ? (e.getCoalescedEvents() as PointerEvent[])
          : [e];
      for (const ev of events) {
        const p = toXY(ev);
        if (last) stroke(last, p);
        last = p;
      }
    };

    const end = () => {
      if (!drawing) return;
      drawing = false;
      last = null;
      syncDirty(c);
    };

    const prevent = (e: Event) => e.preventDefault();

    c.addEventListener("pointerdown", down, { passive: false });
    c.addEventListener("pointermove", move, { passive: false });
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    c.addEventListener("lostpointercapture", end);
    c.addEventListener("contextmenu", prevent);
    window.addEventListener("blur", end);

    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", end);
      c.removeEventListener("pointercancel", end);
      c.removeEventListener("lostpointercapture", end);
      c.removeEventListener("contextmenu", prevent);
      window.removeEventListener("blur", end);
      registerCanvas(null);
    };
  }, [fillWhite, registerCanvas, setSketchDirty, syncDirty]);

  const undo = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const snap = undoStack.current.pop();
    setUndoDepth(undoStack.current.length);
    if (snap) ctx.putImageData(snap, 0, 0);
    else fillWhite(c);
    syncDirty(c);
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    // clearing is undoable too
    undoStack.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    setUndoDepth(undoStack.current.length);
    fillWhite(c);
    setSketchDirty(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white ring-2 ring-line">
        <canvas
          ref={canvasRef}
          data-testid="sketchpad"
          width={480}
          height={360}
          draggable={false}
          className="h-full w-full cursor-crosshair touch-none select-none"
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
      </div>

      {/* Crayon box */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-white px-2 py-1.5 ring-1 ring-line">
        <div className="flex items-center gap-1" role="group" aria-label="Crayon colors">
          {CRAYONS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={`${c.name} crayon`}
              aria-pressed={!eraser && color === c.value}
              onClick={() => {
                setColor(c.value);
                setEraser(false);
              }}
              className={`h-9 w-9 shrink-0 rounded-full ring-offset-1 transition-transform hover:scale-110 ${
                !eraser && color === c.value ? "scale-110 ring-2 ring-ink" : "ring-1 ring-black/10"
              }`}
              style={{ background: c.value }}
            />
          ))}
          <button
            type="button"
            aria-label="Eraser"
            aria-pressed={eraser}
            onClick={() => setEraser((v) => !v)}
            title="Eraser"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-2 text-[14px] transition-transform hover:scale-110 ${
              eraser ? "scale-110 ring-2 ring-ink" : "ring-1 ring-black/10"
            }`}
          >
            🧼
          </button>
        </div>

        <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden />

        <div className="flex items-center gap-1" role="group" aria-label="Brush size">
          {SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-label={`${s.name} brush`}
              aria-pressed={size === s.value}
              onClick={() => setSize(s.value)}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform hover:scale-110 ${
                size === s.value ? "bg-paper-2 ring-2 ring-ink" : "ring-1 ring-black/10"
              }`}
            >
              <span
                className="rounded-full bg-ink"
                style={{ width: 4 + s.value / 4, height: 4 + s.value / 4 }}
              />
            </button>
          ))}
        </div>

        <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden />

        <button
          type="button"
          onClick={undo}
          disabled={undoDepth === 0}
          aria-label="Undo"
          title="Undo"
          className="grid h-9 w-10 shrink-0 place-items-center rounded-lg text-[15px] ring-1 ring-black/10 transition-colors hover:bg-paper-2 disabled:opacity-35"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={!sketchDirty}
          aria-label="Clear the pad"
          title="Clear"
          className="grid h-9 w-10 shrink-0 place-items-center rounded-lg text-[14px] ring-1 ring-black/10 transition-colors hover:bg-paper-2 disabled:opacity-35"
        >
          🧽
        </button>
      </div>
    </div>
  );
}
