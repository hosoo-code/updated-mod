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
  /** Нүүрний бүсээс авсан дундаж RGB (anti-spoof өнгөний тогтвортой шалгалт) */
  avgR: number;
  avgG: number;
  avgB: number;
  /** 4 булан тус бүрийн sharpness — нугалсан/мушгирсан ирмэг илрүүлэх */
  cornerSharpness: [number, number, number, number];
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
  // Нүүр/баримт ихэвчлэн төвд байдаг тул төвийн 60% дээр дундаж RGB-г авна (anti-spoof)
  const cxA = Math.floor(sw * 0.2);
  const cxB = Math.ceil(sw * 0.8);
  const cyA = Math.floor(sh * 0.2);
  const cyB = Math.ceil(sh * 0.8);
  let sum = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let csumCount = 0;
  for (let i = 0; i < sw * sh; i++) {
    const r = data[i * 4] ?? 0;
    const gx = data[i * 4 + 1] ?? 0;
    const b = data[i * 4 + 2] ?? 0;
    const v = 0.299 * r + 0.587 * gx + 0.114 * b;
    gray[i] = v;
    sum += v;
    const x = i % sw;
    const y = (i / sw) | 0;
    if (x >= cxA && x <= cxB && y >= cyA && y <= cyB) {
      sumR += r;
      sumG += gx;
      sumB += b;
      csumCount++;
    }
  }
  const brightness = sum / (sw * sh);
  const avgR = csumCount ? sumR / csumCount : 0;
  const avgG = csumCount ? sumG / csumCount : 0;
  const avgB = csumCount ? sumB / csumCount : 0;

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

  // 4 булан бүрийн sharpness (edge magnitude) — нугалсан/мушгирсан ирмэг илрүүлэх
  const qW = Math.max(1, Math.floor(sw / 2));
  const qH = Math.max(1, Math.floor(sh / 2));
  const cornerSum = [0, 0, 0, 0];
  const cornerCount = [0, 0, 0, 0];
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const v = edge[y * sw + x] ?? 0;
      const qi = (x < qW ? 0 : 1) + (y < qH ? 0 : 2);
      cornerSum[qi] = (cornerSum[qi] ?? 0) + v;
      cornerCount[qi] = (cornerCount[qi] ?? 0) + 1;
    }
  }
  const cornerSharpness: [number, number, number, number] = [
    (cornerCount[0] ?? 0) ? (cornerSum[0] ?? 0) / (cornerCount[0] ?? 1) : 0,
    (cornerCount[1] ?? 0) ? (cornerSum[1] ?? 0) / (cornerCount[1] ?? 1) : 0,
    (cornerCount[2] ?? 0) ? (cornerSum[2] ?? 0) / (cornerCount[2] ?? 1) : 0,
    (cornerCount[3] ?? 0) ? (cornerSum[3] ?? 0) / (cornerCount[3] ?? 1) : 0,
  ];

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
    avgR,
    avgG,
    avgB,
    cornerSharpness,
  };
}

/** object-cover CSS crop-той тохирох viewport → video координатын масштаб/оффсет.
 *  Video элемент нь object-cover тул захыг тайрдаг — дэлгэцэд харагдах бүсээс гадуурх
 *  координатыг ашиглавал guidance тааруу болно. Энэ нь тэр тайралтыг засна. */
export function coverCropRect(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
): { scale: number; offX: number; offY: number } {
  const vr = videoWidth / videoHeight;
  const cr = containerWidth / containerHeight;
  if (vr > cr) {
    // Видео нь контейнерээс өргөн — хажуу талыг тайрна
    const scale = containerHeight / videoHeight;
    const displayW = videoWidth * scale;
    return { scale, offX: (containerWidth - displayW) / 2, offY: 0 };
  }
  const scale = containerWidth / videoWidth;
  const displayH = videoHeight * scale;
  return { scale, offX: 0, offY: (containerHeight - displayH) / 2 };
}

/**
 * Каптурыг илгээхээс өмнө шалгах — хоосон/хоёр дахин/бүдэг зургаас сэргийлнэ.
 * @returns алдааны мессеж эсвэл null (хүлээн зөвшөөрөгдөнө)
 */
export function validateCapture(a: FrameAnalysis | null): string | null {
  if (!a) return "Зураг шинжлэгдээгүй байна. Дахин оролдоно уу.";
  if (a.brightness < 40) return "Зураг хэт харанхуй байна. Гэрлийг нэмэгдүүлээд дахин авна уу.";
  if (a.isTooBright) return "Зураг хэт гэрэлтсэн байна. Гэрлийг багасгаад дахин авна уу.";
  if (a.isBlurry) return "Зураг бүдэг гарсан байна. Камераа тогтоож, дахин авна уу.";
  // Бүх 4 булан тод байх ёстой — хамгийн бүдэг булан нь гол хэсгээс хэт холдсон бол нугалсан байна
  const minCorner = Math.min(...a.cornerSharpness);
  const mini = a.cornerSharpness.indexOf(minCorner);
  const others = a.cornerSharpness.filter((_, i) => i !== mini);
  const othersAvg = others.length ? others.reduce((x, y) => x + y, 0) / others.length : minCorner;
  if (othersAvg > 2.2 && minCorner < othersAvg * 0.45) {
    return "Баримтын нэг булан нь бүдэг байна — тэгшлээд дахин авна уу.";
  }
  return null;
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
  const b64 = dataUrl.split(",")[1] ?? "";
  if (!b64) throw new Error("Зураг авахад алдаа гарлаа. Дахин оролдоно уу.");
  const bytes = atob(b64);
  if (bytes.length < 512) throw new Error("Зураг авахад алдаа гарлаа. Камераа шалгаад дахин оролдоно уу.");
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: "image/jpeg" });
  return { dataUrl, blob, width: canvas.width, height: canvas.height };
}

export function blobSize(blob: Blob): number {
  return blob.size;
}
