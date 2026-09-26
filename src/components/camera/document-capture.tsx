"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, FileText, RefreshCcw, ShieldCheck, Sun, Zap, Loader2 } from "lucide-react";
import { useCamera, cameraErrorMessage, type CameraStatus } from "./use-camera";
import { analyzeFrame, autoCropDocument, validateCapture } from "./capture-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DocumentGuidance = "none" | "tooFar" | "tooClose" | "tooDark" | "tooBright" | "blurry" | "ready";

export const DOCUMENT_GUIDANCE_TEXT: Record<DocumentGuidance, string> = {
  none: "Баримтаа хүрээнд бүрэн багтааж, 4 буланг нь харагдуулна уу.",
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
/** Иргэний үнэмлэхийн стандарт хэмжээ: 85.6 × 54 мм (ISO/IEC 7810 ID-1) */
export const ID_CARD_ASPECT_RATIO = 85.6 / 54; // ≈ 1.585

export function DocumentCapture({
  documentLabel,
  onConfirm,
  onCancel,
  aspectRatio,
}: {
  documentLabel: string;
  onConfirm: (capture: { blob: Blob; dataUrl: string }) => void;
  onCancel: () => void;
  /** Зургийг тааруулах тэгш өнцөгт харьцаа (w/h). Иргэний үнэмлэх бол ID_CARD_ASPECT_RATIO. */
  aspectRatio?: number;
}) {
  const { videoRef, status, start } = useCamera("environment");
  const [guidance, setGuidance] = useState<DocumentGuidance>("none");
  const [preview, setPreview] = useState<string | null>(null);
  const [autoCount, setAutoCount] = useState(0);
  const previewBlobRef = useRef<Blob | null>(null);
  const analysisRaf = useRef<number | null>(null);
  const lastAnalysis = useRef(0);
  const capturedRef = useRef(false);
  const autoCaptureScheduledRef = useRef(false);
  const readyMetricsRef = useRef<{ width: number; height: number; brightness: number; sharpness: number }[]>([]);

  useEffect(() => {
    start();
  }, [start]);

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
            else if (a.edgeBBoxWidth > 96 || a.edgeBBoxHeight > 96) g = "tooClose";
            else if (a.edgeBBoxWidth > 0 && a.edgeBBoxWidth < 30 && a.edgeDensity > 6) g = "tooFar";
            else if (a.borderEdgeDensity > a.centerEdgeDensity * 1.8 && a.borderEdgeDensity > 10) g = "tooClose";
            else if (a.edgeDensity < 18) g = "none";
            else g = "ready";
            setGuidance(g);
            if (g === "ready") {
              const readyMetrics = readyMetricsRef.current;
              readyMetrics.push({
                width: a.edgeBBoxWidth,
                height: a.edgeBBoxHeight,
                brightness: a.brightness,
                sharpness: a.sharpness,
              });
              if (readyMetrics.length > 12) readyMetrics.shift();
              setAutoCount((c) => {
                const next = c + 1;
                const stable = readyMetrics.length >= 6 && (() => {
                  const recent = readyMetrics.slice(-6);
                  const avgW = recent.reduce((sum, m) => sum + m.width, 0) / recent.length;
                  const avgH = recent.reduce((sum, m) => sum + m.height, 0) / recent.length;
                  return recent.every((m) => Math.abs(m.width - avgW) < 8 && Math.abs(m.height - avgH) < 8 && m.sharpness >= 6);
                })();
                if (next >= 6 && stable && !capturedRef.current && !autoCaptureScheduledRef.current) {
                  autoCaptureScheduledRef.current = true;
                  window.setTimeout(() => {
                    autoCaptureScheduledRef.current = false;
                    handleCaptureRef.current();
                  }, 40);
                }
                return next;
              });
            } else {
              readyMetricsRef.current = [];
              setAutoCount(0);
            }
            lastFrameRef.current = a;
          } else setAutoCount(0);
        }
      }
      analysisRaf.current = requestAnimationFrame(loop);
    };
    analysisRaf.current = requestAnimationFrame(loop);
    return () => {
      if (analysisRaf.current) cancelAnimationFrame(analysisRaf.current);
    };
  }, [status, preview, videoRef]);

  const lastFrameRef = useRef<ReturnType<typeof analyzeFrame> | null>(null);

  const handleCapture = useCallback(() => {
    if (capturedRef.current) return;
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    // Capture хийх яг мөчийн frame-ийг дахин шинжилнэ — auto-capture-ийн
    // 40ms delay дотор баримт хөдөлсөн байж болох тул хуучин analysis-д бүү итгэ.
    const freshAnalysis = analyzeFrame(video);
    const err = validateCapture(freshAnalysis ?? lastFrameRef.current);
    if (err) {
      setGuidance((prev) => (prev === "ready" || err.includes("булан") ? prev : "blurry"));
      return;
    }
    let dataUrl = "";
    let blob: Blob;
    try {
      const c = autoCropDocument(video, 1800, 0.95, aspectRatio ? { aspectRatio } : undefined);
      dataUrl = c.dataUrl;
      blob = c.blob;
    } catch {
      return;
    }
    capturedRef.current = true;
    previewBlobRef.current = blob;
    setPreview(dataUrl);
  }, [aspectRatio, videoRef]);

  const handleCaptureRef = useRef(handleCapture);
  handleCaptureRef.current = handleCapture;

  return (
    <div className="safe-pt safe-pb fixed inset-0 z-[70] flex flex-col bg-zinc-950">
      <div className="relative z-20 flex min-h-14 items-center gap-3 border-b border-white/10 px-4 py-2">
        <button onClick={onCancel} aria-label="Буцах" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white transition hover:bg-white/15"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Баталгаажуулалт</p><p className="truncate text-xs text-zinc-400">{documentLabel} · 4 буланг бүтнээр нь харуулна уу</p></div>
        <ShieldCheck className="h-5 w-5 text-white" />
      </div>
      <div className="relative flex-1 overflow-hidden">
        {(status === "idle" || status === "requesting") ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm" role="status" aria-live="polite">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-zinc-100">
              <Loader2 className="h-4 w-4 animate-spin text-white" /> Камер нээгдэж байна…
            </div>
          </div>
        ) : null}
        {status === "denied" || status === "unavailable" || status === "error" || status === "inuse" ? <CameraProblem status={status} onRetry={start} /> : preview ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-6"><img src={preview} alt="Авсан зураг" className="max-h-[80vh] w-auto max-w-full rounded-2xl border border-white/10 shadow-2xl" /><p className="text-center text-sm text-zinc-300">Зургаа шалгана уу. Тодорхой байгаа эсэхийг нягталсны дараа үргэлжлүүлнэ үү.</p><div className="flex w-full max-w-sm flex-col gap-2.5"><Button size="lg" onClick={() => previewBlobRef.current && onConfirm({ blob: previewBlobRef.current, dataUrl: preview })}><Check className="h-5 w-5" /> Үргэлжлүүлэх</Button><Button size="lg" variant="secondary" onClick={() => { capturedRef.current = false; autoCaptureScheduledRef.current = false; readyMetricsRef.current = []; setAutoCount(0); setPreview(null); }}><RefreshCcw className="h-5 w-5" /> Дахин авах</Button></div></div>
        ) : <><video ref={videoRef} playsInline muted className="h-full w-full object-cover" /><div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex justify-center"><div className="max-w-full rounded-full border border-white/15 bg-zinc-950/70 px-4 py-2 text-center text-xs font-medium text-white shadow-lg backdrop-blur-md">{guidance === "ready" ? "Гараа хөдөлгөхгүй тогтвортой барина уу" : "Баримтын 4 буланг хүрээнд бүрэн оруулна уу"}</div></div><div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="relative max-w-lg" style={aspectRatio ? { width: "min(88%, 56vh)", aspectRatio: String(aspectRatio) } : { height: "72%", width: "92%" }}><div className={cn("absolute inset-0 rounded-[24px] border-2 transition-colors duration-300", guidance === "ready" ? "border-white shadow-[0_0_32px_rgba(255,255,255,0.2)]" : "border-white/60")} />{["top-0 left-0 border-t-4 border-l-4 rounded-tl-[24px]", "top-0 right-0 border-t-4 border-r-4 rounded-tr-[24px]", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[24px]", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-[24px]"].map((pos) => <span key={pos} className={cn("absolute h-10 w-10 border-white", pos, guidance === "ready" ? "opacity-100" : "opacity-60")} />)}{guidance === "ready" ? <div className="absolute inset-x-4 h-0.5 animate-scan rounded bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_rgba(255,255,255,0.7)]" /> : null}{guidance === "none" ? <div className="absolute inset-4 flex items-center justify-center rounded-2xl border border-dashed border-white/30"><div className="flex h-16 w-24 items-center justify-center rounded-lg bg-white/5 backdrop-blur-sm"><Camera className="h-7 w-7 text-white/50" /></div></div> : null}</div></div><div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.72) 100%)" }} /></>}
      </div>
      {!preview && status === "active" ? <div className="relative z-20 border-t border-white/10 px-6 pb-5 pt-4"><GuidancePill guidance={guidance} /><div className="mt-4 flex flex-col items-center gap-3"><button onClick={handleCapture} aria-label="Зураг авах" className={cn("relative flex h-[76px] w-[76px] items-center justify-center rounded-full transition-all duration-300", guidance === "ready" ? "bg-white text-ink-950 shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95" : "bg-white/25 text-white/80 hover:bg-white/35 active:scale-95")}>{guidance === "ready" ? <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse-ring" /> : null}<Camera className="h-8 w-8" /></button><p className="text-xs font-semibold uppercase tracking-widest text-white/80">{guidance === "ready" ? "Зураг авах" : "Гараар авах"}</p>{guidance === "ready" && autoCount > 0 ? <p className="text-[11px] text-zinc-300">Автоматаар авахлаа… ({autoCount}/6)</p> : null}</div></div> : null}
    </div>
  );
}

function GuidancePill({ guidance }: { guidance: DocumentGuidance }) {
  const ready = guidance === "ready";
  const Icon = guidance === "tooDark" || guidance === "tooBright" ? Sun : guidance === "blurry" ? Zap : guidance === "tooFar" || guidance === "tooClose" ? Camera : FileText;
  return <div className={cn("mx-auto flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-md transition-all duration-300", ready ? "border-white/25 bg-white/15 text-white" : "border-white/15 bg-white/10 text-zinc-200")}><Icon className={cn("h-4 w-4", ready && "animate-blink")} />{DOCUMENT_GUIDANCE_TEXT[guidance]}</div>;
}

function CameraProblem({ status, onRetry }: { status: CameraStatus; onRetry: () => void }) {
  return <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15"><Camera className="h-8 w-8 text-rose-300" /></div><h3 className="text-lg font-semibold text-white">Камер ашиглах боломжгүй</h3><p className="max-w-sm text-sm leading-relaxed text-zinc-400">{cameraErrorMessage(status)}</p><div className="flex w-full max-w-sm flex-col gap-2.5"><Button onClick={onRetry}><RefreshCcw className="h-4 w-4" /> Дахин оролдох</Button><p className="text-xs text-zinc-500">Browser-ийн тохиргоо → Камер → Энэ сайтад зөвшөөрөх</p></div></div>;
}
