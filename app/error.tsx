"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-5 text-center">
      <div>
        <div className="text-6xl">🙈</div>
        <h1 className="mt-4 font-display text-4xl font-bold text-ink">Oops — I dropped my blocks</h1>
        <p className="mx-auto mt-2 max-w-sm text-[14px] font-bold text-ink-soft">
          Something went wrong on our side. Your camera and drawings never left your
          device — let&apos;s just try that again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-2xl bg-go px-6 py-3 font-display text-lg font-bold text-ink ring-2 ring-go-edge shadow-[0_5px_0_0_var(--color-go-edge)] transition-transform hover:-translate-y-0.5 active:translate-y-1"
        >
          ↺ Pick them back up
        </button>
      </div>
    </div>
  );
}
