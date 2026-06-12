"use client";

import { BlockShell } from "./BlockShell";
import { BLOCK_META } from "@/lib/blocks";
import { useStudio } from "@/lib/store";

interface Props {
  handleProps?: Record<string, unknown>;
  onRemove?: () => void;
}

export function CameraBlock({ handleProps, onRemove }: Props) {
  const camera = useStudio((s) => s.camera);
  const meta = BLOCK_META.camera;

  const live = camera === "on";

  return (
    <BlockShell token={meta.token} handleProps={handleProps} onRemove={onRemove}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.emoji}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-display text-[15px] font-bold text-white">{meta.label}</div>
          <div className="truncate text-[12px] font-bold text-white/80">{meta.hint}</div>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
            live ? "bg-white text-[color:var(--blk-edge)]" : "bg-black/15 text-white/85"
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              live ? "bg-[color:var(--color-bad)] rec-dot" : "bg-white/70"
            }`}
          />
          {live ? "LIVE" : camera === "denied" ? "blocked" : "off"}
        </span>
      </div>
    </BlockShell>
  );
}
