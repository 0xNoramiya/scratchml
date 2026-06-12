"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import confetti from "canvas-confetti";

import { BlockType, BLOCK_META, tokenVars } from "@/lib/blocks";
import { useStudio, classBlocks, sourceOf } from "@/lib/store";
import * as samples from "@/lib/samples";
import {
  loadFeatureExtractor,
  retryLoad,
  captureEmbedding,
  trainHead,
  predict,
} from "@/lib/mlEngine";
import { CaptureContext, CaptureApi } from "./CaptureContext";

import { TopBar } from "./TopBar";
import { Palette } from "./Palette";
import { ScriptCanvas } from "./ScriptCanvas";
import { Stage, StageHint } from "./Stage";
import { SketchPad } from "./SketchPad";
import { Onboarding, HelpModal } from "./Overlays";

interface ActiveDrag {
  fromPalette: boolean;
  type: BlockType;
}

const ONBOARD_KEY = "sml_onboarded_v1";

export type DemoKind = "camera" | "sketch";

interface StudioProps {
  /** Deep link from the landing page: jump straight into a demo recipe. */
  initialDemo?: DemoKind | null;
}

export default function Studio({ initialDemo = null }: StudioProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sketchRef = useRef<HTMLCanvasElement | null>(null);
  const thumbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const hintTimer = useRef<number | null>(null);

  const phase = useStudio((s) => s.phase);
  const camera = useStudio((s) => s.camera);
  const source = useStudio((s) => sourceOf(s));

  const setCamera = useStudio((s) => s.setCamera);
  const setModelStatus = useStudio((s) => s.setModelStatus);
  const setPhase = useStudio((s) => s.setPhase);
  const setTraining = useStudio((s) => s.setTraining);
  const setPredictions = useStudio((s) => s.setPredictions);
  const celebrate = useStudio((s) => s.celebrate);
  const noteCapture = useStudio((s) => s.noteCapture);
  const setSketchDirty = useStudio((s) => s.setSketchDirty);
  const addBlock = useStudio((s) => s.addBlock);
  const loadExample = useStudio((s) => s.loadExample);
  const loadSketchExample = useStudio((s) => s.loadSketchExample);
  const reset = useStudio((s) => s.reset);

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [hint, setHint] = useState<StageHint | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ---- First load: MobileNet + onboarding / demo deep-link ----
  useEffect(() => {
    if (initialDemo === "camera") {
      localStorage.setItem(ONBOARD_KEY, "1");
      loadExample();
    } else if (initialDemo === "sketch") {
      localStorage.setItem(ONBOARD_KEY, "1");
      loadSketchExample();
    } else if (!localStorage.getItem(ONBOARD_KEY)) {
      setShowOnboarding(true);
    }
    setModelStatus("loading");
    loadFeatureExtractor()
      .then(() => setModelStatus("ready"))
      .catch(() => setModelStatus("error"));
    return () => stopCameraTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryBrain = useCallback(() => {
    setModelStatus("loading");
    retryLoad()
      .then(() => setModelStatus("ready"))
      .catch(() => setModelStatus("error"));
  }, [setModelStatus]);

  const dismissOnboarding = useCallback((then?: () => void) => {
    localStorage.setItem(ONBOARD_KEY, "1");
    setShowOnboarding(false);
    then?.();
  }, []);

  const flash = useCallback((msg: string, kind: "err" | "ok" = "err") => {
    setHint({ msg, kind });
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(
      () => setHint(null),
      kind === "ok" ? 2600 : 3200,
    );
  }, []);

  // ---- Camera control ----
  function stopCameraTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  const ensureCamera = useCallback(async () => {
    const cur = useStudio.getState().camera;
    if (cur === "on" || cur === "starting") return;
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamera("on");
    } catch {
      setCamera("denied");
    }
  }, [setCamera]);

  const toggleCamera = useCallback(() => {
    if (useStudio.getState().camera === "on") {
      stopCameraTracks();
      setCamera("off");
    } else {
      void ensureCamera();
    }
  }, [ensureCamera, setCamera]);

  /** Camera-shy escape hatch: swap the recipe's eyes to the sketchpad. */
  const useSketchInstead = useCallback(() => {
    stopCameraTracks();
    setCamera("off");
    addBlock("sketchpad");
    flash("No camera needed — draw your examples instead! ✏️", "ok");
  }, [addBlock, flash, setCamera]);

  // ---- Capture: one example -> embedding + thumbnail ----
  const grabThumb = useCallback((el: HTMLVideoElement | HTMLCanvasElement, mirror: boolean): string => {
    const c = thumbCanvasRef.current;
    if (!c) return "";
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    ctx.save();
    if (mirror) {
      ctx.scale(-1, 1); // mirror to match the on-screen video
      ctx.drawImage(el, -c.width, 0, c.width, c.height);
    } else {
      ctx.drawImage(el, 0, 0, c.width, c.height);
    }
    ctx.restore();
    return c.toDataURL("image/jpeg", 0.55);
  }, []);

  const clearSketch = useCallback(() => {
    const c = sketchRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setSketchDirty(false);
  }, [setSketchDirty]);

  // Stable identity matters: if this were an inline arrow, every Studio
  // re-render would re-run SketchPad's effects mid-drawing.
  const registerSketch = useCallback((c: HTMLCanvasElement | null) => {
    sketchRef.current = c;
  }, []);

  const captureSample = useCallback(
    async (classId: string) => {
      const state = useStudio.getState();
      if (sourceOf(state) === "sketchpad") {
        const c = sketchRef.current;
        if (!c) return;
        if (!state.sketchDirty) {
          flash("Draw something on the pad first! ✏️");
          throw new Error("empty-sketch");
        }
        const emb = await captureEmbedding(c);
        const { sampleId, count } = samples.addEmbedding(classId, emb);
        noteCapture(classId, sampleId, grabThumb(c, false), count);
        clearSketch();
        flash("Got it! Now draw it again, a little different ✨", "ok");
        return;
      }
      const v = videoRef.current;
      if (!v) return;
      const emb = await captureEmbedding(v); // throws if frame not ready
      const { sampleId, count } = samples.addEmbedding(classId, emb);
      noteCapture(classId, sampleId, grabThumb(v, true), count);
    },
    [clearSketch, flash, grabThumb, noteCapture],
  );

  const captureApi = useMemo<CaptureApi>(
    () => ({ captureSample, cameraReady: camera === "on", ensureCamera }),
    [captureSample, camera, ensureCamera],
  );

  // ---- Run: validate -> train -> live ----
  const run = useCallback(async () => {
    const s = useStudio.getState();
    const src = sourceOf(s);
    const classes = classBlocks(s);
    if (!src) return flash("Give it eyes: add 📷 Camera or ✏️ Sketchpad!");
    if (classes.length < 2) return flash("Teach at least 2 Things first!");
    if (!s.script.some((b) => b.type === "train")) return flash("Add a 🧠 Train the Brain block!");
    if (!s.script.some((b) => b.type === "predict")) return flash("Add a ✨ Guess It! block!");
    const low = classes.filter((c) => samples.countFor(c.id) < 5);
    if (low.length) {
      const what = src === "sketchpad" ? "drawings" : "examples";
      const names = low
        .map((c) => s.classMeta[c.id]?.name || "a Thing")
        .join(" & ");
      return flash(`${names} needs at least 5 ${what} 📸`);
    }
    if (s.modelStatus !== "ready") return flash("Brain is still loading… try again!");

    if (src === "camera") await ensureCamera();
    setPhase("training");
    setTraining({ epoch: 0, total: s.epochs, acc: 0, loss: 0 });

    const flat = samples.flatten(classes.map((c) => c.id));
    try {
      await trainHead({
        samples: flat,
        numClasses: classes.length,
        epochs: s.epochs,
        onEpoch: (epoch, total, acc, loss) => setTraining({ epoch, total, acc, loss }),
      });
    } catch {
      flash("Training hiccup — add a few more examples and retry");
      setPhase("build");
      return;
    }
    const finalAcc = Math.round(useStudio.getState().training.acc * 100);
    useStudio.setState({ celebrated: false, predictions: [], topClassId: null });
    if (src === "sketchpad") clearSketch();
    setPhase("live");
    flash(`I studied ${flat.length} pictures — ${finalAcc}% on my practice test! 🎓`, "ok");
  }, [clearSketch, ensureCamera, flash, setPhase, setTraining]);

  const stop = useCallback(() => {
    setPhase("build");
    setPredictions([], null);
  }, [setPhase, setPredictions]);

  // ---- Live prediction loop (with EMA smoothing so bars don't flicker) ----
  useEffect(() => {
    if (phase !== "live") return;
    let active = true;
    let last = 0;
    let smoothed: number[] | null = null;

    const loop = async (t: number) => {
      if (!active) return;
      if (t - last > 110) {
        last = t;
        const s = useStudio.getState();
        const input =
          sourceOf(s) === "sketchpad" ? sketchRef.current : videoRef.current;
        if (input) {
          const probs = await predict(input);
          if (probs && active) {
            smoothed =
              smoothed && smoothed.length === probs.length
                ? smoothed.map((p, i) => p * 0.65 + probs[i] * 0.35)
                : probs;
            const classes = classBlocks(useStudio.getState());
            let topI = -1;
            let topP = 0;
            smoothed.forEach((p, i) => {
              if (p > topP) {
                topP = p;
                topI = i;
              }
            });
            const topId = topI >= 0 ? classes[topI]?.id ?? null : null;
            setPredictions([...smoothed], topId);
            if (topP > 0.85 && !useStudio.getState().celebrated) {
              celebrate();
              burstConfetti();
            }
          }
        }
      }
      if (active) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, setPredictions, celebrate]);

  // ---- Drag & drop ----
  const onDragStart = (e: DragStartEvent) => {
    const d = e.active.data.current as { fromPalette?: boolean; blockType?: BlockType; type?: BlockType } | undefined;
    if (d?.fromPalette && d.blockType) setActiveDrag({ fromPalette: true, type: d.blockType });
    else if (d?.type) setActiveDrag({ fromPalette: false, type: d.type });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;
    const data = active.data.current as { fromPalette?: boolean; blockType?: BlockType } | undefined;
    const store = useStudio.getState();

    if (data?.fromPalette && data.blockType) {
      if (over.id === "canvas") {
        store.addBlock(data.blockType);
      } else {
        const idx = store.script.findIndex((b) => b.id === over.id);
        store.addBlock(data.blockType, idx >= 0 ? idx : undefined);
      }
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = store.script.findIndex((b) => b.id === active.id);
      const newIndex = store.script.findIndex((b) => b.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        store.reorder(arrayMove(store.script, oldIndex, newIndex));
      }
    }
  };

  const handleReset = useCallback(() => {
    stopCameraTracks();
    reset();
    setHint(null);
  }, [reset]);

  return (
    <CaptureContext.Provider value={captureApi}>
      <div className="atmosphere">
        <span className="blob left-[6%] top-[14%] h-56 w-56 bg-[#ffd2a8] animate-float" />
        <span
          className="blob right-[10%] top-[8%] h-64 w-64 bg-[#ffc2dd] animate-float"
          style={{ animationDelay: "-3s" }}
        />
        <span
          className="blob bottom-[6%] left-[40%] h-72 w-72 bg-[#bfe0ff] animate-float"
          style={{ animationDelay: "-6s" }}
        />
      </div>

      <div className="relative z-[1] flex h-dvh flex-col overflow-hidden">
        <TopBar
          onShowDemos={() => setShowOnboarding(true)}
          onReset={handleReset}
          onHelp={() => setShowHelp(true)}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveDrag(null)}
        >
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            <Palette />
            <ScriptCanvas />
            <Stage
              videoRef={videoRef}
              onToggleCamera={toggleCamera}
              onUseSketch={useSketchInstead}
              onRun={run}
              onStop={stop}
              onRetryBrain={retryBrain}
              hint={hint}
              sketchpad={
                source === "sketchpad" ? (
                  <SketchPad registerCanvas={registerSketch} />
                ) : null
              }
            />
          </main>

          <DragOverlay dropAnimation={null}>
            {activeDrag ? <BlockGhost type={activeDrag.type} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <canvas ref={thumbCanvasRef} width={64} height={48} className="hidden" />

      {showOnboarding && (
        <Onboarding
          onExample={() => dismissOnboarding(loadExample)}
          onSketchExample={() => dismissOnboarding(loadSketchExample)}
          onBlank={() => dismissOnboarding()}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </CaptureContext.Provider>
  );
}

function BlockGhost({ type }: { type: BlockType }) {
  const meta = BLOCK_META[type];
  return (
    <div
      className="toy-block w-[260px] rotate-2 px-3 py-2.5 shadow-xl"
      style={tokenVars(meta.token)}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{meta.emoji}</span>
        <span className="font-display text-[15px] font-bold text-white">{meta.label}</span>
      </div>
    </div>
  );
}

function burstConfetti() {
  const base = { spread: 75, startVelocity: 42, ticks: 180, zIndex: 9999 } as const;
  confetti({ ...base, particleCount: 70, origin: { x: 0.72, y: 0.55 } });
  confetti({ ...base, particleCount: 45, angle: 120, origin: { x: 0.92, y: 0.62 } });
  confetti({ ...base, particleCount: 45, angle: 60, origin: { x: 0.55, y: 0.6 } });
}
