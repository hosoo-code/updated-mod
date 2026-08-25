"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
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

  const start = useCallback(async () => {
    stop();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus("active");
    } catch (e) {
      const err = e as DOMException | null;
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        setStatus("denied");
      } else if (
        err?.name === "NotFoundError" ||
        err?.name === "OverconstrainedError" ||
        err?.name === "NotReadableError"
      ) {
        setStatus("unavailable");
      } else {
        setStatus("error");
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
      return "Камер олдсонгүй эсвэл өөр аппликейшн ашиглаж байна. Камераа шалгаад дахин оролдоно уу.";
    case "error":
      return "Камер ачаалахад алдаа гарлаа. Дахин оролдоно уу.";
    default:
      return null;
  }
}
