import { create } from "zustand";
import {
  BlockType,
  ScriptBlock,
  SINGLETON,
  SOURCE_TYPES,
  CLASS_COLORS,
  FUN_EMOJIS,
  makeId,
} from "./blocks";
import * as samples from "./samples";
import { resetModel } from "./mlEngine";

export interface ClassThumb {
  id: string; // mirrors the sample id in lib/samples — deleting the thumb deletes the embedding
  src: string;
}

export interface ClassMeta {
  name: string;
  emoji: string;
  color: string;
  sampleCount: number;
  thumbs: ClassThumb[];
}

export type Phase = "build" | "training" | "live";
export type CameraState = "off" | "starting" | "on" | "denied" | "error";
export type ModelStatus = "idle" | "loading" | "ready" | "error";

interface TrainingProgress {
  epoch: number;
  total: number;
  acc: number;
  loss: number;
}

interface StudioState {
  script: ScriptBlock[];
  classMeta: Record<string, ClassMeta>;
  epochs: number;

  phase: Phase;
  camera: CameraState;
  modelStatus: ModelStatus;
  training: TrainingProgress;
  predictions: number[];
  topClassId: string | null;
  celebrated: boolean;
  activeCaptureId: string | null;
  /** has the kid drawn anything on the sketchpad since the last clear? */
  sketchDirty: boolean;

  addBlock: (type: BlockType, index?: number) => void;
  removeBlock: (id: string) => void;
  reorder: (next: ScriptBlock[]) => void;
  renameClass: (id: string, name: string) => void;
  cycleEmoji: (id: string) => void;
  noteCapture: (id: string, sampleId: string, thumb: string, count: number) => void;
  removeSample: (id: string, sampleId: string) => void;
  clearClassSamples: (id: string) => void;
  setEpochs: (n: number) => void;

  setPhase: (p: Phase) => void;
  setCamera: (c: CameraState) => void;
  setModelStatus: (s: ModelStatus) => void;
  setTraining: (t: Partial<TrainingProgress>) => void;
  setPredictions: (probs: number[], topId: string | null) => void;
  celebrate: () => void;
  setActiveCapture: (id: string | null) => void;
  setSketchDirty: (dirty: boolean) => void;

  loadExample: () => void;
  loadSketchExample: () => void;
  reset: () => void;
}

let colorCounter = 0;
let emojiCounter = 0;

function nextClassMeta(name?: string): ClassMeta {
  const color = CLASS_COLORS[colorCounter % CLASS_COLORS.length];
  const emoji = FUN_EMOJIS[emojiCounter % FUN_EMOJIS.length];
  colorCounter += 1;
  emojiCounter += 3; // skip ahead so adjacent classes get visually distinct emojis
  return { name: name ?? `Thing ${colorCounter}`, emoji, color, sampleCount: 0, thumbs: [] };
}

/** Place a new block in a sensible default position when added without a drag target. */
function smartInsert(script: ScriptBlock[], block: ScriptBlock): ScriptBlock[] {
  const next = [...script];
  const idxOf = (t: BlockType) => next.findIndex((b) => b.type === t);
  switch (block.type) {
    case "camera":
    case "sketchpad":
      next.unshift(block);
      break;
    case "class": {
      // after the last class, else after the source block, else at start
      let pos = -1;
      for (let i = 0; i < next.length; i++) if (next[i].type === "class") pos = i;
      if (pos >= 0) next.splice(pos + 1, 0, block);
      else {
        const src = Math.max(idxOf("camera"), idxOf("sketchpad"));
        next.splice(src >= 0 ? src + 1 : 0, 0, block);
      }
      break;
    }
    case "train": {
      const pred = idxOf("predict");
      if (pred >= 0) next.splice(pred, 0, block);
      else next.push(block);
      break;
    }
    case "predict":
      next.push(block);
      break;
  }
  return next;
}

const initialState = (): Pick<
  StudioState,
  | "script"
  | "classMeta"
  | "epochs"
  | "phase"
  | "camera"
  | "modelStatus"
  | "training"
  | "predictions"
  | "topClassId"
  | "celebrated"
  | "activeCaptureId"
  | "sketchDirty"
> => ({
  script: [],
  classMeta: {},
  epochs: 30,
  phase: "build",
  camera: "off",
  modelStatus: "idle",
  training: { epoch: 0, total: 0, acc: 0, loss: 0 },
  predictions: [],
  topClassId: null,
  celebrated: false,
  activeCaptureId: null,
  sketchDirty: false,
});

export const useStudio = create<StudioState>((set, get) => ({
  ...initialState(),

  addBlock: (type, index) =>
    set((state) => {
      if (SINGLETON.includes(type) && state.script.some((b) => b.type === type)) {
        return state;
      }
      let base = state.script;
      let classMeta = { ...state.classMeta };

      // Swapping camera <-> sketchpad wipes all samples: embeddings from different
      // sources are incompatible, so mixing them silently breaks the trained model.
      if (SOURCE_TYPES.includes(type)) {
        const other = base.filter(
          (b) => SOURCE_TYPES.includes(b.type) && b.type !== type,
        );
        if (other.length > 0) {
          const previousSource = other[0].type;
          const samplesCleared = Object.values(classMeta).reduce((n, m) => n + (m?.sampleCount ?? 0), 0);
          const numClassesAffected = Object.keys(classMeta).filter((id) => (classMeta[id]?.sampleCount ?? 0) > 0).length;
          base = base.filter((b) => !SOURCE_TYPES.includes(b.type));
          Object.keys(classMeta).forEach((id) => {
            samples.clearClass(id);
            classMeta[id] = { ...classMeta[id], sampleCount: 0, thumbs: [] };
          });
          resetModel();
          if (typeof pendo !== "undefined") {
            pendo.track("source_type_changed", {
              new_source: type,
              previous_source: previousSource,
              samples_cleared_count: samplesCleared,
              num_classes_affected: numClassesAffected,
            });
          }
        }
      }

      const block: ScriptBlock = { id: makeId(type), type };
      if (type === "class") classMeta[block.id] = nextClassMeta();

      let script: ScriptBlock[];
      if (typeof index === "number") {
        script = [...base];
        script.splice(Math.max(0, Math.min(index, script.length)), 0, block);
      } else {
        script = smartInsert(base, block);
      }
      // Clear sketchDirty so a blank post-swap pad can't be captured immediately.
      return { script, classMeta, sketchDirty: false };
    }),

  removeBlock: (id) =>
    set((state) => {
      const block = state.script.find((b) => b.id === id);
      const script = state.script.filter((b) => b.id !== id);
      const classMeta = { ...state.classMeta };
      if (block?.type === "class") {
        delete classMeta[id];
        samples.dropClass(id);
      }
      return { script, classMeta };
    }),

  reorder: (next) => set({ script: next }),

  renameClass: (id, name) =>
    set((state) => ({
      classMeta: { ...state.classMeta, [id]: { ...state.classMeta[id], name } },
    })),

  cycleEmoji: (id) =>
    set((state) => {
      const cur = state.classMeta[id];
      if (!cur) return state;
      const i = FUN_EMOJIS.indexOf(cur.emoji);
      const emoji = FUN_EMOJIS[(i + 1) % FUN_EMOJIS.length];
      return { classMeta: { ...state.classMeta, [id]: { ...cur, emoji } } };
    }),

  noteCapture: (id, sampleId, thumb, count) =>
    set((state) => {
      const cur = state.classMeta[id];
      if (!cur) return state;
      const thumbs = [...cur.thumbs, { id: sampleId, src: thumb }];
      return {
        classMeta: { ...state.classMeta, [id]: { ...cur, sampleCount: count, thumbs } },
      };
    }),

  removeSample: (id, sampleId) =>
    set((state) => {
      const cur = state.classMeta[id];
      if (!cur) return state;
      const count = samples.removeSample(id, sampleId);
      return {
        classMeta: {
          ...state.classMeta,
          [id]: {
            ...cur,
            sampleCount: count,
            thumbs: cur.thumbs.filter((t) => t.id !== sampleId),
          },
        },
      };
    }),

  clearClassSamples: (id) =>
    set((state) => {
      const cur = state.classMeta[id];
      if (!cur) return state;
      const clearedCount = cur.sampleCount;
      samples.clearClass(id);
      if (typeof pendo !== "undefined") {
        pendo.track("class_samples_cleared", {
          class_name: cur.name,
          samples_cleared_count: clearedCount,
        });
      }
      return {
        classMeta: { ...state.classMeta, [id]: { ...cur, sampleCount: 0, thumbs: [] } },
      };
    }),

  setEpochs: (n) => set({ epochs: Math.max(5, Math.min(80, Math.round(n))) }),

  setPhase: (p) => set({ phase: p }),
  setCamera: (c) => set({ camera: c }),
  setModelStatus: (s) => set({ modelStatus: s }),
  setTraining: (t) => set((state) => ({ training: { ...state.training, ...t } })),
  setPredictions: (probs, topId) => set({ predictions: probs, topClassId: topId }),
  celebrate: () => set({ celebrated: true }),
  setActiveCapture: (id) => set({ activeCaptureId: id }),
  setSketchDirty: (dirty) => set({ sketchDirty: dirty }),

  loadExample: () =>
    set((state) => {
      Object.keys(state.classMeta).forEach((id) => samples.dropClass(id));
      resetModel();
      colorCounter = 0;
      emojiCounter = 0;
      const cam: ScriptBlock = { id: makeId("camera"), type: "camera" };
      const c1: ScriptBlock = { id: makeId("class"), type: "class" };
      const c2: ScriptBlock = { id: makeId("class"), type: "class" };
      const trn: ScriptBlock = { id: makeId("train"), type: "train" };
      const prd: ScriptBlock = { id: makeId("predict"), type: "predict" };
      return {
        ...initialState(),
        // the feature extractor is app-global — swapping recipes must never
        // reset its status or the GO button waits for a load that won't re-run
        modelStatus: state.modelStatus,
        script: [cam, c1, c2, trn, prd],
        classMeta: {
          [c1.id]: { ...nextClassMeta("Happy"), emoji: "😀" },
          [c2.id]: { ...nextClassMeta("Sad"), emoji: "😢" },
        },
      };
    }),

  loadSketchExample: () =>
    set((state) => {
      Object.keys(state.classMeta).forEach((id) => samples.dropClass(id));
      resetModel();
      colorCounter = 0;
      emojiCounter = 0;
      const pad: ScriptBlock = { id: makeId("sketchpad"), type: "sketchpad" };
      const c1: ScriptBlock = { id: makeId("class"), type: "class" };
      const c2: ScriptBlock = { id: makeId("class"), type: "class" };
      const trn: ScriptBlock = { id: makeId("train"), type: "train" };
      const prd: ScriptBlock = { id: makeId("predict"), type: "predict" };
      return {
        ...initialState(),
        modelStatus: state.modelStatus,
        script: [pad, c1, c2, trn, prd],
        classMeta: {
          [c1.id]: { ...nextClassMeta("Circle"), emoji: "⭕" },
          [c2.id]: { ...nextClassMeta("Square"), emoji: "🟦" },
        },
      };
    }),

  reset: () => {
    samples.clearAll();
    resetModel();
    colorCounter = 0;
    emojiCounter = 0;
    set({ ...initialState(), modelStatus: get().modelStatus });
  },
}));

/** Class blocks in script order, which is also training/prediction order. */
export function classBlocks(state: StudioState): ScriptBlock[] {
  return state.script.filter((b) => b.type === "class");
}

/** Returns a primitive so zustand selector equality check is safe. */
export function sourceOf(state: StudioState): "camera" | "sketchpad" | null {
  const b = state.script.find((x) => SOURCE_TYPES.includes(x.type));
  return (b?.type as "camera" | "sketchpad") ?? null;
}
