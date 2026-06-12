// One-shot asset generation for ScratchML's playful layer.
// Run: set -a; source .env.assets; set +a; node scripts/generate-assets.mjs [sfx|music|images]
// Keys are LOCAL ONLY (gitignored .env.assets); generated files are static
// assets committed to the repo — no API key ever reaches the client bundle.

import { writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SOUNDS = path.join(ROOT, "public/sounds");
const IMAGES = path.join(ROOT, "public/art");
const TMP = "/tmp/sml-assets";

const OPENAI = process.env.OPENAI_API_KEY;
const ELEVEN = process.env.ELEVENLABS_API_KEY;
const only = process.argv[2]; // optional: sfx | music | images

async function elevenSfx(name, text, seconds) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "xi-api-key": ELEVEN, "Content-Type": "application/json" },
    body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: 0.5 }),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${await res.text()}`);
  const raw = path.join(TMP, `${name}.raw.mp3`);
  await writeFile(raw, Buffer.from(await res.arrayBuffer()));
  execFileSync("ffmpeg", [
    "-y", "-i", raw,
    "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-1.5",
    "-ac", "1", "-ar", "44100", "-b:a", "96k",
    path.join(SOUNDS, `${name}.mp3`),
  ], { stdio: "pipe" });
  console.log(`  ✓ sfx ${name}`);
}

async function elevenMusic(name, prompt, ms) {
  for (const url of [
    "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
    "https://api.elevenlabs.io/v1/music/compose?output_format=mp3_44100_128",
  ]) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": ELEVEN, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, music_length_ms: ms }),
    });
    if (res.ok) {
      const raw = path.join(TMP, `${name}.raw.mp3`);
      await writeFile(raw, Buffer.from(await res.arrayBuffer()));
      // Single-pass mp3->mp3 loudnorm produced corrupt output truncated ~1.7s in; go via WAV intermediate and add fades to avoid loop-edge clicks.
      const dec = path.join(TMP, `${name}.dec.wav`);
      const norm = path.join(TMP, `${name}.norm.wav`);
      execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, dec], { stdio: "pipe" });
      execFileSync("ffmpeg", [
        "-y", "-v", "error", "-i", dec,
        "-af", `loudnorm=I=-20:TP=-2,afade=t=in:d=0.25,afade=t=out:st=${ms / 1000 - 0.7}:d=0.7`,
        norm,
      ], { stdio: "pipe" });
      execFileSync("ffmpeg", [
        "-y", "-v", "error", "-i", norm,
        "-codec:a", "libmp3lame", "-b:a", "112k", "-ar", "44100",
        path.join(SOUNDS, `${name}.mp3`),
      ], { stdio: "pipe" });
      const probed = execFileSync("ffprobe", [
        "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path.join(SOUNDS, `${name}.mp3`),
      ]).toString().trim();
      if (Number(probed) < (ms / 1000) * 0.9) throw new Error(`${name}: truncated output (${probed}s)`);
      console.log(`  ✓ music ${name} (${Number(probed).toFixed(1)}s)`);
      return;
    }
    console.log(`  music attempt ${url.split("?")[0]} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  console.log("  ✗ music generation unavailable on this key — skipping BGM (sfx still work)");
}

async function gptImage(name, prompt, { size = "1024x1024", transparent = false, post = null } = {}) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // gpt-image-2 rejects transparent backgrounds; use 1.5 for stickers
      model: transparent ? "gpt-image-1.5" : "gpt-image-2",
      prompt,
      size,
      quality: "high",
      ...(transparent ? { background: "transparent" } : {}),
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${name}: ${JSON.stringify(body.error ?? body).slice(0, 300)}`);
  const raw = path.join(TMP, `${name}.raw.png`);
  await writeFile(raw, Buffer.from(body.data[0].b64_json, "base64"));
  const out = path.join(IMAGES, `${name}.png`);
  if (post) execFileSync("ffmpeg", ["-y", "-i", raw, ...post, out], { stdio: "pipe" });
  else execFileSync("cp", [raw, out]);
  console.log(`  ✓ image ${name}`);
}

const SFX = [
  ["snap", "a single toy plastic building block snapping into place, short satisfying click, bright and playful, clean studio recording, no background noise", 0.7],
  ["pop", "a tiny cute cartoon bubble pop, soft and round, very short, playful kids game ui sound, no background noise", 0.5],
  ["whoosh", "a quick playful cartoon whoosh swooping upward, light and airy, kids game start sound, no background noise", 0.8],
  ["fanfare", "a short cheerful toy fanfare on xylophone and glockenspiel, kids game level complete jingle, bright and happy ending cleanly", 1.8],
  ["tada", "a celebratory ta-da chime with magical sparkle shimmer, kids game win sound, joyful, short", 1.5],
];

const MUSIC_PROMPT =
  "Gentle playful background music for a children's learning game: bouncy marimba, soft ukulele, glockenspiel sparkles, light hand claps, warm and curious mood, moderate tempo, instrumental, seamless loop, consistent energy";

const OG_PROMPT =
  'Social media banner for a kids\' machine-learning website. LEFT HALF: a friendly small purple robot with round white eyes and a green antenna joyfully stacking chunky rounded toy blocks that snap together like Scratch programming blocks (green block with a white play triangle on top of blue, pink, and orange blocks). RIGHT HALF: huge bold playful title "ScratchML" in chunky rounded dark letters, below it the tagline "Teach a computer to see" in smaller rounded letters, and under that a small white rounded card showing a green circle icon and a green confidence bar at 92%. IMPORTANT COMPOSITION RULE: all characters, blocks, text and cards must sit fully inside the vertical middle 75% of the frame; the top 12% and bottom 12% of the image must contain ONLY plain background (cream with subtle dotted grid and a few tiny confetti dots), because the banner will be cropped to a wider shape. Flat vector illustration style with thick dark outlines (#2b2233), rounded corners, warm cream background (#fff6e9) with a subtle dotted grid like graph paper. Candy-bright palette: green #54c265, blue #37a8f0, pink #ff6fa3, orange #ff9f45, purple #a674f2, yellow #ffce3a. Cheerful, clean, professional kids-brand quality, soft pastel confetti accents, balanced full composition with no large empty areas.';

const STICKERS = [
  ["sticker-star", "A single kid's crayon-doodle sticker of a cheerful yellow five-pointed star with a tiny smiling face, thick wobbly dark outline, flat colors, slight white sticker border, isolated, no background, no text"],
  ["sticker-rainbow", "A single kid's crayon-doodle sticker of a small arched rainbow with three bands (red, yellow, blue) and tiny clouds at each end, thick wobbly dark outline, flat colors, slight white sticker border, isolated, no background, no text"],
  ["sticker-bolt", "A single kid's crayon-doodle sticker of a friendly orange lightning bolt with a tiny winking face, thick wobbly dark outline, flat colors, slight white sticker border, isolated, no background, no text"],
];

await mkdir(SOUNDS, { recursive: true });
await mkdir(IMAGES, { recursive: true });
await mkdir(TMP, { recursive: true });

if (!only || only === "sfx") {
  console.log("SFX (ElevenLabs)…");
  if (!ELEVEN) throw new Error("ELEVENLABS_API_KEY missing");
  for (const [name, text, s] of SFX) await elevenSfx(name, text, s);
}

if (!only || only === "music") {
  console.log("Music (ElevenLabs)…");
  await elevenMusic("bgm", MUSIC_PROMPT, 30000);
}

if (!only || only === "images" || only === "og") {
  console.log("OG image (OpenAI gpt-image-2)…");
  if (!OPENAI) throw new Error("OPENAI_API_KEY missing");
  await gptImage("og", OG_PROMPT, {
    size: "1536x1024",
    post: ["-vf", "crop=1536:804:0:110,scale=1200:630"],
  });
}

if (!only || only === "images" || only === "stickers") {
  console.log("Stickers (OpenAI gpt-image-1.5, transparent)…");
  if (!OPENAI) throw new Error("OPENAI_API_KEY missing");
  for (const [name, prompt] of STICKERS) {
    await gptImage(name, prompt, {
      transparent: true,
      post: ["-vf", "scale=360:-1"],
    });
  }
}

console.log("done.");
