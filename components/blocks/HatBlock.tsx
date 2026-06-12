"use client";

import { tokenVars } from "@/lib/blocks";

/** The "cap" of the program — non-draggable, always at the top. */
export function HatBlock() {
  return (
    <div
      className="toy-block snap-bump select-none"
      style={{
        ...tokenVars("ev"),
        borderTopLeftRadius: "28px",
        borderTopRightRadius: "28px",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/35 text-lg text-[color:var(--blk-text)]">
          ▶
        </span>
        <div className="leading-tight">
          <div className="font-display text-lg font-bold text-[color:var(--blk-text)]">
            When I press <span className="rounded-md bg-white/40 px-1.5">GO</span>
          </div>
          <div className="text-[12px] font-bold text-[color:var(--blk-text)]/90">
            start the experiment
          </div>
        </div>
      </div>
    </div>
  );
}
