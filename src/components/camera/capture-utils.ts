"use client";

/**
 * Camera frame-ийн client-side шинжилгээ (privacy-friendly).
 *
 * - Canvas руу хуулсан зурагнаас БУСАД мэдээлэл авахгүй
 * - EXIF гэх мэт metadata хадгалагдахгүй (canvas output нь metadata-гүй)
 * - Бодит document/face баталгаажуулалтыг admin хяналт шийднэ.
 *   Энэ шинжилгээ нь зөвхөн хэрэглэгчид бодит цагийн guidance өгнө.
 */

export interface FrameAnalysis {
  brightness: number; // 0-255
  sharpness: number; // Laplacian variance
  edgeDensity: number; // Sobel edge mean
  isTooDark: boolean;
  isTooBright: boolean;
  isBlurry: boolean;
  /** Баримтын хэмжээний heuristic: edge bounding box-ийн өргөн (frame-ийн %) */
  edgeBBoxWidth: number;
  /** Төв хэсгийн edge нягт (frame-ийн 60%) */
  centerEdgeDensity: number;
  /** Захын band-ийн edge нягт (frame-ийн гадна 15%) */
  borderEdgeDensity: number;
}

export function analyzeFrame(
  video: HTMLVideoElement,
  sampleSize = 160
): FrameAnalysis | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  const scale = Math.min(1, sampleSize / Math.max(w, h));
  const sw = Math.max(2, Math.round(w * scale));
  const sh = Math.max(2, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  const gray = new Float32Array(sw * sh);
  let sum = 0;
  for (let i = 0; i < sw * sh; i++) {
    const r = data[i * 4] ?? 0;
    const gx = data[i * 4 + 1] ?? 0;
    const b = data[i * 4 + 2] ?? 0;
    const v = 0.299 * r + 0.587 * gx + 0.114 * b;
    gray[i] = v;
    sum += v;
  }
  const brightness = sum / (sw * sh);

  // Laplacian (blur илрүүлэх)
  let lapSum = 0;
  let lapSqSum = 0;
  let count = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      const lap =
        (gray[i - sw] ?? 0) +
        (gray[i + sw] ?? 0) +
        (gray[i - 1] ?? 0) +
        (gray[i + 1] ?? 0) -
        4 * (gray[i] ?? 0);
      lapSum += lap;
      lapSqSum += lap * lap;
      count++;
    }
  }
  const mean = lapSum / count;
  const variance = lapSqSum / count - mean * mean;
  const sharpness = Math.sqrt(Math.max(0, variance));

  // Sobel edge detection — баримт хүрээнд байгаа эсэх heuristic
  const edge = new Float32Array(sw * sh);
  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      const gx =
        (gray[i - sw + 1] ?? 0) - (gray[i - sw - 1] ?? 0) +
        2 * ((gray[i + 1] ?? 0) - (gray[i - 1] ?? 0)) +
        (gray[i + sw + 1] ?? 0) - (gray[i + sw - 1] ?? 0);
      const gy =
        (gray[i + sw - 1] ?? 0) - (gray[i - sw - 1] ?? 0) +
        2 * ((gray[i + sw] ?? 0) - (gray[i - sw] ?? 0)) +
        (gray[i + sw + 1] ?? 0) - (gray[i - sw + 1] ?? 0);
      const mag = Math.sqrt(gx * gx + gy * gy);
      edge[i] = mag;
      edgeSum += mag;
      edgeCount++;
    }
  }
  const edgeDensity = edgeSum / edgeCount;

  // Edge bounding box — баримтын хэмжээг ойролцоогоор тодорхойлох
  const edgeThreshold = Math.max(8, edgeDensity * 1.6);
  let minX = sw;
  let maxX = 0;
  let minY = sh;
  let maxY = 0;
  let strongCount = 0;
  for (let y = 2; y < sh - 2; y++) {
    for (let x = 2; x < sw - 2; x++) {
      if ((edge[y * sw + x] ?? 0) > edgeThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        strongCount++;
      }
    }
  }
  const edgeBBoxWidth = strongCount > 4 ? ((maxX - minX) / sw) * 100 : 0;

  // Төв (60%) vs захын (гадна 15%) edge нягт
  const cx0 = Math.floor(sw * 0.2);
  const cx1 = Math.ceil(sw * 0.8);
  const cy0 = Math.floor(sh * 0.2);
  const cy1 = Math.ceil(sh * 0.8);
  let centerSum = 0;
  let centerCount = 0;
  let borderSum = 0;
  let borderCount = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const v = edge[y * sw + x] ?? 0;
      const inCenter = x >= cx0 && x <= cx1 && y >= cy0 && y <= cy1;
      const inBorder =
        x < sw * 0.12 || x > sw * 0.88 || y < sh * 0.12 || y > sh * 0.88;
      if (inCenter) {
        centerSum += v;
        centerCount++;
      } else if (inBorder) {
        borderSum += v;
        borderCount++;
      }
    }
  }
  const centerEdgeDensity = centerCount ? centerSum / centerCount : 0;
  const borderEdgeDensity = borderCount ? borderSum / borderCount : 0;

  return {
    brightness,
    sharpness,
    edgeDensity,
    isTooDark: brightness < 62,
    isTooBright: brightness > 205,
    isBlurry: sharpness < 6,
    edgeBBoxWidth,
    centerEdgeDensity,
    borderEdgeDensity,
  };
}

/** Бүтэн frame-ийг JPEG болгон авах (compression + downscale + metadata strip) */
export function captureFrame(
  video: HTMLVideoElement,
  maxSize = 1400,
  quality = 0.85
): { dataUrl: string; blob: Blob; width: number; height: number } {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const bytes = atob(dataUrl.split(",")[1] ?? "");
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: "image/jpeg" });
  return { dataUrl, blob, width: canvas.width, height: canvas.height };
}

export function blobSize(blob: Blob): number {
  return blob.size;
}
