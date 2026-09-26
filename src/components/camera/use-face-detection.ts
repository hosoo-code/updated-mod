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
  | "covered"
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
  covered: "Нүүр бүрхэгдсэн байна — маск, гар болон үсээр бүү таглана уу.",
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
    /** Нүүр халхалсан (маск/гар) — зөвхөн FaceLandmarker-ийн үед тооцогдоно, бусад backend-д байхгүй */
    occluded?: boolean;
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

/**
 * MediaPipe детектор үүсгэх — эхлээд GPU (хурдан), GPU амжилтгүй бол CPU.
 * PRoot/ARM/Android Chrome дээр GPU delegate байнга алдаа өгдөг — CPU fallback
 * нь юу ч байсан детектор ажиллах баталгааг өгнө (гацахаас сэргийлнэ).
 */
async function createWithDelegateFallback<T>(
  factory: (delegate: "GPU" | "CPU") => Promise<T>
): Promise<T | null> {
  // MediaPipe/WASM-ийн XNNPACK нь CPU delegate үүсгэхдээ console.info-оор
  // мэдээлэл хэвлэдэг. Next dev overlay үүнийг error stack шиг харуулдаг тул
  // зөвхөн энэ тогтмол мэдээллийг түр шүүнэ; бодит warning/error-ийг хэзээ ч
  // дарахгүй.
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    const message = args.map(String).join(" ");
    if (message.includes("Created TensorFlow Lite XNNPACK delegate for CPU")) return;
    originalInfo(...args);
  };
  try {
    try {
      return await factory("GPU");
    } catch {
      /* GPU амжилтгүй — CPU delegate-ээр дахин оролдоно */
    }
    try {
      return await factory("CPU");
    } catch {
      return null;
    }
  } finally {
    console.info = originalInfo;
  }
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
          return createWithDelegateFallback(async (delegate) => {
            const detector = await vision.FaceDetector.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                delegate,
              },
              runningMode: "VIDEO",
              minDetectionConfidence: 0.4,
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
                    // FaceDetector bounding boxes are pixels; FaceBox is normalized.
                    // Keep this fallback consistent with the landmarker backend.
                    const pixelCoordinates =
                      bb.width > 1 || bb.height > 1 || bb.originX > 1 || bb.originY > 1;
                    const scaleX = pixelCoordinates ? video.videoWidth : 1;
                    const scaleY = pixelCoordinates ? video.videoHeight : 1;
                    return {
                      x: bb.originX / scaleX,
                      y: bb.originY / scaleY,
                      width: bb.width / scaleX,
                      height: bb.height / scaleY,
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
          });
        },
        async createFaceLandmarker() {
          return createWithDelegateFallback(async (delegate) => {
            const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate,
              },
              runningMode: "VIDEO",
              // Хоёр нүүрийг зэрэг илрүүлж, liveness үед олон хүн байгааг хориглоно.
              numFaces: 2,
              outputFaceBlendshapes: false,
              outputFacialTransformationMatrixes: false,
            });
            // MediaPipe-ийн VIDEO timestamp нь бүхэл тоо бөгөөд заавал өсөх ёстой.
            // performance.now() зарим production/browser дээр бутархай эсвэл давхардсан
            // утга өгч, detectForVideo warning/error үүсгэхээс хамгаална.
            let lastVideoTimestamp = 0;
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
            /**
             * Occlusion is deliberately advisory. A single FaceLandmarker frame
             * cannot reliably distinguish a covered mouth from a closed mouth,
             * a side pose, facial hair, or landmark jitter. Do not turn an
             * uncertain geometric guess into a hard liveness failure.
             */
            const detectCovered = (_lm: { x: number; y: number }[]): boolean => false;
            // Blink state (агшсан эсэх)
            let earBelowCount = 0;
            let blinkSeen = false;
            let blinkClosed = false;
            return {
              async detect(video, ts) {
                const safeTimestamp = Math.max(lastVideoTimestamp + 1, Math.floor(ts));
                lastVideoTimestamp = safeTimestamp;
                let res: { faceLandmarks?: { x: number; y: number }[][] };
                try {
                  res = landmarker.detectForVideo(video, safeTimestamp);
                } catch {
                  // MediaPipe зарим browser/CPU delegate дээр нэг frame-ийг уншихдаа
                  // дотроо exception гаргаж болно. Нэг frame алгасаад дараагийн
                  // timestamp-ээр үргэлжлүүлэх нь camera flow-г таслахгүй.
                  return { faces: [], blink: { blinkSeen, earBelow: earBelowCount > 0 }, occluded: false };
                }
                const landmarks = res.faceLandmarks ?? [];
                const validLandmarks = landmarks.filter((lm: { x: number; y: number }[]) => lm.length >= 380);
                const primary = validLandmarks[0];
                if (!primary) {
                  return { faces: [], blink: { blinkSeen, earBelow: earBelowCount > 0 }, occluded: false };
                }

                const e = (ear(primary, LEFT_EYE) + ear(primary, RIGHT_EYE)) / 2;
                if (e < 0.23) {
                  earBelowCount++;
                  if (earBelowCount >= 2) {
                    blinkClosed = true;
                  }
                } else {
                  if (blinkClosed && e > 0.27) {
                    blinkSeen = true;
                    blinkClosed = false;
                  }
                  earBelowCount = 0;
                }

                const toFaceBox = (lm: { x: number; y: number }[]): FaceBox => {
                  let minX = 1, maxX = 0, minY = 1, maxY = 0;
                  for (const p of lm) {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                  }
                  const padX = (maxX - minX) * 0.12;
                  const padY = (maxY - minY) * 0.16;
                  const nose = lm[1] ?? null;
                  return {
                    x: Math.max(0, minX - padX),
                    y: Math.max(0, minY - padY),
                    width: Math.min(1, maxX - minX + padX * 2),
                    height: Math.min(1, maxY - minY + padY * 2),
                    noseX: nose ? nose.x : undefined,
                    noseY: nose ? nose.y : undefined,
                  };
                };

                return {
                  faces: validLandmarks.map(toFaceBox),
                  blink: { blinkSeen, earBelow: earBelowCount > 0 },
                  occluded: detectCovered(primary),
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
          });
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

/** Детектор үүсгэх — liveness-д хэрэгтэй landmark backend-ийг түрүүлж сонгоно. */
async function createBestDetector(): Promise<{
  detector: DetectorBackend;
  backend: "native" | "mediapipe" | "landmarker";
} | null> {
  // Liveness-д landmark хэрэгтэй тул MediaPipe FaceLandmarker-ийг нэгдүгээрт
  // сонгоно. Native detector нь зөвхөн browser compatibility fallback байна.
  const loader = await loadMediaPipeLoader();
  if (loader) {
    const landmarker = await loader.createFaceLandmarker();
    if (landmarker) return { detector: landmarker, backend: "landmarker" };
    const blaze = await loader.createFaceDetector();
    if (blaze) return { detector: blaze, backend: "mediapipe" };
  }
  const native = await createNativeDetector();
  if (native) return { detector: native, backend: "native" };
  return null;
}

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  brightness: number | null,
  enabled: boolean
) {
  const [faces, setFaces] = useState<FaceBox[]>([]);
  const [blink, setBlink] = useState<BlinkResult>({ blinkSeen: false, earBelow: false });
  const [occluded, setOccluded] = useState(false);
  const [backend, setBackend] = useState<"native" | "mediapipe" | "landmarker" | "none">("none");
  const backendRef = useRef<DetectorBackend | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectTs = useRef(0);
  // Нүүрний width түүх — size variance (3D толгойн хөдөлгөөн) anti-spoof
  const widthHistoryRef = useRef<number[]>([]);
  const centerHistoryRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    const setup = async () => {
      const created = await createBestDetector();
      if (disposed) {
        created?.detector.dispose();
        return;
      }
      const det = created?.detector ?? null;
      backendRef.current = det;
      setBackend(created?.backend ?? "none");
      if (!det) return;

      // Detect loop — 60fps биш, ~12fps (battery/thermal friendly, харин хангалттай хурдан)
      const loop = async () => {
        if (disposed || !backendRef.current) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          const now = performance.now();
          if (now - lastDetectTs.current >= 80) {
            lastDetectTs.current = now;
            try {
              const r = await backendRef.current.detect(video, now);
              if (!disposed) {
                setFaces(r.faces);
                if (r.faces.length === 0) centerHistoryRef.current = [];
                if (r.blink) setBlink(r.blink);
                if (r.occluded !== undefined) setOccluded(r.occluded);
                const f = r.faces[0];
                if (f) {
                  const hist = widthHistoryRef.current;
                  hist.push(f.width);
                  if (hist.length > 60) hist.shift();
                  const centers = centerHistoryRef.current;
                  centers.push({ x: f.x + f.width / 2, y: f.y + f.height / 2 });
                  if (centers.length > 30) centers.shift();
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
      centerHistoryRef.current = [];
      setFaces([]);
      setBlink({ blinkSeen: false, earBelow: false });
      setOccluded(false);
    };
  }, [enabled, videoRef]);

  const guidance: FaceGuidance = (() => {
    if (!enabled) return "loading";
    if (backend === "none") return "none";
    if (faces.length === 0) return "none";
    if (faces.length > 1) return "multiple";
    const f = faces[0]!;
    let w = f.width;
    let cx = f.x + w / 2;
    let cy = f.y + f.height / 2;

    // The preview uses object-cover, so raw video coordinates do not line up
    // with the visible oval on portrait phones. Project the detected face into
    // the visible crop before comparing it with the guide.
    const video = videoRef.current;
    const display = video?.getBoundingClientRect();
    const parent = video?.parentElement?.getBoundingClientRect();
    if (video && display && parent && video.videoWidth > 0 && video.videoHeight > 0 && parent.width > 0 && parent.height > 0) {
      const scale = Math.max(parent.width / video.videoWidth, parent.height / video.videoHeight);
      const visibleW = parent.width / scale / video.videoWidth;
      const visibleH = parent.height / scale / video.videoHeight;
      const left = (1 - visibleW) / 2;
      const top = (1 - visibleH) / 2;
      cx = (cx - left) / visibleW;
      cy = (cy - top) / visibleH;
      w /= visibleW;
      const guideW = Math.min(0.68 * parent.width, 384) / parent.width;
      const guideH = 0.54;
      if (w < guideW * 0.62) return "tooFar";
      if (w > guideW * 1.12) return "tooClose";
      if (Math.abs(cx - 0.5) > 0.13) return cx < 0.5 ? "left" : "right";
      if (Math.abs(cy - 0.5) > guideH * 0.22) return "offCenter";
    } else {
      if (w < 0.2) return "tooFar";
      if (w > 0.56) return "tooClose";
      if (Math.abs(cx - 0.5) > 0.15) return cx < 0.5 ? "left" : "right";
      if (Math.abs(cy - 0.5) > 0.18) return "offCenter";
    }

    if (brightness !== null && brightness < 62) return "tooDark";
    if (brightness !== null && brightness > 205) return "tooBright";
    const centers = centerHistoryRef.current;
    if (centers.length >= 8) {
      const recent = centers.slice(-8);
      const meanX = recent.reduce((sum, p) => sum + p.x, 0) / recent.length;
      const meanY = recent.reduce((sum, p) => sum + p.y, 0) / recent.length;
      const jitter = recent.reduce((sum, p) => sum + Math.hypot(p.x - meanX, p.y - meanY), 0) / recent.length;
      // Detector-ийн жижиг bounding-box jitter-ийг бодит байрлалын алдаа гэж
      // үзэхгүй; зөвхөн их хөдөлгөөнтэй үед guidance өгнө.
      if (jitter > 0.16) return "offCenter";
    }
    // Нүүр халхалсан (зөвхөн landmarker-ийн үед идэвхтэй) — хүн харагдаж байгаа ч ам/доод хэсэг таглагдсан
    if (occluded) return "covered";
    return "ok";
  })();

  return { faces, blink, occluded, guidance, backend, widthHistoryRef, detectRef: backendRef };
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
