"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { DemoKind } from "@/components/Studio";

// TF.js + getUserMedia are browser-only, so the whole studio is client-rendered.
const Studio = dynamic(() => import("@/components/Studio"), {
  ssr: false,
  loading: () => <Splash />,
});

export default function StudioPage() {
  return (
    <Suspense fallback={<Splash />}>
      <StudioWithParams />
    </Suspense>
  );
}

function StudioWithParams() {
  const params = useSearchParams();
  const demoParam = params.get("demo");
  const initialDemo: DemoKind | null =
    demoParam === "camera" || demoParam === "sketch" ? demoParam : null;
  return <Studio initialDemo={initialDemo} />;
}

function Splash() {
  return (
    <div className="grid h-dvh place-items-center bg-paper">
      <div className="text-center">
        <div className="bob text-5xl">🤖</div>
        <p className="mt-3 font-display text-xl font-bold text-ink">
          Scratch<span className="text-prd">ML</span>
        </p>
        <p className="mt-1 text-[13px] font-bold text-ink-soft">warming up the blocks…</p>
      </div>
    </div>
  );
}
