"use client";

import Link from "next/link";

interface TopBarProps {
  onShowDemos: () => void;
  onReset: () => void;
  onHelp: () => void;
}

export function TopBar({ onShowDemos, onReset, onHelp }: TopBarProps) {
  return (
    <header className="z-10 flex items-center justify-between gap-3 border-b-2 border-line bg-card/80 px-4 py-2.5 backdrop-blur">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-xl transition-transform hover:scale-[1.02]"
        aria-label="ScratchML home"
      >
        <LogoMark />
        <div className="leading-none">
          <div className="font-display text-xl font-bold text-ink">
            Scratch<span className="text-prd">ML</span>
          </div>
          <div className="hidden text-[11px] font-bold text-ink-soft sm:block">
            teach a computer to see — by snapping blocks
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onHelp}
          className="min-h-[40px] rounded-full px-3 py-2 text-[13px] font-extrabold text-ink-soft transition-colors hover:bg-paper-2"
        >
          ❓ How
        </button>
        <button
          type="button"
          onClick={onShowDemos}
          className="min-h-[40px] rounded-full bg-prd px-3.5 py-2 text-[13px] font-extrabold text-white ring-2 ring-prd-edge transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          ✨ Demos
        </button>
        <button
          type="button"
          onClick={onReset}
          className="min-h-[40px] rounded-full bg-card px-3 py-2 text-[13px] font-extrabold text-ink ring-2 ring-line transition-colors hover:bg-paper-2"
        >
          ↺ Reset
        </button>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <div className="relative h-9 w-9">
      <span className="absolute inset-0 rotate-[-8deg] rounded-lg bg-cls ring-2 ring-cls-edge" />
      <span className="absolute inset-0 translate-x-1 translate-y-0.5 rotate-[6deg] rounded-lg bg-cam ring-2 ring-cam-edge" />
      <span className="absolute inset-0 grid place-items-center rounded-lg bg-go text-lg ring-2 ring-go-edge">
        🧠
      </span>
    </div>
  );
}
