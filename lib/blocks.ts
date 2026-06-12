// Block vocabulary and shared helpers for the ScratchML recipe.

export type BlockType = "camera" | "sketchpad" | "class" | "train" | "predict";

export const SOURCE_TYPES: BlockType[] = ["camera", "sketchpad"];

export interface ScriptBlock {
  id: string;
  type: BlockType;
}

export interface BlockMeta {
  label: string;
  hint: string;
  emoji: string;
  /** css color token prefix, e.g. "cam" => var(--color-cam) / var(--color-cam-edge) */
  token: string;
}

export const BLOCK_META: Record<BlockType, BlockMeta> = {
  camera: {
    label: "Use the Camera",
    hint: "The model's eyes. It looks at live video frames.",
    emoji: "📷",
    token: "cam",
  },
  sketchpad: {
    label: "Use the Sketchpad",
    hint: "The model's eyes — no camera needed! It looks at what you draw.",
    emoji: "✏️",
    token: "skb",
  },
  class: {
    label: "Teach a Thing",
    hint: "A label to recognize. Show examples so it learns what this looks like.",
    emoji: "🏷️",
    token: "cls",
  },
  train: {
    label: "Train the Brain",
    hint: "Crunch all your examples into a tiny neural network.",
    emoji: "🧠",
    token: "trn",
  },
  predict: {
    label: "Guess It!",
    hint: "Point the camera at something — the model guesses which Thing it is.",
    emoji: "✨",
    token: "prd",
  },
};

export const PALETTE: BlockType[] = ["camera", "sketchpad", "class", "train", "predict"];

/** Blocks limited to one per recipe (class blocks are unlimited). */
export const SINGLETON: BlockType[] = ["camera", "sketchpad", "train", "predict"];

export const CLASS_COLORS = [
  "#ff6b6b",
  "#ffc83d",
  "#43c59e",
  "#4d96ff",
  "#ff6fb5",
  "#a66bff",
  "#ff9f45",
  "#2dd4bf",
];

export const FUN_EMOJIS = [
  "😀", "😎", "😺", "🐶", "✋", "👍", "👎", "⭐",
  "❤️", "🎈", "🍌", "🤖", "🌈", "🎩", "👻", "🦄",
];

let _seq = 0;
export function makeId(prefix = "b"): string {
  _seq += 1;
  return `${prefix}_${_seq}_${performance.now().toString(36).replace(".", "")}`;
}

export function tokenVars(token: string): React.CSSProperties {
  return {
    ["--blk" as string]: `var(--color-${token})`,
    ["--blk-edge" as string]: `var(--color-${token}-edge)`,
    ["--blk-text" as string]: `var(--color-${token}-text)`,
  } as React.CSSProperties;
}
