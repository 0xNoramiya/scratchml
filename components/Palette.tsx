"use client";

import { useDraggable } from "@dnd-kit/core";
import { BlockType, BLOCK_META, PALETTE, SINGLETON, tokenVars } from "@/lib/blocks";
import { useStudio } from "@/lib/store";
import { playSfx } from "@/lib/sound";

export function Palette() {
  const phase = useStudio((s) => s.phase);
  const locked = phase !== "build";

  return (
    <aside className="flex w-full shrink-0 flex-col gap-2 px-3 py-3 lg:w-[210px] lg:gap-3 lg:overflow-y-auto lg:py-4 nice-scroll">
      <div className="px-1">
        <h2 className="font-display text-lg font-bold text-ink">Blocks</h2>
        <p className="text-[12px] font-bold text-ink-soft">tap to add · or drag →</p>
      </div>
      <div
        className={`flex flex-row gap-2.5 overflow-x-auto pb-1 lg:flex-col lg:gap-3 lg:overflow-x-visible lg:pb-0 nice-scroll ${
          locked ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {PALETTE.map((type) => (
          <PaletteItem key={type} type={type} locked={locked} />
        ))}
      </div>

      <div className="mt-auto hidden rounded-2xl bg-white/70 p-3 text-[12px] font-bold leading-snug text-ink-soft ring-1 ring-line lg:block">
        <span className="font-display text-ink">Recipe order</span>
        <ol className="mt-1 list-inside list-decimal space-y-0.5">
          <li>Pick eyes: 📷 or ✏️</li>
          <li>Teach 2+ Things</li>
          <li>Train the Brain</li>
          <li>Guess It!</li>
        </ol>
      </div>
    </aside>
  );
}

function PaletteItem({ type, locked }: { type: BlockType; locked: boolean }) {
  const meta = BLOCK_META[type];
  const addBlock = useStudio((s) => s.addBlock);
  const already = useStudio(
    (s) => SINGLETON.includes(type) && s.script.some((b) => b.type === type),
  );

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { fromPalette: true, blockType: type },
    disabled: already || locked,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={already}
      onClick={() => {
        playSfx("snap");
        addBlock(type);
      }}
      className={`toy-block toy-block--hover toy-block--press w-auto min-w-[170px] shrink-0 touch-none px-3 py-2.5 text-left lg:w-full lg:min-w-0 ${
        isDragging ? "opacity-40" : ""
      } ${already ? "cursor-not-allowed opacity-45" : "cursor-grab"}`}
      style={tokenVars(meta.token)}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{meta.emoji}</span>
        <div className="leading-tight">
          <div className="font-display text-[14px] font-bold text-[color:var(--blk-text)]">{meta.label}</div>
          {already && <div className="text-[11px] font-bold text-[color:var(--blk-text)]/90">added ✓</div>}
        </div>
      </div>
    </button>
  );
}
