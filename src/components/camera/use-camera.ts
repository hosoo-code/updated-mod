"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "inuse"
  | "error";

/**
 * Camera lifecycle hook.
 * - getUserMedia-ээр камер асууна
 * - Unmount/stop үед БҮХ track-ийг зогсооно (background-д ажиллахгүй)
 * - Permission denied/unavailable төлөвүүдийг ялгаж, Монгол мессеж өгнө
 */
export function useCamera(facingMode: "environment" | "user" = "environment") {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");

  const stop = useCallback(() => {
    // CAMERA CLEANUP — track бүрийг зогсооно
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

  const genRef = useRef(0);

  const start = useCallback(async () => {
    const gen = ++genRef.current;
    stop();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("requesting");
    const constraints = {
      video: {
        facingMode,
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
      } as MediaTrackConstraints,
      audio: false,
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Хуучин зөвшөөрөл хэвээр байвал stream-ийг заавал зогсооно
        if (gen !== genRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus("active");
        return;
      } catch (e) {
        if (gen !== genRef.current) return; // дараагийн start() энэ амлалтыг хүчингүй болгосон
        const err = e as DOMException | null;
        const name = err?.name;
        // Эхний оролдлого зөвшөөрөгдөөгүй бол (низкийн резолюц эсвэл хязгаарлалт) —
        // хязгааргүй (ideal-гүй) оролдоод үзнэ
        if (attempt === 0 && (name === "OverconstrainedError" || name === "NotReadableError")) {
          constraints.video = { facingMode };
          continue;
        }
        if (name === "NotAllowedError" || name === "SecurityError") {
          setStatus("denied");
        } else if (name === "NotReadableError") {
          // Камерыг өөр апп ашиглаж байна — ялгаатай мессеж
          setStatus("inuse");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setStatus("unavailable");
        } else {
          setStatus("error");
        }
        return;
      }
    }
  }, [facingMode, stop]);

  // Unmount үед camera заавал унтраана
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return { videoRef, status, start, stop };
}

export function cameraErrorMessage(status: CameraStatus): string | null {
  switch (status) {
    case "denied":
      return "Камерын зөвшөөрөл татгалзсан байна. Тохиргооноос камерын зөвшөөрлийг өгөөд дахин оролдоно уу.";
    case "unavailable":
      return "Камер олдсонгүй эсвэл ашиглах боломжгүй байна. Камераа шалгаад дахин оролдоно уу.";
    case "inuse":
      return "Камерыг өөр аппликейшн ашиглаж байна. Бусад аппликейшний камерын ашиглалтыг хаагаад дахин оролдоно уу.";
    case "error":
      return "Камер ачаалахад алдаа гарлаа. Дахин оролдоно уу.";
    default:
      return null;
  }
}
