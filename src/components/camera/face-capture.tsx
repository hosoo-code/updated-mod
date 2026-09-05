"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, RefreshCcw, ScanFace } from "lucide-react";
import { useCamera, cameraErrorMessage, type CameraStatus } from "./use-camera";
import {
  useFaceDetection,
  FACE_GUIDANCE_TEXT,
  headTurnState,
  faceSizeVariance,
  type FaceBox,
} from "./use-face-detection";
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
/** Нэг алхам хэт удаан зогссон үед хэрэглэгчид дохио өгөх — гацахаас сэргийлнэ */
const STEP_TIMEOUT_MS = 12000;

/**
 * Front camera + real-time face guidance + liveness (толгой эргүүлэх + anti-spoof).
 * Biometric identity matching ХИЙДЭГГҮЙ, зөвхөн detection/liveness/anti-spoof.
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
  const [stalled, setStalled] = useState(false);

  // Mount хийгдмэгц камерыг автоматаар эхлүүлнэ
  useEffect(() => {
    start();
  }, [start]);

  const { faces, blink, guidance, backend, widthHistoryRef } = useFaceDetection(
    videoRef,
    brightness,
    status === "active" && phase !== "done"
  );

  // Refs — stale сlosure-оос сэргийлж state-machine-ийн бүх төлөвийг энд хадгална
  const prevFaceRef = useRef<FaceBox | null>(null);
  const stepResultsRef = useRef<boolean[]>([]);
  const firstStepTimeRef = useRef<number>(-1);
  const lastStepTimeRef = useRef<number>(-1);
  const lastStepAtRef = useRef<number>(-1);
  const colorSamplesRef = useRef<{ r: number; g: number; b: number }[]>([]);
  const completedRef = useRef(false);
  const phaseRef = useRef<Phase>("position");
  const stepIndexRef = useRef(0);
  phaseRef.current = phase;
  stepIndexRef.current = stepIndex;

  // Stalled hint — нэг алхам дээр удаан зогссон цагт дохио өгнө (гацахаас сэргийлэх)
  useEffect(() => {
    if (status !== "active" || phase === "done") return;
    const id = window.setInterval(() => {
      if (holdSince !== null) {
        setStalled(performance.now() - holdSince > STEP_TIMEOUT_MS);
      } else {
        setStalled(false);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, phase, holdSince]);

  // Brightness + color sampling loop (300ms)
  useEffect(() => {
    if (status !== "active" || phase === "done") return;
    let raf: number | null = null;
    let last = 0;
    const loop = () => {
      const now = performance.now();
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && now - last > 300) {
        last = now;
        const a = analyzeFrame(video);
        if (a) {
          setBrightness(a.brightness);
          // Холд хийж байх үед өнгөний дээж хуримтлуулна — video replay/photo swap илрүүлэх
          colorSamplesRef.current.push({ r: a.avgR, g: a.avgG, b: a.avgB });
          if (colorSamplesRef.current.length > 40) colorSamplesRef.current.shift();
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

  // finishCapture — бүх төлөвийг ref-ээс уншина (stale closure асуудалгүй)
  const finishCapture = useCallback((mode: "auto" | "manual" = "auto") => {
    if (completedRef.current) return; // double-fire хамгаалалт
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    let blob: Blob;
    let dataUrl: string;
    try {
      const c = captureFrame(video, 1000, 0.8);
      blob = c.blob;
      dataUrl = c.dataUrl;
    } catch {
      // Зураг авахад алдаа — бүтэлгүйтэл гэж үзнэ
      completedRef.current = true;
      setPhase("done");
      window.setTimeout(() => {
        onComplete({
          blob: new Blob([], { type: "image/jpeg" }),
          dataUrl: "",
          faceResult: {
            passed: false,
            livenessPassed: false,
            checks: {
              faceDetected: false,
              singleFace: false,
              lightingOk: false,
              centered: false,
              stepsCompleted: 0,
              steps: [],
              blinkDetected: false,
              sizeVariance: 0,
              colorConsistent: false,
              totalElapsedMs: 0,
              confidence: 0,
            },
            note: "Зураг авахад алдаа гарлаа — admin хяналт шаардлагатай.",
          },
        });
      }, 1300);
      return;
    }

    const detected = facesRef.current.length > 0;
    const stepsDone = stepResultsRef.current;
    const totalSteps = LIVENESS_STEPS.length;
    const didAllSteps = phaseRef.current === "liveness" && stepIndexRef.current >= totalSteps;
    const sizeVar = faceSizeVariance(widthHistoryRef.current);

    // Anti-spoof нийлмэл шалгалт — ТОЛЬКО бодит алхмууд хийгдсэн үед л liveness давагдсан гэж үзнэ.
    // Manual/override үед livenessPassed=false (шүүмжлэлтэй хэвээр), гэхдээ зураг admin руу очно.
    const livenessPassed =
      didAllSteps &&
      stepsDone.length >= totalSteps &&
      stepsDone.every(Boolean) &&
      sizeVar >= 0.02;

    // Өнгө тогтвортой байдал (video replay-ээс сэргийлэх)
    const samples = colorSamplesRef.current;
    let colorConsistent = true;
    if (samples.length >= 2 && samples[0]) {
      const s0 = samples[0];
      for (const s of samples) {
        if (
          Math.abs(s.r - s0.r) > 18 ||
          Math.abs(s.g - s0.g) > 18 ||
          Math.abs(s.b - s0.b) > 18
        ) {
          colorConsistent = false;
          break;
        }
      }
    }

    const totalElapsedMs =
      firstStepTimeRef.current > 0 && lastStepTimeRef.current > 0
        ? lastStepTimeRef.current - firstStepTimeRef.current
        : 0;

    const checks: FaceCheckResult["checks"] = {
      faceDetected: detected,
      singleFace: facesRef.current.length <= 1,
      lightingOk: brightnessRef.current !== null && brightnessRef.current >= 62 && brightnessRef.current <= 205,
      centered: guidanceRef.current === "ok",
      stepsCompleted: stepsDone.filter(Boolean).length,
      steps: didAllSteps ? stepsDone.slice(0, totalSteps) : stepsDone,
      blinkDetected: blinkRef.current.blinkSeen,
      sizeVariance: sizeVar,
      colorConsistent,
      totalElapsedMs,
      confidence: 0,
    };
    checks.confidence =
      0.3 * (checks.faceDetected ? 1 : 0) +
      0.2 * (checks.singleFace ? 1 : 0) +
      0.2 * (checks.lightingOk ? 1 : 0) +
      0.15 * (checks.centered ? 1 : 0) +
      0.15 * (didAllSteps ? 1 : 0);

    const result: FaceCheckResult = {
      // Зургийг admin руу илгээхэд ашиглах боломжтой гэдгийг passed илэрхийлнэ
      passed: mode === "manual" || backendRef.current === "none" ? detected : livenessPassed,
      livenessPassed,
      checks,
      note:
        mode === "manual" || backendRef.current === "none"
          ? "Нүүр илрүүлэлт хязгаарлагдмал — admin хяналт шийднэ."
          : stalledRef.current
            ? "Алхам хэт удаан зогссон — admin хяналт шаардлагатай."
            : null,
    };

    completedRef.current = true;
    setPhase("done");
    window.setTimeout(() => onComplete({ blob, dataUrl, faceResult: result }), 1300);
  }, [videoRef, widthHistoryRef, onComplete]);

  // Render үед refs-ийг шинэчилнэ — finishCapture-д хамгийн сүүлийн утгууд очно
  const facesRef = useRef(faces);
  facesRef.current = faces;
  const guidanceRef = useRef(guidance);
  guidanceRef.current = guidance;
  const brightnessRef = useRef(brightness);
  brightnessRef.current = brightness;
  const blinkRef = useRef(blink);
  blinkRef.current = blink;
  const backendRef = useRef(backend);
  backendRef.current = backend;
  const stalledRef = useRef(stalled);
  stalledRef.current = stalled;

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
      else conditionMet = headTurnState(face, prevFaceRef.current) === step.kind;
    }

    if (face) prevFaceRef.current = face;

    if (conditionMet) {
      if (holdSince === null) {
        setHoldSince(performance.now());
        if (firstStepTimeRef.current < 0) firstStepTimeRef.current = performance.now();
      } else if (performance.now() - holdSince >= HOLD_MS) {
        const now = performance.now();
        lastStepTimeRef.current = now;
        if (phase === "position") {
          setHoldSince(null);
          setPhase("liveness");
          setStepIndex(0);
          prevFaceRef.current = null;
        } else if (stepIndex < LIVENESS_STEPS.length - 1) {
          stepResultsRef.current[stepIndex] = true;
          lastStepAtRef.current = now;
          setHoldSince(null);
          setStepIndex((i) => i + 1);
          prevFaceRef.current = null;
        } else {
          stepResultsRef.current[stepIndex] = true;
          lastStepAtRef.current = now;
          setHoldSince(null);
          finishCapture("auto");
        }
      }
    } else {
      setHoldSince(null);
    }
  }, [status, phase, faces, guidance, stepIndex, holdSince, finishCapture]);

  const currentStep = LIVENESS_STEPS[stepIndex];
  // Холд progress ring — state machine-тэй ижил нөхцөл (бусад алхмуудад ч харагдана)
  const activeCondition =
    phase === "position"
      ? guidance === "ok"
      : currentStep?.kind === "center"
        ? guidance === "ok"
        : !!currentStep &&
          headTurnState(faces[0] ?? null, prevFaceRef.current) === currentStep.kind;
  const showHold = phase === "liveness" && activeCondition && holdSince !== null;

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
        {status === "denied" || status === "unavailable" || status === "error" || status === "inuse" ? (
          <FaceProblem status={status} onRetry={start} />
        ) : phase === "done" ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
            <span className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-brand-500/30 animate-pulse-ring" />
              <span className="absolute inset-0 rounded-full bg-brand-500/20 animate-pulse-ring [animation-delay:0.5s]" />
              <CheckCircle2 className="relative h-14 w-14 text-brand-400" />
            </span>
            <h3 className="text-xl font-bold text-white">Нүүрний шалгалт дууслаа ✓</h3>
            <p className="text-sm text-zinc-400">Зураг авагдаж байна…</p>
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
                      activeCondition
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
              activeCondition
                ? "border-brand-400/40 bg-brand-500/15 text-brand-300"
                : "border-white/15 bg-ink-900/80 text-zinc-200",
              stalled && "border-amber-400/40 bg-amber-500/15 text-amber-300"
            )}
            role="status"
            aria-live="polite"
          >
            <ScanFace className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {stalled
                ? "Толгойгоо зөв байрлалд тогтвортой барина уу…"
                : phase === "liveness"
                  ? currentStep?.label
                  : FACE_GUIDANCE_TEXT[guidance]}
            </span>
          </div>
          {backend === "none" && phase === "position" ? (
            <div className="mt-3 text-center">
              <p className="mb-2 text-xs text-zinc-500">
                Энэ browser-т нүүр илрүүлэлт дэмжигдэхгүй байна. Камерын зураг admin хяналтад очно.
              </p>
              <Button size="sm" variant="secondary" onClick={() => finishCapture("manual")}>
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
