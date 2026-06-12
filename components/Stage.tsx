"use client";

import { ReactNode, RefObject, useMemo } from "react";
import { useStudio, sourceOf } from "@/lib/store";
import { Mascot } from "./Mascot";
import { PredictionBars } from "./PredictionBars";

export interface StageHint {
  msg: string;
  kind: "err" | "ok";
}

interface StageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onToggleCamera: () => void;
  onUseSketch: () => void;
  onRun: () => void;
  onStop: () => void;
  hint: StageHint | null;
  /** Rendered instead of the camera when the recipe uses the sketchpad. */
  sketchpad: ReactNode;
}

export function Stage({
  videoRef,
  onToggleCamera,
  onUseSketch,
  onRun,
  onStop,
  hint,
  sketchpad,
}: StageProps) {
  const phase = useStudio((s) => s.phase);
  const camera = useStudio((s) => s.camera);
  const modelStatus = useStudio((s) => s.modelStatus);
  const training = useStudio((s) => s.training);
  const topId = useStudio((s) => s.topClassId);
  const topMeta = useStudio((s) => (topId ? s.classMeta[topId] : null));
  const predictions = useStudio((s) => s.predictions);
  const script = useStudio((s) => s.script);
  const classes = useMemo(() => script.filter((b) => b.type === "class"), [script]);
  const classMeta = useStudio((s) => s.classMeta);
  const source = useStudio((s) => sourceOf(s));

  const live = phase === "live";
  const conf = predictions.length ? Math.max(...predictions) : 0;
  const showGuess = live && topMeta && conf > 0.6;

  return (
    <aside className="order-first flex w-full shrink-0 flex-col gap-3 bg-white/55 px-4 py-4 ring-1 ring-line backdrop-blur-sm nice-scroll lg:order-none lg:w-[360px] lg:overflow-y-auto">
      <Mascot />

      {/* Eyes: sketchpad or camera */}
      {sketchpad ? (
        <div className="relative">
          {sketchpad}
          {/* live guess badge over the pad */}
          {showGuess && topMeta && (
            <GuessBadge name={topMeta.name} emoji={topMeta.emoji} color={topMeta.color} conf={conf} />
          )}
        </div>
      ) : (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink ring-2 ring-line">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full -scale-x-100 object-cover ${camera === "on" ? "" : "opacity-0"}`}
          />

          {camera !== "on" && (
            <div className="absolute inset-0 grid place-items-center p-5 text-center">
              <div>
                <div className="text-4xl">{camera === "denied" ? "🚫" : "📷"}</div>
                <p className="mt-2 font-display text-base font-bold text-white">
                  {camera === "denied" ? "Camera blocked" : "Camera is off"}
                </p>
                <p className="mx-auto mt-0.5 max-w-[15rem] text-[12px] font-bold text-white/70">
                  {camera === "denied"
                    ? "That's okay! You can teach the model by drawing instead."
                    : "Turn it on so the model can see — or draw instead."}
                </p>
                <div className="mt-3 flex flex-col items-center gap-2">
                  {camera !== "denied" && (
                    <button
                      type="button"
                      onClick={onToggleCamera}
                      className="rounded-full bg-white px-4 py-1.5 font-display text-[13px] font-bold text-ink shadow transition-transform hover:scale-105 active:scale-95"
                    >
                      ▶ Turn on camera
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onUseSketch}
                    className="rounded-full bg-skb px-4 py-1.5 font-display text-[13px] font-bold text-white ring-2 ring-skb-edge shadow transition-transform hover:scale-105 active:scale-95"
                  >
                    ✏️ Use the Sketchpad instead
                  </button>
                </div>
              </div>
            </div>
          )}

          {showGuess && topMeta && (
            <GuessBadge name={topMeta.name} emoji={topMeta.emoji} color={topMeta.color} conf={conf} />
          )}

          {camera === "on" && (
            <button
              type="button"
              onClick={onToggleCamera}
              className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur transition-colors hover:bg-black/65"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--color-bad)] rec-dot" />
              LIVE · turn off
            </button>
          )}
        </div>
      )}

      {/* Status / bars */}
      <div className="min-h-[2rem]">
        {live ? (
          <PredictionBars />
        ) : (
          <ExampleStatus classes={classes} classMeta={classMeta} source={source} />
        )}
      </div>

      {/* Controls */}
      <div className="mt-auto flex flex-col gap-2 pt-1">
        {hint && (
          <div
            className={`rounded-xl px-3 py-2 text-center text-[13px] font-extrabold text-white shadow ${
              hint.kind === "ok" ? "bg-good" : "bg-[color:var(--color-bad)]"
            }`}
          >
            {hint.msg}
          </div>
        )}

        {phase === "build" && (
          <GoButton ready={modelStatus === "ready"} onClick={onRun} />
        )}
        {phase === "training" && (
          <button
            disabled
            className="w-full cursor-wait rounded-2xl bg-trn px-4 py-3.5 font-display text-lg font-bold text-white ring-2 ring-trn-edge"
          >
            🧠 Training… {training.total ? Math.round((training.epoch / training.total) * 100) : 0}%
          </button>
        )}
        {phase === "live" && (
          <button
            type="button"
            onClick={onStop}
            className="w-full rounded-2xl bg-card px-4 py-3.5 font-display text-lg font-bold text-ink ring-2 ring-line transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
          >
            ↺ Teach me more
          </button>
        )}
      </div>
    </aside>
  );
}

function GuessBadge({
  name,
  emoji,
  color,
  conf,
}: {
  name: string;
  emoji: string;
  color: string;
  conf: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex items-end justify-center p-3">
      <div
        className="wiggle flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2 shadow-lg"
        style={{ boxShadow: `0 6px 0 0 ${color}` }}
      >
        <span className="text-2xl">{emoji}</span>
        <div className="leading-tight">
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-ink-soft">
            I see a
          </div>
          <div className="font-display text-lg font-bold" style={{ color }}>
            {name}
          </div>
        </div>
        <span className="ml-1 font-display text-sm font-bold text-ink-soft">
          {Math.round(conf * 100)}%
        </span>
      </div>
    </div>
  );
}

function GoButton({ ready, onClick }: { ready: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!ready}
      className="w-full rounded-2xl bg-go px-4 py-3.5 font-display text-xl font-bold text-ink ring-2 ring-go-edge shadow-[0_6px_0_0_var(--color-go-edge)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_0_var(--color-go-edge)] disabled:cursor-wait disabled:opacity-70"
    >
      {ready ? "🚀 Train & Play!" : "🔌 loading brain…"}
    </button>
  );
}

function ExampleStatus({
  classes,
  classMeta,
  source,
}: {
  classes: { id: string }[];
  classMeta: Record<string, { name: string; emoji: string; color: string; sampleCount: number }>;
  source: "camera" | "sketchpad" | null;
}) {
  if (classes.length === 0) {
    return (
      <p className="rounded-xl bg-white px-3 py-2 text-center text-[12px] font-bold text-ink-soft ring-1 ring-line">
        Add some <b>Teach a Thing</b> blocks
        {source === "sketchpad"
          ? " — draw on the pad, then tap ➕ to save examples ✏️"
          : ", then hold their buttons to snap examples 📸"}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {classes.map(({ id }) => {
        const m = classMeta[id];
        if (!m) return null;
        const ok = m.sampleCount >= 5;
        return (
          <span
            key={id}
            className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-extrabold ring-1 ring-line"
            style={{ color: m.color }}
          >
            <span>{m.emoji}</span>
            {m.name || "?"}
            <span className={ok ? "text-good" : "text-ink-soft"}>{m.sampleCount}{ok ? " ✓" : ""}</span>
          </span>
        );
      })}
    </div>
  );
}
