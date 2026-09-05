"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Face detection — real-time guidance + liveness (anti-spoof).
 *
 * Давуу эрх: (1) Native FaceDetector API (Android Chrome/Edge),
 * (2) MediaPipe BlazeFace (CDN-ээс runtime-д ачаална, iOS Safari дэмжинэ),
 * (3) MediaPipe FaceLandmarker (нүд анивчсан blink илрүүлэх — урд камер),
 * (4) Боломжгүй бол manual горим (камер ажиллаж, admin хяналт шийднэ).
 *
 * Энэ нь зөвхөн face DETECTION + liveness guidance юм.
 * Биометрийн identity matching ХИЙДЭГГҮЙ, face embedding хадгалахгүй.
 */

export interface FaceBox {
  x: number; // normalized 0-1 (video координат)
  y: number;
  width: number;
  height: number;
  noseX?: number; // nose keypoint (байвал)
  noseY?: number;
}

/** Blink илрүүлэлтийн үр дүн — FaceLandmarker-аас 2 нүдний EAR */
export interface BlinkResult {
  blinkSeen: boolean;
  /** Нүд анивчихын тулд EAR < 0.23 болсон байх ёстой */
  earBelow: boolean;
}

export type FaceGuidance =
  | "loading"
  | "none"
  | "multiple"
  | "tooFar"
  | "tooClose"
  | "left"
  | "right"
  | "offCenter"
  | "tooDark"
  | "tooBright"
  | "ok";

export const FACE_GUIDANCE_TEXT: Record<FaceGuidance, string> = {
  loading: "Нүүр илрүүлэлт ачаалж байна…",
  none: "Нүүр илэрсэнгүй.",
  multiple: "Камерт зөвхөн нэг хүн харагдана уу.",
  tooFar: "Камераа бага зэрэг ойртуулна уу.",
  tooClose: "Камераас бага зэрэг холдоно уу.",
  left: "Бага зэрэг баруун тийш хөдөлнө үү.",
  right: "Бага зэрэг зүүн тийш хөдөлнө үү.",
  offCenter: "Нүүрээ хүрээний төвд байрлуулна уу.",
  tooDark: "Гэрэлтүүлгийг сайжруулна уу.",
  tooBright: "Гэрэл хэт тод байна. Сүүдэрт шилжиж эсвэл гэрлийг багасгана уу.",
  ok: "Нүүр зөв байрлалд байна ✓",
};

type NativeFaceDetectorCtor = new (opts?: {
  maxDetectedFaces?: number;
  fastMode?: boolean;
}) => {
  detect: (el: HTMLVideoElement) => Promise<NativeDetection[]>;
};

interface NativeDetection {
  boundingBox: DOMRectReadOnly;
  landmarks?: { x: number; y: number; type: string }[];
}

interface DetectorBackend {
  detect: (video: HTMLVideoElement, ts: number) => Promise<{
    faces: FaceBox[];
    blink?: BlinkResult;
  }>;
  dispose: () => void;
}

async function createNativeDetector(): Promise<DetectorBackend | null> {
  const ctor = (window as unknown as { FaceDetector?: NativeFaceDetectorCtor })
    .FaceDetector;
  if (!ctor) return null;
  try {
    const detector = new ctor({ maxDetectedFaces: 3, fastMode: true });
    return {
      async detect(video) {
        const dets = await detector.detect(video);
        return {
          faces: dets.map((d) => {
            const bb = d.boundingBox;
            // Native landmark-ийн type тогтмол биш — nose төрлийг хайж олно
            const nose = d.landmarks?.find((l) => {
              const t = l.type.toLowerCase();
              return t.includes("nose");
            });
            return {
              x: bb.x / video.videoWidth,
              y: bb.y / video.videoHeight,
              width: bb.width / video.videoWidth,
              height: bb.height / video.videoHeight,
              noseX: nose ? nose.x / video.videoWidth : undefined,
              noseY: nose ? nose.y / video.videoHeight : undefined,
            };
          }),
        };
      },
      dispose() {
        /* native detector-т dispose байхгүй */
      },
    };
  } catch {
    return null;
  }
}

const MEDIAPIPE_VERSION = "0.10.14";
const MEDIAPIPE_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;

/**
 * MediaPipe-ийн model/fileset loader-ийг module-д cache хийнэ (детектор ХИЙГҮЙ).
 * Өмнө нь бүтэн live DetectorBackend (GPU ресурс) cache хийгээд, unmount дээр
 * dispose болсны дараа remount-д хаалттай детектор дахин ашиглагдаж байсан.
 * Одоо зөвхөн loader-ийг cache хийх тул failure дээр reset хийж, дахин retry болно.
 */
let mediaPipeLoaderPromise: Promise<{
  createFaceDetector: () => Promise<DetectorBackend | null>;
  createFaceLandmarker: () => Promise<DetectorBackend | null>;
} | null> | null = null;

function resetMediaPipeLoader() {
  mediaPipeLoaderPromise = null;
}

async function loadMediaPipeLoader() {
  if (mediaPipeLoaderPromise) return mediaPipeLoaderPromise;
  mediaPipeLoaderPromise = (async () => {
    try {
      const vision = await import(
        /* webpackIgnore: true */ `${MEDIAPIPE_BASE}/vision_bundle.mjs`
      );
      const fileset = await vision.FilesetResolver.forVisionTasks(
        `${MEDIAPIPE_BASE}/wasm`
      );
      return {
        async createFaceDetector() {
          try {
            const detector = await vision.FaceDetector.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              minDetectionConfidence: 0.5,
            });
            return {
              async detect(video, ts) {
                const result = detector.detectForVideo(video, ts);
                return {
                  faces: (result.detections ?? []).map((d: {
                    boundingBox?: { originX: number; originY: number; width: number; height: number };
                    keypoints?: { x: number; y: number }[];
                  }) => {
                    const bb = d.boundingBox ?? { originX: 0, originY: 0, width: 1, height: 1 };
                    const nose = d.keypoints?.[2]; // BlazeFace keypoints: rightEye, leftEye, noseTip, mouthCenter...
                    return {
                      x: bb.originX,
                      y: bb.originY,
                      width: bb.width,
                      height: bb.height,
                      noseX: nose ? nose.x : undefined,
                      noseY: nose ? nose.y : undefined,
                    };
                  }),
                };
              },
              dispose() {
                try {
                  detector.close();
                } catch {
                  /* ignore */
                }
              },
            };
          } catch {
            return null;
          }
        },
        async createFaceLandmarker() {
          try {
            const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              numFaces: 1,
              outputFaceBlendshapes: false,
              outputFacialTransformationMatrixes: false,
            });
            // EAR (Eye Aspect Ratio) index: 2 нүд
            const LEFT_EYE = [33, 160, 158, 133, 153, 144];
            const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
            const ear = (lm: { x: number; y: number }[], idx: number[]): number => {
            const p = (i: number | undefined) => lm[i ?? 0] ?? { x: 0, y: 0 };
              const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
                Math.hypot(a.x - b.x, a.y - b.y);
              const v1 = d(p(idx[1]), p(idx[5]));
              const v2 = d(p(idx[2]), p(idx[4]));
              const h = d(p(idx[0]), p(idx[3]));
              return h === 0 ? 0 : (v1 + v2) / (2 * h);
            };
            // Blink state (агшсан эсэх)
            let earBelowCount = 0;
            let blinkSeen = false;
            return {
              async detect(video, ts) {
                const res = landmarker.detectForVideo(video, ts);
                const lm = res.faceLandmarks?.[0];
                if (!lm || lm.length < 380) {
                  return { faces: [], blink: { blinkSeen, earBelow: earBelowCount > 0 } };
                }
                const e = (ear(lm, LEFT_EYE) + ear(lm, RIGHT_EYE)) / 2;
                if (e < 0.23) {
                  earBelowCount++;
                  if (earBelowCount >= 2) blinkSeen = true; // 2+ frame дараалан
                } else {
                  earBelowCount = 0;
                }
                // Нүүрний bounding box-ийг landmark-аас үүсгэнэ
                let minX = 1, maxX = 0, minY = 1, maxY = 0;
                for (let i = 0; i < lm.length; i++) {
                  const p = lm[i];
                  if (!p) continue;
                  if (p.x < minX) minX = p.x;
                  if (p.x > maxX) maxX = p.x;
                  if (p.y < minY) minY = p.y;
                  if (p.y > maxY) maxY = p.y;
                }
                const padX = (maxX - minX) * 0.12;
                const padY = (maxY - minY) * 0.16;
                const nose = lm[1] ?? null; // nose tip
                return {
                  faces: [{
                    x: Math.max(0, minX - padX),
                    y: Math.max(0, minY - padY),
                    width: Math.min(1, maxX - minX + padX * 2),
                    height: Math.min(1, maxY - minY + padY * 2),
                    noseX: nose ? nose.x : undefined,
                    noseY: nose ? nose.y : undefined,
                  }],
                  blink: { blinkSeen, earBelow: earBelowCount > 0 },
                };
              },
              dispose() {
                try {
                  landmarker.close();
                } catch {
                  /* ignore */
                }
              },
            };
          } catch {
            return null;
          }
        },
      };
    } catch {
      // CDN/GPU ачаалал амжилтгүй — cache-г өгөгдүүлж, дараагийн оролдлогод retry болно
      resetMediaPipeLoader();
      return null;
    }
  })();
  return mediaPipeLoaderPromise;
}

/** Детектор үүсгэх — native эхлээд, дараа нь MediaPipe BlazeFace, тэгвэл FaceLandmarker (blink) */
async function createBestDetector(): Promise<DetectorBackend | null> {
  const native = await createNativeDetector();
  if (native) return native;
  const loader = await loadMediaPipeLoader();
  if (!loader) return null;
  const blaze = await loader.createFaceDetector();
  if (blaze) return blaze;
  return loader.createFaceLandmarker();
}

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  brightness: number | null,
  enabled: boolean
) {
  const [faces, setFaces] = useState<FaceBox[]>([]);
  const [blink, setBlink] = useState<BlinkResult>({ blinkSeen: false, earBelow: false });
  const [backend, setBackend] = useState<"native" | "mediapipe" | "landmarker" | "none">("none");
  const backendRef = useRef<DetectorBackend | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectTs = useRef(0);
  // Нүүрний width түүх — size variance (3D толгойн хөдөлгөөн) anti-spoof
  const widthHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    const setup = async () => {
      const isNative = !!(window as unknown as { FaceDetector?: unknown }).FaceDetector;
      const det = await createBestDetector();
      if (disposed) {
        det?.dispose();
        return;
      }
      backendRef.current = det;
      setBackend(det ? (isNative ? "native" : "mediapipe") : "none");
      if (!det) return;

      // Detect loop — 60fps биш, ~8-10fps-ээр (battery/thermal)
      const loop = async () => {
        if (disposed || !backendRef.current) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          const now = performance.now();
          if (now - lastDetectTs.current >= 110) {
            lastDetectTs.current = now;
            try {
              const r = await backendRef.current.detect(video, now);
              if (!disposed) {
                setFaces(r.faces);
                if (r.blink) setBlink(r.blink);
                const f = r.faces[0];
                if (f) {
                  const hist = widthHistoryRef.current;
                  hist.push(f.width);
                  if (hist.length > 60) hist.shift();
                }
              }
            } catch {
              /* дараагийн frame-д оролдоно */
            }
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    };

    setup();

    return () => {
      disposed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      backendRef.current?.dispose();
      backendRef.current = null;
      widthHistoryRef.current = [];
      setFaces([]);
      setBlink({ blinkSeen: false, earBelow: false });
    };
  }, [enabled, videoRef]);

  const guidance: FaceGuidance = (() => {
    if (!enabled) return "loading";
    if (backend === "none") return "none";
    if (faces.length === 0) return "none";
    if (faces.length > 1) return "multiple";
    const f = faces[0]!;
    const w = f.width;
    const cx = f.x + w / 2;
    const cy = f.y + f.height / 2;

    if (w < 0.2) return "tooFar";
    if (w > 0.62) return "tooClose";

    const dx = cx - 0.5;
    const dy = cy - 0.45;
    if (Math.abs(dx) > 0.14) return dx < 0 ? "left" : "right";
    if (Math.abs(dy) > 0.16) return "offCenter";

    if (brightness !== null && brightness < 62) return "tooDark";
    if (brightness !== null && brightness > 205) return "tooBright";
    return "ok";
  })();

  return { faces, blink, guidance, backend, widthHistoryRef, detectRef: backendRef };
}

/** Толгой эргүүлэх чиглэл — nose байрлалаар; байхгүй бол bounding box төвийн drift-ээр */
export function headTurnState(
  face: FaceBox | null,
  prevFace?: FaceBox | null
): "center" | "left" | "right" | null {
  if (!face) return null;
  const w = face.width;
  const safeW = Math.max(0.05, w);

  if (face.noseX !== undefined) {
    const center = face.x + w / 2;
    const offset = (face.noseX - center) / safeW;
    const thr = 0.12;
    if (offset < -thr) return "right"; // нүүр баруун тийш харсан
    if (offset > thr) return "left"; // нүүр зүүн тийш харсан
    return "center";
  }

  // nose keypoint байхгүй — bounding box төвийн хөдөлгөөнөөр чиглэлийг тооцно
  if (!prevFace) return null;
  const prevCx = prevFace.x + prevFace.width / 2;
  const cx = face.x + w / 2;
  const drift = (cx - prevCx) / safeW;
  if (drift > 0.05) return "right";
  if (drift < -0.05) return "left";
  return "center";
}

/** Нүүрний размерын өөрчлөлтийн коэффициент (coefficient of variation) — 3D хөдөлгөөн anti-spoof */
export function faceSizeVariance(widths: number[]): number {
  if (widths.length < 12) return 0;
  const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
  if (mean < 0.1) return 0;
  const variance = widths.reduce((a, b) => a + (b - mean) * (b - mean), 0) / widths.length;
  return Math.sqrt(variance) / mean;
}
