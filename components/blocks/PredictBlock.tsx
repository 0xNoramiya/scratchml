"use client";

import { BlockShell } from "./BlockShell";
import { BLOCK_META } from "@/lib/blocks";
import { useStudio, sourceOf } from "@/lib/store";

interface Props {
  handleProps?: Record<string, unknown>;
  onRemove?: () => void;
}

export function PredictBlock({ handleProps, onRemove }: Props) {
  const meta = BLOCK_META.predict;
  const phase = useStudio((s) => s.phase);
  const source = useStudio((s) => sourceOf(s));
  const topId = useStudio((s) => s.topClassId);
  const topName = useStudio((s) => (topId ? s.classMeta[topId]?.name : null));
  const topEmoji = useStudio((s) => (topId ? s.classMeta[topId]?.emoji : null));

  const live = phase === "live";
  const hint =
    source === "sketchpad"
      ? "Draw one of your Things on the pad — the model guesses which it is."
      : meta.hint;

  return (
    <BlockShell token={meta.token} handleProps={handleProps} onRemove={onRemove}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.emoji}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-display text-[15px] font-bold text-white">{meta.label}</div>
          <div className="truncate text-[12px] font-bold text-white/80">{hint}</div>
        </div>
        {live && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-extrabold text-[color:var(--blk-edge)]">
            {topName ? (
              <>
                <span className="text-base leading-none">{topEmoji}</span>
                {topName}
              </>
            ) : (
              "watching… 👀"
            )}
          </span>
        )}
      </div>
    </BlockShell>
  );
}
