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
  getBackend,
} from "@/lib/mlEngine";
import { playSfx, resumeMusicIfEnabled } from "@/lib/sound";
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
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);

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
    // Re-arm on every (re)mount: React Strict Mode unmount→remount flips this false,
    // permanently breaking ensureCamera's mounted guard without this reset.
    mountedRef.current = true;
    if (initialDemo === "camera") {
      localStorage.setItem(ONBOARD_KEY, "1");
      loadExample();
      if (typeof pendo !== "undefined") {
        pendo.track("demo_recipe_loaded", {
          demo_type: "camera",
          had_existing_work: false,
          existing_sample_count: 0,
        });
      }
    } else if (initialDemo === "sketch") {
      localStorage.setItem(ONBOARD_KEY, "1");
      loadSketchExample();
      if (typeof pendo !== "undefined") {
        pendo.track("demo_recipe_loaded", {
          demo_type: "sketch",
          had_existing_work: false,
          existing_sample_count: 0,
        });
      }
    } else if (!localStorage.getItem(ONBOARD_KEY)) {
      setShowOnboarding(true);
    }
    setModelStatus("loading");
    loadFeatureExtractor()
      .then(() => {
        setModelStatus("ready");
        if (typeof pendo !== "undefined") {
          pendo.track("brain_loaded", {
            backend: getBackend(),
            load_source: "initial",
          });
        }
      })
      .catch((e) => {
        setModelStatus("error");
        if (typeof pendo !== "undefined") {
          pendo.track("brain_load_failed", {
            error_message: e instanceof Error ? e.message?.substring(0, 100) : "unknown",
            is_retry: false,
            backend_attempted: getBackend(),
          });
        }
      });
    // Browser blocks autoplay until first interaction — resume music on first pointerdown.
    const resume = () => resumeMusicIfEnabled();
    window.addEventListener("pointerdown", resume, { once: true });
    return () => {
      mountedRef.current = false;
      stopCameraTracks();
      window.removeEventListener("pointerdown", resume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryBrain = useCallback(() => {
    setModelStatus("loading");
    retryLoad()
      .then(() => {
        setModelStatus("ready");
        if (typeof pendo !== "undefined") {
          pendo.track("brain_loaded", {
            backend: getBackend(),
            load_source: "retry",
          });
        }
      })
      .catch((e) => {
        setModelStatus("error");
        if (typeof pendo !== "undefined") {
          pendo.track("brain_load_failed", {
            error_message: e instanceof Error ? e.message?.substring(0, 100) : "unknown",
            is_retry: true,
            backend_attempted: getBackend(),
          });
        }
      });
  }, [setModelStatus]);

  // Stop the live stream when source changes away from camera so the webcam LED goes off.
  useEffect(() => {
    if (source !== "camera") {
      stopCameraTracks();
      if (useStudio.getState().camera === "on") setCamera("off");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

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

  // ---- Camera ----
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
      // Source may have swapped or component unmounted while the permission prompt was open —
      // kill the stream immediately or the hardware camera LED stays on with no UI.
      if (!mountedRef.current || sourceOf(useStudio.getState()) !== "camera") {
        stream.getTracks().forEach((t) => t.stop());
        if (mountedRef.current) setCamera("off");
        return;
      }
      streamRef.current = stream;
      // Track 'ended' fires when OS/browser revokes camera mid-session; without this
      // the LIVE badge and prediction loop keep running on a frozen last frame.
      stream.getTracks().forEach((t) =>
        t.addEventListener("ended", () => {
          stopCameraTracks();
          setCamera("denied");
          if (useStudio.getState().phase === "live") {
            setPhase("build");
            setPredictions([], null);
            flash("Camera was disconnected — tap GO to restart");
          }
        }),
      );
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamera("on");
    } catch {
      setCamera("denied");
      if (typeof pendo !== "undefined") {
        pendo.track("camera_permission_denied", {
          had_previous_camera_access: false,
          source_at_denial: sourceOf(useStudio.getState()) || "none",
        });
      }
    }
  }, [flash, setCamera, setPhase, setPredictions]);

  const toggleCamera = useCallback(() => {
    if (useStudio.getState().camera === "on") {
      stopCameraTracks();
      setCamera("off");
      // Wipe stale bars so a confident guess can't linger over the "Camera is off" panel.
      if (useStudio.getState().phase === "live") setPredictions([], null);
    } else {
      void ensureCamera();
    }
  }, [ensureCamera, setCamera, setPredictions]);

  /** Camera-shy escape hatch: swap the recipe's eyes to the sketchpad. */
  const useSketchInstead = useCallback(() => {
    stopCameraTracks();
    setCamera("off");
    addBlock("sketchpad");
    flash("No camera needed — draw your examples instead! ✏️", "ok");
  }, [addBlock, flash, setCamera]);

  // ---- Capture ----
  const grabThumb = useCallback((el: HTMLVideoElement | HTMLCanvasElement, mirror: boolean): string => {
    const c = thumbCanvasRef.current;
    if (!c) return "";
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    ctx.save();
    if (mirror) {
      ctx.scale(-1, 1); // mirror to match on-screen video
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

  // Stable ref: an inline arrow would re-run SketchPad's effects on every Studio render, wiping drawings.
  const registerSketch = useCallback((c: HTMLCanvasElement | null) => {
    sketchRef.current = c;
  }, []);

  const captureSample = useCallback(
    async (classId: string) => {
      const state = useStudio.getState();
      const srcAtStart = sourceOf(state);
      // Inference is async (~80ms); a source swap mid-flight would land an embedding from the
      // old source into incompatible classes. Re-check state after every await and drop if moved.
      const stillValid = () => {
        const st = useStudio.getState();
        return sourceOf(st) === srcAtStart && !!st.classMeta[classId];
      };
      if (srcAtStart === "sketchpad") {
        const c = sketchRef.current;
        if (!c) return;
        if (!state.sketchDirty) {
          flash("Draw something on the pad first! ✏️");
          throw new Error("empty-sketch");
        }
        const emb = await captureEmbedding(c);
        if (!stillValid()) return;
        const { sampleId, count } = samples.addEmbedding(classId, emb);
        noteCapture(classId, sampleId, grabThumb(c, false), count);
        playSfx("pop");
        if (typeof pendo !== "undefined") {
          const st = useStudio.getState();
          pendo.track("sample_captured", {
            source_type: "sketchpad",
            class_name: st.classMeta[classId]?.name || "unknown",
            sample_count_after: count,
            class_index: classBlocks(st).findIndex((b) => b.id === classId),
          });
        }
        clearSketch();
        flash("Got it! Now draw it again, a little different ✨", "ok");
        return;
      }
      const v = videoRef.current;
      if (!v) return;
      const emb = await captureEmbedding(v);
      if (!stillValid()) return;
      const { sampleId, count } = samples.addEmbedding(classId, emb);
      noteCapture(classId, sampleId, grabThumb(v, true), count);
      playSfx("pop"); // throttled internally so hold-to-capture stays gentle
      if (typeof pendo !== "undefined") {
        const st = useStudio.getState();
        pendo.track("sample_captured", {
          source_type: "camera",
          class_name: st.classMeta[classId]?.name || "unknown",
          sample_count_after: count,
          class_index: classBlocks(st).findIndex((b) => b.id === classId),
        });
      }
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

    if (src === "camera") {
      await ensureCamera();
      // Camera still blocked after prompt — don't enter live with no frames.
      if (useStudio.getState().camera !== "on") {
        return flash("I need the camera to play — turn it on or switch to the Sketchpad ✏️");
      }
    }
    // runId guards against a Reset mid-training; without it trainHead resolving after reset
    // would push the blank session into 'live'.
    const runId = ++runIdRef.current;
    playSfx("whoosh");
    setPhase("training");
    setTraining({ epoch: 0, total: s.epochs, acc: 0, loss: 0 });

    const flat = samples.flatten(classes.map((c) => c.id));
    try {
      await trainHead({
        samples: flat,
        numClasses: classes.length,
        epochs: s.epochs,
        onEpoch: (epoch, total, acc, loss) => {
          if (runId === runIdRef.current) setTraining({ epoch, total, acc, loss });
        },
      });
    } catch (e) {
      if (runId !== runIdRef.current) return;
      if (typeof pendo !== "undefined") {
        pendo.track("model_training_failed", {
          num_classes: classes.length,
          total_samples: flat.length,
          epochs: s.epochs,
          source_type: src,
          error_message: e instanceof Error ? e.message?.substring(0, 100) : "unknown",
        });
      }
      flash("Training hiccup — add a few more examples and retry");
      setPhase("build");
      return;
    }
    // Abandon if Reset or source swap happened during training.
    if (runId !== runIdRef.current || useStudio.getState().phase !== "training") return;
    const { acc: finalAccRaw, loss: finalLoss } = useStudio.getState().training;
    const finalAcc = Math.round(finalAccRaw * 100);
    if (typeof pendo !== "undefined") {
      pendo.track("model_training_completed", {
        num_classes: classes.length,
        total_samples: flat.length,
        epochs: s.epochs,
        final_accuracy: finalAcc,
        final_loss: Math.round(finalLoss * 1000) / 1000,
        source_type: src,
      });
    }
    useStudio.setState({ celebrated: false, predictions: [], topClassId: null });
    if (src === "sketchpad") clearSketch();
    playSfx("fanfare");
    setPhase("live");
    flash(`I studied ${flat.length} pictures — ${finalAcc}% on my practice test! 🎓`, "ok");
  }, [clearSketch, ensureCamera, flash, setPhase, setTraining]);

  const stop = useCallback(() => {
    setPhase("build");
    setPredictions([], null);
    // Clear doodle drawn during testing so it can't be accidentally captured as a training example.
    if (sourceOf(useStudio.getState()) === "sketchpad") clearSketch();
  }, [clearSketch, setPhase, setPredictions]);

  // ---- Live prediction loop (EMA smoothing so bars don't flicker) ----
  useEffect(() => {
    if (phase !== "live") return;
    let active = true;
    let last = 0;
    let smoothed: number[] | null = null;

    const loop = async (t: number) => {
      if (!active) return;
      try {
        if (t - last > 110) {
          last = t;
          const s = useStudio.getState();
          const isSketch = sourceOf(s) === "sketchpad";
          if (isSketch && !s.sketchDirty) {
            // Blank pad — clear any stale predictions and wait for the kid to draw.
            setPredictions(new Array(classBlocks(s).length).fill(0), null);
            smoothed = null;
          } else {
            const input = isSketch ? sketchRef.current : videoRef.current;
            if (input) {
              const probs = await predict(input);
              if (!isSketch && probs === null && active) {
                // Camera lost mid-play — clear stale UI.
                setPredictions(new Array(classBlocks(useStudio.getState()).length).fill(0), null);
                smoothed = null;
              }
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
                  playSfx("tada");
                  burstConfetti();
                  if (typeof pendo !== "undefined") {
                    pendo.track("prediction_celebrated", {
                      predicted_class_name: topId ? s.classMeta[topId]?.name || "unknown" : "unknown",
                      confidence: Math.round(topP * 100),
                      num_classes: classes.length,
                      source_type: isSketch ? "sketchpad" : "camera",
                    });
                  }
                }
              }
            }
          }
        }
      } catch {
        // TF.js error (e.g. WebGL context lost) — skip frame and keep looping.
      } finally {
        if (active) rafRef.current = requestAnimationFrame(loop);
      }
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
      playSfx("snap");
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
    const s = useStudio.getState();
    const numClasses = classBlocks(s).length;
    const totalSamples = Object.values(s.classMeta).reduce((n, m) => n + (m?.sampleCount ?? 0), 0);
    if (typeof pendo !== "undefined") {
      pendo.track("session_reset", {
        num_classes_at_reset: numClasses,
        total_samples_at_reset: totalSamples,
        phase_at_reset: s.phase,
        source_type_at_reset: sourceOf(s) || "none",
      });
    }
    runIdRef.current++; // invalidate any in-flight training
    stopCameraTracks();
    reset();
    setHint(null);
    localStorage.removeItem(ONBOARD_KEY);
    setShowOnboarding(true);
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
              onBrainNotReady={() => flash("Still warming up — try again in a second! 🔌")}
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
          existingExamples={Object.values(useStudio.getState().classMeta).reduce(
            (n, m) => n + (m?.sampleCount ?? 0),
            0,
          )}
          onExample={() => {
            const existingCount = Object.values(useStudio.getState().classMeta).reduce((n, m) => n + (m?.sampleCount ?? 0), 0);
            if (typeof pendo !== "undefined") {
              pendo.track("demo_recipe_loaded", {
                demo_type: "camera",
                had_existing_work: existingCount > 0,
                existing_sample_count: existingCount,
              });
            }
            dismissOnboarding(loadExample);
          }}
          onSketchExample={() => {
            const existingCount = Object.values(useStudio.getState().classMeta).reduce((n, m) => n + (m?.sampleCount ?? 0), 0);
            if (typeof pendo !== "undefined") {
              pendo.track("demo_recipe_loaded", {
                demo_type: "sketch",
                had_existing_work: existingCount > 0,
                existing_sample_count: existingCount,
              });
            }
            dismissOnboarding(loadSketchExample);
          }}
          onBlank={() => {
            const existingCount = Object.values(useStudio.getState().classMeta).reduce((n, m) => n + (m?.sampleCount ?? 0), 0);
            if (typeof pendo !== "undefined") {
              pendo.track("build_from_scratch_started", {
                had_existing_work: existingCount > 0,
                existing_sample_count: existingCount,
              });
            }
            dismissOnboarding();
          }}
        />
      )}
      {showHelp && <HelpModal source={source} onClose={() => setShowHelp(false)} />}
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
        <span className="font-display text-[15px] font-bold text-[color:var(--blk-text)]">{meta.label}</span>
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
