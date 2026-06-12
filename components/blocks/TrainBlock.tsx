"use client";

import { BlockShell } from "./BlockShell";
import { BLOCK_META } from "@/lib/blocks";
import { useStudio } from "@/lib/store";

interface Props {
  handleProps?: Record<string, unknown>;
  onRemove?: () => void;
}

export function TrainBlock({ handleProps, onRemove }: Props) {
  const meta = BLOCK_META.train;
  const epochs = useStudio((s) => s.epochs);
  const setEpochs = useStudio((s) => s.setEpochs);
  const phase = useStudio((s) => s.phase);
  const training = useStudio((s) => s.training);

  const isTraining = phase === "training";
  const pct = training.total > 0 ? Math.round((training.epoch / training.total) * 100) : 0;

  return (
    <BlockShell token={meta.token} handleProps={handleProps} onRemove={onRemove}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.emoji}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-display text-[15px] font-bold text-[color:var(--blk-text)]">{meta.label}</div>
          <div className="truncate text-[12px] font-bold text-[color:var(--blk-text)]/90">{meta.hint}</div>
        </div>
      </div>

      {isTraining ? (
        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-[12px] font-extrabold text-[color:var(--blk-text)]">
            <span className="shimmer rounded bg-white/25 px-1">studying… round {training.epoch} of {training.total}</span>
            <span>{training.epoch > 0 ? `${Math.round(training.acc * 100)}% sure` : "starting…"}</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={`Training progress, epoch ${training.epoch} of ${training.total}`}
            className="h-3 overflow-hidden rounded-full bg-black/20"
          >
            <div
              className="h-full rounded-full bg-white transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : (
        <label className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-black/12 px-2.5 py-1.5">
          <span className="text-[12px] font-extrabold text-[color:var(--blk-text)]">practice rounds</span>
          <input
            type="range"
            min={5}
            max={80}
            step={5}
            value={epochs}
            onChange={(e) => setEpochs(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer accent-[color:var(--blk-text)]"
          />
          <span className="w-7 text-right font-display text-[15px] font-bold text-[color:var(--blk-text)]">{epochs}</span>
        </label>
      )}
    </BlockShell>
  );
}
