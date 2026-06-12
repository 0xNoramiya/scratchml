"use client";

import { BlockShell } from "./BlockShell";
import { BLOCK_META } from "@/lib/blocks";
import { useStudio } from "@/lib/store";

interface Props {
  handleProps?: Record<string, unknown>;
  onRemove?: () => void;
}

export function SketchpadBlock({ handleProps, onRemove }: Props) {
  const meta = BLOCK_META.sketchpad;
  const sketchDirty = useStudio((s) => s.sketchDirty);

  return (
    <BlockShell token={meta.token} handleProps={handleProps} onRemove={onRemove}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.emoji}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-display text-[15px] font-bold text-[color:var(--blk-text)]">{meta.label}</div>
          <div className="truncate text-[12px] font-bold text-[color:var(--blk-text)]/90">{meta.hint}</div>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
            sketchDirty ? "bg-white text-[color:var(--blk-text)]" : "bg-black/15 text-white/85"
          }`}
        >
          {sketchDirty ? "✏️ drawing!" : "pad empty"}
        </span>
      </div>
    </BlockShell>
  );
}
