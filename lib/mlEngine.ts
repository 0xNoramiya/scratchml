// TensorFlow.js transfer-learning engine.
//
// Pipeline: MobileNet (frozen feature extractor) -> small trainable head.
// Everything runs in the browser. No data ever leaves the device.

import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import type { FlatSample } from "./samples";

// alpha 0.5 keeps the download small (~5MB) and training fast, while still
// being plenty accurate for the simple "thumbs up vs thumbs down" style tasks
// kids will try first.
//
// The weights are SELF-HOSTED from /public (downloaded from TFHub's
// mobilenet_v2_050_224/classification/2 — see README). inputRange must be
// [0, 1] to match that model; the package would default a custom modelUrl
// to [-1, 1] and quietly degrade the embeddings.
const MOBILENET_CFG = {
  version: 2 as const,
  alpha: 0.5 as const,
  modelUrl: "/models/mobilenet-v2-050/model.json",
  inputRange: [0, 1] as [number, number],
};

// If the local copy is unreachable for any reason, fall back to TFHub.
const MOBILENET_CDN_CFG = { version: 2 as const, alpha: 0.5 as const };

type FeatureExtractor = mobilenet.MobileNet;

let extractorPromise: Promise<FeatureExtractor> | null = null;
let head: tf.LayersModel | null = null;

export type VideoLike = HTMLVideoElement | HTMLCanvasElement;

/** Kick off (and cache) the MobileNet download. Safe to call repeatedly. */
export function loadFeatureExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = mobilenet
      .load(MOBILENET_CFG)
      .catch(() => mobilenet.load(MOBILENET_CDN_CFG))
      .then((net) => {
        // Warm-up inference: compiles the GPU shaders now so the kid's very
        // first capture doesn't stall for a second or two.
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
        return net;
      });
  }
  return extractorPromise;
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

  // Assemble xs / ys tensors.
  const xsBuf = new Float32Array(samples.length * dim);
  const labels: number[] = [];
  samples.forEach((s, i) => {
    xsBuf.set(s.embedding, i * dim);
    labels.push(s.classIndex);
  });

  const xs = tf.tensor2d(xsBuf, [samples.length, dim]);
  const ys = tf.tidy(() => tf.oneHot(tf.tensor1d(labels, "int32"), numClasses));

  head?.dispose();
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
          await tf.nextFrame(); // let the UI paint between epochs
        },
      },
    });
    head = model;
  } finally {
    xs.dispose();
    ys.dispose();
  }
}

/** Live inference. Returns probabilities aligned to class order, or null. */
export async function predict(input: VideoLike): Promise<number[] | null> {
  if (!head || !extractorPromise) return null;
  if (!frameOk(input)) return null;
  const net = await extractorPromise;
  const emb = net.infer(input, true) as tf.Tensor;
  const out = head.predict(emb) as tf.Tensor;
  const probs = Array.from(out.dataSync());
  emb.dispose();
  out.dispose();
  return probs;
}

export function resetModel(): void {
  head?.dispose();
  head = null;
}

export function tfMemoryInfo() {
  return tf.memory();
}
