import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-5 text-center">
      <div>
        <div className="bob text-6xl">🤖</div>
        <h1 className="mt-4 font-display text-4xl font-bold text-ink">
          404 — I looked <em>everywhere</em>
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[14px] font-bold text-ink-soft">
          I&apos;m trained to recognize lots of things, but this page isn&apos;t one of them.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-2xl bg-go px-6 py-3 font-display text-lg font-bold text-ink ring-2 ring-go-edge shadow-[0_5px_0_0_var(--color-go-edge)] transition-transform hover:-translate-y-0.5 active:translate-y-1"
        >
          🏠 Back home
        </Link>
      </div>
    </div>
  );
}
