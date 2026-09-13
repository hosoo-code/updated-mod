import { NextRequest } from "next/server";
import { withApi } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo/store";
import { isObjectOwnedByUser } from "@/lib/r2";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * PUT /api/demo/upload — ЗӨВХӨН demo горим.
 * R2-ийн presigned upload-ийг дуурайна (in-memory хадгална).
 * Content-Type, хэмжээ, object key харьяаллыг server талд шалгана.
 */
export const PUT = withApi(async (req: NextRequest) => {
  if (!isDemoMode()) return err("Энэ endpoint зөвхөн demo горимд ажиллана.", 404);
  const user = await requireUser();

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return err("Object key заагдаагүй.", 400);
  if (!isObjectOwnedByUser(key, user.id)) {
    return err("Object key таны харьяалалд орохгүй байна.", 403);
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!ALLOWED.has(contentType)) {
    return err("Зөвхөн JPEG/PNG/WebP зураг зөвшөөрөгдөнө.", 415);
  }

  const buffer = Buffer.from(await req.arrayBuffer());
  if (buffer.byteLength === 0) return err("Хоосон файл илгээсэн байна.", 400);
  if (buffer.byteLength > MAX_BYTES) return err("Файл хэтэрхий том байна (≤10MB).", 413);

  // Magic byte шалгалт — content-type хуурамчлах оролдлогоос сэргийлнэ
  const magic = buffer.subarray(0, 4).toString("hex").toUpperCase();
  const isJpeg = magic.startsWith("FFD8");
  const isPng = magic === "89504E47";
  const isWebp = buffer.subarray(0, 12).toString("ascii").startsWith("RIFF");
  if (!isJpeg && !isPng && !isWebp) {
    return err("Файлын агуулга зураг биш байна.", 415);
  }

  const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
  demoStore.documentBlobs.set(key, { dataUrl, contentType, size: buffer.byteLength });

  return ok({ objectKey: key, size: buffer.byteLength });
});
