"use client";

import { useMemo } from "react";
import { useStudio } from "@/lib/store";

export function PredictionBars() {
  const script = useStudio((s) => s.script);
  const blocks = useMemo(() => script.filter((b) => b.type === "class"), [script]);
  const classMeta = useStudio((s) => s.classMeta);
  const predictions = useStudio((s) => s.predictions);
  const topId = useStudio((s) => s.topClassId);

  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) => {
        const meta = classMeta[b.id];
        if (!meta) return null;
        const p = predictions[i] ?? 0;
        const pct = Math.round(p * 100);
        const isTop = topId === b.id && p > 0.15;
        return (
          <div
            key={b.id}
            className={`rounded-xl bg-white px-2.5 py-2 ring-1 transition-all ${
              isTop ? "ring-2 scale-[1.01]" : "ring-line"
            }`}
            style={isTop ? { boxShadow: `0 0 0 1px ${meta.color}` } : undefined}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-base leading-none">{meta.emoji}</span>
              <span className="flex-1 truncate font-display text-[13px] font-bold text-ink">
                {meta.name || "unnamed"}
              </span>
              <span
                className="font-display text-[13px] font-bold"
                style={{ color: meta.color }}
              >
                {pct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-paper-2">
              <div
                className="h-full rounded-full transition-all duration-150 ease-out"
                style={{ width: `${pct}%`, background: meta.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
