import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { BrainPreloader } from "@/components/BrainPreloader";

export const metadata: Metadata = {
  title: "ScratchML — Teach a computer to see, by snapping blocks",
  description:
    "A playground where kids and beginners build a real machine-learning model with zero code. Snap blocks, show examples (webcam or drawings), and watch it learn — live, in your browser.",
};

/* Mini "toy block" rows used in the hero illustration. Static markup —
   the real draggable ones live in the studio. */
const RECIPE = [
  { emoji: "▶", label: "When I press GO", token: "ev", rotate: "-rotate-2" },
  { emoji: "✏️", label: "Use the Sketchpad", token: "skb", rotate: "rotate-1" },
  { emoji: "🏷️", label: "Teach: Circle ⭕", token: "cls", rotate: "-rotate-1" },
  { emoji: "🏷️", label: "Teach: Square 🟦", token: "cls", rotate: "rotate-2" },
  { emoji: "🧠", label: "Train the Brain", token: "trn", rotate: "-rotate-1" },
  { emoji: "✨", label: "Guess It!", token: "prd", rotate: "rotate-1" },
];

const STEPS = [
  {
    emoji: "🧩",
    title: "Snap blocks",
    text: "Stack a recipe like Scratch: eyes, things to learn, a brain, a guesser.",
    bg: "bg-cam",
    edge: "ring-cam-edge",
  },
  {
    emoji: "📸",
    title: "Show examples",
    text: "Snap webcam pictures — or draw them on the sketchpad. 15–20 each is plenty.",
    bg: "bg-cls",
    edge: "ring-cls-edge",
  },
  {
    emoji: "🧠",
    title: "Train in seconds",
    text: "A tiny neural network studies your examples right in the browser.",
    bg: "bg-trn",
    edge: "ring-trn-edge",
  },
  {
    emoji: "🎉",
    title: "Watch it guess",
    text: "Show it something new and see live confidence bars. Confetti included.",
    bg: "bg-prd",
    edge: "ring-prd-edge",
  },
];

const TRUST = [
  {
    emoji: "🔒",
    title: "Private by design",
    text: "Camera frames and drawings never leave the device. There is no server to send them to.",
  },
  {
    emoji: "🧠",
    title: "Real machine learning",
    text: "Genuine transfer learning on MobileNet via TensorFlow.js — not a simulation.",
  },
  {
    emoji: "✏️",
    title: "No camera needed",
    text: "Camera-shy? The sketchpad mode trains on your drawings instead.",
  },
  {
    emoji: "🚀",
    title: "Nothing to install",
    text: "Runs in any modern browser, on laptops, tablets, and phones.",
  },
];

export default function Landing() {
  return (
    <div className="relative overflow-x-clip">
      <BrainPreloader />
      {/* atmosphere */}
      <div className="atmosphere">
        <span className="blob left-[8%] top-[6%] h-64 w-64 bg-[#ffd2a8] animate-float" />
        <span
          className="blob right-[6%] top-[18%] h-72 w-72 bg-[#ffc2dd] animate-float"
          style={{ animationDelay: "-3s" }}
        />
        <span
          className="blob bottom-[10%] left-[30%] h-80 w-80 bg-[#bfe0ff] animate-float"
          style={{ animationDelay: "-6s" }}
        />
      </div>

      <div className="relative z-[1]">
        {/* ---------- Nav ---------- */}
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl font-bold text-ink">
              Scratch<span className="text-prd">ML</span>
            </span>
          </div>
          <Link
            href="/studio"
            className="rounded-full bg-ink px-4 py-2 font-display text-[14px] font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
          >
            Open the Studio →
          </Link>
        </nav>

        {/* ---------- Hero ---------- */}
        <header className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-2 md:pb-24 md:pt-14">
          {/* crayon-doodle stickers (decorative) */}
          <Image
            src="/art/sticker-star.png"
            alt=""
            aria-hidden
            width={86}
            height={86}
            className="animate-float pointer-events-none absolute -top-2 right-[4%] hidden rotate-12 select-none md:block"
          />
          <Image
            src="/art/sticker-rainbow.png"
            alt=""
            aria-hidden
            width={96}
            height={96}
            className="animate-float pointer-events-none absolute bottom-2 left-[42%] hidden -rotate-6 select-none lg:block"
            style={{ animationDelay: "-4s" }}
          />
          <div>
            <p className="pop-in inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[12px] font-extrabold text-ink-soft ring-1 ring-line">
              <span className="bob inline-block">🤖</span> for kids, classrooms & the curious
            </p>
            <h1
              className="pop-in mt-4 font-display text-5xl font-bold leading-[1.05] text-ink sm:text-6xl"
              style={{ animationDelay: "60ms" }}
            >
              Teach a computer
              <br />
              to <span className="text-prd">see</span>
              <span className="text-cls">.</span>
            </h1>
            <p
              className="pop-in mt-4 max-w-md text-lg font-bold leading-relaxed text-ink-soft"
              style={{ animationDelay: "120ms" }}
            >
              Snap colorful blocks into a recipe, show a few examples, and watch a{" "}
              <em>real</em> machine-learning model learn — live, in your browser. No code.
              No math. No accounts.
            </p>

            <div
              className="pop-in mt-7 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "180ms" }}
            >
              <Link
                href="/studio"
                className="rounded-2xl bg-go px-6 py-3.5 font-display text-lg font-bold text-ink ring-2 ring-go-edge shadow-[0_6px_0_0_var(--color-go-edge)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_0_var(--color-go-edge)]"
              >
                🚀 Start building — it&apos;s free
              </Link>
            </div>

            <p className="mt-4 text-[12px] font-bold text-ink-soft">
              🔒 Your camera frames and drawings never leave your browser — no ML data is
              uploaded, ever.
            </p>
          </div>

          {/* Block-stack illustration */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -right-7 -top-9 z-[2] sm:-right-9">
              <span className="bob inline-block text-6xl drop-shadow-lg" aria-hidden>
                🤖
              </span>
            </div>
            <div className="dotgrid rounded-3xl bg-white/60 p-6 ring-2 ring-line backdrop-blur-sm">
              <div className="flex flex-col gap-2.5">
                {RECIPE.map((b, i) => (
                  <div
                    key={b.label}
                    className={`toy-block pop-in px-4 py-2.5 ${b.rotate}`}
                    style={
                      {
                        "--blk": `var(--color-${b.token})`,
                        "--blk-edge": `var(--color-${b.token}-edge)`,
                        "--blk-text": `var(--color-${b.token}-text)`,
                        animationDelay: `${200 + i * 90}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <div className="flex items-center gap-3 text-[color:var(--blk-text)]">
                      <span className="text-xl">{b.emoji}</span>
                      <span className="font-display text-[15px] font-bold">
                        {b.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="pop-in mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 ring-1 ring-line"
                style={{ animationDelay: "800ms" }}
              >
                <span className="font-display text-[14px] font-bold text-ink">
                  ⭕ Circle
                </span>
                <span className="h-2.5 w-24 overflow-hidden rounded-full bg-paper-2">
                  <span className="block h-full w-[92%] rounded-full bg-good" />
                </span>
                <span className="font-display text-[14px] font-bold text-good">92%</span>
              </div>
            </div>
          </div>
        </header>

        {/* ---------- How it works ---------- */}
        <section className="relative bg-white/55 py-16 ring-1 ring-line backdrop-blur-sm">
          <Image
            src="/art/sticker-bolt.png"
            alt=""
            aria-hidden
            width={72}
            height={72}
            className="animate-float pointer-events-none absolute left-[6%] top-6 hidden -rotate-12 select-none md:block"
            style={{ animationDelay: "-7s" }}
          />
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">
              From zero to <span className="text-trn">“it learned!”</span> in 2 minutes
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className="relative rounded-3xl bg-card p-5 ring-2 ring-line transition-transform hover:-translate-y-1"
                >
                  <span
                    className={`absolute -top-3 left-5 grid h-7 w-7 place-items-center rounded-full ${s.bg} font-display text-sm font-bold text-white ring-2 ${s.edge}`}
                  >
                    {i + 1}
                  </span>
                  <div className="text-3xl">{s.emoji}</div>
                  <h3 className="mt-2 font-display text-lg font-bold text-ink">{s.title}</h3>
                  <p className="mt-1 text-[13px] font-bold leading-snug text-ink-soft">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Trust ---------- */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.title} className="rounded-3xl bg-white/70 p-5 ring-1 ring-line">
                <div className="text-2xl">{t.emoji}</div>
                <h3 className="mt-1.5 font-display text-base font-bold text-ink">{t.title}</h3>
                <p className="mt-1 text-[13px] font-bold leading-snug text-ink-soft">{t.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="mx-auto max-w-3xl px-5 pb-20 text-center">
          <div className="rounded-[2rem] bg-prd px-6 py-12 ring-4 ring-prd-edge">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Your first ML model is 2 minutes away.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[15px] font-bold text-white/85">
              If you can stack blocks, you can train a neural network. Yes, really. Yes, you.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/studio?demo=camera"
                className="rounded-2xl bg-go px-6 py-3 font-display text-lg font-bold text-ink ring-2 ring-go-edge shadow-[0_5px_0_0_var(--color-go-edge)] transition-transform hover:-translate-y-0.5 active:translate-y-1"
              >
                📷 Camera demo
              </Link>
              <Link
                href="/studio?demo=sketch"
                className="rounded-2xl bg-white px-6 py-3 font-display text-lg font-bold text-skb-edge transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
              >
                ✏️ Drawing demo
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Footer ---------- */}
        <footer className="border-t-2 border-line bg-card/70 py-8 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 text-center">
            <div className="flex items-center gap-2">
              <LogoMark small />
              <span className="font-display text-base font-bold text-ink">
                Scratch<span className="text-prd">ML</span>
              </span>
            </div>
            <p className="text-[12px] font-bold text-ink-soft">
              Built for Mind the Product&apos;s World Product Day — #EveryoneShipsNow 🚢
            </p>
            <p className="text-[11px] font-bold text-ink-soft/70">
              All training happens in your browser. Your camera footage and drawings never leave
              this page.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function LogoMark({ small = false }: { small?: boolean }) {
  const sz = small ? "h-7 w-7" : "h-9 w-9";
  return (
    <div className={`relative ${sz}`}>
      <span className="absolute inset-0 rotate-[-8deg] rounded-lg bg-cls ring-2 ring-cls-edge" />
      <span className="absolute inset-0 translate-x-1 translate-y-0.5 rotate-[6deg] rounded-lg bg-cam ring-2 ring-cam-edge" />
      <span
        className={`absolute inset-0 grid place-items-center rounded-lg bg-go ring-2 ring-go-edge ${small ? "text-sm" : "text-lg"}`}
      >
        🧠
      </span>
    </div>
  );
}
