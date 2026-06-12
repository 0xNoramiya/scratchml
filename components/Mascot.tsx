"use client";

import { useStudio, sourceOf } from "@/lib/store";

type Mood = "boot" | "idle" | "think" | "happy" | "hmm";

export function Mascot() {
  const modelStatus = useStudio((s) => s.modelStatus);
  const phase = useStudio((s) => s.phase);
  const training = useStudio((s) => s.training);
  const predictions = useStudio((s) => s.predictions);
  const topId = useStudio((s) => s.topClassId);
  const topName = useStudio((s) => (topId ? s.classMeta[topId]?.name : null));
  const source = useStudio((s) => sourceOf(s));

  const conf = predictions.length ? Math.max(...predictions) : 0;

  let mood: Mood = "idle";
  let line = "Snap some blocks together to start!";

  if (phase === "build" && modelStatus !== "ready") {
    mood = "boot";
    line = "Warming up my brain… one sec! 🔌";
  } else if (phase === "training") {
    mood = "think";
    line = `Studying your examples… ${Math.round((training.acc || 0) * 100)}% there!`;
  } else if (phase === "live") {
    if (conf > 0.75 && topName) {
      mood = "happy";
      line = `I think that's a ${topName}! 🎉`;
    } else {
      mood = "hmm";
      line =
        source === "sketchpad"
          ? "Draw one of your Things on the pad…"
          : "Show me something you taught me…";
    }
  } else if (phase === "build" && modelStatus === "ready") {
    mood = "idle";
    line = "Ready! Teach me a couple of Things 👇";
  }

  return (
    <div className="flex items-center gap-3">
      <div className="bob shrink-0">
        <RobotFace mood={mood} />
      </div>
      <div className="relative flex-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-[13px] font-bold leading-snug text-ink shadow-[0_4px_0_0_rgba(43,34,51,0.10)] ring-1 ring-line">
        <span
          className="absolute -left-1.5 bottom-2 h-3 w-3 rotate-45 bg-white ring-1 ring-line"
          aria-hidden
        />
        {line}
      </div>
    </div>
  );
}

function RobotFace({ mood }: { mood: Mood }) {
  const happy = mood === "happy";
  const think = mood === "think" || mood === "boot";
  const antenna = mood === "boot" ? "#ff5d5d" : mood === "think" ? "#ffce3a" : "#54c265";

  return (
    <svg width="60" height="60" viewBox="0 0 60 60" aria-label="ScratchML robot">
      {/* antenna */}
      <line x1="30" y1="6" x2="30" y2="13" stroke="#2b2233" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="30" cy="5" r="3.4" fill={antenna} stroke="#2b2233" strokeWidth="2">
        {(mood === "boot" || mood === "think") && (
          <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
        )}
      </circle>
      {/* head */}
      <rect x="10" y="13" width="40" height="34" rx="12" fill="#a674f2" stroke="#2b2233" strokeWidth="2.5" />
      <rect x="10" y="13" width="40" height="34" rx="12" fill="url(#g)" opacity="0.18" />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* eyes */}
      {happy ? (
        <>
          <path d="M18 30 q4 -5 8 0" fill="none" stroke="#2b2233" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M34 30 q4 -5 8 0" fill="none" stroke="#2b2233" strokeWidth="2.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={think ? 23 : 22} cy={think ? 27 : 29} r="3.4" fill="#fff" />
          <circle cx={think ? 23 : 22} cy={think ? 27 : 29} r="1.7" fill="#2b2233" />
          <circle cx={think ? 39 : 38} cy={think ? 27 : 29} r="3.4" fill="#fff" />
          <circle cx={think ? 39 : 38} cy={think ? 27 : 29} r="1.7" fill="#2b2233" />
        </>
      )}
      {/* mouth */}
      {happy ? (
        <path d="M22 37 q8 8 16 0" fill="#2b2233" />
      ) : mood === "hmm" ? (
        <circle cx="30" cy="39" r="2.6" fill="#2b2233" />
      ) : (
        <rect x="24" y="38" width="12" height="3" rx="1.5" fill="#2b2233" />
      )}
      {/* ears */}
      <rect x="6" y="26" width="4" height="10" rx="2" fill="#864fdf" stroke="#2b2233" strokeWidth="2" />
      <rect x="50" y="26" width="4" height="10" rx="2" fill="#864fdf" stroke="#2b2233" strokeWidth="2" />
    </svg>
  );
}
