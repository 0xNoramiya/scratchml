"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  { emoji: "✨", title: "Show", text: "Snap camera examples — or draw them on the sketchpad." },
  { emoji: "🧠", title: "Train", text: "Press GO. The computer studies your pictures in seconds." },
  { emoji: "👀", title: "Guess", text: "Show it something new — watch it guess, live!" },
];

export function Onboarding({
  onExample,
  onSketchExample,
  onBlank,
  existingExamples = 0,
}: {
  onExample: () => void;
  onSketchExample: () => void;
  onBlank: () => void;
  /** How many examples the child has already captured this session. */
  existingExamples?: number;
}) {
  // Escape dismisses into blank canvas; re-opening mid-session requires a double-tap to confirm (loading a demo wipes existing examples).
  const panelRef = useDialog<HTMLDivElement>(onBlank);
  const [pendingDemo, setPendingDemo] = useState<null | "camera" | "sketch">(null);
  const hasWork = existingExamples > 0;
  const guard = (kind: "camera" | "sketch", run: () => void) => {
    if (hasWork && pendingDemo !== kind) {
      setPendingDemo(kind);
      return;
    }
    run();
  };
  return (
    <Backdrop onClose={onBlank}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className="pop-in w-full max-w-lg rounded-3xl bg-card p-6 ring-2 ring-line shadow-2xl outline-none sm:p-8"
      >
        <div className="mb-1 flex justify-center gap-1 text-3xl">
          <span className="bob">🤖</span>
        </div>
        <h1
          id="onboarding-title"
          className="text-center font-display text-3xl font-bold leading-tight text-ink sm:text-4xl"
        >
          Teach a computer to <span className="text-prd">see</span> 👀
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-[14px] font-bold text-ink-soft">
          No code. No math. Just snap colorful blocks together and build a <i>real</i> machine-learning
          model — right here in your browser.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl bg-paper p-3 text-center ring-1 ring-line">
              <div className="text-2xl">{s.emoji}</div>
              <div className="mt-1 font-display text-[15px] font-bold text-ink">{s.title}</div>
              <div className="mt-0.5 text-[11px] font-bold leading-tight text-ink-soft">{s.text}</div>
            </div>
          ))}
        </div>

        {hasWork && (
          <p
            role="alert"
            className="mt-5 rounded-2xl bg-[color:var(--color-bad)]/15 px-3 py-2 text-center text-[12px] font-extrabold text-ink ring-1 ring-[color:var(--color-bad)]/40"
          >
            ⚠️ Loading a demo replaces your {existingExamples}{" "}
            {existingExamples === 1 ? "example" : "examples"}. Tap a demo twice to confirm.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => guard("camera", onExample)}
            className="rounded-2xl bg-go px-4 py-3 font-display text-lg font-bold text-ink ring-2 ring-go-edge shadow-[0_5px_0_0_var(--color-go-edge)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_0_var(--color-go-edge)]"
          >
            {pendingDemo === "camera"
              ? "⚠️ Tap again to replace your examples"
              : "📷 Camera demo: Happy vs Sad"}
          </button>
          <button
            type="button"
            onClick={() => guard("sketch", onSketchExample)}
            className="rounded-2xl bg-skb px-4 py-3 font-display text-lg font-bold text-[color:var(--color-skb-text)] ring-2 ring-skb-edge shadow-[0_5px_0_0_var(--color-skb-edge)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_0_var(--color-skb-edge)]"
          >
            {pendingDemo === "sketch"
              ? "⚠️ Tap again to replace your examples"
              : "✏️ Drawing demo: no camera needed!"}
          </button>
          {hasWork ? (
            <button
              type="button"
              onClick={onBlank}
              className="rounded-2xl bg-card px-4 py-2.5 font-display text-base font-bold text-ink ring-2 ring-line transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              ✕ Keep building — don&apos;t change anything
            </button>
          ) : (
            <button
              type="button"
              onClick={onBlank}
              className="rounded-2xl bg-card px-4 py-2.5 font-display text-base font-bold text-ink ring-2 ring-line transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              🧩 Build my own from scratch
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] font-bold text-ink-soft">
          🔒 Camera-shy? Pick the drawing demo — either way, everything stays on your device.
        </p>
      </div>
    </Backdrop>
  );
}

export function HelpModal({
  source = null,
  onClose,
}: {
  source?: "camera" | "sketchpad" | null;
  onClose: () => void;
}) {
  const panelRef = useDialog<HTMLDivElement>(onClose);
  return (
    <Backdrop onClose={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        tabIndex={-1}
        className="pop-in w-full max-w-md rounded-3xl bg-card p-6 ring-2 ring-line shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between">
          <h2 id="help-title" className="font-display text-2xl font-bold text-ink">
            How ScratchML works
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-paper text-lg ring-1 ring-line hover:bg-paper-2"
          >
            ×
          </button>
        </div>

        <ol className="mt-4 space-y-3">
          <Item n="1" color="var(--color-cam)" title="Pick its eyes: Camera or Sketchpad">
            The model needs to see! Use live webcam frames — or, if you&apos;d rather not use a
            camera, draw your examples on the sketchpad instead.
          </Item>
          <Item n="2" color="var(--color-cls)" title="Teach a Thing (×2 or more)">
            Each block is a label. Hold its button to snap camera examples (or tap ➕ to add
            drawings) — try 15-20 each, with variety.
          </Item>
          <Item n="3" color="var(--color-trn)" title="Train the Brain">
            A tiny neural network learns to tell your Things apart, using a pre-trained vision model
            called MobileNet. This is called <b>transfer learning</b>.
          </Item>
          <Item n="4" color="var(--color-prd)" title="Guess It!">
            {source === "sketchpad"
              ? "Draw one of your Things on the pad — watch the confidence bars update live!"
              : "Show the camera something new and the model guesses which Thing it is — with a confidence score for each."}
          </Item>
        </ol>

        <p className="mt-4 rounded-2xl bg-paper p-3 text-[12px] font-bold leading-snug text-ink-soft ring-1 ring-line">
          💡 Tip: more examples + varied backgrounds = smarter model. Keep lighting steady and have
          fun!
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-prd px-4 py-3 font-display text-lg font-bold text-white ring-2 ring-prd-edge transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          Got it! Let's build 🚀
        </button>
      </div>
    </Backdrop>
  );
}

function Item({
  n,
  color,
  title,
  children,
}: {
  n: string;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-sm font-bold text-white"
        style={{ background: color }}
      >
        {n}
      </span>
      <div className="leading-snug">
        <div className="font-display text-[15px] font-bold text-ink">{title}</div>
        <p className="text-[12.5px] font-bold text-ink-soft">{children}</p>
      </div>
    </li>
  );
}

/** Focus trap + Escape dismiss for both dialogs. Returns a ref for the panel element. */
function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const panel = ref.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null || el === panel);

    (focusables()[0] ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      prevFocus?.focus?.();
    };
  }, [onClose]);
  return ref;
}

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
