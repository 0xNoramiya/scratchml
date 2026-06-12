// TensorFlow.js transfer-learning engine: MobileNet feature extractor + trainable head, fully in-browser.

import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import type { FlatSample } from "./samples";

// inputRange MUST be [0, 1] for the self-hosted weights; a custom modelUrl defaults to [-1, 1] and silently degrades embeddings.
const MOBILENET_CFG = {
  version: 2 as const,
  alpha: 0.5 as const,
  modelUrl: "/models/mobilenet-v2-050/model.json",
  inputRange: [0, 1] as [number, number],
};

const MOBILENET_CDN_CFG = { version: 2 as const, alpha: 0.5 as const };

type FeatureExtractor = mobilenet.MobileNet;

let extractorPromise: Promise<FeatureExtractor> | null = null;
let extractorReady = false;
let head: tf.LayersModel | null = null;

export type VideoLike = HTMLVideoElement | HTMLCanvasElement;

/**
 * WebGL that is software-emulated (SwiftShader / llvmpipe / Basic Render
 * Driver) takes 15s+ to compile MobileNet's shaders — far slower than just
 * running on the CPU backend. Detect it and opt out of WebGL up front.
 */
async function pickBackend(): Promise<void> {
  try {
    // Escape hatch: software WebGL runs in the GPU process and keeps the main
    // thread responsive, which the plain-JS cpu backend does not — useful for
    // testing/recording on machines without hardware GL.
    if (localStorage.getItem("sml_force_webgl") === "1") return;
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ?? (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) return; // tf will fall back to cpu on its own
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
      : "";
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) {
      // Prefer the WASM backend (SIMD, ~ms-level inference, self-hosted
      // binaries); the plain-JS cpu backend blocks the main thread for
      // seconds per frame. Loaded lazily so GPU users never pay for it.
      try {
        const wasm = await import("@tensorflow/tfjs-backend-wasm");
        wasm.setWasmPaths("/tfjs-wasm/");
        const ok = await tf.setBackend("wasm");
        if (!ok) await tf.setBackend("cpu");
      } catch {
        await tf.setBackend("cpu");
      }
      await tf.ready();
    }
  } catch {
    /* never block loading on detection */
  }
}

/** Start (and cache) the MobileNet download; safe to call repeatedly. */
export function loadFeatureExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = pickBackend()
      .then(() => mobilenet.load(MOBILENET_CFG))
      .catch(() => mobilenet.load(MOBILENET_CDN_CFG))
      .then((net) => {
        // Warm-up: compile GPU shaders now so the first real capture doesn't stall.
        const c = document.createElement("canvas");
        c.width = 224;
        c.height = 224;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, 224, 224);
          const t = net.infer(c, true) as tf.Tensor;
          t.dispose();
        }
        extractorReady = true;
        return net;
      });
  }
  return extractorPromise;
}

/** Reset a failed load attempt so the next call retries. */
export function retryLoad(): Promise<FeatureExtractor> {
  if (!extractorReady) extractorPromise = null;
  return loadFeatureExtractor();
}

export function isExtractorLoading(): boolean {
  return extractorPromise !== null;
}

export function hasTrainedModel(): boolean {
  return head !== null;
}

function frameOk(input: VideoLike): boolean {
  if (input instanceof HTMLVideoElement) {
    return input.readyState >= 2 && input.videoWidth > 0;
  }
  return input.width > 0;
}

/** Run a single frame through MobileNet and return its embedding vector. */
export async function captureEmbedding(input: VideoLike): Promise<Float32Array> {
  const net = await loadFeatureExtractor();
  if (!frameOk(input)) throw new Error("camera-not-ready");
  const emb = net.infer(input, true) as tf.Tensor; // shape [1, D]
  const data = emb.dataSync();
  emb.dispose();
  return new Float32Array(data);
}

export interface TrainOptions {
  samples: FlatSample[];
  numClasses: number;
  epochs: number;
  onEpoch?: (epoch: number, total: number, acc: number, loss: number) => void;
}

/** Build + train the classification head on captured embeddings. */
export async function trainHead(opts: TrainOptions): Promise<void> {
  const { samples, numClasses, epochs } = opts;
  if (samples.length === 0) throw new Error("no-samples");

  const dim = samples[0].embedding.length;

  const xsBuf = new Float32Array(samples.length * dim);
  const labels: number[] = [];
  samples.forEach((s, i) => {
    xsBuf.set(s.embedding, i * dim);
    labels.push(s.classIndex);
  });

  const xs = tf.tensor2d(xsBuf, [samples.length, dim]);
  const ys = tf.tidy(() => tf.oneHot(tf.tensor1d(labels, "int32"), numClasses));

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [dim], units: 100, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.25 }));
  model.add(tf.layers.dense({ units: numClasses, activation: "softmax" }));
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  try {
    await model.fit(xs, ys, {
      epochs,
      batchSize: Math.max(2, Math.min(16, samples.length)),
      shuffle: true,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const acc = (logs?.acc ?? logs?.accuracy ?? 0) as number;
          const loss = (logs?.loss ?? 0) as number;
          opts.onEpoch?.(epoch + 1, epochs, acc, loss);
          await tf.nextFrame();
        },
      },
    });
    // Swap only after a successful fit to avoid leaving head pointing at a disposed model.
    head?.dispose();
    head = model;
  } catch (e) {
    // Dispose the new model to avoid a WebGL tensor leak; leave the old head intact.
    model.dispose();
    throw e;
  } finally {
    xs.dispose();
    ys.dispose();
  }
}

/** Live inference. Returns probabilities aligned to class order, or null. */
export async function predict(input: VideoLike): Promise<number[] | null> {
  if (!head || !extractorPromise || !extractorReady) return null;
  if (!frameOk(input)) return null;
  const net = await extractorPromise;
  let emb: tf.Tensor | null = null;
  let out: tf.Tensor | null = null;
  try {
    emb = net.infer(input, true) as tf.Tensor;
    out = head.predict(emb) as tf.Tensor;
    return Array.from(out.dataSync());
  } finally {
    emb?.dispose();
    out?.dispose();
  }
}

export function resetModel(): void {
  head?.dispose();
  head = null;
}

export function getBackend(): string {
  return tf.getBackend() || "unknown";
}

export function tfMemoryInfo() {
  return tf.memory();
}
