"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScriptBlock } from "@/lib/blocks";
import { useStudio } from "@/lib/store";
import { HatBlock } from "./blocks/HatBlock";
import { CameraBlock } from "./blocks/CameraBlock";
import { SketchpadBlock } from "./blocks/SketchpadBlock";
import { ClassBlock } from "./blocks/ClassBlock";
import { TrainBlock } from "./blocks/TrainBlock";
import { PredictBlock } from "./blocks/PredictBlock";

export function ScriptCanvas() {
  const script = useStudio((s) => s.script);
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div className="relative min-h-[55vh] flex-1 nice-scroll dotgrid lg:min-h-0 lg:overflow-y-auto">
      <div
        ref={setNodeRef}
        className={`mx-auto min-h-full w-full max-w-[420px] px-5 py-6 transition-colors ${
          isOver ? "bg-white/30" : ""
        }`}
      >
        <HatBlock />
        <div className="h-1.5" />

        <SortableContext items={script.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {script.map((b) => (
              <SortableBlock key={b.id} block={b} />
            ))}
          </div>
        </SortableContext>

        {script.length === 0 ? (
          <DropHint />
        ) : (
          <div className="mt-3 flex justify-center">
            <span className="rounded-full bg-white/70 px-3 py-1 text-[12px] font-bold text-ink-soft ring-1 ring-line">
              drag blocks from the left to add more
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DropHint() {
  return (
    <div className="mt-3 grid place-items-center rounded-2xl border-[3px] border-dashed border-line bg-white/40 px-6 py-10 text-center">
      <div className="text-4xl">🧩</div>
      <p className="mt-2 font-display text-lg font-bold text-ink">Build your recipe!</p>
      <p className="max-w-[16rem] text-[13px] font-bold text-ink-soft">
        Tap or drag blocks from the left. Start with <b>📷 Camera</b> or <b>✏️ Sketchpad</b>.
      </p>
    </div>
  );
}

function SortableBlock({ block }: { block: ScriptBlock }) {
  const removeBlock = useStudio((s) => s.removeBlock);
  // Lock structure while training/playing: no reordering or deleting mid-run,
  // otherwise the predictions array desyncs from the class list.
  const locked = useStudio((s) => s.phase !== "build");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { type: block.type },
    disabled: locked,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleProps = locked ? undefined : { ...attributes, ...listeners };
  const onRemove = locked ? undefined : () => removeBlock(block.id);

  return (
    <div ref={setNodeRef} style={style} className="pop-in pb-2">
      {block.type === "camera" && <CameraBlock handleProps={handleProps} onRemove={onRemove} />}
      {block.type === "sketchpad" && (
        <SketchpadBlock handleProps={handleProps} onRemove={onRemove} />
      )}
      {block.type === "class" && (
        <ClassBlock blockId={block.id} handleProps={handleProps} onRemove={onRemove} />
      )}
      {block.type === "train" && <TrainBlock handleProps={handleProps} onRemove={onRemove} />}
      {block.type === "predict" && <PredictBlock handleProps={handleProps} onRemove={onRemove} />}
    </div>
  );
}
