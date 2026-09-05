import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { isR2Configured } from "@/lib/env";
import { ok, err } from "@/lib/security";
import { buildApplicationObjectKey } from "@/lib/r2";
import { createPresignedUploadUrl } from "@/lib/r2";
import { getModeratorApplicationForUser } from "@/lib/repo";
import { uploadAppImageSchema } from "@/lib/validation";

/**
 * POST /api/apply/upload-url
 * - Зөвхөн нэвтэрсэн хэрэглэгч өөрийн draft/editable анкет руу зураг upload хийнэ.
 * - Object key-ийг ЗӨВХӨН server үүсгэнэ (client path сонгох боломжгүй).
 * - Slot: id-front-0|1|2, id-back-0|1|2, selfie
 */
export const POST = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = uploadAppImageSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const { applicationId, slot, contentType } = parsed.data;

  const app = await getModeratorApplicationForUser(user.id);
  if (!app || app.id !== applicationId) {
    return err("Анкет олдсонгүй эсвэл танд хандах эрхгүй байна.", 403);
  }

  const objectKey = buildApplicationObjectKey(user.id, applicationId, slot);

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
