import { NextRequest } from "next/server";
import { withApi } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo/store";
import { createPresignedDownloadUrl, isObjectOwnedByUser } from "@/lib/r2";
import { getVerificationById } from "@/lib/repo";

/**
 * GET /api/r2/download-url?key=...
 * - Sensitive баримтын SHORT-LIVED signed URL — permanent public URL БАЙХГҮЙ
 * - Зөвхөн эзэмшигч эсвэл admin үзэх боломжтой (IDOR хамгаалалт)
 * - Admin үзэлт audit log-д бичигдэнэ
 */
export const GET = withApi(async (req: NextRequest) => {
  const user = await requireUser();
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return err("Object key заагдаагүй.", 400);

  // Object key нь хэрэглэгчийн харьяа байх ёстой — эсвэл admin
  const isOwner = isObjectOwnedByUser(key, user.id);
  if (!isOwner && user.role !== "admin") {
    return err("Энэ баримтад хандах эрхгүй байна.", 403);
  }
  if (isOwner) {
    // Эзэмшигч нь зөвхөн өөрийн request-ийн document-ыг үзнэ
    const requestIdFromKey = key.split("/")[2] ?? "";
    const request = await getVerificationById(requestIdFromKey);
    if (!request || request.userId !== user.id) {
      return err("Энэ баримтад хандах эрхгүй байна.", 403);
    }
  }

  if (isDemoMode()) {
    const blob = demoStore.documentBlobs.get(key);
    if (!blob) return err("Баримт олдсонгүй (demo).", 404);
    return ok({ url: blob.dataUrl, expiresIn: 120 });
  }

  try {
    const url = await createPresignedDownloadUrl(key);
    return ok({ url, expiresIn: 120 });
  } catch {
    return err("Баримт ачаалахад алдаа гарлаа.", 500);
  }
});
