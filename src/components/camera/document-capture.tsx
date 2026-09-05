"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, FileText, RefreshCcw, ShieldCheck, Sun, Zap } from "lucide-react";
import { useCamera, cameraErrorMessage, type CameraStatus } from "./use-camera";
import { analyzeFrame, captureFrame, validateCapture } from "./capture-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DocumentGuidance = "none" | "tooFar" | "tooClose" | "tooDark" | "tooBright" | "blurry" | "ready";

export const DOCUMENT_GUIDANCE_TEXT: Record<DocumentGuidance, string> = {
  none: "Баримтаа хүрээнд бүрэн багтаана уу.",
  tooFar: "Камераа бага зэрэг ойртуулна уу.",
  tooClose: "Камераас бага зэрэг холдуулна уу.",
  tooDark: "Гэрэлтүүлгийг нэмэгдүүлнэ үү.",
  tooBright: "Гэрэл хэт тод байна. Сүүдэрт шилжиж эсвэл гэрлийг тохируулна уу.",
  blurry: "Камераа тогтвортой барина уу.",
  ready: "Зураг авахад бэлэн байна.",
};

/**
 * CAMERA-ONLY баримт авах дэлгэц.
 * <input type="file">, gallery upload БАЙХГҮЙ — зөвхөн device camera.
 */
export function DocumentCapture({
  documentLabel,
  onConfirm,
  onCancel,
}: {
  documentLabel: string;
  onConfirm: (capture: { blob: Blob; dataUrl: string }) => void;
  onCancel: () => void;
}) {
  const { videoRef, status, start } = useCamera("environment");
  const [guidance, setGuidance] = useState<DocumentGuidance>("none");
  const [preview, setPreview] = useState<string | null>(null);
  const [autoCount, setAutoCount] = useState(0); // тогтвортой 'ready'-ийн фрэйм тоолуур
  const previewBlobRef = useRef<Blob | null>(null);
  const analysisRaf = useRef<number | null>(null);
  const lastAnalysis = useRef(0);
  const capturedRef = useRef(false);

  // Mount хийгдмэгц камерыг автоматаар эхлүүлнэ
  useEffect(() => {
    start();
  }, [start]);

  // Frame шинжилгээ (300ms тутамд) + тогтвортой ready үед auto-capture
  useEffect(() => {
    if (status !== "active" || preview || capturedRef.current) return;
    const loop = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const now = performance.now();
        if (now - lastAnalysis.current > 300) {
          lastAnalysis.current = now;
          let g: DocumentGuidance;
          const a = analyzeFrame(video);
          if (a) {
            if (a.isTooDark) g = "tooDark";
            else if (a.isTooBright) g = "tooBright";
            else if (a.isBlurry) g = "blurry";
            else if (a.edgeBBoxWidth > 0 && a.edgeBBoxWidth < 30 && a.edgeDensity > 6) g = "tooFar";
            else if (a.borderEdgeDensity > a.centerEdgeDensity * 1.8 && a.borderEdgeDensity > 10) g = "tooClose";
            else if (a.edgeDensity < 18) g = "none";
            else g = "ready";
            setGuidance(g);
            // Auto-capture: тогтвортой 'ready' 6 фрэйм (~1.8с) үргэлжилбэл өөрөө авна
            if (g === "ready") {
              setAutoCount((c) => {
                const next = c + 1;
                if (next >= 6 && !capturedRef.current) {
                  capturedRef.current = true;
                  window.setTimeout(() => handleCaptureRef.current(), 40);
                }
                return next;
              });
            } else {
              setAutoCount(0);
            }
            lastFrameRef.current = a;
          } else {
            setAutoCount(0);
          }
        }
      }
      analysisRaf.current = requestAnimationFrame(loop);
    };
    analysisRaf.current = requestAnimationFrame(loop);
    return () => {
      if (analysisRaf.current) cancelAnimationFrame(analysisRaf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, preview, videoRef]);

  const lastFrameRef = useRef<ReturnType<typeof analyzeFrame> | null>(null);

  const handleCapture = useCallback(() => {
    if (capturedRef.current) return;
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    // Зураг авахаас өмнө хамгийн сүүлийн шинжилгээгээр чанарыг баталгаажуулна
    const err = validateCapture(lastFrameRef.current);
    if (err) {
      // Бүдэг/бараг харагдахгүй бол хүлээн авахгүй — preview дээр нь хэвээр үлдээнэ
      setGuidance((prev) => (prev === "ready" || err.includes("булан") ? prev : "blurry"));
      return;
    }
    let dataUrl = "";
    let blob: Blob;
    try {
      const c = captureFrame(video);
      dataUrl = c.dataUrl;
      blob = c.blob;
    } catch {
      return;
    }
    capturedRef.current = true;
    previewBlobRef.current = blob;
    setPreview(dataUrl);
  }, [videoRef]);

  // Auto-capture-д handleCapture-г ref-ээр дуудах (эффект-ийн dep array-г багасгах)
  const handleCaptureRef = useRef(handleCapture);
  handleCaptureRef.current = handleCapture;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-ink-950">
      {/* Top bar */}
      <div className="relative z-20 flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={onCancel}
          aria-label="Буцах"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white transition hover:bg-white/15"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Баталгаажуулалт</p>
          <p className="text-xs text-zinc-400">{documentLabel}</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-brand-400" />
      </div>

      {/* Camera / preview area */}
      <div className="relative flex-1 overflow-hidden">
        {status === "denied" || status === "unavailable" || status === "error" || status === "inuse" ? (
          <CameraProblem status={status} onRetry={start} />
        ) : preview ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-6">
            <img
              src={preview}
              alt="Авсан зураг"
              className="max-h-[60vh] w-auto max-w-full rounded-2xl border border-white/10 shadow-2xl"
            />
            <p className="text-center text-sm text-zinc-300">
              Зургаа шалгана уу. Тодорхой байгаа эсэхийг нягталсны дараа үргэлжлүүлнэ үү.
            </p>
            <div className="flex w-full max-w-sm flex-col gap-2.5">
              <Button size="lg" onClick={() => previewBlobRef.current && onConfirm({ blob: previewBlobRef.current, dataUrl: preview })}>
                <Check className="h-5 w-5" /> Үргэлжлүүлэх
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setPreview(null)}>
                <RefreshCcw className="h-5 w-5" /> Дахин авах
              </Button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {/* Document frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-[52%] w-[86%] max-w-md">
                <div
                  className={cn(
                    "absolute inset-0 rounded-[24px] border-2 transition-colors duration-300",
                    guidance === "ready"
                      ? "border-brand-400 shadow-[0_0_40px_rgba(16,185,129,0.35)]"
                      : "border-white/60"
                  )}
                />
                {/* Corner accents */}
                {(["top-0 left-0 border-t-4 border-l-4 rounded-tl-[24px]", "top-0 right-0 border-t-4 border-r-4 rounded-tr-[24px]", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[24px]", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-[24px]"] as const).map(
                  (pos) => (
                    <span
                      key={pos}
                      className={cn(
                        "absolute h-10 w-10 border-brand-400",
                        pos,
                        guidance === "ready" ? "opacity-100" : "opacity-60"
                      )}
                    />
                  )
                )}
                {/* Scan line */}
                {guidance === "ready" ? (
                  <div className="absolute inset-x-4 h-0.5 animate-scan rounded bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                ) : null}
                {guidance === "none" ? (
                  <div className="absolute inset-4 flex items-center justify-center rounded-2xl border border-dashed border-white/30">
                    <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-white/5 backdrop-blur-sm">
                      <Camera className="h-7 w-7 text-white/50" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {/* Dim edges */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.72) 100%)",
              }}
            />
          </>
        )}
      </div>

      {/* Bottom controls */}
      {!preview && (status === "active" || status === "requesting") ? (
        <div className="relative z-20 px-6 pb-8 pt-4">
          <GuidancePill guidance={guidance} />
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              onClick={handleCapture}
              aria-label="Зураг авах"
              className={cn(
                "relative flex h-[76px] w-[76px] items-center justify-center rounded-full transition-all duration-300",
                guidance === "ready"
                  ? "bg-white text-ink-950 shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95"
                  : "bg-white/25 text-white/80 hover:bg-white/35 active:scale-95"
              )}
            >
              {guidance === "ready" ? (
                <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse-ring" />
              ) : null}
              <Camera className="h-8 w-8" />
            </button>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
              {guidance === "ready" ? "Зураг авах" : "Гараар авах"}
            </p>
            {guidance === "ready" && autoCount > 0 ? (
              <p className="text-[11px] text-brand-300">Автоматаар авахлаа… ({autoCount}/6)</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GuidancePill({ guidance }: { guidance: DocumentGuidance }) {
  const ready = guidance === "ready";
  const Icon =
    guidance === "tooDark" || guidance === "tooBright" ? Sun : guidance === "blurry" ? Zap : guidance === "tooFar" || guidance === "tooClose" ? Camera : FileText;
  return (
    <div
      className={cn(
        "mx-auto flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-md transition-all duration-300",
        ready
          ? "border-brand-400/40 bg-brand-500/15 text-brand-300"
          : "border-white/15 bg-ink-900/80 text-zinc-200"
      )}
    >
      <Icon className={cn("h-4 w-4", ready && "animate-blink")} />
      {DOCUMENT_GUIDANCE_TEXT[guidance]}
    </div>
  );
}

function CameraProblem({
  status,
  onRetry,
}: {
  status: CameraStatus;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
        <Camera className="h-8 w-8 text-rose-400" />
      </div>
      <h3 className="text-lg font-semibold text-white">Камер ашиглах боломжгүй</h3>
      <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
        {cameraErrorMessage(status)}
      </p>
      <div className="flex flex-col gap-2.5">
        <Button onClick={onRetry}>
          <RefreshCcw className="h-4 w-4" /> Дахин оролдох
        </Button>
        <p className="text-xs text-zinc-500">
          Browser-ийн тохиргоо → Камер → Энэ сайтад зөвшөөрөх
        </p>
      </div>
    </div>
  );
}
