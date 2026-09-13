import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { isDemoMode } from "@/lib/demo-mode";
import { isR2Configured } from "@/lib/env";
import { createPresignedUploadUrl, buildObjectKey, isObjectOwnedByUser } from "@/lib/r2";
import { getVerificationById } from "@/lib/repo";
import { uploadUrlSchema } from "@/lib/validation";

/**
 * POST /api/r2/upload-url
 * - Зөвхөн нэвтэрсэн хэрэглэгч
 * - Зөвхөн ӨӨРИЙН verification request-д upload хийх эрхтэй (IDOR хамгаалалт)
 * - Object key-ийг зөвхөн SERVER үүсгэнэ — client path сонгох боломжгүй
 * - Төрөл + хэмжээ баталгаажуулна (JPEG/PNG/WebP, ≤10MB)
 */
export const POST = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = uploadUrlSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const { requestId, documentType, contentType, fileSize } = parsed.data;

  const request = await getVerificationById(requestId);
  if (!request) return err("Баталгаажуулалтын хүсэлт олдсонгүй.", 404);
  if (request.userId !== user.id) {
    return err("Энэ хүсэлтэд хандах эрхгүй байна.", 403);
  }
  if (request.status !== "draft") {
    return err("Энэ хүсэлт аль хэдийн илгээгдсэн байна.", 400);
  }

  const objectKey = buildObjectKey(user.id, requestId, documentType);

  if (isDemoMode()) {
    // Demo: бодит R2 байхгүй тул дотоод upload endpoint руу чиглүүлнэ
    return ok({
      objectKey,
      uploadUrl: `/api/demo/upload?key=${encodeURIComponent(objectKey)}`,
      method: "PUT",
      directUpload: false,
    });
  }

  if (!isR2Configured()) {
    return err("R2 storage тохируулаагүй байна. Администратортой холбогдоно уу.", 500);
  }

  const uploadUrl = await createPresignedUploadUrl(objectKey, contentType);
  return ok({
    objectKey,
    uploadUrl,
    method: "PUT",
    directUpload: true,
  });
});
