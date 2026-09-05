"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Face detection — real-time guidance.
 *
 * Давуу эрх: (1) Native FaceDetector API (Android Chrome/Edge),
 * (2) MediaPipe BlazeFace (CDN-ээс runtime-д ачаална, iOS Safari дэмжинэ),
 * (3) Боломжгүй бол manual горим (камер ажиллаж, admin хяналт шийднэ).
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
  detect: (video: HTMLVideoElement) => Promise<FaceBox[]>;
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
        return dets.map((d) => {
          const bb = d.boundingBox;
          const nose = d.landmarks?.find((l) => l.type === "nose");
          return {
            x: bb.x / video.videoWidth,
            y: bb.y / video.videoHeight,
            width: bb.width / video.videoWidth,
            height: bb.height / video.videoHeight,
            noseX: nose ? nose.x / video.videoWidth : undefined,
            noseY: nose ? nose.y / video.videoHeight : undefined,
          };
        });
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

let mediaPipePromise: Promise<DetectorBackend | null> | null = null;

async function createMediaPipeDetector(): Promise<DetectorBackend | null> {
  if (mediaPipePromise) return mediaPipePromise;
  mediaPipePromise = (async () => {
    try {
      // Runtime-д CDN-ээс ачаална — bundle-д орохгүй
      const vision = await import(
        /* webpackIgnore: true */ `${MEDIAPIPE_BASE}/vision_bundle.mjs`
      );
      const fileset = await vision.FilesetResolver.forVisionTasks(
        `${MEDIAPIPE_BASE}/wasm`
      );
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
        async detect(video) {
          const result = detector.detectForVideo(video, performance.now());
          return (result.detections ?? []).map((d: {
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
          });
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
  })();
  return mediaPipePromise;
}

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  brightness: number | null,
  enabled: boolean
) {
  const [faces, setFaces] = useState<FaceBox[]>([]);
  const [backend, setBackend] = useState<"native" | "mediapipe" | "none">("none");
  const backendRef = useRef<DetectorBackend | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    const setup = async () => {
      const native = await createNativeDetector();
      if (disposed) return;
      const det = native ?? (await createMediaPipeDetector());
      if (disposed) {
        det?.dispose();
        return;
      }
      backendRef.current = det;
      setBackend(native ? "native" : det ? "mediapipe" : "none");
      if (!det) return;

      const loop = async () => {
        if (disposed || !backendRef.current) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          try {
            const detected = await backendRef.current.detect(video);
            if (!disposed) setFaces(detected);
          } catch {
            /* дараагийн frame-д оролдоно */
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
      setFaces([]);
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
    return "ok";
  })();

  return { faces, guidance, backend };
}

/** Liveness — толгой эргүүлэх чиглэлийг nose байрлалаар тодорхойлох */
export function headTurnState(face: FaceBox | null): "center" | "left" | "right" | null {
  if (!face || face.noseX === undefined) return null;
  const center = face.x + face.width / 2;
  const offset = (face.noseX - center) / Math.max(0.05, face.width);
  if (offset < -0.1) return "right"; // нүүр баруун тийш харсан
  if (offset > 0.1) return "left"; // нүүр зүүн тийш харсан
  return "center";
}
