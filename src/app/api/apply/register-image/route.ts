import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { ok, err } from "@/lib/security";
import { updateApplicationImages, getModeratorApplicationForUser } from "@/lib/repo";
import { z } from "zod";

/**
 * POST /api/apply/register-image
 * R2 руу upload хийсний дараа objectKey-г анкетын тохирох slot-д бүртгэнэ.
 * Сервер нь slot-оос jsonb баганыг шийдэж, зөвхөн өөрийн draft/editable анкет руу бичнэ.
 */
const schema = z.object({
  applicationId: z.string().min(1).max(100),
  objectKey: z.string().min(5).max(500),
  slot: z.enum(["id-front-0", "id-front-1", "id-front-2", "id-back-0", "id-back-1", "id-back-2", "selfie"]),
});

export const POST = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const { applicationId, objectKey, slot } = parsed.data;

  const app = await getModeratorApplicationForUser(user.id);
  if (!app || app.id !== applicationId) {
    return err("Анкет олдсонгүй эсвэл танд хандах эрхгүй байна.", 403);
  }

  // Slot дээр суурилан баганыг шийднэ
  let updated;
  if (slot === "selfie") {
    updated = await updateApplicationImages(user.id, applicationId, { selfieUrl: objectKey });
  } else if (slot.startsWith("id-front-")) {
    const idx = Number(slot.split("-")[2]);
    const arr = [...app.idCardFrontUrls];
    arr[idx] = objectKey;
    updated = await updateApplicationImages(user.id, applicationId, { frontUrls: arr });
  } else {
    const idx = Number(slot.split("-")[2]);
    const arr = [...app.idCardBackUrls];
    arr[idx] = objectKey;
    updated = await updateApplicationImages(user.id, applicationId, { backUrls: arr });
  }

  if (!updated) return err("Зураг бүртгэхэд алдаа гарлаа.", 400);

  return ok({ registered: true, objectKey });
});
