"use client";

import { CSSProperties, ReactNode } from "react";
import { tokenVars } from "@/lib/blocks";

interface BlockShellProps {
  token: string;
  children: ReactNode;
  onRemove?: () => void;
  /** dnd-kit listeners; when omitted (e.g. while running) no grip is shown. */
  handleProps?: Record<string, unknown>;
  notch?: boolean;
  bump?: boolean;
  glow?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function BlockShell({
  token,
  children,
  onRemove,
  handleProps,
  notch = true,
  bump = true,
  glow = false,
  style,
  className = "",
}: BlockShellProps) {
  return (
    <div
      className={`toy-block ${notch ? "snap-notch" : ""} ${bump ? "snap-bump" : ""} ${className}`}
      style={{
        ...tokenVars(token),
        ...(glow
          ? { outline: "3px solid #fff", outlineOffset: "3px" }
          : {}),
        ...style,
      }}
    >
      <div className="flex items-stretch gap-2 p-2.5 pr-3">
        {handleProps && (
          <button
            type="button"
            aria-label="Drag to reorder"
            className="-my-2.5 -ml-2.5 flex w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-[14px] text-white/55 transition-colors hover:bg-black/10 hover:text-white/90 active:cursor-grabbing"
            {...handleProps}
          >
            <GripIcon />
          </button>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      {onRemove && (
        <button
          type="button"
          aria-label="Remove block"
          onClick={onRemove}
          className="absolute -right-2 -top-2 z-[2] grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[var(--blk-edge)] text-sm font-bold text-white shadow-md transition-transform hover:scale-110 active:scale-95"
        >
          ×
        </button>
      )}
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="10" height="18" viewBox="0 0 10 18" fill="currentColor" aria-hidden>
      {[3, 9, 15].map((cy) =>
        [2.5, 7.5].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" />),
      )}
    </svg>
  );
}
