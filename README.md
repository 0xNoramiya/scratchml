# ScratchML 🧠🧩

**Teach a computer to see — by snapping blocks together.**

A Scratch-style playground where kids and beginners build a *real* machine-learning
model with zero code. Drag colorful blocks into a recipe, show your webcam a few
examples of each "Thing," press **GO**, and watch the model learn to recognize them
live. Everything runs **in the browser** with TensorFlow.js — no backend, and your
camera never leaves your device.

Built for the **Mind the Product · "World Product Day: Everyone Ships Now"** hackathon.

## How it works

The "recipe" the kid builds maps directly to a real ML pipeline:

| Block | What it teaches |
|-------|-----------------|
| 📷 **Use the Camera** | The model's input — live webcam frames |
| ✏️ **Use the Sketchpad** | Camera-shy? Draw your examples instead — same pipeline, no webcam |
| 🏷️ **Teach a Thing** (×2+) | A class label; hold to snap camera examples, or tap ➕ to add drawings |
| 🧠 **Train the Brain** | Trains a small neural-net head via **transfer learning** on MobileNet |
| ✨ **Guess It!** | Live inference with per-class confidence bars |

## Tech

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind v4**
- **TensorFlow.js** + **MobileNet** (frozen feature extractor) → small trainable `tf.sequential` head
- **dnd-kit** for the snap-together block canvas · **zustand** for state · **canvas-confetti** for the win moment
- Deployed on **Fly.io** (Docker, Next standalone output)

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

The MobileNet weights (~7.6 MB) are **self-hosted** in `public/models/mobilenet-v2-050/`
(no third-party CDN at runtime; TFHub is only a fallback if the local copy is missing).
They were downloaded from TFHub's `mobilenet_v2_050_224/classification/2` — to re-fetch:

```bash
BASE="https://tfhub.dev/google/imagenet/mobilenet_v2_050_224/classification/2"
for f in model.json group1-shard1of2.bin group1-shard2of2.bin; do
  curl -sL "$BASE/$f?tfjs-format=file" -o "public/models/mobilenet-v2-050/$f"
done
```

Note: this model expects `inputRange: [0, 1]` — already configured in `lib/mlEngine.ts`.
A webcam is optional — the ✏️ Sketchpad path works everywhere, including devices
without a camera.

```bash
npm run test:e2e   # Playwright smoke test (sketch + camera + mobile), needs `npx playwright install chromium`
```

## Novus.ai analytics (required for the hackathon)

A submission without Novus installed is ineligible. The hook is already wired in
`components/NovusAnalytics.tsx`; you just need to supply your embed via env vars.

1. Copy `.env.example` → `.env.local` and fill in the values from your Novus dashboard:
   ```
   NEXT_PUBLIC_NOVUS_SRC=https://…   # the <script src> Novus gives you
   NEXT_PUBLIC_NOVUS_ID=your-id
   ```
2. For production, pass them as Docker build args (they're inlined at build time):
   ```bash
   fly deploy --build-arg NEXT_PUBLIC_NOVUS_SRC=https://… --build-arg NEXT_PUBLIC_NOVUS_ID=your-id
   ```

## Deploy to Fly.io

```bash
# one-time: claim a globally-unique app name (rewrites fly.toml)
fly launch --no-deploy --copy-config

# deploy (add the Novus build args once you have them)
fly deploy
```

The included `Dockerfile` builds the Next.js standalone server and the container
listens on `:8080` (matching `fly.toml`'s `internal_port`). HTTPS is forced, which
`getUserMedia` requires in production.
