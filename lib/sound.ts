// Tiny sound manager for ScratchML's playful layer.
//
// All sounds are local /public/sounds assets (generated with ElevenLabs at
// build time — no runtime API calls). SFX default ON, music defaults OFF;
// both persist in localStorage. Every play() call no-ops when disabled or
// during SSR, and browser autoplay rejections are swallowed silently.

export type SfxName = "snap" | "pop" | "whoosh" | "fanfare" | "tada";

const SFX_KEY = "sml_sfx_v1";
const MUSIC_KEY = "sml_music_v1";

const VOLUME: Record<SfxName, number> = {
  snap: 0.5,
  pop: 0.35,
  whoosh: 0.45,
  fanfare: 0.55,
  tada: 0.6,
};

/** Per-sound minimum gap, ms — keeps hold-to-capture from machine-gunning. */
const THROTTLE: Record<SfxName, number> = {
  snap: 90,
  pop: 130,
  whoosh: 300,
  fanfare: 500,
  tada: 500,
};

const lastPlayed: Partial<Record<SfxName, number>> = {};
const pool = new Map<SfxName, HTMLAudioElement>();
let musicEl: HTMLAudioElement | null = null;

const isBrowser = () => typeof window !== "undefined";

export function sfxEnabled(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(SFX_KEY) !== "0"; // default ON
}

export function musicEnabled(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(MUSIC_KEY) === "1"; // default OFF
}

export function setSfxEnabled(on: boolean): void {
  if (!isBrowser()) return;
  localStorage.setItem(SFX_KEY, on ? "1" : "0");
  if (on) playSfx("pop"); // tiny confirmation blip
}

export function setMusicEnabled(on: boolean): void {
  if (!isBrowser()) return;
  localStorage.setItem(MUSIC_KEY, on ? "1" : "0");
  if (on) startMusic();
  else stopMusic();
}

export function playSfx(name: SfxName): void {
  if (!isBrowser() || !sfxEnabled()) return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? -Infinity) < THROTTLE[name]) return;
  lastPlayed[name] = now;

  let el = pool.get(name);
  if (!el) {
    el = new Audio(`/sounds/${name}.mp3`);
    el.preload = "auto";
    pool.set(name, el);
  }
  el.volume = VOLUME[name];
  el.currentTime = 0;
  void el.play().catch(() => {
    /* autoplay policy or decode hiccup — sounds are garnish, never errors */
  });
}

function startMusic(): void {
  if (!isBrowser()) return;
  if (!musicEl) {
    musicEl = new Audio("/sounds/bgm.mp3");
    musicEl.loop = true;
    musicEl.volume = 0.25;
  }
  void musicEl.play().catch(() => {});
}

function stopMusic(): void {
  musicEl?.pause();
}

/** Re-attach music on page load if the kid had it on last session. */
export function resumeMusicIfEnabled(): void {
  if (musicEnabled()) startMusic();
}
