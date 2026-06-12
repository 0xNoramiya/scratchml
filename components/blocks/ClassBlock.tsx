"use client";

import { useRef } from "react";
import { BlockShell } from "./BlockShell";
import { useStudio, sourceOf } from "@/lib/store";
import { useCapture } from "../CaptureContext";

interface Props {
  blockId: string;
  handleProps?: Record<string, unknown>;
  onRemove?: () => void;
}

export function ClassBlock({ blockId, handleProps, onRemove }: Props) {
  const meta = useStudio((s) => s.classMeta[blockId]);
  const renameClass = useStudio((s) => s.renameClass);
  const cycleEmoji = useStudio((s) => s.cycleEmoji);
  const clearSamples = useStudio((s) => s.clearClassSamples);
  const activeCaptureId = useStudio((s) => s.activeCaptureId);
  const setActiveCapture = useStudio((s) => s.setActiveCapture);
  const phase = useStudio((s) => s.phase);
  const source = useStudio((s) => sourceOf(s));
  const sketchDirty = useStudio((s) => s.sketchDirty);

  const { captureSample, cameraReady, ensureCamera } = useCapture();

  const holding = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  if (!meta) return null;
  const capturing = activeCaptureId === blockId;
  const locked = phase !== "build";
  const sketchMode = source === "sketchpad";

  const tick = async () => {
    if (!holding.current) return;
    try {
      await captureSample(blockId);
    } catch {
      /* frame not ready — skip */
    }
    if (holding.current) timer.current = window.setTimeout(tick, 80);
  };

  const startHold = () => {
    if (locked) return;
    if (!cameraReady) {
      ensureCamera();
      return;
    }
    holding.current = true;
    setActiveCapture(blockId);
    void tick();
  };

  const stopHold = () => {
    holding.current = false;
    if (timer.current) window.clearTimeout(timer.current);
    setActiveCapture(null);
  };

  const addDrawing = async () => {
    if (locked) return;
    try {
      await captureSample(blockId); // Studio flashes a hint if the pad is empty
    } catch {
      /* pad empty or not ready */
    }
  };

  return (
    <BlockShell
      token="cls"
      handleProps={handleProps}
      onRemove={onRemove}
      glow={capturing}
    >
      {/* Title row: emoji + name + count */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => cycleEmoji(blockId)}
          title="Tap to change the sticker"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/25 text-xl transition-transform hover:scale-110 active:scale-95"
          style={{ color: meta.color }}
        >
          {meta.emoji}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl bg-white px-2 py-1">
          <span className="text-[11px] font-extrabold text-ink-soft">I see a</span>
          <input
            value={meta.name}
            maxLength={16}
            onChange={(e) => renameClass(blockId, e.target.value)}
            placeholder="name it…"
            className="min-w-0 flex-1 bg-transparent font-display text-[15px] font-bold text-ink outline-none"
            style={{ color: meta.color }}
          />
        </div>
        <span className="shrink-0 rounded-full bg-black/15 px-2 py-1 text-[12px] font-extrabold text-white">
          {meta.sampleCount}
        </span>
      </div>

      {/* Thumbnails + capture controls */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex h-10 flex-1 items-center gap-1 overflow-hidden rounded-lg bg-black/12 px-1.5">
          {meta.thumbs.length === 0 ? (
            <span className="px-1 text-[11px] font-bold text-white/80">
              {sketchMode ? "no examples yet — draw, then tap add" : "no examples yet — hold the button →"}
            </span>
          ) : (
            meta.thumbs.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-cover ring-1 ring-white/60"
              />
            ))
          )}
        </div>

        {meta.sampleCount > 0 && !locked && (
          <button
            type="button"
            onClick={() => clearSamples(blockId)}
            title="Clear examples"
            className="grid h-10 w-9 shrink-0 place-items-center rounded-lg bg-black/12 text-white/85 transition-colors hover:bg-black/25"
          >
            🗑
          </button>
        )}
      </div>

      {sketchMode ? (
        <button
          type="button"
          disabled={locked}
          onClick={addDrawing}
          className="mt-2 w-full select-none rounded-xl bg-white px-3 py-2 text-center font-display text-[14px] font-bold text-[color:var(--blk-edge)] transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {locked ? "🔒 building done" : sketchDirty ? "➕ add this drawing" : "✏️ draw on the pad first"}
        </button>
      ) : (
        <button
          type="button"
          disabled={locked}
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className={`mt-2 w-full select-none touch-none rounded-xl px-3 py-2 text-center font-display text-[14px] font-bold transition-transform active:scale-[0.98] disabled:opacity-50 ${
            capturing
              ? "bg-[color:var(--color-bad)] text-white"
              : "bg-white text-[color:var(--blk-edge)]"
          }`}
        >
          {locked
            ? "🔒 building done"
            : !cameraReady
              ? "▶ turn on camera first"
              : capturing
                ? "📸 capturing… keep holding!"
                : "📸 hold to add examples"}
        </button>
      )}
    </BlockShell>
  );
}
