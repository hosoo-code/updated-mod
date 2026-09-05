"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, RefreshCcw, ScanFace } from "lucide-react";
import { useCamera, cameraErrorMessage, type CameraStatus } from "./use-camera";
import { useFaceDetection, FACE_GUIDANCE_TEXT, headTurnState } from "./use-face-detection";
import { analyzeFrame, captureFrame } from "./capture-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FaceCheckResult } from "@/types";

type Phase = "position" | "liveness" | "done";

interface LivenessStep {
  kind: "center" | "right" | "left";
  label: string;
}

const LIVENESS_STEPS: LivenessStep[] = [
  { kind: "center", label: "Камер руу эгц харна уу." },
  { kind: "right", label: "Толгойгоо бага зэрэг баруун тийш эргүүлнэ үү." },
  { kind: "left", label: "Одоо зүүн тийш эргүүлнэ үү." },
  { kind: "center", label: "Нүүрээ төвд буцааж байрлуулна уу." },
];

const HOLD_MS = 1200;

/**
 * Front camera + real-time face guidance + liveness (толгой эргүүлэх).
 * Biometric identity matching ХИЙДЭГГҮЙ, зөвхөн detection/liveness.
 */
export function FaceCapture({
  onComplete,
  onCancel,
}: {
  onComplete: (result: { blob: Blob; dataUrl: string; faceResult: FaceCheckResult }) => void;
  onCancel: () => void;
}) {
  const { videoRef, status, start } = useCamera("user");
  const [brightness, setBrightness] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("position");
  const [stepIndex, setStepIndex] = useState(0);
  const [holdSince, setHoldSince] = useState<number | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);

  // Mount хийгдмэгц камерыг автоматаар эхлүүлнэ
  useEffect(() => {
    start();
  }, [start]);

  const { faces, guidance, backend } = useFaceDetection(
    videoRef,
    brightness,
    status === "active" && phase !== "done"
  );

  const stateRef = useRef({ phase, stepIndex, holdSince });
  stateRef.current = { phase, stepIndex, holdSince };

  // Brightness loop (300ms)
  useEffect(() => {
    if (status !== "active" || phase === "done") return;
    let raf: number | null = null;
    let last = 0;
    const loop = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const now = performance.now();
        if (now - last > 300) {
          last = now;
          const a = analyzeFrame(video);
          if (a) setBrightness(a.brightness);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [status, phase, videoRef]);

  // Hold progress animation
  useEffect(() => {
    if (holdSince === null) {
      setHoldProgress(0);
      return;
    }
    let raf: number | null = null;
    const loop = () => {
      const p = Math.min(1, (performance.now() - holdSince) / HOLD_MS);
      setHoldProgress(p);
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [holdSince]);

  const finishCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const { dataUrl, blob } = captureFrame(video, 1000, 0.8);
    const detected = faces.length > 0;
    const result: FaceCheckResult = {
      passed: true,
      livenessPassed: phase === "liveness" && stepIndex >= LIVENESS_STEPS.length,
      checks: {
        faceDetected: detected,
        singleFace: faces.length <= 1,
        lightingOk: brightness !== null && brightness >= 62,
        centered: guidance === "ok",
        stepsCompleted: Math.max(0, stepIndex),
      },
      note: backend === "none" ? "Энэ browser-т face detection боломжгүй — admin хяналт шийднэ." : null,
    };
    setPhase("done");
    window.setTimeout(() => onComplete({ blob, dataUrl, faceResult: result }), 1400);
  }, [videoRef, faces, phase, stepIndex, brightness, guidance, backend, onComplete]);

  // Main state machine — face guidance + liveness steps
  useEffect(() => {
    if (status !== "active" || phase === "done") return;

    const face = faces[0] ?? null;
    const step = LIVENESS_STEPS[stepIndex] ?? null;
    let conditionMet = false;

    if (phase === "position") {
      conditionMet = guidance === "ok";
    } else if (step) {
      if (step.kind === "center") conditionMet = guidance === "ok";
      else conditionMet = headTurnState(face) === step.kind;
    }

    if (conditionMet) {
      if (holdSince === null) setHoldSince(performance.now());
      else if (performance.now() - holdSince >= HOLD_MS) {
        setHoldSince(null);
        if (phase === "position") {
          setPhase("liveness");
          setStepIndex(0);
        } else if (stepIndex < LIVENESS_STEPS.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          finishCapture();
        }
      }
    } else {
      setHoldSince(null);
    }
  }, [status, phase, faces, guidance, stepIndex, holdSince, finishCapture]);

  const currentStep = LIVENESS_STEPS[stepIndex];
  const showHold = phase === "liveness" && guidance === "ok" && currentStep?.kind === "center";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-ink-950">
      <div className="relative z-20 flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={onCancel}
          aria-label="Буцах"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white transition hover:bg-white/15"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Нүүрний баталгаажуулалт</p>
          <p className="text-xs text-zinc-400">Урд камер</p>
        </div>
        <ScanFace className="h-5 w-5 text-brand-400" />
      </div>

      <div className="relative flex-1 overflow-hidden">
        {status === "denied" || status === "unavailable" || status === "error" ? (
          <FaceProblem status={status} onRetry={start} />
        ) : phase === "done" ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
            <span className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-brand-500/30 animate-pulse-ring" />
              <span className="absolute inset-0 rounded-full bg-brand-500/20 animate-pulse-ring [animation-delay:0.5s]" />
              <CheckCircle2 className="relative h-14 w-14 text-brand-400" />
            </span>
            <h3 className="text-xl font-bold text-white">Нүүрний шалгалт дууслаа ✓</h3>
            <p className="text-sm text-zinc-400">Face verification complete</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.78) 100%)",
                }}
              />
              {/* Oval guide */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-[54%] w-[68%] max-w-sm">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-[50%] border-2 transition-all duration-300",
                      guidance === "ok"
                        ? "border-brand-400 shadow-[0_0_44px_rgba(16,185,129,0.4)]"
                        : "border-white/60"
                    )}
                  />
                  {showHold ? (
                    <div
                      className="absolute -inset-1.5 rounded-[50%] border-2 border-brand-400/60"
                      style={{
                        clipPath: `inset(0 ${100 - holdProgress * 100}% 0 0)`,
                        transform: "rotate(-90deg)",
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {status === "active" && phase !== "done" ? (
        <div className="relative z-20 px-6 pb-8 pt-4">
          {/* Liveness progress dots */}
          {phase === "liveness" ? (
            <div className="mb-3 flex items-center justify-center gap-2">
              {LIVENESS_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i < stepIndex
                      ? "w-6 bg-brand-400"
                      : i === stepIndex
                        ? "w-4 bg-brand-400/60"
                        : "w-2 bg-white/15"
                  )}
                />
              ))}
            </div>
          ) : null}
          <div
            className={cn(
              "mx-auto flex w-fit max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-md transition-all duration-300",
              guidance === "ok"
                ? "border-brand-400/40 bg-brand-500/15 text-brand-300"
                : "border-white/15 bg-ink-900/80 text-zinc-200"
            )}
          >
            <ScanFace className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {phase === "liveness" ? currentStep?.label : FACE_GUIDANCE_TEXT[guidance]}
            </span>
          </div>
          {backend === "none" && phase === "position" ? (
            <div className="mt-3 text-center">
              <p className="mb-2 text-xs text-zinc-500">
                Энэ browser-т нүүр илрүүлэлт дэмжигдэхгүй байна. Камерын зураг admin хяналтад очно.
              </p>
              <Button size="sm" variant="secondary" onClick={finishCapture}>
                <Camera className="h-4 w-4" /> Гараар үргэлжлүүлэх
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FaceProblem({ status, onRetry }: { status: CameraStatus; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
        <Camera className="h-8 w-8 text-rose-400" />
      </div>
      <h3 className="text-lg font-semibold text-white">Камер ашиглах боломжгүй</h3>
      <p className="max-w-sm text-sm leading-relaxed text-zinc-400">{cameraErrorMessage(status)}</p>
      <Button onClick={onRetry}>
        <RefreshCcw className="h-4 w-4" /> Дахин оролдох
      </Button>
    </div>
  );
}
